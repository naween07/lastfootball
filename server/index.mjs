// LastFootball Local API — replaces Supabase Edge Functions
// Runs on the same VPS, eliminates the Supabase network hop.
// Memory-cached with TTL, stale-while-revalidate strategy.

import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 3001;
const API_BASE = 'https://v3.football.api-sports.io';
const API_KEY = process.env.API_FOOTBALL_KEY;
const SUPABASE_URL = 'https://ehfyctoaudhyrjxbftty.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZnljdG9hdWRoeXJqeGJmdHR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMjU4NjAsImV4cCI6MjA5MjYwMTg2MH0.0AoYP0nhrYWuLhSVGwRdHKSfNVQa-jJw0E4EZKWtTGU';

if (!API_KEY) {
  console.error('Missing API_FOOTBALL_KEY env var');
  process.exit(1);
}

// ─── In-memory cache ────────────────────────────────────────────────────────
const cache = new Map();
const MAX_ENTRIES = 2000;
const inflight = new Map();

function getTtl(endpoint, params) {
  // Live matches — very short cache
  if (params.live === 'all') return { fresh: 20, stale: 40 };
  
  // H2H — historical data, cache for 24h
  if (endpoint === 'fixtures/headtohead') return { fresh: 86400, stale: 172800 };
  
  // Match events/stats/lineups for specific fixture
  if (endpoint.startsWith('fixtures/') && params.fixture) {
    // Check if it's a past fixture (we can cache longer)
    return { fresh: 300, stale: 3600 };
  }
  
  // Fixtures by date
  if (endpoint === 'fixtures') {
    if (params.team && (params.last || params.next)) {
      // Team's last/next fixtures — cache 1h
      return { fresh: 3600, stale: 7200 };
    }
    const date = params.date;
    if (date) {
      const today = new Date().toISOString().split('T')[0];
      if (date < today) return { fresh: 86400, stale: 604800 }; // Past dates — 24h
      if (date === today) return { fresh: 60, stale: 120 };      // Today — 1min
      return { fresh: 600, stale: 1800 };                         // Future — 10min
    }
    return { fresh: 60, stale: 120 };
  }
  
  // Team statistics — refresh fast during the tournament
  if (endpoint === 'teams/statistics') return { fresh: 600, stale: 3600 }; // 10min fresh, 1h stale
  
  // Squad data — rarely changes (transfers only)
  if (endpoint === 'players/squads') return { fresh: 86400, stale: 172800 }; // 24h fresh, 48h stale
  
  // Standings — near-real-time during the tournament (live group-stage swings)
  if (endpoint === 'standings') return { fresh: 60, stale: 600 }; // 1min fresh, 10min stale
  
  // Player stats (top scorers etc.) — near-real-time during the tournament
  if (endpoint.startsWith('players/')) return { fresh: 60, stale: 600 };
  
  // Team info — very stable
  if (endpoint === 'teams') {
    if (params.id) return { fresh: 86400, stale: 604800 }; // Single team — 24h
    if (params.search) return { fresh: 300, stale: 900 };   // Search — 5min
    return { fresh: 21600, stale: 86400 };                   // League teams — 6h
  }
  
  // Rounds — stable
  if (endpoint === 'fixtures/rounds') return { fresh: 21600, stale: 86400 };
  
  // Default — 5min
  return { fresh: 300, stale: 900 };
}

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.staleUntil) { cache.delete(key); return null; }
  return entry;
}

// "Last good" store: the most recent successful response per key, kept even after
// the TTL cache expires. Used as a fallback when the upstream API fails (e.g. quota
// exhausted) so the site never serves empty data / skeletons.
const lastGood = new Map();

function cacheSet(key, data, ttl) {
  const now = Date.now();
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, {
    data,
    fetchedAt: now,
    freshUntil: now + ttl.fresh * 1000,
    staleUntil: now + (ttl.fresh + ttl.stale) * 1000,
  });
  // Remember the last good payload indefinitely (bounded) for degraded fallback
  if (data !== null && data !== undefined) {
    if (lastGood.size >= MAX_ENTRIES * 2) {
      const oldest = lastGood.keys().next().value;
      if (oldest) lastGood.delete(oldest);
    }
    lastGood.set(key, { data, savedAt: now });
  }
}

// ─── API Quota Monitor ──────────────────────────────────────────────────────
const quota = {
  daily: { used: 0, limit: 0, remaining: 0 },
  lastChecked: null,
  callsToday: 0,
};

// Circuit breaker: background jobs (warming, reports, fantasy, computed stats)
// must call this and bail if it returns false. Keeps a hard reserve of the daily
// quota for real user traffic so background work can NEVER exhaust the limit.
// Real user requests are NOT gated by this — they always run (and fall back to
// cached/last-good data if the API itself is exhausted).
const QUOTA_RESERVE = 2500; // always leave this many calls for live user traffic
let _breakerLogged = false;
function backgroundJobsAllowed() {
  // If we haven't seen a quota header yet, allow (we'll learn the real number fast)
  if (!quota.daily.limit) return true;
  if (quota.daily.remaining <= QUOTA_RESERVE) {
    if (!_breakerLogged) {
      console.warn(`🛑 CIRCUIT BREAKER: background jobs paused — only ${quota.daily.remaining} calls left (reserve ${QUOTA_RESERVE} for users). Resumes at daily reset.`);
      _breakerLogged = true;
    }
    return false;
  }
  if (_breakerLogged && quota.daily.remaining > QUOTA_RESERVE + 500) {
    console.log(`✅ CIRCUIT BREAKER: quota recovered (${quota.daily.remaining} left) — background jobs resumed.`);
    _breakerLogged = false;
  }
  return true;
}

// Second (lower) quota tier for ESSENTIAL on-demand work: real user fetches that
// miss cache (a freshly-viewed match/page) and the live pollers. These may spend
// quota all the way down to USER_QUOTA_FLOOR — below the background reserve — so
// the site stays interactive even after non-essential background jobs have paused.
// We still keep a small floor so we never drive remaining to 0 (a hard 0 makes the
// upstream return 429s). When the floor is hit, callers fall back to last-good data.
const USER_QUOTA_FLOOR = 250;
function userFetchAllowed() {
  if (!quota.daily.limit) return true; // haven't learned the real limit yet — allow
  return quota.daily.remaining > USER_QUOTA_FLOOR;
}

// ─── Background polling schedule (tunable) ──────────────────────────────────
// The whole point of the refactor: upstream call volume is bounded by THESE
// intervals, not by how many users are browsing. Adjust here, then check the
// startup budget log to see the estimated daily total vs the 7,500 cap.
const HOMEPAGE_POLL_MS    = 180 * 1000; // full homepage rebuild (live + today + WC + domestic, cache-first)
const LIVE_DETAIL_POLL_MS = 180 * 1000; // refresh events+stats for *viewed* live matches (handoff: ~3 min)
const MAX_LIVE_DETAIL     = 20;         // hard cap on live matches refreshed per detail-poll run

// API-Football fixture.status.short codes that mean "in play" (per handoff).
const LIVE_STATUSES = ['1H', '2H', 'HT', 'ET', 'P', 'BT'];
function isLiveStatus(s) { return LIVE_STATUSES.includes(s); }

function fetchWithHeaders(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      const resHeaders = res.headers;
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ data: JSON.parse(body), headers: resHeaders }); }
        catch (e) { reject(new Error('Invalid JSON from upstream')); }
      });
    }).on('error', reject);
  });
}

async function fetchUpstream(endpoint, params) {
  const qs = new URLSearchParams(params).toString();
  const url = `${API_BASE}/${endpoint}${qs ? '?' + qs : ''}`;
  const { data, headers } = await fetchWithHeaders(url, {
    'x-rapidapi-key': API_KEY,
    'x-rapidapi-host': 'v3.football.api-sports.io',
  });

  // Track quota from response headers
  const remaining = parseInt(headers['x-ratelimit-requests-remaining'] || '0');
  const limit = parseInt(headers['x-ratelimit-requests-limit'] || '0');
  if (limit > 0) {
    quota.daily = { used: limit - remaining, limit, remaining };
    quota.lastChecked = new Date().toISOString();
    quota.callsToday++;

    const pctUsed = ((limit - remaining) / limit) * 100;
    if (pctUsed >= 80) {
      console.warn(`⚠️ API QUOTA WARNING: ${Math.round(pctUsed)}% used (${limit - remaining}/${limit}). ${remaining} calls remaining.`);
    }
  }

  return data;
}

// Cache-first upstream fetch: returns cached data if still within stale window,
// otherwise fetches and caches. Use this for warming/aggregation so repeated
// builds reuse cached data instead of burning fresh API calls each time.
async function cachedUpstream(endpoint, params, ttl) {
  const sortedKeys = Object.keys(params).sort();
  const cacheKey = endpoint + '?' + sortedKeys.map(k => k + '=' + params[k]).join('&');
  const hit = cacheGet(cacheKey);
  if (hit) return hit.data;
  // Cache miss. If we're at/below the user-fetch floor, don't spend a call — hand
  // back the last good copy (or an empty API-shaped object). This never throws, so
  // callers / routes that rely on it never crash when quota is exhausted.
  if (!userFetchAllowed()) {
    return lastGood.get(cacheKey)?.data ?? { response: [] };
  }
  try {
    const data = await fetchUpstream(endpoint, params);
    cacheSet(cacheKey, data, ttl || getTtl(endpoint, params));
    return data;
  } catch (err) {
    return lastGood.get(cacheKey)?.data ?? { response: [] };
  }
}

async function revalidate(cacheKey, endpoint, params, ttl) {
  const existing = inflight.get(cacheKey);
  if (existing) return existing;

  const promise = fetchUpstream(endpoint, params)
    .then(data => {
      cacheSet(cacheKey, data, ttl);
      inflight.delete(cacheKey);
      return data;
    })
    .catch(err => {
      inflight.delete(cacheKey);
      throw err;
    });

  inflight.set(cacheKey, promise);
  return promise;
}

// ─── News (RSS) ─────────────────────────────────────────────────────────────
const RSS_FEEDS = [
  { url: 'https://feeds.bbci.co.uk/sport/football/rss.xml', source: 'BBC Sport', category: 'general' },
  { url: 'https://www.espn.com/espn/rss/soccer/news', source: 'ESPN FC', category: 'general' },
  { url: 'https://www.skysports.com/rss/12040', source: 'Sky Sports', category: 'transfers' },
];

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LastFootball/1.0)' }, timeout: 8000 }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

function getTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))</${tag}>`, 'i'));
  return m ? (m[1] || m[2] || '').trim() : '';
}

function getImage(block) {
  const thumb = block.match(/<media:thumbnail[^>]+url="([^"]+)"/i);
  if (thumb) return thumb[1];
  const media = block.match(/<media:content[^>]+url="([^"]+)"/i);
  if (media) return media[1];
  const enc = block.match(/<enclosure[^>]+url="([^"]+)"/i);
  if (enc) return enc[1];
  return undefined;
}

function stripHtml(s) {
  return s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").trim();
}

let newsCache = { data: null, fetchedAt: 0 };
const NEWS_TTL = 5 * 60 * 1000; // 5 min

async function getNews() {
  if (newsCache.data && Date.now() - newsCache.fetchedAt < NEWS_TTL) {
    return newsCache.data;
  }

  const results = await Promise.allSettled(RSS_FEEDS.map(async (feed) => {
    const xml = await fetchText(feed.url);
    const items = xml.split(/<item[^>]*>/i).slice(1);
    return items.slice(0, 15).map(raw => {
      const block = raw.split(/<\/item>/i)[0];
      const title = stripHtml(getTag(block, 'title'));
      const link = getTag(block, 'link').trim();
      const pubDate = getTag(block, 'pubDate');
      if (!title || !link) return null;
      return {
        id: title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 60),
        title,
        description: stripHtml(getTag(block, 'description')).substring(0, 200),
        url: link,
        source: feed.source,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        imageUrl: getImage(block),
        category: feed.category,
      };
    }).filter(Boolean);
  }));

  const all = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
  all.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  const seen = new Set();
  const unique = [];
  for (const item of all) {
    if (!seen.has(item.id)) { seen.add(item.id); unique.push(item); }
  }

  const news = unique.slice(0, 50);
  newsCache = { data: news, fetchedAt: Date.now() };
  return news;
}

// ─── Logo proxy ─────────────────────────────────────────────────────────────
const ALLOWED_HOSTS = new Set([
  'media.api-sports.io', 'media-1.api-sports.io', 'media-2.api-sports.io',
  'media-3.api-sports.io', 'media-4.api-sports.io',
]);
const logoCache = new Map();
const LOGO_TTL = 7 * 24 * 3600 * 1000;
const MAX_LOGOS = 2000;

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 5000 }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ buf: Buffer.concat(chunks), type: res.headers['content-type'] || 'image/png' }));
    }).on('error', reject);
  });
}

// Try to load sharp for image optimization (optional dependency)
let sharp = null;
try {
  sharp = (await import('sharp')).default;
  console.log('Sharp loaded — logo resizing enabled');
} catch {
  console.log('Sharp not available — serving logos at original size');
}

async function getLogo(logoUrl, maxSize = 80) {
  try {
    const u = new URL(logoUrl);
    if (!ALLOWED_HOSTS.has(u.host)) return null;
  } catch { return null; }

  const cacheKey = logoUrl + ':' + maxSize;
  const cached = logoCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < LOGO_TTL) return cached;

  const { buf, type } = await fetchBuffer(logoUrl);

  let finalBuf = buf;
  let finalType = type;

  // Resize with sharp if available (saves ~80% bandwidth)
  if (sharp && buf.length > 1024) {
    try {
      finalBuf = await sharp(buf)
        .resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true })
        .png({ quality: 80, compressionLevel: 9 })
        .toBuffer();
      finalType = 'image/png';
    } catch {
      // Fall back to original
    }
  }

  if (logoCache.size >= MAX_LOGOS) {
    const oldest = logoCache.keys().next().value;
    if (oldest) logoCache.delete(oldest);
  }
  const entry = { buf: finalBuf, type: finalType, fetchedAt: Date.now() };
  logoCache.set(cacheKey, entry);
  return entry;
}

// ─── Rate Limiter (per-IP, no dependencies) ────────────────────────────────
const rateLimits = new Map();
const RATE_WINDOW = 60_000;  // 1 minute window
const RATE_MAX_API = 60;     // 60 requests/min per IP for /api/football + /api/news
const RATE_MAX_LOGO = 300;   // 300 requests/min per IP for /api/logo (images load in bursts)

function getRateKey(ip, bucket) { return ip + ':' + bucket; }

function checkRate(ip, bucket, max) {
  const key = getRateKey(ip, bucket);
  const now = Date.now();
  let entry = rateLimits.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_WINDOW };
    rateLimits.set(key, entry);
  }

  entry.count++;

  if (entry.count > max) {
    return { allowed: false, remaining: 0, resetIn: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { allowed: true, remaining: max - entry.count, resetIn: Math.ceil((entry.resetAt - now) / 1000) };
}

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimits) {
    if (now > entry.resetAt) rateLimits.delete(key);
  }
}, 5 * 60_000);

// ─── HTTP Server ────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = new Set([
  'https://lastfootball.com',
  'https://www.lastfootball.com',
  'http://localhost:8080',
  'http://localhost:5173',
]);

function getCorsHeaders(req) {
  const origin = req?.headers?.origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://lastfootball.com';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function json(req, res, data, extra = {}) {
  const body = JSON.stringify(data);
  res.writeHead(200, { ...getCorsHeaders(req), 'Content-Type': 'application/json', ...extra });
  res.end(body);
}

function error(req, res, code, msg) {
  res.writeHead(code, { ...getCorsHeaders(req), 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: msg }));
}

// ─── Publishing Pipeline Helpers ────────────────────────────────────────────

// XSS sanitizer — strips HTML tags and SQL injection vectors
function sanitize(str) {
  if (!str) return '';
  return String(str)
    .replace(/'/g, "''")
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/;/g, '')
    .replace(/--/g, '')
    .trim();
}

// Read request body
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 1e6) reject(new Error('Body too large')); });
    req.on('end', () => resolve(body));
  });
}

// supabaseQuery stub removed (duplicate)
// Generate Google-compliant JSON-LD structured data
function generateJsonLd({ type, title, description, slug, author, image, published }) {
  const base = {
    '@context': 'https://schema.org',
    '@type': type,
    headline: title,
    description: description,
    url: `https://lastfootball.com/news/${slug}`,
    datePublished: published,
    dateModified: published,
    author: {
      '@type': 'Person',
      name: author,
      url: 'https://lastfootball.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'LastFootball',
      url: 'https://lastfootball.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://lastfootball.com/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://lastfootball.com/news/${slug}`,
    },
  };
  
  if (image) {
    base.image = {
      '@type': 'ImageObject',
      url: image,
      width: 1200,
      height: 630,
    };
  }
  
  // NewsArticle gets dateline for Google Top Stories
  if (type === 'NewsArticle') {
    base.dateline = published;
    base.articleSection = 'Football';
  }
  
  // BlogPosting gets wordCount for evergreen indexing
  if (type === 'BlogPosting') {
    base.articleBody = description;
  }
  
  return base;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, getCorsHeaders(req));
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  try {
    // Health check (no rate limit)
    if (path === '/api/health') {
      return json(req, res, { ok: true, cache: cache.size, logos: logoCache.size, rateLimits: rateLimits.size });
    }

    // ─── Share kit: copy-paste posting helper for Facebook/social ───────────
    // Lists recent match reports with a ready-to-post caption + score-card image.
    // Open in a browser, click "Copy", paste into a Facebook Page post.
    if (path === '/api/share-kit') {
      try {
        const SVC = process.env.SUPABASE_SERVICE_KEY || SUPABASE_KEY;
        const posts = await supabaseQueryWithKey('posts',
          "category=eq.match-report&status=eq.published&select=title,slug,subtitle,league,teams,featured_image,published_at&order=published_at.desc&limit=25",
          'GET', null, SVC);
        const html = buildShareKitHtml(Array.isArray(posts) ? posts : []);
        res.writeHead(200, { ...getCorsHeaders(req), 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
        return res.end(html);
      } catch (e) {
        console.error('[SHAREKIT] error:', e.message);
        res.writeHead(500, getCorsHeaders(req));
        return res.end('error');
      }
    }

    // ─── Server-side prerender for article pages (SEO) ──────────────────
    // Crawlers (and users) hitting /news/:slug get full HTML with real title,
    // meta tags, JSON-LD, and article text baked in — not an empty SPA shell.
    // The React app still hydrates on top for interactivity.
    if (path.startsWith('/news/') && path.length > 6) {
      const slug = decodeURIComponent(path.slice(6)).replace(/\/$/, '');
      if (slug && !slug.includes('/')) {
        try {
          const html = await prerenderArticle(slug);
          if (html) {
            res.writeHead(200, {
              ...getCorsHeaders(req),
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'public, max-age=300',
            });
            return res.end(html);
          }
        } catch (e) {
          console.error('[PRERENDER] error:', e.message);
        }
        // Fall through to SPA shell if no content / error
        return serveSpaShell(req, res);
      }
    }

    // ─── Dynamic sitemap (static pages + all published posts) ───────────
    if (path === '/api/sitemap.xml' || path === '/sitemap.xml') {
      const cached = cacheGet('sitemap:xml');
      const xml = cached ? cached.data : await buildSitemapXml();
      res.writeHead(200, { ...getCorsHeaders(req), 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=600' });
      return res.end(xml);
    }

    // ─── Aggregated homepage data (1 call instead of 13) ────────────────
    if (path === '/api/homepage') {
      // Use a SINGLE cache key for all visitors. Clients send varied IANA timezone
      // strings (Asia/Kathmandu, Asia/Katmandu, Asia/Calcutta, etc.) and per-tz keys
      // meant most mobile visitors hit a COLD key (warming only covered one tz) and
      // saw empty widgets until refresh. The homepage data is essentially tz-agnostic
      // (fixtures carry their own kickoff times), so one warm key serves everyone fast.
      const tz = 'Asia/Kathmandu';
      const cacheKey = 'agg_homepage:' + tz;

      // CACHE-ONLY for users. The background homepage loop (HOMEPAGE_POLL_MS) is the
      // ONLY thing that rebuilds this aggregate, so call volume is bounded by the
      // poll schedule, never by traffic. We intentionally do NOT kick off a rebuild
      // on user requests: that used to fire a fresh build (incl. a live-fixtures
      // call) on every stale hit during peak hours, draining the quota — and it also
      // caused the "homepage needs a hard refresh" race when many requests stampeded
      // a cold key at once.
      const hit = cacheGet(cacheKey);
      if (hit) {
        const isFresh = Date.now() < hit.freshUntil;
        return json(req, res, hit.data, { 'X-Cache': isFresh ? 'HIT' : 'STALE' });
      }

      // No TTL cache → serve last-good instantly (kept indefinitely; refreshed by the
      // background loop). Never make the user wait or see empty widgets.
      const lg = lastGood.get(cacheKey);
      if (lg) {
        return json(req, res, lg.data, { 'X-Cache': 'LASTGOOD' });
      }

      // Truly cold: no TTL cache AND no last-good AND no snapshot (e.g. first request
      // right after a fresh deploy before the startup build finished). Do ONE
      // coalesced build so the very first visitor still gets data — this is the cold
      // path only, not a per-request kickoff. Skip the call if we're out of quota.
      if (!userFetchAllowed()) {
        return json(req, res, { live: [], today: [], scorers: {}, standings: {}, worldCupActive: false }, { 'X-Cache': 'EMPTY' });
      }
      try {
        let p = inflight.get(cacheKey);
        if (!p) {
          p = buildHomepageData(tz).finally(() => inflight.delete(cacheKey));
          inflight.set(cacheKey, p);
        }
        const result = await p;
        return json(req, res, result, { 'X-Cache': 'COLD' });
      } catch (err) {
        console.error('Homepage aggregate error:', err);
        return json(req, res, { live: [], today: [], scorers: {}, standings: {}, worldCupActive: false }, { 'X-Cache': 'EMPTY' });
      }
    }

    // ─── Aggregated match detail (1 call instead of 4-7) ────────────────
    if (path === '/api/match') {
      const fixtureId = url.searchParams.get('id');
      if (!fixtureId) return json(req, res, { error: 'Missing id' }, 400);

      const cacheKey = `agg_match_${fixtureId}`;
      const EMPTY = { fixture: [], events: [], stats: [], lineups: [], players: [] };

      // Cache hit → serve immediately. Live matches are kept fresh by the background
      // liveDetailPoller (events+stats), finished matches are cached ~30 days. We do
      // NOT re-burst the 5-call aggregate on every view anymore — that burst (one per
      // match view, multiplied by every browsing user during peak) was the main quota
      // drain.
      const hit = cacheGet(cacheKey);
      if (hit) return json(req, res, hit.data, { 'X-Cache': 'HIT' });

      // Cache miss + low quota → serve last-good (or empty) instead of bursting.
      if (!userFetchAllowed()) {
        const lg = lastGood.get(cacheKey);
        return json(req, res, lg ? lg.data : EMPTY, { 'X-Cache': lg ? 'LASTGOOD' : 'EMPTY' });
      }

      // Cache miss + quota OK → build the aggregate once, cache it, and serve. The
      // poller takes over keeping it fresh while the match is live.
      try {
        const result = await fetchMatchAggregate(fixtureId);
        return json(req, res, result, { 'X-Cache': 'MISS' });
      } catch (err) {
        console.error('Match aggregate error:', err);
        const lg = lastGood.get(cacheKey);
        return json(req, res, lg ? lg.data : EMPTY, { 'X-Cache': lg ? 'LASTGOOD' : 'EMPTY' });
      }
    }

    // API quota status (no rate limit)
    if (path === '/api/leaderboard') {
      try {
        const key = process.env.SUPABASE_SERVICE_KEY || SUPABASE_KEY;
        const stats = await supabaseQueryWithKey('prediction_stats', 'select=*&order=total_points.desc&limit=50', 'GET', null, key);
        return json(req, res, { leaderboard: stats || [] });
      } catch (err) {
        console.error('Leaderboard error:', err.message);
        return json(req, res, { leaderboard: [] });
      }
    }

    if (path === '/api/quota') {
      // Count cache entries by type
      const cacheBreakdown = {};
      for (const [key] of cache) {
        const type = key.split('?')[0] || 'unknown';
        cacheBreakdown[type] = (cacheBreakdown[type] || 0) + 1;
      }

      // Count fresh vs stale entries
      const now = Date.now();
      let freshEntries = 0, staleEntries = 0;
      for (const [, entry] of cache) {
        if (now < entry.freshUntil) freshEntries++;
        else staleEntries++;
      }

      return json(req, res, {
        quota: quota.daily,
        callsFromServer: quota.callsToday,
        lastChecked: quota.lastChecked,
        cache: {
          totalEntries: cache.size,
          maxEntries: MAX_ENTRIES,
          freshEntries,
          staleEntries,
          hitRate: `${cache.size > 0 ? 'active' : 'empty'}`,
          breakdown: cacheBreakdown,
        },
        pctUsed: quota.daily.limit > 0 ? Math.round((quota.daily.used / quota.daily.limit) * 100) : 0,
      });
    }

    // Rate limit check for API and news routes
    if (path === '/api/football' || path === '/api/news') {
      const rate = checkRate(ip, 'api', RATE_MAX_API);
      if (!rate.allowed) {
        res.writeHead(429, { ...getCorsHeaders(req), 'Content-Type': 'application/json', 'Retry-After': String(rate.resetIn) });
        return res.end(JSON.stringify({ error: 'Too many requests', retryAfter: rate.resetIn }));
      }
      res.setHeader('X-RateLimit-Remaining', String(rate.remaining));
    }

    // Rate limit for logo proxy (higher limit)
    if (path === '/api/logo') {
      const rate = checkRate(ip, 'logo', RATE_MAX_LOGO);
      if (!rate.allowed) {
        res.writeHead(429, { ...getCorsHeaders(req), 'Content-Type': 'application/json', 'Retry-After': String(rate.resetIn) });
        return res.end(JSON.stringify({ error: 'Too many requests', retryAfter: rate.resetIn }));
      }
    }

    // Football API proxy
    // World Cup top stats computed from real match events (fresher than the
    // upstream topscorers aggregate, which lags hours behind finished matches)
    if (path === '/api/wc-topstats') {
      const cached = cacheGet('computed:wc-topstats');
      if (cached) {
        return json(req, res, cached.data, { 'X-Cache': 'HIT', 'Cache-Control': 'no-cache, no-store, must-revalidate' });
      }
      const data = await computeWorldCupTopStats();
      cacheSet('computed:wc-topstats', data, { fresh: 90, stale: 600 });
      return json(req, res, data, { 'X-Cache': 'MISS', 'Cache-Control': 'no-cache, no-store, must-revalidate' });
    }

    if (path === '/api/football') {
      const endpoint = url.searchParams.get('endpoint');
      if (!endpoint) return error(req, res, 400, 'Missing endpoint');

      const params = {};
      for (const [k, v] of url.searchParams) {
        if (k !== 'endpoint') params[k] = v;
      }

      const sortedKeys = Object.keys(params).sort();
      const cacheKey = endpoint + '?' + sortedKeys.map(k => k + '=' + params[k]).join('&');
      const ttl = getTtl(endpoint, params);

      const entry = cacheGet(cacheKey);
      if (entry) {
        const isFresh = Date.now() < entry.freshUntil;
        // Background-revalidate a stale entry ONLY if we still have quota headroom.
        // Otherwise just serve the stale copy — the pollers / quota reset will catch
        // up. This stops a flood of stale hits during peak from each firing a call.
        if (!isFresh && userFetchAllowed()) {
          revalidate(cacheKey, endpoint, params, ttl).catch(e => console.error('BG revalidate:', e));
        }
        return json(req, res, entry.data, {
          'X-Cache': isFresh ? 'HIT' : 'STALE',
          // Don't let the browser cache API data — the server memory cache provides speed,
          // and browser caching caused stale/empty data on soft SPA navigation.
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        });
      }

      // True cache miss. If we're below the user floor, don't spend a call — serve
      // last-good if we have it, else an empty API-shaped object. Never burst.
      if (!userFetchAllowed()) {
        const lg = lastGood.get(cacheKey);
        return json(req, res, lg ? lg.data : { response: [] }, {
          'X-Cache': lg ? 'DEGRADED' : 'EMPTY',
          ...(lg ? { 'X-Data-Age': String(Math.round((Date.now() - lg.savedAt) / 1000)) } : {}),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        });
      }

      try {
        const data = await revalidate(cacheKey, endpoint, params, ttl);
        return json(req, res, data, {
          'X-Cache': 'MISS',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        });
      } catch (apiErr) {
        // Upstream failed (e.g. quota exhausted). Serve the last good copy if we
        // have one, so the site shows recent data instead of empty skeletons.
        const lg = lastGood.get(cacheKey);
        if (lg) {
          return json(req, res, lg.data, {
            'X-Cache': 'DEGRADED',
            'X-Data-Age': String(Math.round((Date.now() - lg.savedAt) / 1000)),
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          });
        }
        // Nothing cached at all — return an empty shape rather than a 500 so the
        // widget renders empty instead of erroring.
        return json(req, res, { response: [] }, {
          'X-Cache': 'EMPTY',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        });
      }
    }

    // News
    if (path === '/api/news') {
      const news = await getNews();
      return json(req, res, { news });
    }

    // Logo proxy
    if (path === '/api/logo') {
      const logoUrl = url.searchParams.get('url');
      if (!logoUrl) return error(req, res, 400, 'Missing url');

      const size = parseInt(url.searchParams.get('s') || '80') || 80;
      const maxSize = Math.min(Math.max(size, 16), 200); // clamp 16-200

      const logo = await getLogo(logoUrl, maxSize);
      if (!logo) return error(req, res, 403, 'Host not allowed');

      res.writeHead(200, {
        ...getCorsHeaders(req),
        'Content-Type': logo.type,
        'Cache-Control': 'public, max-age=604800, immutable',
      });
      return res.end(logo.buf);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PUBLISHING PIPELINE — Articles API
    // ═══════════════════════════════════════════════════════════════════════

    // GET /api/articles — list published articles
    if (path === '/api/articles' && req.method === 'GET') {
      const limit = url.searchParams.get('limit') || '20';
      const category = url.searchParams.get('category');
      const league = url.searchParams.get('league');
      
      let query = `select id, type, title, slug, subtitle, excerpt, meta_description, author_name, featured_image, featured_image_alt, category, tags, league, teams, reading_time_mins, view_count, published_at, created_at from posts where status = 'published'`;
      if (category) query += ` and category = '${sanitize(category)}'`;
      if (league) query += ` and league = '${sanitize(league)}'`;
      query += ` order by published_at desc limit ${parseInt(limit)}`;
      
      const data = await supabaseQuery(query);
      return json(req, res, data || []);
    }

    // GET /api/articles/:slug — single article with assets
    if (path.startsWith('/api/articles/') && req.method === 'GET') {
      const slug = sanitize(path.split('/api/articles/')[1]);
      if (!slug) return error(req, res, 400, 'Slug required');
      
      const posts = await supabaseQuery(`select * from posts where slug = '${slug}' and status = 'published' limit 1`);
      if (!posts?.length) return error(req, res, 404, 'Article not found');
      
      const post = posts[0];
      const assets = await supabaseQuery(`select * from post_assets where post_id = '${post.id}' order by position`);
      
      // Increment view count
      await supabaseQuery(`update posts set view_count = view_count + 1 where id = '${post.id}'`);
      
      return json(req, res, { ...post, assets: assets || [] });
    }

    // POST /api/admin/articles — create new article (auth required)
    if (path === '/api/admin/articles' && req.method === 'POST') {
      const body = await readBody(req);
      const authHeader = req.headers['authorization'];
      if (!authHeader) return error(req, res, 401, 'Unauthorized');
      
      const { title, type, body: content, subtitle, excerpt, meta_description, category, league, tags, teams, featured_image, featured_image_alt, author_name, assets } = JSON.parse(body);
      
      if (!title || !content) return error(req, res, 400, 'Title and body required');
      
      // Generate slug
      const slug = sanitize(title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
      
      // Generate JSON-LD structured data
      const jsonLd = generateJsonLd({
        type: type || 'NewsArticle',
        title: sanitize(title),
        description: sanitize(meta_description || excerpt || title),
        slug,
        author: sanitize(author_name || 'LastFootball Editorial'),
        image: featured_image,
        published: new Date().toISOString(),
      });
      
      // Calculate reading time
      const wordCount = content.split(/\s+/).length;
      const readingTime = Math.max(1, Math.ceil(wordCount / 200));
      
      const insertQuery = `
        insert into posts (type, status, title, slug, subtitle, body, excerpt, meta_title, meta_description, 
          category, league, tags, teams, featured_image, featured_image_alt, author_name, 
          json_ld, reading_time_mins, published_at)
        values (
          '${sanitize(type || 'NewsArticle')}', 'published', 
          '${sanitize(title)}', '${slug}', 
          ${subtitle ? `'${sanitize(subtitle)}'` : 'null'},
          '${sanitize(content)}',
          ${excerpt ? `'${sanitize(excerpt)}'` : 'null'},
          '${sanitize(title)} | LastFootball',
          '${sanitize(meta_description || excerpt || title).substring(0, 155)}',
          '${sanitize(category || 'Football')}',
          ${league ? `'${sanitize(league)}'` : 'null'},
          ${tags ? `ARRAY[${tags.map(t => `'${sanitize(t)}'`).join(',')}]` : 'null'},
          ${teams ? `ARRAY[${teams.map(t => `'${sanitize(t)}'`).join(',')}]` : 'null'},
          ${featured_image ? `'${sanitize(featured_image)}'` : 'null'},
          ${featured_image_alt ? `'${sanitize(featured_image_alt)}'` : 'null'},
          '${sanitize(author_name || 'LastFootball Editorial')}',
          '${JSON.stringify(jsonLd).replace(/'/g, "''")}',
          ${readingTime},
          now()
        ) returning id, slug`;
      
      const result = await supabaseQuery(insertQuery);
      
      // Insert assets if provided
      if (result?.[0]?.id && assets?.length) {
        for (let i = 0; i < assets.length; i++) {
          const a = assets[i];
          await supabaseQuery(`
            insert into post_assets (post_id, type, url, alt_text, caption, embed_code, position)
            values ('${result[0].id}', '${sanitize(a.type || 'image')}', '${sanitize(a.url)}', 
              ${a.alt_text ? `'${sanitize(a.alt_text)}'` : 'null'},
              ${a.caption ? `'${sanitize(a.caption)}'` : 'null'},
              ${a.embed_code ? `'${sanitize(a.embed_code)}'` : 'null'},
              ${i})
          `);
        }
      }
      
      console.log(`[PUBLISH] Article "${title}" → /news/${slug}`);
      return json(req, res, { success: true, slug, id: result?.[0]?.id, url: `/news/${slug}` });
    }

    if (url.pathname === '/api/fantasy/rescore') {
      scoreFantasy();
      return json(req, res, { started: true, note: 'Fantasy scoring run started in background' });
    }

    if (url.pathname === '/api/reports/generate') {
      generateMatchReports();
      return json(req, res, { started: true, note: 'Report generation started in background' });
    }

    error(req, res, 404, 'Not found');
  } catch (err) {
    console.error('Request error:', err);
    error(req, res, 500, err.message || 'Internal error');
  }
});

// ─── Startup budget log (item 4) ────────────────────────────────────────────
// Estimates the daily upstream call volume implied by the polling schedule and
// compares it to the 7,500/day API-Football cap. This is the single most useful
// dial after the refactor: if the estimate creeps toward the cap, widen the poll
// intervals (HOMEPAGE_POLL_MS / LIVE_DETAIL_POLL_MS) or lower MAX_LIVE_DETAIL.
// Numbers are steady-state estimates assuming pollers run all day; in reality the
// circuit breaker pauses background jobs below the reserve, and the live pollers
// only spend calls while matches are actually live, so real usage is lower.
const DAILY_CAP = 7500;
function logQuotaBudget() {
  const runsPerDay = (intervalMs) => 86400000 / intervalMs;
  // The live-detail poller and the homepage live call only spend on matches while
  // they're actually in play. Model a realistic number of "live hours" per day
  // rather than pretending matches run 24h. ~3 simultaneously *viewed* live matches
  // is a sane average for this audience; the hard ceiling is MAX_LIVE_DETAIL.
  const LIVE_HOURS_PER_DAY = 8;
  const AVG_VIEWED_LIVE = 3;
  const liveRunsPerDay = (LIVE_HOURS_PER_DAY * 3600000) / LIVE_DETAIL_POLL_MS;

  const lines = [
    ['homepage rebuild', Math.round(runsPerDay(HOMEPAGE_POLL_MS) * 2.5), 'live + today + WC standings (domestic cached 6h)'],
    ['live detail',      Math.round(liveRunsPerDay * AVG_VIEWED_LIVE * 2), `~${AVG_VIEWED_LIVE} viewed live × 2 calls, ~${LIVE_HOURS_PER_DAY}h live/day`],
    ['WC stats warm',    Math.round(runsPerDay(300 * 1000) * 3), 'standings + topscorers + topassists (WC only)'],
    ['WC topstats',      Math.round(runsPerDay(300 * 1000) * 2), 'fixtures list + new finished (rest cached 30d, WC only)'],
    ['match reports',    Math.round(runsPerDay(20 * 60 * 1000) * 3), 'WC + today + yesterday'],
    ['fantasy scoring',  Math.round(runsPerDay(30 * 60 * 1000) * 9), '1 list + up to 8 fixtures/run (WC only)'],
    ['prediction score', Math.round(runsPerDay(5 * 60 * 1000) * 1), 'only unscored finished matches'],
  ];

  let total = 0;
  console.log('───────────────────────────────────────────────────────────');
  console.log(`📊 API BUDGET ESTIMATE (cap ${DAILY_CAP}/day, reset 00:00 UTC)`);
  for (const [name, perDay, note] of lines) {
    total += perDay;
    console.log(`   ${String(perDay).padStart(5)} /day  ${name.padEnd(17)} (${note})`);
  }
  const liveCeiling = Math.round(runsPerDay(LIVE_DETAIL_POLL_MS) * MAX_LIVE_DETAIL * 2);
  console.log('   ─────');
  console.log(`   ${String(total).padStart(5)} /day  ESTIMATED TOTAL  (~${Math.round((total / DAILY_CAP) * 100)}% of cap)`);
  console.log(`   reserve for users: ${QUOTA_RESERVE} (bg pauses below this) | hard floor: ${USER_QUOTA_FLOOR}`);
  console.log(`   live-detail absolute worst case (all ${MAX_LIVE_DETAIL} live & viewed, 24h): ${liveCeiling}/day — capped by circuit breaker`);
  if (total > DAILY_CAP - QUOTA_RESERVE) {
    console.warn(`   ⚠️ estimate exceeds (cap − reserve = ${DAILY_CAP - QUOTA_RESERVE}); widen poll intervals or lower MAX_LIVE_DETAIL.`);
  } else {
    console.log(`   ✅ within budget (cap − reserve = ${DAILY_CAP - QUOTA_RESERVE}).`);
  }
  console.log('───────────────────────────────────────────────────────────');
}

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`LastFootball API running on http://127.0.0.1:${PORT}`);
  console.log(`Cache: ${MAX_ENTRIES} entries | Logos: ${MAX_LOGOS} entries`);
  // Load persisted snapshots FIRST (awaited) so the homepage cache is populated before
  // the first visitor arrives — no cold start, no empty widgets, no API call needed.
  await loadSnapshotsIntoCache();
  // Generate the homepage immediately so even a snapshot-less start is fast.
  buildHomepageData('Asia/Kathmandu').catch(() => {});
  // Dedicated homepage refresh loop — the ONLY thing that rebuilds the homepage
  // aggregate now (user requests are cache-only). Bounds homepage call volume to the
  // poll interval regardless of traffic. Gated so it pauses when the budget is low.
  setInterval(() => {
    if (!backgroundJobsAllowed()) return;
    buildHomepageData('Asia/Kathmandu').catch(() => {});
  }, HOMEPAGE_POLL_MS);
  // Live-detail poller — keeps *viewed* live matches (events+stats+score) fresh on a
  // schedule instead of re-bursting on every view. Starts shortly after boot.
  setTimeout(liveDetailPoller, 30 * 1000);
  setInterval(liveDetailPoller, LIVE_DETAIL_POLL_MS);
  // Backfill score cards for existing reports (once, shortly after boot)
  setTimeout(() => { backfillScoreCards().catch(() => {}); }, 90 * 1000);
  // Start prediction scoring job
  scorePredictions();
  setInterval(scorePredictions, 5 * 60 * 1000); // Every 5 minutes
  // Fantasy points job
  setTimeout(scoreFantasy, 20 * 1000);
  setInterval(scoreFantasy, 30 * 60 * 1000); // Every 30 minutes
  // Match report generation
  setTimeout(generateMatchReports, 35 * 1000);
  setInterval(generateMatchReports, 20 * 60 * 1000); // Every 20 minutes
  // Write the static sitemap file (nginx serves it directly) — on startup + every 30 min
  setTimeout(writeSitemapFile, 50 * 1000);
  setInterval(writeSitemapFile, 30 * 60 * 1000);
  // Prerender article HTML files to dist/news/ (served directly by nginx via try_files)
  setTimeout(writeArticleFiles, 60 * 1000);
  setInterval(writeArticleFiles, 30 * 60 * 1000);
  // Keep World Cup stats cache always warm so the first viewer never sees stale data
  setTimeout(warmWorldCupStats, 10 * 1000);
  setInterval(warmWorldCupStats, 300 * 1000); // Every 5 minutes
  // Compute WC top scorers from real match events (heavier; less frequent)
  setTimeout(async () => { try { const d = await computeWorldCupTopStats(); cacheSet('computed:wc-topstats', d, { fresh: 90, stale: 600 }); } catch {} }, 45 * 1000);
  setInterval(async () => {
    if (!backgroundJobsAllowed()) return;
    try { const d = await computeWorldCupTopStats(); cacheSet('computed:wc-topstats', d, { fresh: 90, stale: 600 }); } catch {}
  }, 5 * 60 * 1000); // Every 5 minutes
  logQuotaBudget();
});

// Compute WC top scorers / assists / cards directly from finished-match player
// stats — available immediately, unlike the upstream topscorers aggregate.
async function computeWorldCupTopStats() {
  try {
    const fx = await fetchUpstream('fixtures', { league: '1', season: '2026', status: 'FT-AET-PEN' });
    const finished = fx?.response || [];
    const players = {}; // id -> aggregated stats

    let fetchedThisRun = 0;
    for (const f of finished.slice(0, 104)) {
      const fid = f.fixture?.id;
      if (!fid) continue;

      // A finished match's player stats NEVER change — cache them permanently
      // (per fixture) so we only ever hit the API once per match. This is the
      // single biggest quota saver: previously every run refetched every match.
      const cacheKey = `fixplayers:${fid}`;
      let stats;
      const cached = cacheGet(cacheKey);
      if (cached) {
        stats = cached.data;
      } else {
        // Limit new fetches per run to avoid a quota spike when many matches finish at once
        if (fetchedThisRun >= 12) continue;
        try {
          stats = await fetchUpstream('fixtures/players', { fixture: String(fid) });
          fetchedThisRun++;
          // Cache for ~30 days — finished match data is immutable
          cacheSet(cacheKey, stats, { fresh: 2592000, stale: 2592000 });
        } catch { continue; }
      }

      for (const t of (stats?.response || [])) {
        const team = { id: t.team?.id, name: t.team?.name, logo: t.team?.logo };
        for (const pl of (t.players || [])) {
          const s = pl.statistics?.[0];
          if (!s) continue;
          const id = pl.player?.id;
          if (!id) continue;
          if (!players[id]) {
            players[id] = {
              player: { id, name: pl.player?.name, photo: pl.player?.photo },
              team, goals: 0, penalties: 0, assists: 0, yellow: 0, red: 0,
            };
          }
          const p = players[id];
          p.goals += s.goals?.total || 0;
          p.penalties += s.penalty?.scored || 0;
          p.assists += s.goals?.assists || 0;
          p.yellow += s.cards?.yellow || 0;
          p.red += s.cards?.red || 0;
          if (team?.id) p.team = team;
        }
      }
    }

    const list = Object.values(players);
    const rankBy = (key, min = 1) => list
      .filter(p => p[key] >= min)
      .sort((a, b) => b[key] - a[key] || a.player.name.localeCompare(b.player.name))
      .slice(0, 25);

    return {
      topscorers: rankBy('goals'),
      topassists: rankBy('assists'),
      topyellowcards: rankBy('yellow'),
      topredcards: rankBy('red'),
      computedAt: new Date().toISOString(),
    };
  } catch (e) {
    console.error('[WC-STATS] compute error:', e.message);
    return { topscorers: [], topassists: [], topyellowcards: [], topredcards: [], computedAt: null };
  }
}

// ─── Match-detail aggregate ─────────────────────────────────────────────────
// Builds the full /api/match payload (fixture + events + stats + lineups + players)
// with ONE upstream burst, then caches it. Used by the /api/match route on a cache
// miss and by the live-detail poller for the first warm of a match. The cache TTL is
// long enough for live matches that the entry survives between poll runs (so the
// poller keeps treating it as "viewed" and refreshing it); finished matches are
// cached ~30 days since their data is immutable.
async function fetchMatchAggregate(fixtureId) {
  const cacheKey = `agg_match_${fixtureId}`;
  const [fixture, events, stats, lineups, players] = await Promise.allSettled([
    fetchUpstream('fixtures', { id: String(fixtureId) }),
    fetchUpstream('fixtures/events', { fixture: String(fixtureId) }),
    fetchUpstream('fixtures/statistics', { fixture: String(fixtureId) }),
    fetchUpstream('fixtures/lineups', { fixture: String(fixtureId) }),
    fetchUpstream('fixtures/players', { fixture: String(fixtureId) }),
  ]);
  const result = {
    fixture: fixture.status === 'fulfilled' ? fixture.value : [],
    events: events.status === 'fulfilled' ? events.value : [],
    stats: stats.status === 'fulfilled' ? stats.value : [],
    lineups: lineups.status === 'fulfilled' ? lineups.value : [],
    players: players.status === 'fulfilled' ? players.value : [],
  };
  const statusShort = result.fixture?.response?.[0]?.fixture?.status?.short;
  const isLive = isLiveStatus(statusShort);
  const FINISHED_TTL = { fresh: 2592000, stale: 2592000 }; // ~30d — immutable
  // Live: keep fresh a little longer than the poll interval so the entry stays in
  // cache between runs and the poller keeps it warm.
  const liveSecs = Math.ceil(LIVE_DETAIL_POLL_MS / 1000);
  const LIVE_TTL = { fresh: liveSecs, stale: liveSecs * 2 };
  cacheSet(cacheKey, result, isLive ? LIVE_TTL : FINISHED_TTL);
  return result;
}

// Background live-detail poller. Refreshes the score (from the already-fetched live
// list — free), events, and stats for live matches that a user has actually viewed
// (i.e. have an agg_match_* cache entry), capped at MAX_LIVE_DETAIL. This replaces
// the old behaviour where every viewer of a live match re-triggered a 5-call burst
// every ~30s; now call volume is bounded to (viewed live matches × 2) per run.
async function liveDetailPoller() {
  if (!backgroundJobsAllowed()) return; // yields to the reserve when budget is low
  try {
    // Live fixture list comes from the homepage poll's cached `fixtures?live=all`.
    const tz = 'Asia/Kathmandu';
    const liveKey = 'fixtures?live=all&timezone=' + tz;
    let liveResp = cacheGet(liveKey)?.data || lastGood.get(liveKey)?.data;
    // Fallback: pull the live array out of the homepage snapshot aggregate.
    if (!liveResp) {
      const agg = cacheGet('agg_homepage:' + tz)?.data || lastGood.get('agg_homepage:' + tz)?.data;
      liveResp = agg?.live;
    }
    const liveList = liveResp?.response || [];
    if (!liveList.length) return;

    // Only refresh matches that are BOTH live AND already cached (viewed at least
    // once). We never pre-warm matches nobody is looking at.
    const candidates = [];
    for (const f of liveList) {
      const fid = f?.fixture?.id;
      if (!fid) continue;
      if (!isLiveStatus(f?.fixture?.status?.short)) continue;
      if (!cacheGet(`agg_match_${fid}`) && !lastGood.get(`agg_match_${fid}`)) continue;
      candidates.push({ fid, live: f });
      if (candidates.length >= MAX_LIVE_DETAIL) break;
    }
    if (!candidates.length) return;

    const liveSecs = Math.ceil(LIVE_DETAIL_POLL_MS / 1000);
    const LIVE_TTL = { fresh: liveSecs, stale: liveSecs * 2 };

    for (const { fid, live } of candidates) {
      if (!backgroundJobsAllowed()) break; // re-check between matches
      const cacheKey = `agg_match_${fid}`;
      const prev = cacheGet(cacheKey)?.data || lastGood.get(cacheKey)?.data || {};
      try {
        // Two calls per live match: the moving parts. Lineups/players (heavier and
        // far more stable mid-match) are kept from the first full aggregate; the
        // score/status comes from the live-list object we already have (free).
        const [events, stats] = await Promise.allSettled([
          fetchUpstream('fixtures/events', { fixture: String(fid) }),
          fetchUpstream('fixtures/statistics', { fixture: String(fid) }),
        ]);
        // Splice the fresh live fixture object into the existing fixture payload so
        // the detail page shows the current score without a separate fixtures?id call.
        let fixturePayload = prev.fixture;
        if (fixturePayload?.response?.[0]) {
          fixturePayload = { ...fixturePayload, response: [{ ...fixturePayload.response[0], ...live }] };
        } else {
          fixturePayload = { get: 'fixtures', parameters: { id: String(fid) }, response: [live] };
        }
        const merged = {
          fixture: fixturePayload,
          events: events.status === 'fulfilled' ? events.value : (prev.events || []),
          stats: stats.status === 'fulfilled' ? stats.value : (prev.stats || []),
          lineups: prev.lineups || [],
          players: prev.players || [],
        };
        cacheSet(cacheKey, merged, LIVE_TTL);
      } catch {
        // leave the previous cached aggregate in place on failure
      }
    }
  } catch (e) {
    console.error('liveDetailPoller error:', e.message);
  }
}

// Build the aggregated homepage payload for a given timezone (cached + warmable).
async function buildHomepageData(tz) {
  const cacheKey = 'agg_homepage:' + tz;
  let today;
  try {
    today = new Date(new Date().toLocaleString('en-US', { timeZone: tz })).toLocaleDateString('en-CA');
  } catch {
    today = new Date().toLocaleDateString('en-CA');
  }
  const leagues = [
    { id: 39, name: 'Premier League', season: '2025' },
    { id: 140, name: 'La Liga', season: '2025' },
    { id: 135, name: 'Serie A', season: '2025' },
    { id: 78, name: 'Bundesliga', season: '2025' },
    { id: 61, name: 'Ligue 1', season: '2025' },
  ];

  let wcActive = false, wcStandings = null;
  try {
    const ws = await cachedUpstream('standings', { league: '1', season: '2026' });
    const blocks = ws?.response?.[0]?.league?.standings;
    if (blocks && blocks.length) { wcActive = true; wcStandings = ws; }
  } catch {}

  // Domestic league scorers/standings barely change and aren't even shown during
  // the WC — cache them for 6h so warming doesn't refetch them every few minutes.
  const domesticTtl = { fresh: 21600, stale: 43200 };

  // Live fixtures: this runs only from background pollers now (the user homepage
  // route never triggers a build), so its frequency is bounded by HOMEPAGE_POLL_MS.
  // Cache fresh for ~the poll interval when matches are live; longer when idle.
  const liveKey = 'fixtures?live=all&timezone=' + tz;
  let liveData;
  const liveHit = cacheGet(liveKey);
  if (liveHit) {
    liveData = liveHit.data;
  } else if (!userFetchAllowed()) {
    // Out of budget — reuse the last known live list rather than spending a call.
    liveData = lastGood.get(liveKey)?.data || { response: [] };
  } else {
    try {
      liveData = await fetchUpstream('fixtures', { live: 'all', timezone: tz });
      const hasLive = (liveData?.response || []).length > 0;
      const liveSecs = Math.ceil(HOMEPAGE_POLL_MS / 1000);
      cacheSet(liveKey, liveData, hasLive ? { fresh: liveSecs, stale: liveSecs } : { fresh: 300, stale: 600 });
    } catch { liveData = lastGood.get(liveKey)?.data || { response: [] }; }
  }

  const [todayMatches, ...rest] = await Promise.allSettled([
    cachedUpstream('fixtures', { date: today, timezone: tz }, { fresh: 60, stale: 300 }),
    ...leagues.map(l => cachedUpstream('players/topscorers', { league: String(l.id), season: l.season }, domesticTtl)),
    ...leagues.map(l => cachedUpstream('standings', { league: String(l.id), season: l.season }, domesticTtl)),
  ]);
  const live = { status: 'fulfilled', value: liveData };

  const result = {
    live: live.status === 'fulfilled' ? live.value : [],
    today: todayMatches.status === 'fulfilled' ? todayMatches.value : [],
    scorers: {},
    standings: {},
    worldCupActive: wcActive,
    wcScorers: null,
    wcStandings: wcActive ? wcStandings : null,
  };

  if (wcActive) {
    try {
      let computed = cacheGet('computed:wc-topstats');
      if (!computed) {
        const d = await computeWorldCupTopStats();
        cacheSet('computed:wc-topstats', d, { fresh: 90, stale: 600 });
        computed = { data: d };
      }
      result.wcScorers = computed.data?.topscorers || [];
    } catch {}
  }

  leagues.forEach((l, i) => {
    const scorerRes = rest[i];
    const standRes = rest[i + leagues.length];
    if (scorerRes?.status === 'fulfilled') result.scorers[l.id] = scorerRes.value;
    if (standRes?.status === 'fulfilled') result.standings[l.id] = standRes.value;
  });

  cacheSet(cacheKey, result, { fresh: 60, stale: 300 });
  // Persist a snapshot so a server restart can serve instant data with no API call.
  // Only snapshot if we actually got meaningful data (avoid storing empties).
  if (result.worldCupActive || (result.live?.response?.length) || (result.today?.response?.length)) {
    saveSnapshot(cacheKey, result);
  }
  return result;
}

// ─── Persistent snapshots (survive restarts, zero API cost) ─────────────────
let _snapshotDebounce = {};
function saveSnapshot(key, data) {
  // Debounce writes per key to avoid hammering the DB (max once per 60s per key)
  const now = Date.now();
  if (_snapshotDebounce[key] && now - _snapshotDebounce[key] < 60000) return;
  _snapshotDebounce[key] = now;
  const SVC = process.env.SUPABASE_SERVICE_KEY || SUPABASE_KEY;
  const body = { key, data, updated_at: new Date().toISOString() };
  supabaseQueryWithKey('cache_snapshots', 'on_conflict=key', 'POST', body, SVC)
    .catch(e => console.error('[SNAPSHOT] save error:', e.message));
}

async function loadSnapshotsIntoCache() {
  try {
    const SVC = process.env.SUPABASE_SERVICE_KEY || SUPABASE_KEY;
    const rows = await supabaseQueryWithKey('cache_snapshots', 'select=key,data,updated_at', 'GET', null, SVC);
    if (Array.isArray(rows)) {
      for (const r of rows) {
        if (!r.key || !r.data) continue;
        // Seed both the TTL cache (short fresh, so it refreshes soon) and lastGood
        cache.set(r.key, {
          data: r.data,
          fetchedAt: Date.now(),
          freshUntil: Date.now() + 30 * 1000,   // treat as slightly stale → triggers bg refresh
          staleUntil: Date.now() + 3600 * 1000, // but usable for an hour
        });
        lastGood.set(r.key, { data: r.data, savedAt: Date.parse(r.updated_at) || Date.now() });
      }
      console.log(`[SNAPSHOT] Loaded ${rows.length} snapshot(s) into cache on startup`);
    }
  } catch (e) {
    console.error('[SNAPSHOT] load error:', e.message);
  }
}

// Proactively refresh WC standings + top scorers so the cache is always fresh.
// Quota-aware: backs off if the daily API budget is running low.
async function warmWorldCupStats() {
  if (!backgroundJobsAllowed()) return;
  const targets = [
    { endpoint: 'standings', params: { league: '1', season: '2026' } },
    { endpoint: 'players/topscorers', params: { league: '1', season: '2026' } },
    { endpoint: 'players/topassists', params: { league: '1', season: '2026' } },
  ];
  for (const t of targets) {
    try {
      const sortedKeys = Object.keys(t.params).sort();
      const cacheKey = t.endpoint + '?' + sortedKeys.map(k => k + '=' + t.params[k]).join('&');
      const ttl = getTtl(t.endpoint, t.params);
      const data = await fetchUpstream(t.endpoint, t.params);
      cacheSet(cacheKey, data, ttl);
    } catch (e) {
      // ignore individual failures (quota, transient)
    }
  }
  // NOTE: the homepage aggregate is rebuilt by its own dedicated background loop
  // (HOMEPAGE_POLL_MS) — we deliberately don't call buildHomepageData here too, to
  // avoid double-spending live/today calls. The fresh WC standings/scorers warmed
  // above are picked up by that loop on its next run (cache-first).
}

// ─── Fantasy Points Engine (FPL-style) ──────────────────────────────────────
// Scores finished WC fixtures from real player stats, applies to fantasy squads.
async function scoreFantasy() {
  if (!backgroundJobsAllowed()) return;
  try {
    const SVC = process.env.SUPABASE_SERVICE_KEY || SUPABASE_KEY;

    // 1. All finished WC 2026 fixtures
    const fx = await fetchUpstream('fixtures', { league: '1', season: '2026', status: 'FT-AET-PEN' });
    const finished = fx?.response || [];
    if (!finished.length) return;

    // 2. Skip already-scored fixtures
    const done = await supabaseQueryWithKey('fantasy_scored_fixtures', 'select=fixture_id', 'GET', null, SVC);
    const doneSet = new Set((Array.isArray(done) ? done : []).map(r => r.fixture_id));
    const todo = finished.filter(f => f.fixture?.id && !doneSet.has(f.fixture.id)).slice(0, 8); // cap per run (API quota)
    if (!todo.length) return;

    for (const f of todo) {
      const fid = f.fixture.id;
      try {
        const stats = await fetchUpstream('fixtures/players', { fixture: String(fid) });
        const teams = stats?.response || [];
        if (teams.length < 2) continue;

        const goals = { [f.teams.home.id]: f.goals?.home ?? 0, [f.teams.away.id]: f.goals?.away ?? 0 };
        const pointsByPlayer = {};

        for (const t of teams) {
          const teamId = t.team.id;
          const oppGoals = Object.entries(goals).find(([id]) => Number(id) !== teamId)?.[1] ?? 0;
          for (const pl of t.players || []) {
            const s = pl.statistics?.[0];
            if (!s) continue;
            const mins = s.games?.minutes || 0;
            if (mins <= 0) continue;
            const posRaw = (s.games?.position || 'M').toUpperCase();
            const pos = posRaw.startsWith('G') ? 'GK' : posRaw.startsWith('D') ? 'DEF' : posRaw.startsWith('M') ? 'MID' : 'FWD';

            let pts = mins >= 60 ? 2 : 1;                                              // appearance
            const g = s.goals?.total || 0;
            pts += g * (pos === 'GK' ? 10 : pos === 'DEF' ? 6 : pos === 'MID' ? 5 : 4); // goals
            pts += (s.goals?.assists || 0) * 3;                                          // assists
            if (mins >= 60 && oppGoals === 0 && (pos === 'GK' || pos === 'DEF')) pts += 4; // clean sheet
            if (mins >= 60 && oppGoals === 0 && pos === 'MID') pts += 1;
            if (pos === 'GK' || pos === 'DEF') pts -= Math.floor(oppGoals / 2);          // goals conceded
            pts -= (s.cards?.yellow || 0);                                               // yellow -1
            pts -= (s.cards?.red || 0) * 3;                                              // red -3
            if (pos === 'GK') pts += Math.floor((s.goals?.saves || 0) / 3);              // saves
            pts -= (s.penalty?.missed || 0) * 2;                                         // pen miss

            pointsByPlayer[pl.player.id] = (pointsByPlayer[pl.player.id] || 0) + pts;
          }
        }

        // 3. Apply to every fantasy squad holding these players (captain = x2)
        let applied = 0;
        for (const pid of Object.keys(pointsByPlayer)) {
          const rows = await supabaseQueryWithKey('fantasy_squad', `player_id=eq.${pid}&select=id,points,is_captain`, 'GET', null, SVC);
          for (const r of (Array.isArray(rows) ? rows : [])) {
            const mult = r.is_captain ? 2 : 1;
            await supabaseQueryWithKey('fantasy_squad', `id=eq.${r.id}`, 'PATCH', { points: (r.points || 0) + pointsByPlayer[pid] * mult }, SVC);
            applied++;
          }
        }

        // 4. Mark fixture scored
        await supabaseQueryWithKey('fantasy_scored_fixtures', '', 'POST', { fixture_id: fid }, SVC);
        console.log(`[FANTASY] Scored fixture ${fid} (${f.teams.home.name} ${f.goals?.home}-${f.goals?.away} ${f.teams.away.name}): ${Object.keys(pointsByPlayer).length} players, ${applied} squad rows`);
      } catch (e) {
        console.error(`[FANTASY] fixture ${fid} failed:`, e.message);
      }
    }

    // 5. Recompute team totals (starters only)
    const all = await supabaseQueryWithKey('fantasy_squad', 'select=team_id,points,is_starting', 'GET', null, SVC);
    const byTeam = {};
    for (const r of (Array.isArray(all) ? all : [])) {
      if (r.is_starting && r.team_id) byTeam[r.team_id] = (byTeam[r.team_id] || 0) + (r.points || 0);
    }
    for (const [tid, pts] of Object.entries(byTeam)) {
      await supabaseQueryWithKey('fantasy_teams', `id=eq.${tid}`, 'PATCH', { total_points: pts, updated_at: new Date().toISOString() }, SVC);
    }
  } catch (e) {
    console.error('[FANTASY] scoring error:', e.message);
  }
}

// ─── Match Report Generator (saves finished matches to posts table) ─────────
const REPORT_LEAGUE_IDS = new Set([
  1,        // World Cup
  2, 3, 848,// UCL, UEL, Conference
  39, 140, 135, 78, 61, // top 5
  45, 48, 143, 137, 81, 66, // major domestic cups
  4, 5, 9, 6, 13,           // Euro, Nations League, Copa America, AFCON, Libertadores
]);

function reportSlugify(t) {
  return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 90);
}

