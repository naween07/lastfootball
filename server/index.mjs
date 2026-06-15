// LastFootball Local API — replaces Supabase Edge Functions
// Runs on the same VPS, eliminates the Supabase network hop.
// Memory-cached with TTL, stale-while-revalidate strategy.

import http from 'node:http';
import https from 'node:https';

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
  
  // Standings — refresh fast during the tournament (live group-stage swings)
  if (endpoint === 'standings') return { fresh: 180, stale: 900 }; // 3min fresh, 15min stale
  
  // Player stats (top scorers etc.) — refresh fast during the tournament
  if (endpoint.startsWith('players/')) return { fresh: 180, stale: 900 };
  
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
}

// ─── API Quota Monitor ──────────────────────────────────────────────────────
const quota = {
  daily: { used: 0, limit: 0, remaining: 0 },
  lastChecked: null,
  callsToday: 0,
};

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

    // ─── Aggregated homepage data (1 call instead of 13) ────────────────
    if (path === '/api/homepage') {
      const cacheKey = 'agg_homepage';
      const hit = cacheGet(cacheKey);
      if (hit) return json(req, res, hit.data);

      const today = new Date().toLocaleDateString('en-CA');
      const leagues = [
        { id: 1, name: 'World Cup', season: '2026' },
        { id: 39, name: 'Premier League', season: '2025' },
        { id: 140, name: 'La Liga', season: '2025' },
        { id: 135, name: 'Serie A', season: '2025' },
        { id: 78, name: 'Bundesliga', season: '2025' },
        { id: 61, name: 'Ligue 1', season: '2025' },
      ];

      try {
        const [live, todayMatches, ...rest] = await Promise.allSettled([
          fetchUpstream('fixtures', { live: 'all' }),
          fetchUpstream('fixtures', { date: today }),
          ...leagues.map(l => fetchUpstream('players/topscorers', { league: String(l.id), season: l.season })),
          ...leagues.map(l => fetchUpstream('standings', { league: String(l.id), season: l.season })),
        ]);

        const result = {
          live: live.status === 'fulfilled' ? live.value : [],
          today: todayMatches.status === 'fulfilled' ? todayMatches.value : [],
          scorers: {},
          standings: {},
          worldCupActive: false,
        };

        leagues.forEach((l, i) => {
          const scorerRes = rest[i];
          const standRes = rest[i + leagues.length];
          if (scorerRes?.status === 'fulfilled') result.scorers[l.id] = scorerRes.value;
          if (standRes?.status === 'fulfilled') result.standings[l.id] = standRes.value;
        });

        // Flag whether the World Cup has live/recent data so the client can prioritize it
        const wcStand = result.standings[1]?.response?.[0]?.league?.standings;
        const wcScorers = result.scorers[1]?.response;
        result.worldCupActive = !!((wcStand && wcStand.length) || (wcScorers && wcScorers.length));

        cacheSet(cacheKey, result, { fresh: 60, stale: 120 });
        return json(req, res, result);
      } catch (err) {
        console.error('Homepage aggregate error:', err);
        return json(req, res, { live: [], today: [], scorers: {}, standings: {} });
      }
    }

    // ─── Aggregated match detail (1 call instead of 4-7) ────────────────
    if (path === '/api/match') {
      const fixtureId = params.get('id');
      if (!fixtureId) return json(req, res, { error: 'Missing id' }, 400);

      const cacheKey = `agg_match_${fixtureId}`;
      const hit = cacheGet(cacheKey);
      if (hit) return json(req, res, hit.data);

      try {
        const [fixture, events, stats, lineups, players] = await Promise.allSettled([
          fetchUpstream('fixtures', { id: fixtureId }),
          fetchUpstream('fixtures/events', { fixture: fixtureId }),
          fetchUpstream('fixtures/statistics', { fixture: fixtureId }),
          fetchUpstream('fixtures/lineups', { fixture: fixtureId }),
          fetchUpstream('fixtures/players', { fixture: fixtureId }),
        ]);

        const result = {
          fixture: fixture.status === 'fulfilled' ? fixture.value : [],
          events: events.status === 'fulfilled' ? events.value : [],
          stats: stats.status === 'fulfilled' ? stats.value : [],
          lineups: lineups.status === 'fulfilled' ? lineups.value : [],
          players: players.status === 'fulfilled' ? players.value : [],
        };

        // Cache 30s for live, 5min for finished
        const statusShort = result.fixture?.response?.[0]?.fixture?.status?.short;
        const isLive = ['1H', '2H', 'HT', 'ET', 'P', 'BT'].includes(statusShort);
        cacheSet(cacheKey, result, { fresh: isLive ? 30 : 300, stale: isLive ? 60 : 600 });
        return json(req, res, result);
      } catch (err) {
        console.error('Match aggregate error:', err);
        return json(req, res, { fixture: [], events: [], stats: [], lineups: [], players: [] });
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
        if (!isFresh) {
          revalidate(cacheKey, endpoint, params, ttl).catch(e => console.error('BG revalidate:', e));
        }
        return json(req, res, entry.data, {
          'X-Cache': isFresh ? 'HIT' : 'STALE',
          'Cache-Control': `public, max-age=${ttl.fresh}, stale-while-revalidate=${ttl.stale}`,
        });
      }

      const data = await revalidate(cacheKey, endpoint, params, ttl);
      return json(req, res, data, {
        'X-Cache': 'MISS',
        'Cache-Control': `public, max-age=${ttl.fresh}, stale-while-revalidate=${ttl.stale}`,
      });
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

    error(req, res, 404, 'Not found');
  } catch (err) {
    console.error('Request error:', err);
    error(req, res, 500, err.message || 'Internal error');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`LastFootball API running on http://127.0.0.1:${PORT}`);
  console.log(`Cache: ${MAX_ENTRIES} entries | Logos: ${MAX_LOGOS} entries`);
  // Start prediction scoring job
  scorePredictions();
  setInterval(scorePredictions, 5 * 60 * 1000); // Every 5 minutes
  // Fantasy points job
  setTimeout(scoreFantasy, 20 * 1000);
  setInterval(scoreFantasy, 30 * 60 * 1000); // Every 30 minutes
});

// ─── Fantasy Points Engine (FPL-style) ──────────────────────────────────────
// Scores finished WC fixtures from real player stats, applies to fantasy squads.
async function scoreFantasy() {
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

// ─── Supabase HTTP helpers ──────────────────────────────────────────────────

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
