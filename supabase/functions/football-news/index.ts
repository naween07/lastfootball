import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NewsItem {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  sourceIcon: string;
  publishedAt: string;
  imageUrl?: string;
  category: string;
}

const RSS_FEEDS = [
  {
    url: "https://feeds.bbci.co.uk/sport/football/rss.xml",
    source: "BBC Sport",
    sourceIcon: "https://www.bbc.co.uk/favicon.ico",
    category: "general",
  },
  {
    url: "https://www.espn.com/espn/rss/soccer/news",
    source: "ESPN FC",
    sourceIcon: "https://www.espn.com/favicon.ico",
    category: "general",
  },
  {
    url: "https://www.skysports.com/rss/12040",
    source: "Sky Sports",
    sourceIcon: "https://www.skysports.com/favicon.ico",
    category: "transfers",
  },
  {
    url: "https://sportstar.thehindu.com/rss/football/feeder/default.rss",
    source: "Sportstar",
    sourceIcon: "https://sportstar.thehindu.com/favicon.ico",
    category: "general",
  },
];

function extractText(el: any, tag: string): string {
  const child = el.querySelector(tag);
  return child?.textContent?.trim() || "";
}

function extractImage(el: any): string | undefined {
  // Try media:content, media:thumbnail, enclosure, or image in description
  const enclosure = el.querySelector("enclosure");
  if (enclosure) {
    const url = enclosure.getAttribute("url");
    if (url && url.match(/\.(jpg|jpeg|png|webp|gif)/i)) return url;
  }

  const mediaContent = el.querySelector("media\\:content, content");
  if (mediaContent) {
    const url = mediaContent.getAttribute("url");
    if (url) return url;
  }

  const mediaThumbnail = el.querySelector("media\\:thumbnail, thumbnail");
  if (mediaThumbnail) {
    const url = mediaThumbnail.getAttribute("url");
    if (url) return url;
  }

  // Try to extract from description HTML
  const desc = extractText(el, "description");
  const imgMatch = desc.match(/<img[^>]+src="([^"]+)"/);
  if (imgMatch) return imgMatch[1];

  return undefined;
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 60);
}

async function fetchFeed(feed: typeof RSS_FEEDS[0]): Promise<NewsItem[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "LastFootball/1.0" },
    });
    if (!res.ok) {
      console.warn(`Failed to fetch ${feed.source}: ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/html");
    if (!doc) return [];

    const items = doc.querySelectorAll("item");
    const results: NewsItem[] = [];

    for (let i = 0; i < Math.min(items.length, 15); i++) {
      const item = items[i];
      const title = extractText(item, "title");
      const description = extractText(item, "description")
        .replace(/<[^>]*>/g, "")
        .substring(0, 200);
      const link = extractText(item, "link");
      const pubDate = extractText(item, "pubDate");
      const image = extractImage(item);

      if (!title || !link) continue;

      results.push({
        id: normalizeTitle(title),
        title,
        description,
        url: link,
        source: feed.source,
        sourceIcon: feed.sourceIcon,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        imageUrl: image,
        category: feed.category,
      });
    }

    return results;
  } catch (err) {
    console.error(`Error fetching ${feed.source}:`, err);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Fetch all feeds in parallel
    const allResults = await Promise.all(RSS_FEEDS.map(fetchFeed));
    const allNews = allResults.flat();

    // Deduplicate by normalized title similarity
    const seen = new Set<string>();
    const unique: NewsItem[] = [];

    // Sort by date first (newest first)
    allNews.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    for (const item of allNews) {
      const key = item.id;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    return new Response(JSON.stringify({ news: unique.slice(0, 50) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