// Pull a clean stat value from a fixtures/statistics team block
function statVal(teamStats, type) {
  if (!teamStats?.statistics) return null;
  const row = teamStats.statistics.find(s => s.type === type);
  if (!row) return null;
  let v = row.value;
  if (v === null || v === undefined) return null;
  if (typeof v === 'string' && v.includes('%')) return parseInt(v);
  return v;
}

const VAR = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Build a premium, data-driven match report applying journalistic translation rules.
// Resolve the TRUE outcome of a finished match, accounting for knockout ties that
// go to extra time or penalties. API-Football keeps `goals` as the score after 90
// (and after ET), so a penalty shootout leaves goals level (e.g. 1-1) even though a
// winner exists. The decisive info lives in status.short (AET/PEN), score.penalty,
// and teams.*.winner. Returns the side that actually advanced.
function decideMatch(f) {
  const st = f.fixture?.status?.short;                 // FT | AET | PEN
  const hs = f.goals?.home, as_ = f.goals?.away;       // score incl. ET, excl. pens
  const ph = f.score?.penalty?.home, pa = f.score?.penalty?.away;
  const wentPens = st === 'PEN' || (ph != null && pa != null);
  const wentAET = st === 'AET' || st === 'PEN';        // PEN implies ET was played
  let winnerSide = null;                               // 'home' | 'away' | null (true draw)
  if (f.teams?.home?.winner === true) winnerSide = 'home';
  else if (f.teams?.away?.winner === true) winnerSide = 'away';
  else if (wentPens && ph != null && pa != null && ph !== pa) winnerSide = ph > pa ? 'home' : 'away';
  else if (hs != null && as_ != null && hs !== as_) winnerSide = hs > as_ ? 'home' : 'away';
  return {
    statusShort: st, hs, as_, penHome: ph, penAway: pa,
    wentPens, wentAET, winnerSide,
    isDraw: winnerSide === null,                       // only a draw if nobody advanced
  };
}

