// Logo proxy: fetches third-party team/league logos once, caches them
// in-memory, and serves with long browser cache headers. Eliminates
// hundreds of slow remote image requests during initial paint.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// Allow only known logo CDNs to prevent SSRF
const ALLOWED_HOSTS = new Set([
  "media.api-sports.io",
  "media-1.api-sports.io",
  "media-2.api-sports.io",
  "media-3.api-sports.io",
  "media-4.api-sports.io",
]);

type CacheEntry = {
  body: Uint8Array;
  contentType: string;
  fetchedAt: number;
};

const memCache = new Map<string, CacheEntry>();
const MAX_ENTRIES = 2000;
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function cacheGet(key: string): CacheEntry | null {
  const e = memCache.get(key);
  if (!e) return null;
  if (Date.now() - e.fetchedAt > TTL_MS) {
    memCache.delete(key);
    return null;
  }
  // LRU touch
  memCache.delete(key);
  memCache.set(key, e);
  return e;
}

function cacheSet(key: string, entry: CacheEntry) {
  if (memCache.size >= MAX_ENTRIES) {
    const oldest = memCache.keys().next().value;
    if (oldest) memCache.delete(oldest);
  }
  memCache.set(key, entry);
}

const inflight = new Map<string, Promise<CacheEntry>>();

async function fetchLogo(url: string): Promise<CacheEntry> {
  const existing = inflight.get(url);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const upstream = await fetch(url, {
        headers: { "User-Agent": "LastFootball-LogoProxy/1.0" },
      });
      if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
      const buf = new Uint8Array(await upstream.arrayBuffer());
      const contentType = upstream.headers.get("content-type") || "image/png";
      const entry: CacheEntry = {
        body: buf,
        contentType,
        fetchedAt: Date.now(),
      };
      cacheSet(url, entry);
      return entry;
    } finally {
      inflight.delete(url);
    }
  })();

  inflight.set(url, promise);
  return promise;
}

// Tiny 1x1 transparent PNG for missing logos
const TRANSPARENT_PNG = Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1,
  0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84,
  120, 156, 99, 250, 207, 0, 0, 0, 2, 0, 1, 226, 33, 188, 51, 0, 0, 0, 0,
  73, 69, 78, 68, 174, 66, 96, 130,
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const target = url.searchParams.get("url");
    if (!target) {
      return new Response("Missing url param", { status: 400, headers: corsHeaders });
    }

    let parsed: URL;
    try {
      parsed = new URL(target);
    } catch {
      return new Response("Invalid url", { status: 400, headers: corsHeaders });
    }

    if (!ALLOWED_HOSTS.has(parsed.host)) {
      return new Response("Host not allowed", { status: 403, headers: corsHeaders });
    }

    // Memory cache hit
    const cached = cacheGet(target);
    if (cached) {
      return new Response(cached.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": cached.contentType,
          "Cache-Control": "public, max-age=2592000, immutable", // 30 days in browser
          "X-Cache": "HIT",
        },
      });
    }

    try {
      const entry = await fetchLogo(target);
      return new Response(entry.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": entry.contentType,
          "Cache-Control": "public, max-age=2592000, immutable",
          "X-Cache": "MISS",
        },
      });
    } catch (e) {
      console.error("logo fetch failed", target, e);
      // Return transparent png so the UI doesn't break
      return new Response(TRANSPARENT_PNG, {
        headers: {
          ...corsHeaders,
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=300",
          "X-Cache": "ERROR",
        },
      });
    }
  } catch (e) {
    console.error("logo-proxy error", e);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
