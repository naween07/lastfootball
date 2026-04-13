import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/Header';
import { fetchFootballNews, NewsItem } from '@/services/newsApi';
import { Flame, ExternalLink, Clock, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const CATEGORIES = [
  { id: 'all', label: '🔥 All' },
  { id: 'general', label: '⚽ General' },
  { id: 'transfers', label: '🔄 Transfers' },
];

export default function News() {
  const [category, setCategory] = useState('all');

  const { data: news = [], isLoading } = useQuery({
    queryKey: ['football-news'],
    queryFn: fetchFootballNews,
    staleTime: 5 * 60 * 1000, // 5 min cache
    refetchInterval: 5 * 60 * 1000,
  });

  const filtered = category === 'all' ? news : news.filter(n => n.category === category);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Fire header */}
      <div className="bg-gradient-to-r from-orange-600/20 via-red-600/20 to-orange-600/20 border-b border-orange-500/20">
        <div className="container py-4 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/25">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Hot News</h1>
            <p className="text-xs text-muted-foreground">{news.length} trending stories</p>
          </div>
        </div>
      </div>

      {/* Category filter */}
      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container flex items-center gap-2 py-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                category === cat.id
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <main className="container py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            <span className="ml-2 text-sm text-muted-foreground">Loading hot news...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Flame className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No news found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Featured top story */}
            {filtered.length > 0 && (
              <FeaturedCard news={filtered[0]} />
            )}

            {/* Rest of news */}
            {filtered.slice(1).map((item, idx) => (
              <NewsCard key={item.id + idx} news={item} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function FeaturedCard({ news }: { news: NewsItem }) {
  const timeAgo = formatTimeAgo(news.publishedAt);

  return (
    <a
      href={news.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl overflow-hidden border border-orange-500/20 bg-gradient-to-br from-card to-orange-950/10 hover:border-orange-500/40 transition-all group"
    >
      {news.imageUrl && (
        <div className="relative h-48 overflow-hidden">
          <img
            src={news.imageUrl}
            alt={news.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute top-3 left-3">
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold uppercase tracking-wider">
              <Flame className="w-3 h-3" /> Trending
            </span>
          </div>
        </div>
      )}
      <div className="p-4">
        <h2 className="text-lg font-bold text-foreground leading-tight line-clamp-2 group-hover:text-orange-400 transition-colors">
          {news.title}
        </h2>
        {news.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{news.description}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-orange-400">{news.source}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {timeAgo}
          </div>
        </div>
      </div>
    </a>
  );
}

function NewsCard({ news }: { news: NewsItem }) {
  const timeAgo = formatTimeAgo(news.publishedAt);

  return (
    <a
      href={news.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 p-3 rounded-xl border border-border bg-card hover:border-orange-500/30 hover:bg-card/80 transition-all group"
    >
      {news.imageUrl && (
        <div className="w-24 h-20 rounded-lg overflow-hidden flex-shrink-0">
          <img
            src={news.imageUrl}
            alt={news.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight group-hover:text-orange-400 transition-colors">
          {news.title}
        </h3>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[11px] font-medium text-orange-400">{news.source}</span>
          <span className="text-muted-foreground">·</span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            {timeAgo}
          </span>
        </div>
      </div>
      <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

function formatTimeAgo(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return '';
  }
}