async function buildPremiumReport(f) {
  const home = f.teams?.home?.name, away = f.teams?.away?.name;
  const hs = f.goals?.home, as_ = f.goals?.away;
  if (hs === null || as_ === null || !home || !away) return null;
  const fid = f.fixture?.id;
  const comp = f.league?.name || 'the match';
  const round = f.league?.round || '';
  const D = decideMatch(f);
  const isDraw = D.isDraw;
  const homeWon = D.winnerSide === 'home';
  const winner = homeWon ? home : away, loser = homeWon ? away : home;
  const winScore = homeWon ? hs : as_, loseScore = homeWon ? as_ : hs;
  const wentPens = D.wentPens, wentAET = D.wentAET;
  const penWin = homeWon ? D.penHome : D.penAway, penLose = homeWon ? D.penAway : D.penHome;
  // suffix for winner-context prose, e.g. " on penalties (4-3)" / " after extra time"
  const decisionTag = wentPens ? ` on penalties (${penWin}-${penLose})` : (wentAET ? ' after extra time' : '');
  const margin = Math.abs(hs - as_), total = hs + as_;
  const date = f.fixture?.date ? new Date(f.fixture.date).toISOString() : new Date().toISOString();
  const venue = f.fixture?.venue?.name ? `${f.fixture.venue.name}${f.fixture.venue.city ? ', ' + f.fixture.venue.city : ''}` : null;

  // Events + statistics for a finished match are immutable — cache permanently per fixture.
  let events = [], statsResp = [];
  const evKey = `fixevents:${fid}`, stKey = `fixstats:${fid}`;
  const evCached = cacheGet(evKey);
  if (evCached) { events = evCached.data; }
  else { try { const e = await fetchUpstream('fixtures/events', { fixture: String(fid) }); events = e?.response || []; cacheSet(evKey, events, { fresh: 2592000, stale: 2592000 }); } catch {} }
  const stCached = cacheGet(stKey);
  if (stCached) { statsResp = stCached.data; }
  else { try { const s = await fetchUpstream('fixtures/statistics', { fixture: String(fid) }); statsResp = s?.response || []; cacheSet(stKey, statsResp, { fresh: 2592000, stale: 2592000 }); } catch {} }

  const homeId = f.teams?.home?.id, awayId = f.teams?.away?.id;
  const hStat = statsResp.find(s => s.team?.id === homeId);
  const aStat = statsResp.find(s => s.team?.id === awayId);

  const S = (block, label) => {
    const map = {
      possession: 'Ball Possession', shots: 'Total Shots', sot: 'Shots on Goal',
      corners: 'Corner Kicks', fouls: 'Fouls', passAcc: 'Passes %', saves: 'Goalkeeper Saves',
    };
    return statVal(block, map[label]);
  };
  const hPoss = S(hStat, 'possession'), aPoss = S(aStat, 'possession');
  const hShots = S(hStat, 'shots'), aShots = S(aStat, 'shots');
  const hSot = S(hStat, 'sot'), aSot = S(aStat, 'sot');
  const hCorners = S(hStat, 'corners'), aCorners = S(aStat, 'corners');
  const hFouls = S(hStat, 'fouls'), aFouls = S(aStat, 'fouls');
  const hPass = S(hStat, 'passAcc'), aPass = S(aStat, 'passAcc');

  // ── Goal scorers + types from events ──
  const goals = events.filter(e => e.type === 'Goal');
  const scorerMap = {}; // "name|team" -> { name, team, count, penalty, own }
  for (const g of goals) {
    const nm = g.player?.name || 'Unknown';
    const tm = g.team?.id === homeId ? 'home' : 'away';
    const key = nm + '|' + tm;
    if (!scorerMap[key]) scorerMap[key] = { name: nm, team: tm, count: 0, penalty: 0, own: 0, minutes: [] };
    scorerMap[key].count++;
    if (g.detail === 'Penalty') scorerMap[key].penalty++;
    if (g.detail === 'Own Goal') scorerMap[key].own++;
    if (g.time?.elapsed) scorerMap[key].minutes.push(g.time.elapsed + (g.time.extra || 0));
  }
  const scorers = Object.values(scorerMap);
  // Sanity guard: a player cannot score more goals than their team's final total.
  // The events feed can contain duplicates, VAR-overturned entries, or mislabeled
  // rows that inflate a scorer's count (e.g. a "hat-trick" in a 2-0 game). Clamp each
  // scorer's count to the team total so milestones (brace/hat-trick) are never overstated.
  for (const s of scorers) {
    const teamTotal = s.team === 'home' ? hs : as_;
    if (typeof teamTotal === 'number' && s.count > teamTotal) s.count = teamTotal;
  }
  const teamScorers = (side) => scorers.filter(s => s.team === side);

  // Describe a scorer with milestone translation
  const describeScorer = (s) => {
    const last = s.name.split(' ').slice(-1)[0];
    let phrase = last;
    if (s.own > 0 && s.count === s.own) return `an unfortunate own goal from ${last}`;
    if (s.count >= 3) phrase = `a stunning hat-trick from ${last}`;
    else if (s.count === 2) phrase = `a clinical brace from ${last}`;
    else {
      if (s.penalty > 0) phrase = `${last} from the penalty spot`;
      else phrase = `${last}`;
    }
    return phrase;
  };
  const scorerList = (side) => {
    const list = teamScorers(side).filter(s => s.own === 0);
    if (!list.length) return '';
    const parts = list.map(describeScorer);
    if (parts.length === 1) return parts[0];
    return parts.slice(0, -1).join(', ') + ' and ' + parts.slice(-1);
  };

  // ── TITLE ──
  const hatTrickHero = scorers.find(s => s.count >= 3);
  const braceHero = scorers.find(s => s.count === 2);
  let title;
  if (hatTrickHero) title = `${hatTrickHero.name.split(' ').slice(-1)[0].toUpperCase()} HAT-TRICK FIRES ${winner.toUpperCase()} PAST ${loser.toUpperCase()}`;
  else if (wentPens) title = `${winner.toUpperCase()} BEAT ${loser.toUpperCase()} ON PENALTIES AFTER ${hs}-${as_} DEADLOCK`;
  else if (isDraw && total === 0) title = `${home.toUpperCase()} AND ${away.toUpperCase()} PLAY OUT GOALLESS STALEMATE`;
  else if (isDraw) title = `HONOURS EVEN AS ${home.toUpperCase()} AND ${away.toUpperCase()} SHARE ${total} GOALS`;
  else if (margin >= 3) title = `${winner.toUpperCase()} RUN RIOT IN ${winScore}-${loseScore} ROUT OF ${loser.toUpperCase()}`;
  else if (braceHero && (braceHero.team === (homeWon ? 'home' : 'away'))) title = `${braceHero.name.split(' ').slice(-1)[0].toUpperCase()} BRACE SINKS ${loser.toUpperCase()}`;
  else title = `${winner.toUpperCase()} EDGE ${loser.toUpperCase()} IN ${winScore}-${loseScore} BATTLE`;

  // ── SUBTITLE ──
  let subtitle;
  if (hatTrickHero) subtitle = `${hatTrickHero.name} steals the show with a treble as ${winner} dispatch ${loser} ${winScore}-${loseScore} in the ${comp}.`;
  else if (wentPens) subtitle = `${winner} hold their nerve to beat ${loser} ${penWin}-${penLose} on penalties after a ${hs}-${as_}${wentAET ? ' extra-time' : ''} stalemate in the ${comp}.`;
  else if (isDraw && total === 0) subtitle = `${home} and ${away} cancel each other out in a tense, goalless ${comp} encounter.`;
  else if (isDraw) subtitle = `${home} and ${away} trade blows in an absorbing ${hs}-${as_} draw that leaves the ${comp} group finely poised.`;
  else if (margin >= 3) subtitle = `A ruthless ${winner} dismantle ${loser} ${winScore}-${loseScore}${decisionTag} to lay down a serious marker in the ${comp}.`;
  else subtitle = `${winner} dig deep to overcome a stubborn ${loser} ${winScore}-${loseScore}${decisionTag} in a hard-fought ${comp} clash.`;

  // ── BODY ──
  const paras = [];
  const arc = wentPens
    ? `${winner} ${penWin}-${penLose} ${loser} on penalties. After ${hs}-${as_} could not separate the sides${venue ? ` at ${venue}` : ''}${wentAET ? ' even after extra time' : ''}, it was ${winner} who held their composure from twelve yards to advance in the ${comp}.`
    : isDraw && total === 0
    ? `${VAR(['Stalemate', 'Deadlock', 'A war of attrition'])}. ${home} and ${away} played out a goalless draw${venue ? ` at ${venue}` : ''}, a ${comp} contest that promised much but ultimately produced a cagey, chess-like affair where defensive discipline trumped attacking ambition.`
    : isDraw
    ? `${home} ${hs}-${as_} ${away}. The two sides could not be separated${venue ? ` at ${venue}` : ''} in a ${total >= 4 ? 'breathless, end-to-end' : 'tightly-fought'} ${comp} encounter, the kind of contest that ebbed and flowed and left both benches living on their nerves until the final whistle.`
    : margin >= 3
    ? `${winner} were imperious. A commanding ${winScore}-${loseScore} victory over ${loser}${decisionTag}${venue ? ` at ${venue}` : ''} announced their intentions in this ${comp} campaign, the result rarely in doubt once the floodgates opened.`
    : `${winner} found a way. A hard-earned ${winScore}-${loseScore} win over ${loser}${decisionTag}${venue ? ` at ${venue}` : ''} may not have been pretty, but in tournament football it is results, not aesthetics, that matter — and ${winner} march on.`;
  paras.push(arc + (round ? ` This was a ${round} fixture with real weight attached.` : ''));

  // Attacking analysis
  const att = [];
  const dom = (hPoss != null && aPoss != null) ? (hPoss > aPoss ? 'home' : 'away') : null;
  if (hPoss != null && aPoss != null) {
    const domTeam = dom === 'home' ? home : away, domPoss = dom === 'home' ? hPoss : aPoss;
    const subTeam = dom === 'home' ? away : home, subPoss = dom === 'home' ? aPoss : hPoss;
    att.push(`${domTeam} ${VAR(['dictated the tempo', 'controlled the rhythm', 'monopolised the ball'])} with ${domPoss}% possession, ${subPoss <= 40 ? `leaving ${subTeam} starved of the ball on just ${subPoss}%` : `though ${subTeam} were far from passengers at ${subPoss}%`}.`);
  }
  const winnerSide = homeWon ? 'home' : 'away';
  const wSot = winnerSide === 'home' ? hSot : aSot, wShots = winnerSide === 'home' ? hShots : aShots;
  const sList = scorerList(winnerSide);
  if (!isDraw && total > 0) {
    let goalSentence = `The breakthrough${margin >= 2 ? 's' : ''} ${margin >= 2 ? 'came' : 'arrived'} through ${sList || 'the decisive moments'}`;
    if (hatTrickHero && hatTrickHero.team === winnerSide) goalSentence += ` — a hat-trick hero on the night`;
    else if (braceHero && braceHero.team === winnerSide) goalSentence += `, the brace proving the difference`;
    att.push(goalSentence + '.');
  }
  // Shots-on-target contrast for the winning/dominant side
  if (wSot != null && wShots != null) {
    if (winnerSide && (winnerSide === 'home' ? hs : as_) > 0) {
      const goalsScored = winnerSide === 'home' ? hs : as_;
      if (wSot >= 6 && goalsScored === 1) att.push(`For all their pressure — ${wSot} shots on target — ${winner} had just a solitary goal to show for their dominance, a profligacy they will want to address.`);
      else if (wShots >= 12 && wSot <= 4) att.push(`${winner} were busy without always being precise, firing ${wShots} efforts but testing the keeper only ${wSot} times.`);
    }
  }
  // Loser wasteful
  const loserSide = homeWon ? 'away' : 'home';
  const lSot = loserSide === 'home' ? hSot : aSot;
  const loserGoals = loserSide === 'home' ? hs : as_;
  if (!isDraw && lSot != null && lSot >= 5 && loserGoals === 0) {
    att.push(`${loser} will rue their wastefulness; ${lSot} shots on target yielded nothing, a clinical edge in the final third proving beyond them on the day.`);
  }
  // Corners as territorial pressure
  if (hCorners != null && aCorners != null) {
    const moreC = hCorners > aCorners ? 'home' : 'away';
    const cTeam = moreC === 'home' ? home : away, cVal = moreC === 'home' ? hCorners : aCorners;
    if (cVal >= 7) att.push(`${cTeam} ${VAR(['camped inside the opposition half', 'laid siege to the box'])}, forcing ${cVal} corners as they applied sustained territorial pressure.`);
  }
  if (att.length) paras.push(att.join(' '));
  else paras.push(`In the final third, ${winner === home ? home : winner} carried the greater menace, fashioning the better openings across the ninety minutes.`);

  // Defensive analysis
  const def = [];
  const homeCS = as_ === 0, awayCS = hs === 0;
  if (homeCS || awayCS) {
    const csTeam = homeCS ? home : away;
    def.push(`At the back, ${csTeam} ${VAR(['kept a clean sheet', 'delivered an unblemished defensive display', 'stood firm for a shutout'])}, a platform of defensive solidity that underpinned ${homeCS && homeWon || awayCS && !homeWon ? 'the result' : 'their point'}.`);
  }
  if (hFouls != null && aFouls != null) {
    const moreF = hFouls > aFouls ? 'home' : 'away';
    const fTeam = moreF === 'home' ? home : away, fVal = moreF === 'home' ? hFouls : aFouls;
    if (fVal >= 15) def.push(`${fTeam} adopted a notably physical approach, committing ${fVal} fouls to disrupt the opposition's transition rhythm and break up any momentum.`);
  }
  // GK heroics
  const wSaves = statVal(homeCS ? hStat : awayCS ? aStat : null, 'Goalkeeper Saves');
  if (wSaves != null && wSaves >= 5) {
    const gkTeam = homeCS ? home : away;
    def.push(`The ${gkTeam} goalkeeper was in inspired form, pulling off ${wSaves} saves to repel a sustained barrage and preserve his side's resistance.`);
  }
  if (def.length) paras.push(def.join(' '));

  // Closing
  paras.push(isDraw
    ? `A point apiece leaves the ${comp} picture finely balanced, and both ${home} and ${away} will sense the job is far from done as the tournament unfolds.`
    : `The victory propels ${winner} forward with confidence, while ${loser} are left to regroup and reassess with little time to dwell before their next ${comp} test.`);

  // ── EXPERT SUMMARY (blockquote) ──
  const verdict = isDraw
    ? `> A share of the spoils that flatters neither side and satisfies both only partially. ${dom ? `${dom === 'home' ? home : away} controlled the ball but couldn't convert dominance into victory` : 'The margins were wafer-thin'}, and the ${comp} group remains wide open.`
    : margin >= 3
    ? `> A statement performance. ${winner} blended control with cutting edge to overwhelm ${loser}, and on this evidence they will fancy their chances against anyone left in the ${comp}.`
    : `> A result built on resilience rather than fluency. ${winner} found the moments that mattered; ${loser} will feel they competed but ultimately lacked the ruthlessness that separates the good from the great at this level.`;

  // ── STATS MATRIX ──
  const fmt = (v, pct) => v == null ? '—' : (pct ? v + '%' : String(v));
  const matrix = [
    `| Metric | ${home} | ${away} |`,
    `| :--- | :---: | :---: |`,
    `| Goals | ${hs} | ${as_} |`,
    `| Possession | ${fmt(hPoss, true)} | ${fmt(aPoss, true)} |`,
    `| Total Shots | ${fmt(hShots)} | ${fmt(aShots)} |`,
    `| Shots on Target | ${fmt(hSot)} | ${fmt(aSot)} |`,
    `| Passing Accuracy | ${fmt(hPass, true)} | ${fmt(aPass, true)} |`,
    `| Corners | ${fmt(hCorners)} | ${fmt(aCorners)} |`,
    `| Fouls Committed | ${fmt(hFouls)} | ${fmt(aFouls)} |`,
  ].join('\n');

  const body = [
    paras.join('\n\n'),
    '',
    verdict,
    '',
    '## Match Statistics',
    '',
    matrix,
  ].join('\n');

  const slug = reportSlugify(`${home}-${hs}-${as_}-${away}-${date.slice(0, 10)}`);
  const metaDesc = subtitle.slice(0, 152);
  const tags = ['World Cup 2026', home, away, comp, 'LastFootball', 'Match Report'];
  const imageAlt = `${home} vs ${away} ${comp} match action — final score ${hs}-${as_}`;

  return {
    title, subtitle, body, slug, league: comp, home, away, date,
    metaDesc, tags, imageAlt, isFeatured: f.league?.id === 1,
    // Score + flags + knockout decision — needed by the score card. (These were
    // previously omitted, so the live path passed undefined scores to the card.)
    hs, as_,
    homeLogo: f.teams?.home?.logo, awayLogo: f.teams?.away?.logo,
    statusShort: D.statusShort, penHome: D.penHome, penAway: D.penAway, winnerSide: D.winnerSide,
  };
}

