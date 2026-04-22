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
    const response = await fetch('/api/news', {
      headers: {
        "Content-Type": "application/json",
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
