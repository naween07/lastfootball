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

function fetchJSON(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error('Invalid JSON from upstream')); }
      });
    }).on('error', reject);
  });
}

async function fetchUpstream(endpoint, params) {
  const qs = new URLSearchParams(params).toString();
  const url = `${API_BASE}/${endpoint}${qs ? '?' + qs : ''}`;
  return fetchJSON(url, {
    'x-rapidapi-key': API_KEY,
    'x-rapidapi-host': 'v3.football.api-sports.io',
  });
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

async function getLogo(logoUrl) {
  try {
    const u = new URL(logoUrl);
    if (!ALLOWED_HOSTS.has(u.host)) return null;
  } catch { return null; }

  const cached = logoCache.get(logoUrl);
  if (cached && Date.now() - cached.fetchedAt < LOGO_TTL) return cached;

  const { buf, type } = await fetchBuffer(logoUrl);
  if (logoCache.size >= MAX_LOGOS) {
    const oldest = logoCache.keys().next().value;
    if (oldest) logoCache.delete(oldest);
  }
  const entry = { buf, type, fetchedAt: Date.now() };
  logoCache.set(logoUrl, entry);
  return entry;
}

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

  try {
    // Health check
    if (path === '/api/health') {
      return json(res, { ok: true, cache: cache.size, logos: logoCache.size });
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

      const logo = await getLogo(logoUrl);
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
