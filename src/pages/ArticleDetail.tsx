import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '@/components/Header';
import SEOHead from '@/components/SEOHead';
import OptimizedImage from '@/components/OptimizedImage';
import { fetchMatchDetails } from '@/services/footballApi';
import { generateMatchReport, Article } from '@/services/articleGenerator';
import { ArrowLeft, Calendar, Share2, Loader2 } from 'lucide-react';

export default function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    // Extract match ID from slug (format: team1-score-score-team2-date)
    // We'll try to find it by fetching today's matches and generating reports
    const load = async () => {
      try {
        const { fetchMatchesByDate } = await import('@/services/footballApi');
        const { generateDailyReports } = await import('@/services/articleGenerator');
        
        // Search last 3 days for the article
        const today = new Date();
        const dates = [0, 1, 2].map(d => {
          const date = new Date(today);
          date.setDate(date.getDate() - d);
          return date.toISOString().split('T')[0];
        });

        const allMatches = (await Promise.all(dates.map(date => fetchMatchesByDate(date)))).flat();
        const reports = generateDailyReports(allMatches);
        const found = reports.find(a => a.slug === slug);
        setArticle(found || null);
      } catch {}
      setLoading(false);
    };
    load();
  }, [slug]);

  const handleShare = async () => {
    if (!article) return;
    const shareText = `${article.title} | LastFootball`;
    const shareUrl = `https://lastfootball.com/news/${article.slug}`;
    if (navigator.share) {
      try { await navigator.share({ title: shareText, url: shareUrl }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`); } catch {}
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container text-center py-20">
          <p className="text-lg font-medium text-muted-foreground">Article not found</p>
          <Link to="/news" className="text-primary hover:underline text-sm mt-2 inline-block">← Back to News</Link>
        </div>
      </div>
    );
  }

  // Extract score from title
  const scoreMatch = article.title.match(/(\d+)\s*-\s*(\d+)/);
  const scoreDisplay = scoreMatch ? scoreMatch[0] : 'FT';

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${article.title} — LastFootball`}
        description={article.summary}
        path={`/news/${article.slug}`}
      />
      <Header />

      <main className="container max-w-3xl py-6 pb-20 md:pb-6">
        {/* Back + Share */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/news" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to News
          </Link>
          <button onClick={handleShare} className="p-2 rounded-full hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors">
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* League badge */}
        <div className="flex items-center gap-2 mb-3">
          {article.leagueLogo && <OptimizedImage src={article.leagueLogo} alt="" className="w-4 h-4 object-contain" />}
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">{article.leagueName}</span>
          <span className="text-muted-foreground/30">·</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(article.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-black text-foreground leading-tight mb-4">
          {article.title}
        </h1>

        {/* Match score card */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <div className="flex items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-2">
              {article.homeTeam.logo && <OptimizedImage src={article.homeTeam.logo} alt="" className="w-10 h-10 object-contain" />}
              <span className="text-xs font-bold text-foreground">{article.homeTeam.name}</span>
            </div>
            <Link to={`/match/${article.matchId}`} className="text-center hover:opacity-80 transition-opacity">
              <div className="text-2xl font-black text-foreground tabular-nums">{scoreDisplay}</div>
              <span className="text-[10px] text-primary font-semibold">View Match →</span>
            </Link>
            <div className="flex flex-col items-center gap-2">
              {article.awayTeam.logo && <OptimizedImage src={article.awayTeam.logo} alt="" className="w-10 h-10 object-contain" />}
              <span className="text-xs font-bold text-foreground">{article.awayTeam.name}</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <p className="text-base font-semibold text-foreground/90 leading-relaxed mb-6">
          {article.summary}
        </p>

        {/* Body */}
        {article.body.split('\n\n').map((para, i) => (
          <p key={i} className="text-sm text-foreground/80 leading-relaxed mb-4">
            {para}
          </p>
        ))}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-border/30 text-center">
          <p className="text-[10px] text-muted-foreground/50">
            This report was generated by LastFootball based on official match data.
          </p>
        </div>
      </main>
    </div>
  );
}
