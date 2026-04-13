const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface NewsItem {
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

export async function fetchFootballNews(): Promise<NewsItem[]> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/football-news`, {
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    });
    if (!response.ok) throw new Error(`News API error: ${response.status}`);
    const data = await response.json();
    return data.news || [];
  } catch (err) {
    console.error("Failed to fetch news:", err);
    return [];
  }
}