function buildReportFromFixture(f) {
  const home = f.teams?.home?.name, away = f.teams?.away?.name;
  const hs = f.goals?.home, as_ = f.goals?.away;
  if (hs === null || as_ === null || !home || !away) return null;
  const comp = f.league?.name || 'the match';
  const isDraw = hs === as_;
  const homeWon = hs > as_;
  const winner = homeWon ? home : away, loser = homeWon ? away : home;
  const winScore = homeWon ? hs : as_, loseScore = homeWon ? as_ : hs;
  const margin = Math.abs(hs - as_), total = hs + as_;
  const date = f.fixture?.date ? new Date(f.fixture.date).toISOString() : new Date().toISOString();

  // Title
  let title;
  if (isDraw && total === 0) title = `${home} and ${away} play out goalless stalemate`;
  else if (isDraw) title = `${home} and ${away} share the spoils in ${total}-goal draw`;
  else if (margin >= 3) title = `${winner} thrash ${loser} ${winScore}-${loseScore}`;
  else title = `${winner} edge past ${loser} ${winScore}-${loseScore}`;

  // Summary
  let summary;
  if (isDraw && total === 0) summary = `${home} and ${away} were unable to find a breakthrough in a ${comp} encounter that ended goalless.`;
  else if (isDraw) summary = `${home} and ${away} played out an entertaining ${hs}-${as_} draw in the ${comp}.`;
  else if (margin >= 3) summary = `${winner} produced a dominant display to beat ${loser} ${winScore}-${loseScore} in the ${comp}.`;
  else summary = `${winner} claimed a hard-fought ${winScore}-${loseScore} victory over ${loser} in the ${comp}.`;

  // Body paragraphs
  const venue = f.fixture?.venue?.name ? `${f.fixture.venue.name}${f.fixture.venue.city ? ', ' + f.fixture.venue.city : ''}` : null;
  const round = f.league?.round ? `${f.league.round} of the ${comp}` : comp;
  const paras = [];
  if (isDraw && total === 0) {
    paras.push(`${home} and ${away} cancelled each other out in a tightly-contested ${comp} fixture that finished without a goal. Chances were at a premium${venue ? ` at ${venue}` : ''}, and both sides will reflect on a point that does little to settle the picture.`);
  } else if (isDraw) {
    paras.push(`${home} and ${away} could not be separated in a ${total >= 4 ? 'thrilling' : 'competitive'} ${hs}-${as_} draw${venue ? ` at ${venue}` : ''}. Both teams had spells on top across the ${round}, and a share of the points was arguably a fair reflection of an even contest.`);
  } else if (margin >= 3) {
    paras.push(`${winner} were in irresistible form as they swept aside ${loser} ${winScore}-${loseScore}${venue ? ` at ${venue}` : ''}. From early on it was clear which side carried the greater threat, and ${winner} never looked back as they ran out comfortable winners in the ${round}.`);
  } else {
    paras.push(`${winner} dug deep to see off ${loser} ${winScore}-${loseScore} in a closely-fought ${round}${venue ? ` at ${venue}` : ''}. The margin was slender, but ${winner} did enough at the key moments to take all the spoils on the day.`);
  }
  paras.push(isDraw
    ? `The result leaves both ${home} and ${away} with plenty to ponder as the ${comp} continues. Each will feel there was more on offer, and attention now turns quickly to what comes next.`
    : `It was a result that will lift ${winner} and leave ${loser} searching for answers. As the ${comp} rolls on, ${winner} will hope to build on this performance while ${loser} regroup.`);
  paras.push(`Final score: ${home} ${hs}-${as_} ${away}.`);

  const slug = reportSlugify(`${home}-${hs}-${as_}-${away}-${date.slice(0, 10)}`);
  return { title, summary, body: paras.join('\n\n'), slug, league: comp, home, away, hs, as_, date, total, margin, homeLogo: f.teams?.home?.logo || null, awayLogo: f.teams?.away?.logo || null, isFeatured: f.league?.id === 1 };
}

