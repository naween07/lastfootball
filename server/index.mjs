// LastFootball Local API — replaces Supabase Edge Functions
// Runs on the same VPS, eliminates the Supabase network hop.
// Memory-cached with TTL, stale-while-revalidate strategy.

import http from 'node:http';
import https from 'node:https';

const PORT = 3001;
const API_BASE = 'https://v3.football.api-sports.io';
const API_KEY = process.env.API_FOOTBALL_KEY;

if (!API_KEY) {
  console.error('Missing API_FOOTBALL_KEY env var');
  process.exit(1);
}

// ─── In-memory cache ────────────────────────────────────────────────────────
const cache = new Map();
const MAX_ENTRIES = 500;
const inflight = new Map();

function getTtl(endpoint, params) {
  if (params.live === 'all') return { fresh: 20, stale: 40 };
  if (endpoint.startsWith('fixtures/')) return { fresh: 30, stale: 60 };
  if (endpoint === 'fixtures') {
    const date = params.date;
    if (date) {
      const today = new Date().toISOString().split('T')[0];
      if (date < today) return { fresh: 86400, stale: 604800 };
      if (date === today) return { fresh: 60, stale: 120 };
      return { fresh: 600, stale: 1800 };
    }
    return { fresh: 60, stale: 120 };
  }
  if (endpoint === 'standings') return { fresh: 3600, stale: 21600 };
  if (endpoint.startsWith('players/')) return { fresh: 3600, stale: 21600 };
  if (endpoint === 'teams' || endpoint === 'fixtures/rounds') return { fresh: 21600, stale: 86400 };
  if (params.search) return { fresh: 300, stale: 900 };
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
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function json(res, data, extra = {}) {
  const body = JSON.stringify(data);
  res.writeHead(200, { ...CORS, 'Content-Type': 'application/json', ...extra });
  res.end(body);
}

function error(res, code, msg) {
  res.writeHead(code, { ...CORS, 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: msg }));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  try {
    // Health check (no rate limit)
    if (path === '/api/health') {
      return json(res, { ok: true, cache: cache.size, logos: logoCache.size, rateLimits: rateLimits.size });
    }

    // API quota status (no rate limit)
    if (path === '/api/quota') {
      return json(res, {
        quota: quota.daily,
        callsFromServer: quota.callsToday,
        lastChecked: quota.lastChecked,
        cacheEntries: cache.size,
        pctUsed: quota.daily.limit > 0 ? Math.round((quota.daily.used / quota.daily.limit) * 100) : 0,
      });
    }

    // Rate limit check for API and news routes
    if (path === '/api/football' || path === '/api/news') {
      const rate = checkRate(ip, 'api', RATE_MAX_API);
      if (!rate.allowed) {
        res.writeHead(429, { ...CORS, 'Content-Type': 'application/json', 'Retry-After': String(rate.resetIn) });
        return res.end(JSON.stringify({ error: 'Too many requests', retryAfter: rate.resetIn }));
      }
      res.setHeader('X-RateLimit-Remaining', String(rate.remaining));
    }

    // Rate limit for logo proxy (higher limit)
    if (path === '/api/logo') {
      const rate = checkRate(ip, 'logo', RATE_MAX_LOGO);
      if (!rate.allowed) {
        res.writeHead(429, { ...CORS, 'Content-Type': 'application/json', 'Retry-After': String(rate.resetIn) });
        return res.end(JSON.stringify({ error: 'Too many requests', retryAfter: rate.resetIn }));
      }
    }

    // Football API proxy
    if (path === '/api/football') {
      const endpoint = url.searchParams.get('endpoint');
      if (!endpoint) return error(res, 400, 'Missing endpoint');

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
        return json(res, entry.data, {
          'X-Cache': isFresh ? 'HIT' : 'STALE',
          'Cache-Control': `public, max-age=${ttl.fresh}, stale-while-revalidate=${ttl.stale}`,
        });
      }

      const data = await revalidate(cacheKey, endpoint, params, ttl);
      return json(res, data, {
        'X-Cache': 'MISS',
        'Cache-Control': `public, max-age=${ttl.fresh}, stale-while-revalidate=${ttl.stale}`,
      });
    }

    // News
    if (path === '/api/news') {
      const news = await getNews();
      return json(res, { news });
    }

    // Logo proxy
    if (path === '/api/logo') {
      const logoUrl = url.searchParams.get('url');
      if (!logoUrl) return error(res, 400, 'Missing url');

      const size = parseInt(url.searchParams.get('s') || '80') || 80;
      const maxSize = Math.min(Math.max(size, 16), 200); // clamp 16-200

      const logo = await getLogo(logoUrl, maxSize);
      if (!logo) return error(res, 403, 'Host not allowed');

      res.writeHead(200, {
        ...CORS,
        'Content-Type': logo.type,
        'Cache-Control': 'public, max-age=604800, immutable',
      });
      return res.end(logo.buf);
    }

    error(res, 404, 'Not found');
  } catch (err) {
    console.error('Request error:', err);
    error(res, 500, err.message || 'Internal error');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`LastFootball API running on http://127.0.0.1:${PORT}`);
  console.log(`Cache: ${MAX_ENTRIES} entries | Logos: ${MAX_LOGOS} entries`);
});
