import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import SEOHead from '@/components/SEOHead';
import OptimizedImage from '@/components/OptimizedImage';
import { fetchMatchesByDate, getToday } from '@/services/footballApi';
import { generateDailyReports, Article } from '@/services/articleGenerator';
import { fetchFootballNews, NewsItem } from '@/services/newsApi';
import { Flame, Clock, Loader2, Newspaper, FileText, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'reports' | 'trending';

export default function News() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [externalNews, setExternalNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('reports');

  useEffect(() => {
    const load = async () => {
      try {
        const [matches, news] = await Promise.allSettled([
          fetchMatchesByDate(getToday()),
          fetchFootballNews(),
        ]);

        if (matches.status === 'fulfilled') {
          const reports = generateDailyReports(matches.value);
          setArticles(reports);
        }

        if (news.status === 'fulfilled') {
          setExternalNews(news.value);
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const tabs = [
    { id: 'reports' as Tab, label: 'Match Reports', icon: <FileText className="w-3.5 h-3.5" />, count: articles.length },
    { id: 'trending' as Tab, label: 'Trending', icon: <Flame className="w-3.5 h-3.5" />, count: externalNews.length },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Football News & Match Reports — LastFootball"
        description="Original match reports and trending football news from top leagues worldwide."
        path="/news"
      />
      <Header />

      {/* Header banner */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-primary/20">
        <div className="container py-4 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Newspaper className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">News & Reports</h1>
            <p className="text-xs text-muted-foreground">{articles.length} match reports today</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container flex items-center gap-2 py-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                  : 'bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary',
              )}
            >
              {tab.icon}
              {tab.label}
              <span className={cn(
                'text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full',
                activeTab === tab.id ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground/70',
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <main className="container py-4 pb-20 md:pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading news...</span>
          </div>
        ) : activeTab === 'reports' ? (
          articles.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No match reports yet</p>
              <p className="text-sm mt-1">Reports are generated after matches finish today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Featured report */}
              {articles.length > 0 && <FeaturedReport article={articles[0]} />}
              {/* Rest */}
              {articles.slice(1).map(article => (
                <ReportCard key={article.id} article={article} />
              ))}
            </div>
          )
        ) : (
          externalNews.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Flame className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No trending news</p>
            </div>
          ) : (
            <div className="space-y-3">
              {externalNews.map((item, idx) => (
                <ExternalNewsCard key={idx} news={item} />
              ))}
            </div>
          )
        )}
      </main>
    </div>
  );
}

// Export articles for ArticleDetail to use
export { generateDailyReports };

function FeaturedReport({ article }: { article: Article }) {
  return (
    <Link
      to={`/news/${article.slug}`}
      className="block rounded-xl overflow-hidden border border-primary/20 bg-gradient-to-br from-card to-primary/5 hover:border-primary/40 transition-all group"
    >
      {/* Match score header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary/5 border-b border-primary/10">
        <div className="flex items-center gap-2">
          {article.homeTeam.logo && <OptimizedImage src={article.homeTeam.logo} alt="" className="w-6 h-6 object-contain" />}
          <span className="text-sm font-bold text-foreground">{article.homeTeam.name}</span>
        </div>
        <span className="text-lg font-black text-foreground tabular-nums px-3">
          {article.title.match(/(\d+\s*-\s*\d+)/)?.[0] || 'FT'}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">{article.awayTeam.name}</span>
          {article.awayTeam.logo && <OptimizedImage src={article.awayTeam.logo} alt="" className="w-6 h-6 object-contain" />}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {article.leagueLogo && <OptimizedImage src={article.leagueLogo} alt="" className="w-3.5 h-3.5 object-contain" />}
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">{article.leagueName}</span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {formatTimeAgo(article.publishedAt)}
          </span>
        </div>
        <h2 className="text-lg font-bold text-foreground leading-tight group-hover:text-primary transition-colors mb-2">
          {article.title}
        </h2>
        <p className="text-sm text-muted-foreground line-clamp-2">{article.summary}</p>
        <span className="inline-flex items-center gap-1 mt-3 text-xs text-primary font-semibold">
          Read full report →
        </span>
      </div>
    </Link>
  );
}

function ReportCard({ article }: { article: Article }) {
  return (
    <Link
      to={`/news/${article.slug}`}
      className="flex gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-card/80 transition-all group"
    >
      {/* Team logos stacked */}
      <div className="w-12 flex flex-col items-center justify-center gap-1 flex-shrink-0">
        {article.homeTeam.logo && <OptimizedImage src={article.homeTeam.logo} alt="" className="w-6 h-6 object-contain" />}
        <span className="text-[10px] font-black text-muted-foreground">vs</span>
        {article.awayTeam.logo && <OptimizedImage src={article.awayTeam.logo} alt="" className="w-6 h-6 object-contain" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-semibold text-primary">{article.leagueName}</span>
          <span className="text-muted-foreground/30">·</span>
          <span className="text-[10px] text-muted-foreground">{formatTimeAgo(article.publishedAt)}</span>
        </div>
        <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
          {article.title}
        </h3>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{article.summary}</p>
      </div>
    </Link>
  );
}

function ExternalNewsCard({ news }: { news: NewsItem }) {
  return (
    <a
      href={news.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 p-3 rounded-xl border border-border bg-card hover:border-orange-500/30 hover:bg-card/80 transition-all group"
    >
      {news.imageUrl && (
        <div className="w-24 h-20 rounded-lg overflow-hidden flex-shrink-0">
          <img src={news.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight group-hover:text-orange-400 transition-colors">
          {news.title}
        </h3>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[11px] font-medium text-orange-400">{news.source}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-[11px] text-muted-foreground">{formatTimeAgo(news.publishedAt)}</span>
        </div>
      </div>
      <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

function formatTimeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch { return ''; }
}