async function generateMatchReports() {
  if (!backgroundJobsAllowed()) return;
  try {
    const SVC = process.env.SUPABASE_SERVICE_KEY || SUPABASE_KEY;
    // Gather recently finished matches from notable leagues
    const finished = [];
    // World Cup first
    const wc = await fetchUpstream('fixtures', { league: '1', season: '2026', status: 'FT-AET-PEN', timezone: 'America/New_York' });
    for (const f of (wc?.response || [])) finished.push(f);
    // Today + yesterday across all leagues, keep only notable ones
    const today = new Date();
    for (let d = 0; d <= 1; d++) {
      const date = new Date(today); date.setDate(date.getDate() - d);
      const ds = date.toISOString().split('T')[0];
      const day = await fetchUpstream('fixtures', { date: ds });
      for (const f of (day?.response || [])) {
        const st = f.fixture?.status?.short;
        if (['FT', 'AET', 'PEN'].includes(st) && REPORT_LEAGUE_IDS.has(f.league?.id) && f.league?.id !== 1) finished.push(f);
      }
    }
    if (!finished.length) return;

    // Process NEWEST matches first — otherwise the 20-item cap is permanently
    // filled by the oldest matches (which already have reports), and newly
    // finished matches never get one.
    finished.sort((a, b) => {
      const da = new Date(a.fixture?.date || 0).getTime();
      const db = new Date(b.fixture?.date || 0).getTime();
      return db - da;
    });

    let created = 0;
    let checked = 0;
    for (const f of finished) {
      if (created >= 15) break;      // cap new reports created per run
      if (checked >= 40) break;       // cap existence-probes per run (quota safety)
      checked++;
      // Skip if a post with this slug already exists (cheap check before fetching stats)
      const home = f.teams?.home?.name, away = f.teams?.away?.name;
      const hs = f.goals?.home, as_ = f.goals?.away;
      if (hs == null || as_ == null || !home || !away) continue;
      const date = f.fixture?.date ? new Date(f.fixture.date).toISOString() : new Date().toISOString();
      const probeSlug = reportSlugify(`${home}-${hs}-${as_}-${away}-${date.slice(0, 10)}`);
      const existing = await supabaseQueryWithKey('posts', `slug=eq.${encodeURIComponent(probeSlug)}&select=id`, 'GET', null, SVC);
      if (Array.isArray(existing) && existing.length) continue;

      const r = await buildPremiumReport(f);
      if (!r) continue;
      // Generate a branded score-card OG image for social sharing
      const cardPath = await writeScoreCard({ slug: r.slug, home: r.home, away: r.away, hs: r.hs, as_: r.as_, league: r.league, date: r.date, homeLogo: r.homeLogo, awayLogo: r.awayLogo, statusShort: r.statusShort, penHome: r.penHome, penAway: r.penAway, winnerSide: r.winnerSide });
      const ogImage = cardPath ? `https://lastfootball.com${cardPath}` : null;
      const jsonLd = generateJsonLd({ type: 'NewsArticle', title: r.title, description: r.subtitle, slug: r.slug, author: 'LastFootball', image: ogImage, published: r.date });
      const row = {
        type: 'NewsArticle', status: 'published',
        title: r.title, slug: r.slug, subtitle: r.subtitle, body: r.body,
        excerpt: r.subtitle, meta_title: `${r.title} | LastFootball`,
        meta_description: r.metaDesc,
        category: 'match-report', league: r.league,
        teams: [r.home, r.away], tags: r.tags,
        featured_image: ogImage,
        featured_image_alt: r.imageAlt,
        author_name: 'LastFootball', json_ld: jsonLd,
        reading_time_mins: Math.max(1, Math.round(r.body.split(/\s+/).length / 200)),
        published_at: r.date,
      };
      const res = await supabaseQueryWithKey('posts', '', 'POST', row, SVC);
      if (Array.isArray(res) || res) created++;
    }
    if (created > 0) {
      console.log(`[REPORTS] Generated ${created} premium match reports`);
      writeSitemapFile(); // keep sitemap fresh with the new reports
      writeArticleFiles(); // prerender the new reports to static HTML for SEO
    }
  } catch (e) {
    console.error('[REPORTS] error:', e.message);
  }
}

