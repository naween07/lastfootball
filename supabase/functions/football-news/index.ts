import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  publishedAt: string;
  imageUrl?: string;
  category: string;
}

const RSS_FEEDS = [
  {
    url: "https://feeds.bbci.co.uk/sport/football/rss.xml",
    source: "BBC Sport",
    category: "general",
  },
  {
    url: "https://www.espn.com/espn/rss/soccer/news",
    source: "ESPN FC",
    category: "general",
  },
  {
    url: "https://www.skysports.com/rss/12040",
    source: "Sky Sports",
    category: "transfers",
  },
];

function getTagContent(item: string, tag: string): string {
  // Handle CDATA and regular content
  const patterns = [
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, "i"),
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"),
  ];
  for (const re of patterns) {
    const m = item.match(re);
    if (m) return m[1].trim();
  }
  return "";
}

function getImageUrl(item: string): string | undefined {
  // media:thumbnail
  const thumb = item.match(/<media:thumbnail[^>]+url="([^"]+)"/i);
  if (thumb) return thumb[1];
  // media:content
  const media = item.match(/<media:content[^>]+url="([^"]+)"/i);
  if (media) return media[1];
  // enclosure
  const enc = item.match(/<enclosure[^>]+url="([^"]+)"/i);
  if (enc) return enc[1];
  // img in description
  const desc = getTagContent(item, "description");
  const img = desc.match(/<img[^>]+src="([^"]+)"/i);
  if (img) return img[1];
  return undefined;
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 60);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'").trim();
}

async function fetchFeed(feed: typeof RSS_FEEDS[0]): Promise<NewsItem[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(feed.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LastFootball/1.0)" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`Feed ${feed.source} returned ${res.status}`);
      return [];
    }

    const xml = await res.text();
    
    // Split by <item> tags using regex
    const itemBlocks = xml.split(/<item[^>]*>/i).slice(1);
    const results: NewsItem[] = [];

    for (let i = 0; i < Math.min(itemBlocks.length, 15); i++) {
      const block = itemBlocks[i].split(/<\/item>/i)[0];
      const title = stripHtml(getTagContent(block, "title"));
      const description = stripHtml(getTagContent(block, "description")).substring(0, 200);
      const link = getTagContent(block, "link").trim();
      const pubDate = getTagContent(block, "pubDate");
      const image = getImageUrl(block);

      if (!title || !link) continue;

      results.push({
        id: normalizeTitle(title),
        title,
        description,
        url: link,
        source: feed.source,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        imageUrl: image,
        category: feed.category,
      });
    }

    console.log(`Fetched ${results.length} items from ${feed.source}`);
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
    const allResults = await Promise.all(RSS_FEEDS.map(fetchFeed));
    const allNews = allResults.flat();

    // Sort by date (newest first)
    allNews.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    // Deduplicate by normalized title
    const seen = new Set<string>();
    const unique: NewsItem[] = [];
    for (const item of allNews) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
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