// ─── Sitemap builder (used by endpoint + static file writer) ────────────────
// ─── Share kit HTML (copy-paste social posting helper) ──────────────────────
function buildShareKitHtml(posts) {
  const BASE = 'https://lastfootball.com';
  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cards = posts.map((p, i) => {
    const teams = Array.isArray(p.teams) ? p.teams : [];
    const url = `${BASE}/news/${encodeURIComponent(p.slug)}`;
    const img = p.featured_image || `${BASE}/og-image.png`;
    const hashtags = ['#Football', '#WorldCup2026', '#LastFootball',
      ...teams.map(t => '#' + String(t).replace(/[^a-zA-Z0-9]/g, ''))].join(' ');
    // Ready-to-post caption
    const caption = `⚽ ${p.title}\n\n${p.subtitle || ''}\n\nFull match report 👇\n${url}\n\n${hashtags}`;
    const cid = `cap${i}`;
    return `
      <div class="card">
        <img src="${esc(img)}" alt="${esc(p.title)}" loading="lazy" />
        <div class="body">
          <div class="ttl">${esc(p.title)}</div>
          <textarea id="${cid}" readonly>${esc(caption)}</textarea>
          <div class="row">
            <button onclick="cp('${cid}', this)">📋 Copy caption</button>
            <a href="${esc(img)}" download class="btn">⬇ Image</a>
            <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" class="btn">Share dialog</a>
          </div>
        </div>
      </div>`;
  }).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="robots" content="noindex"/>
  <title>LastFootball — Share Kit</title>
  <style>
    body{background:#0d0d0d;color:#eee;font-family:system-ui,Arial,sans-serif;margin:0;padding:16px;}
    h1{font-size:20px;}h1 b{color:#4ade80;}
    .note{color:#888;font-size:13px;margin-bottom:20px;line-height:1.5;}
    .card{background:#161616;border:1px solid #262626;border-radius:14px;overflow:hidden;margin-bottom:18px;max-width:620px;}
    .card img{width:100%;display:block;}
    .body{padding:14px;}
    .ttl{font-weight:800;margin-bottom:10px;font-size:15px;}
    textarea{width:100%;box-sizing:border-box;height:120px;background:#0d0d0d;color:#ddd;border:1px solid #333;border-radius:8px;padding:10px;font-size:13px;resize:vertical;font-family:inherit;}
    .row{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;}
    button,.btn{background:#4ade80;color:#0d0d0d;border:none;border-radius:8px;padding:9px 14px;font-weight:700;cursor:pointer;text-decoration:none;font-size:13px;display:inline-block;}
    .btn{background:#222;color:#4ade80;border:1px solid #333;}
  </style></head><body>
  <h1>Last<b>Football</b> — Share Kit</h1>
  <p class="note">Ready-to-post captions + branded score cards for your latest match reports.<br/>
  <b>To post on Facebook:</b> tap "Copy caption", tap "⬇ Image" to save the card, then create a Facebook post — paste the caption and attach the image. The link preview will also show the card automatically.</p>
  ${cards || '<p class="note">No published match reports yet.</p>'}
  <script>
    function cp(id, btn){
      var t=document.getElementById(id); t.select(); t.setSelectionRange(0,99999);
      navigator.clipboard.writeText(t.value).then(function(){
        var o=btn.textContent; btn.textContent='✓ Copied!'; setTimeout(function(){btn.textContent=o;},1500);
      });
    }
  </script></body></html>`;
}

// ─── Server-side prerender for SEO ──────────────────────────────────────────
let _spaShellCache = null;
function getSpaShell() {
  if (_spaShellCache) return _spaShellCache;
  const here = path.dirname(new URL(import.meta.url).pathname);
  const candidates = [
    path.resolve(here, '..', 'dist', 'index.html'),
    '/var/www/lastfootball/dist/index.html',
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) { _spaShellCache = fs.readFileSync(p, 'utf8'); return _spaShellCache; }
    } catch {}
  }
  return null;
}

function serveSpaShell(req, res) {
  const shell = getSpaShell();
  if (shell) {
    res.writeHead(200, { ...getCorsHeaders(req), 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    return res.end(shell);
  }
  res.writeHead(404, getCorsHeaders(req));
  return res.end('Not found');
}

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Minimal, safe markdown → HTML for prerendered article body (crawler-visible).
function mdToHtmlServer(md) {
  if (!md) return '';
  const lines = md.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Tables
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const header = line.trim().replace(/^\||\|$/g, '').split('|').map(c => escapeHtml(c.trim()));
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|').map(c => escapeHtml(c.trim())));
        i++;
      }
      out.push('<table><thead><tr>' + header.map(h => `<th>${h}</th>`).join('') + '</tr></thead><tbody>' +
        rows.map(r => '<tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>').join('') + '</tbody></table>');
      continue;
    }
    if (/^### /.test(line)) { out.push(`<h3>${escapeHtml(line.slice(4))}</h3>`); i++; continue; }
    if (/^## /.test(line)) { out.push(`<h2>${escapeHtml(line.slice(3))}</h2>`); i++; continue; }
    if (/^# /.test(line)) { out.push(`<h1>${escapeHtml(line.slice(2))}</h1>`); i++; continue; }
    if (/^> /.test(line)) { out.push(`<blockquote>${escapeHtml(line.slice(2))}</blockquote>`); i++; continue; }
    if (line.trim() === '') { i++; continue; }
    // Paragraph with simple bold/italic
    let p = escapeHtml(line)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
    out.push(`<p>${p}</p>`);
    i++;
  }
  return out.join('\n');
}

// Build a fully prerendered HTML page for a published article (match report etc.)
async function prerenderArticle(slug) {
  // Fetch the post (cached briefly to avoid DB hit per crawl)
  const cacheKey = 'prerender:' + slug;
  const hit = cacheGet(cacheKey);
  if (hit) return hit.data;

  const rows = await supabaseQueryWithKey('posts',
    `slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=title,subtitle,meta_description,body,league,teams,featured_image,featured_image_alt,published_at,json_ld,author_name&limit=1`,
    'GET', null, process.env.SUPABASE_SERVICE_KEY || SUPABASE_KEY);
  if (!Array.isArray(rows) || !rows.length) return null;
  const post = rows[0];

  const shell = getSpaShell();
  if (!shell) return null;

  const BASE = 'https://lastfootball.com';
  const url = `${BASE}/news/${encodeURIComponent(slug)}`;
  const title = escapeHtml(post.title || 'Match Report');
  const desc = escapeHtml((post.meta_description || post.subtitle || '').slice(0, 200));
  const image = post.featured_image || `${BASE}/og-image.png`;
  const imageAlt = escapeHtml(post.featured_image_alt || post.title || '');
  const published = post.published_at || new Date().toISOString();
  const pageTitle = `${title} | LastFootball`;

  // Build the crawler-visible content block
  const bodyHtml = mdToHtmlServer(post.body || '');
  const subtitleHtml = post.subtitle ? `<p class="article-subtitle"><em>${escapeHtml(post.subtitle)}</em></p>` : '';
  const teamsLine = Array.isArray(post.teams) && post.teams.length
    ? `<p class="article-teams">${escapeHtml(post.teams.join(' vs '))}${post.league ? ' — ' + escapeHtml(post.league) : ''}</p>` : '';
  const contentBlock = `
    <article class="prerendered-article">
      <h1>${title}</h1>
      ${subtitleHtml}
      ${teamsLine}
      <div class="article-body">${bodyHtml}</div>
    </article>`;

  // JSON-LD: prefer stored, else build a NewsArticle
  let jsonLd = post.json_ld;
  if (!jsonLd) {
    jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: post.title,
      description: post.meta_description || post.subtitle,
      datePublished: published,
      author: { '@type': 'Organization', name: post.author_name || 'LastFootball' },
      publisher: { '@type': 'Organization', name: 'LastFootball', logo: { '@type': 'ImageObject', url: `${BASE}/favicon.svg` } },
      mainEntityOfPage: url,
    };
  }
  const jsonLdScript = `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;

  // Inject into the shell: replace <title>, description, canonical, OG/Twitter, add article JSON-LD,
  // and place the content block inside #root so crawlers see it (React replaces it on hydration).
  let html = shell;

  // Title
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(pageTitle)}</title>`);
  // Description meta
  html = html.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${desc}" />`);
  // Canonical
  if (/<link rel="canonical"/.test(html)) {
    html = html.replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}" />`);
  } else {
    html = html.replace('</head>', `  <link rel="canonical" href="${url}" />\n</head>`);
  }
  // OG tags
  html = html
    .replace(/<meta property="og:type"[^>]*>/, `<meta property="og:type" content="article" />`)
    .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}" />`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${title}" />`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${desc}" />`)
    .replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${escapeHtml(image)}" />`)
    .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${title}" />`)
    .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${desc}" />`)
    .replace(/<meta name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${escapeHtml(image)}" />`);
  // Article JSON-LD (append before </head>)
  html = html.replace('</head>', `  ${jsonLdScript}\n</head>`);
  // Inject content into #root (crawler sees it; React hydration replaces it)
  html = html.replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${contentBlock}</div>`);

  cacheSet(cacheKey, html, { fresh: 300, stale: 1800 });
  return html;
}

async function buildSitemapXml() {
  const BASE = 'https://lastfootball.com';
  const today = new Date().toISOString().split('T')[0];
  const staticPages = [
    { loc: '/', freq: 'always', pri: '1.0' },
    { loc: '/live', freq: 'always', pri: '0.9' },
    { loc: '/fixtures', freq: 'daily', pri: '0.9' },
    { loc: '/news', freq: 'hourly', pri: '0.9' },
    { loc: '/stats', freq: 'daily', pri: '0.8' },
    { loc: '/worldcup', freq: 'daily', pri: '0.95' },
    { loc: '/worldcup/fixtures', freq: 'daily', pri: '0.9' },
    { loc: '/predict', freq: 'daily', pri: '0.8' },
    { loc: '/leaderboard', freq: 'daily', pri: '0.6' },
    { loc: '/compare', freq: 'weekly', pri: '0.7' },
    { loc: '/search', freq: 'weekly', pri: '0.6' },
  ];
  const urls = staticPages.map(p =>
    `  <url><loc>${BASE}${p.loc}</loc><changefreq>${p.freq}</changefreq><priority>${p.pri}</priority></url>`
  );
  try {
    const posts = await supabaseQueryWithKey('posts',
      'status=eq.published&select=slug,updated_at,published_at,category&order=published_at.desc&limit=5000',
      'GET', null, process.env.SUPABASE_SERVICE_KEY || SUPABASE_KEY);
    if (Array.isArray(posts)) {
      for (const p of posts) {
        if (!p.slug) continue;
        const lastmod = (p.updated_at || p.published_at || '').split('T')[0] || today;
        const pri = p.category === 'match-report' ? '0.7' : '0.8';
        urls.push(`  <url><loc>${BASE}/news/${encodeURIComponent(p.slug)}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>${pri}</priority></url>`);
      }
    }
  } catch (e) { console.error('[SITEMAP] posts fetch error:', e.message); }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
  cacheSet('sitemap:xml', xml, { fresh: 600, stale: 1800 });
  return xml;
}

// Write the sitemap to the static dist file that nginx serves directly.
// This sidesteps any nginx routing quirks — nginx always serves dist/sitemap.xml fine.
async function writeSitemapFile() {
  try {
    const xml = await buildSitemapXml();
    // Resolve dist relative to this file (server/index.mjs -> ../dist), not cwd,
    // since the process may run from the server/ directory.
    const here = path.dirname(new URL(import.meta.url).pathname);
    const candidates = [
      path.resolve(here, '..', 'dist', 'sitemap.xml'),   // server/ -> ../dist
      '/var/www/lastfootball/dist/sitemap.xml',           // absolute fallback
    ];
    let written = false;
    for (const distPath of candidates) {
      try {
        if (!fs.existsSync(path.dirname(distPath))) continue;
        fs.writeFileSync(distPath, xml, 'utf8');
        const count = (xml.match(/<url>/g) || []).length;
        console.log(`[SITEMAP] Wrote ${count} URLs to ${distPath}`);
        written = true;
        break;
      } catch (e) { /* try next candidate */ }
    }
    if (!written) console.error('[SITEMAP] could not write to any dist path');
  } catch (e) {
    console.error('[SITEMAP] file write error:', e.message);
  }
}

// Write static prerendered HTML files for all published posts to dist/news/<slug>.html.
// nginx serves these directly via try_files (no proxy needed — proven to work on this
// setup, unlike location-proxy blocks). Crawlers get full content; React still hydrates.
// ─── Branded score-card OG images for social sharing ────────────────────────
// (uses the top-level `sharp` import; if sharp is null, cards are skipped)

function ogEscape(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function ogFitFont(name, base, maxChars){ if(name.length<=maxChars) return base; return Math.max(30, Math.floor(base*maxChars/name.length)); }

// National-team name → ISO flag code (flagcdn). Lets us show a flag on the score
// card even when only the team NAME is known (the backfill path has no logo URL).
// Home nations use flagcdn's gb-* subdivision codes.
const TEAM_FLAG_ISO = {
  'argentina':'ar','jordan':'jo','south africa':'za','canada':'ca','algeria':'dz','austria':'at',
  'colombia':'co','portugal':'pt','congo dr':'cd','dr congo':'cd','uzbekistan':'uz','croatia':'hr',
  'ghana':'gh','panama':'pa','england':'gb-eng','scotland':'gb-sct','wales':'gb-wls',
  'northern ireland':'gb-nir','egypt':'eg','iran':'ir','new zealand':'nz','belgium':'be',
  'uruguay':'uy','spain':'es','cape verde islands':'cv','cape verde':'cv','saudi arabia':'sa',
  'senegal':'sn','iraq':'iq','norway':'no','france':'fr','turkiye':'tr','turkey':'tr','usa':'us',
  'united states':'us','paraguay':'py','australia':'au','japan':'jp','sweden':'se','tunisia':'tn',
  'netherlands':'nl','ecuador':'ec','germany':'de','curacao':'cw','ivory coast':'ci',
  'cote divoire':'ci','south korea':'kr','korea republic':'kr','czechia':'cz','czech republic':'cz',
  'mexico':'mx','morocco':'ma','haiti':'ht','brazil':'br','switzerland':'ch',
  'bosnia herzegovina':'ba','bosnia and herzegovina':'ba','qatar':'qa','italy':'it','denmark':'dk',
  'poland':'pl','serbia':'rs','nigeria':'ng','cameroon':'cm','mali':'ml','ukraine':'ua','greece':'gr',
  'chile':'cl','peru':'pe','costa rica':'cr','honduras':'hn','jamaica':'jm','venezuela':'ve',
  'bolivia':'bo','republic of ireland':'ie','ireland':'ie','slovakia':'sk','slovenia':'si',
  'hungary':'hu','romania':'ro','china':'cn','china pr':'cn','united arab emirates':'ae','uae':'ae',
  'oman':'om','bahrain':'bh','kuwait':'kw','syria':'sy','lebanon':'lb','palestine':'ps','india':'in',
  'thailand':'th','vietnam':'vn','indonesia':'id','malaysia':'my','philippines':'ph',
  'north korea':'kp','korea dpr':'kp','kenya':'ke','uganda':'ug','tanzania':'tz','zambia':'zm',
  'angola':'ao','mozambique':'mz','gabon':'ga','burkina faso':'bf','guinea':'gn','benin':'bj',
  'togo':'tg','sudan':'sd','libya':'ly','mauritania':'mr','niger':'ne','comoros':'km',
  'madagascar':'mg','botswana':'bw','namibia':'na','equatorial guinea':'gq','gambia':'gm',
};
function flagUrlForTeam(name) {
  if (!name) return null;
  const key = String(name).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents (Türkiye, Curaçao)
    .replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim(); // drop punctuation (& . -), collapse spaces
  const code = TEAM_FLAG_ISO[key];
  return code ? `https://flagcdn.com/w320/${code}.png` : null;
}

// Fetch a flag/logo image and return a base64 data URI (or null on failure)
async function flagDataUri(url) {
  if (!url) return null;
  try {
    const { buf, type } = await fetchBuffer(url);
    if (!buf || !buf.length) return null;
    return `data:${type || 'image/png'};base64,${buf.toString('base64')}`;
  } catch { return null; }
}

function scoreCardSvg({ home, away, hs, as_, league, dateLabel, homeFlag, awayFlag, statusShort, penHome, penAway, winnerSide }) {
  const W = 1200, H = 630;
  const NEON = '#39ff14';
  const FONT = 'Arial, "Helvetica Neue", Helvetica, sans-serif';
  const hFont = ogFitFont(String(home || ''), 46, 13);
  const aFont = ogFitFont(String(away || ''), 46, 13);
  const flagW = 184, flagH = 122, flagRx = 8;
  const homeCx = 238, awayCx = 962, flagY = 196, nameY = 392;

  // Result line: a knockout decided by ET/pens is NOT "FULL TIME". Show how it ended,
  // include the shootout score when present, and tint the advancing team's name green.
  const penStr = (penHome != null && penAway != null) ? ` ${penHome}-${penAway}` : '';
  const statusLabel = statusShort === 'PEN' ? `PENALTIES${penStr}`
    : statusShort === 'AET' ? 'AFTER EXTRA TIME'
    : 'FULL TIME';
  const homeColor = winnerSide === 'home' ? NEON : '#ffffff';
  const awayColor = winnerSide === 'away' ? NEON : '#ffffff';

  // A flag tile (clipped + rounded + hairline border) or a neutral placeholder.
  const flagTile = (img, cx, id) => {
    const x = cx - flagW / 2;
    if (!img) {
      return `<rect x="${x}" y="${flagY}" width="${flagW}" height="${flagH}" rx="${flagRx}" fill="#1e1e1e" stroke="#ffffff" stroke-opacity="0.08"/>`;
    }
    return `<clipPath id="${id}"><rect x="${x}" y="${flagY}" width="${flagW}" height="${flagH}" rx="${flagRx}"/></clipPath>
    <image href="${img}" x="${x}" y="${flagY}" width="${flagW}" height="${flagH}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>
    <rect x="${x}" y="${flagY}" width="${flagW}" height="${flagH}" rx="${flagRx}" fill="none" stroke="#ffffff" stroke-opacity="0.12"/>`;
  };
  // Two short flanking rules around a centred label.
  const flank = (cx, y, half, color, op) =>
    `<line x1="${cx - half - 46}" y1="${y}" x2="${cx - half - 14}" y2="${y}" stroke="${color}" stroke-opacity="${op}" stroke-width="2"/>` +
    `<line x1="${cx + half + 14}" y1="${y}" x2="${cx + half + 46}" y2="${y}" stroke="${color}" stroke-opacity="${op}" stroke-width="2"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1b1b1b"/><stop offset="100%" stop-color="#0b0b0b"/></linearGradient>
    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="72"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="80" cy="36" r="150" fill="${NEON}" opacity="0.13" filter="url(#glow)"/>
  <circle cx="1120" cy="600" r="150" fill="${NEON}" opacity="0.13" filter="url(#glow)"/>
  <rect x="16" y="16" width="${W-32}" height="${H-32}" rx="22" fill="none" stroke="#2b2b2b" stroke-width="1.5"/>

  <text x="${W/2}" y="92" font-family='${FONT}' font-size="40" fill="#ffffff" text-anchor="middle" font-weight="800" letter-spacing="6">${ogEscape(String(league || '').toUpperCase())}</text>
  ${flank(W/2, 80, 170, NEON, 1)}
  <text x="${W/2}" y="134" font-family='${FONT}' font-size="24" fill="${NEON}" text-anchor="middle" font-weight="600" letter-spacing="1">${ogEscape(dateLabel)}</text>

  ${flagTile(homeFlag, homeCx, 'hf')}
  ${flagTile(awayFlag, awayCx, 'af')}
  <text x="${homeCx}" y="${nameY}" font-family='${FONT}' font-size="${hFont}" fill="${homeColor}" text-anchor="middle" font-weight="800" letter-spacing="1">${ogEscape(String(home || '').toUpperCase())}</text>
  <text x="${awayCx}" y="${nameY}" font-family='${FONT}' font-size="${aFont}" fill="${awayColor}" text-anchor="middle" font-weight="800" letter-spacing="1">${ogEscape(String(away || '').toUpperCase())}</text>

  <text x="556" y="312" font-family='${FONT}' font-size="124" fill="#ffffff" text-anchor="end" font-weight="900">${ogEscape(String(hs))}</text>
  <text x="${W/2}" y="300" font-family='${FONT}' font-size="84" fill="#777777" text-anchor="middle" font-weight="300">-</text>
  <text x="644" y="312" font-family='${FONT}' font-size="124" fill="#ffffff" text-anchor="start" font-weight="900">${ogEscape(String(as_))}</text>
  <text x="${W/2}" y="372" font-family='${FONT}' font-size="22" fill="${NEON}" text-anchor="middle" font-weight="700" letter-spacing="4">${ogEscape(statusLabel)}</text>
  ${statusLabel.length <= 10 ? flank(W/2, 365, 72, '#888888', 0.6) : ''}

  <line x1="170" y1="506" x2="1030" y2="506" stroke="#ffffff" stroke-opacity="0.06" stroke-width="2"/>
  <text x="${W/2-5}" y="566" font-family='${FONT}' font-size="42" fill="#ffffff" text-anchor="end" font-weight="900">Last</text>
  <text x="${W/2+5}" y="566" font-family='${FONT}' font-size="42" fill="${NEON}" text-anchor="start" font-weight="900">Football</text>
  <text x="${W/2}" y="600" font-family='${FONT}' font-size="18" fill="#666666" text-anchor="middle" letter-spacing="4">LASTFOOTBALL.COM</text>
</svg>`;
}

// A valid football score is a non-negative integer — accepted as a number or a
// digit-string. This is the guard that makes it IMPOSSIBLE to bake "undefined"/"NaN"
// into a card again, regardless of what a caller passes.
function validScore(v) {
  return v !== undefined && v !== null && /^\d+$/.test(String(v).trim());
}

// Render and save a score-card PNG to dist/og/<slug>.png. Returns the public path or null.
async function writeScoreCard({ slug, home, away, hs, as_, league, date, homeLogo, awayLogo, statusShort, penHome, penAway, winnerSide }) {
  if (!sharp) return null;
  // Refuse to render a card with a missing/invalid score. The old transitional code
  // interpolated undefined scores as "undefined - undefined" and the existsSync guard
  // below then froze that broken PNG forever. Bailing here means no broken file is
  // ever written; the backfill (which derives the score from the slug) regenerates a
  // correct card on a later pass, so this self-heals.
  if (!validScore(hs) || !validScore(as_)) {
    console.warn(`[OG] skip card ${slug}: invalid score hs=${JSON.stringify(hs)} as_=${JSON.stringify(as_)}`);
    return null;
  }
  try {
    // IMPORTANT: store cards OUTSIDE dist/ — `vite build` wipes dist/ on every build,
    // which would delete all generated cards. This persistent dir survives rebuilds.
    const here = path.dirname(new URL(import.meta.url).pathname);
    const ogRoots = [path.resolve(here, '..', 'og-cards'), '/var/www/lastfootball/og-cards'];
    let ogDir = null;
    for (const d of ogRoots) {
      try { fs.mkdirSync(d, { recursive: true }); ogDir = d; break; } catch {}
    }
    if (!ogDir) return null;
    const outPath = path.join(ogDir, `${slug}.png`);
    if (fs.existsSync(outPath)) return `/og/${slug}.png`;  // immutable per finished match
    let dateLabel = '';
    try { dateLabel = new Date(date).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }); } catch {}
    // Fetch flags (embedded as base64 so sharp can render them). Prefer an explicit
    // logo URL (live path passes the API-Football flag); otherwise derive a flag from
    // the team name via flagcdn so backfilled cards (which have no logo) still show one.
    const homeUrl = homeLogo || flagUrlForTeam(home);
    const awayUrl = awayLogo || flagUrlForTeam(away);
    const [homeFlag, awayFlag] = await Promise.all([flagDataUri(homeUrl), flagDataUri(awayUrl)]);
    const svg = scoreCardSvg({ home, away, hs, as_, league, dateLabel, homeFlag, awayFlag, statusShort, penHome, penAway, winnerSide });
    await sharp(Buffer.from(svg)).png().toFile(outPath);
    return `/og/${slug}.png`;
  } catch (e) {
    console.error('[OG] writeScoreCard error:', e.message);
    return null;
  }
}

// Backfill score cards for existing match reports that have no featured_image yet,
// then update the post row so OG tags and the news UI use the card.
async function backfillScoreCards() {
  if (!sharp) return;
  try {
    const SVC = process.env.SUPABASE_SERVICE_KEY || SUPABASE_KEY;
    const rows = await supabaseQueryWithKey('posts',
      "category=eq.match-report&status=eq.published&featured_image=is.null&select=id,slug,teams,league,title,published_at&limit=200",
      'GET', null, SVC);
    if (!Array.isArray(rows) || !rows.length) return;
    let done = 0;
    for (const p of rows) {
      const teams = Array.isArray(p.teams) ? p.teams : [];
      const home = teams[0], away = teams[1];
      if (!home || !away) continue;
      // Parse score from slug: home-HS-AS-away-date
      const m = (p.slug || '').match(/-(\d+)-(\d+)-/);
      if (!m) continue;
      const hs = m[1], as_ = m[2];
      const cardPath = await writeScoreCard({ slug: p.slug, home, away, hs, as_, league: p.league || 'Match Report', date: p.published_at });
      if (!cardPath) continue;
      const ogImage = `https://lastfootball.com${cardPath}`;
      await supabaseQueryWithKey('posts', `id=eq.${p.id}`, 'PATCH', { featured_image: ogImage }, SVC);
      done++;
    }
    if (done > 0) console.log(`[OG] Backfilled ${done} score cards`);
  } catch (e) {
    console.error('[OG] backfill error:', e.message);
  }
}

async function writeArticleFiles() {
  try {
    const here = path.dirname(new URL(import.meta.url).pathname);
    const distRoots = [
      path.resolve(here, '..', 'dist'),
      '/var/www/lastfootball/dist',
    ];
    let distRoot = null;
    for (const d of distRoots) { if (fs.existsSync(d)) { distRoot = d; break; } }
    if (!distRoot) { console.error('[PRERENDER] no dist dir found'); return; }

    const newsDir = path.join(distRoot, 'news');
    if (!fs.existsSync(newsDir)) fs.mkdirSync(newsDir, { recursive: true });

    const posts = await supabaseQueryWithKey('posts',
      'status=eq.published&select=slug&order=published_at.desc&limit=2000',
      'GET', null, process.env.SUPABASE_SERVICE_KEY || SUPABASE_KEY);
    if (!Array.isArray(posts)) return;

    let written = 0;
    for (const p of posts) {
      if (!p.slug) continue;
      try {
        const html = await prerenderArticle(p.slug);
        if (!html) continue;
        // Write both /news/<slug>.html and /news/<slug>/index.html so try_files matches
        // either "$uri" (with .html) or "$uri/" patterns.
        fs.writeFileSync(path.join(newsDir, `${p.slug}.html`), html, 'utf8');
        written++;
      } catch (e) { /* skip this one */ }
    }
    console.log(`[PRERENDER] Wrote ${written} article HTML files to ${newsDir}`);
  } catch (e) {
    console.error('[PRERENDER] writeArticleFiles error:', e.message);
  }
}



function supabaseQuery(table, params = '', method = 'GET', body = null) {
  return supabaseQueryWithKey(table, params, method, body, SUPABASE_KEY);
}

function supabaseQueryWithKey(table, params = '', method = 'GET', body = null, key = SUPABASE_KEY) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}${params ? '?' + params : ''}`);
    const options = {
      method,
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'resolution=merge-duplicates' : (method === 'GET' ? '' : 'return=minimal'),
      },
    };
    // Remove empty headers
    Object.keys(options.headers).forEach(k => { if (!options.headers[k]) delete options.headers[k]; });

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : []);
        } catch {
          resolve([]);
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ─── Prediction Scoring ─────────────────────────────────────────────────────

async function scorePredictions() {
  if (!backgroundJobsAllowed()) return; // non-essential — yields to the reserve
  try {
    // Get unscored predictions
    const predictions = await supabaseQuery('predictions', 'points=is.null&select=*');
    if (!predictions?.length) return;

    // Group by match_id
    const matchIds = [...new Set(predictions.map(p => p.match_id))];

    for (const matchId of matchIds) {
      try {
        // Fetch match result from API
        const result = await fetchUpstream('fixtures', { id: String(matchId) });
        const fixture = result?.response?.[0];
        if (!fixture) continue;

        const status = fixture.fixture?.status?.short;
        if (!['FT', 'AET', 'PEN'].includes(status)) continue; // Not finished yet

        const actualHome = fixture.goals?.home;
        const actualAway = fixture.goals?.away;
        if (actualHome === null || actualAway === null) continue;

        // Score each prediction for this match
        const matchPreds = predictions.filter(p => p.match_id === matchId);

        for (const pred of matchPreds) {
          let points = 0;
          const predHome = pred.home_score;
          const predAway = pred.away_score;

          // Exact score (winner + score both correct)
          if (predHome === actualHome && predAway === actualAway) {
            points = 3;
          }
          // Correct winner/draw but wrong score
          else if (
            (predHome > predAway && actualHome > actualAway) ||
            (predHome < predAway && actualHome < actualAway) ||
            (predHome === predAway && actualHome === actualAway)
          ) {
            points = 1;
          }
          // Wrong winner
          else {
            points = -1;
          }

          // Update prediction with points
          await supabaseQuery(
            'predictions',
            `id=eq.${pred.id}`,
            'PATCH',
            { points, scored_at: new Date().toISOString() }
          );

          // Update leaderboard
          await updateLeaderboard(pred.user_id, points, predHome === actualHome && predAway === actualAway);
        }

        console.log(`Scored ${matchPreds.length} predictions for match ${matchId}: ${actualHome}-${actualAway}`);
      } catch (err) {
        console.error(`Error scoring match ${matchId}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Prediction scoring error:', err.message);
  }
}

async function updateLeaderboard(userId, points, exactScore) {
  try {
    // Get current leaderboard entry
    const entries = await supabaseQuery('prediction_leaderboard', `user_id=eq.${userId}&select=*`);
    const entry = entries?.[0];

    // Get user email as username
    let username = 'Anonymous';
    try {
      const preds = await supabaseQuery('predictions', `user_id=eq.${userId}&select=home_team&limit=1`);
      username = `User_${userId.slice(0, 6)}`;
    } catch {}

    if (entry) {
      const newStreak = points > 0 ? (entry.current_streak + 1) : 0;
      await supabaseQuery(
        'prediction_leaderboard',
        `user_id=eq.${userId}`,
        'PATCH',
        {
          total_points: entry.total_points + points,
          total_predictions: entry.total_predictions + 1,
          correct_scores: entry.correct_scores + (exactScore ? 1 : 0),
          correct_winners: entry.correct_winners + (points > 0 ? 1 : 0),
          current_streak: newStreak,
          best_streak: Math.max(entry.best_streak, newStreak),
          updated_at: new Date().toISOString(),
        }
      );
    } else {
      await supabaseQuery(
        'prediction_leaderboard',
        '',
        'POST',
        {
          user_id: userId,
          username,
          total_points: points,
          total_predictions: 1,
          correct_scores: exactScore ? 1 : 0,
          correct_winners: points > 0 ? 1 : 0,
          current_streak: points > 0 ? 1 : 0,
          best_streak: points > 0 ? 1 : 0,
        }
      );
    }
  } catch (err) {
    console.error(`Leaderboard update error for ${userId}:`, err.message);
  }
}
