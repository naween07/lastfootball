import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import SEOHead from '@/components/SEOHead';
import OptimizedImage from '@/components/OptimizedImage';
import { supabase } from '@/integrations/supabase/client';
import { fetchMatchesByDate } from '@/services/footballApi';
import { generateDailyReports, Article } from '@/services/articleGenerator';
import { Newspaper, FileText, Clock, Eye, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'latest' | 'reports';

export default function NewsList() {
  const [activeTab, setActiveTab] = useState<Tab>('latest');
  const [articles, setArticles] = useState<any[]>([]);
  const [matchReports, setMatchReports] = useState<Article[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);

  // Load admin-published articles
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('posts').select('id, title, slug, subtitle, excerpt, meta_description, author_name, featured_image, featured_image_alt, category, league, tags, reading_time_mins, view_count, published_at, type').eq('status', 'published').order('published_at', { ascending: false }).limit(50);
      if (data) setArticles(data);
      setLoadingNews(false);
    })();
  }, []);

  // Load auto-generated match reports
  useEffect(() => {
    (async () => {
      try {
        const today = new Date();
        const dates = [0, 1, 2].map(d => {
          const date = new Date(today);
          date.setDate(date.getDate() - d);
          return date.toISOString().split('T')[0];
        });
        const results = await Promise.all(dates.map(date => fetchMatchesByDate(date)));
        const allMatches = results.flat();
        const reports = generateDailyReports(allMatches);
        reports.sort((a, b) => {
          if (a.category === 'featured' && b.category !== 'featured') return -1;
          if (b.category === 'featured' && a.category !== 'featured') return 1;
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        });
        setMatchReports(reports);
      } catch {}
      setLoadingReports(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <SEOHead title="Football News & Match Reports | LastFootball" description="Latest football news, match reports, transfer updates, and World Cup 2026 coverage." path="/news" />
      <Header />
      <div className="container max-w-4xl py-4 pb-20">

        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Newspaper className="w-5 h-5 text-[#00ff87]" />
          <h1 className="text-lg font-black text-white uppercase tracking-wider">News</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-[#1a1a1a] pb-2">
          <button onClick={() => setActiveTab('latest')}
            className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all',
              activeTab === 'latest' ? 'bg-[#00ff87]/10 text-[#00ff87] border border-[#00ff87]/20' : 'text-[#555] hover:text-[#888]',
            )}>
            <Newspaper className="w-3.5 h-3.5" /> Latest News
            {articles.length > 0 && <span className="ml-1 text-[9px] bg-[#00ff87]/20 text-[#00ff87] px-1.5 rounded-full">{articles.length}</span>}
          </button>
          <button onClick={() => setActiveTab('reports')}
            className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all',
              activeTab === 'reports' ? 'bg-[#00ff87]/10 text-[#00ff87] border border-[#00ff87]/20' : 'text-[#555] hover:text-[#888]',
            )}>
            <FileText className="w-3.5 h-3.5" /> Match Reports
            {matchReports.length > 0 && <span className="ml-1 text-[9px] bg-amber-400/20 text-amber-400 px-1.5 rounded-full">{matchReports.length}</span>}
          </button>
        </div>

        {/* ─── LATEST NEWS TAB ───────────────────────────────────────── */}
        {activeTab === 'latest' && (
          <div>
            {loadingNews ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[#00ff87]" /></div>
            ) : articles.length === 0 ? (
              <div className="text-center py-16 bg-[#111] border border-[#1e1e1e] rounded-xl">
                <Newspaper className="w-10 h-10 text-[#222] mx-auto mb-3" />
                <p className="text-sm text-[#555]">No articles published yet. Check back soon!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {articles.map(a => (
                  <Link key={a.id} to={`/news/${a.slug}`} className="flex gap-4 bg-[#111] border border-[#1e1e1e] rounded-xl p-3 hover:border-[#2a2a2a] transition-colors group">
                    {a.featured_image && (
                      <img src={a.featured_image} alt={a.featured_image_alt || a.title} className="w-24 h-20 sm:w-32 sm:h-24 object-cover rounded-lg flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[8px] uppercase tracking-widest font-bold text-[#00ff87]">{a.category}</span>
                        {a.league && <span className="text-[8px] uppercase tracking-widest text-amber-400">{a.league}</span>}
                      </div>
                      <h2 className="text-sm font-bold text-white group-hover:text-[#00ff87] transition-colors line-clamp-2">{a.title}</h2>
                      {a.excerpt && <p className="text-[11px] text-[#666] mt-1 line-clamp-2">{a.excerpt}</p>}
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-[#444]">
                        <span>{a.author_name}</span>
                        <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{a.reading_time_mins}m</span>
                        <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{a.view_count}</span>
                        <span>{new Date(a.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── MATCH REPORTS TAB ─────────────────────────────────────── */}
        {activeTab === 'reports' && (
          <div>
            {loadingReports ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[#00ff87]" /></div>
            ) : matchReports.length === 0 ? (
              <div className="text-center py-16 bg-[#111] border border-[#1e1e1e] rounded-xl">
                <FileText className="w-10 h-10 text-[#222] mx-auto mb-3" />
                <p className="text-sm text-[#555]">No match reports available. Reports are generated after matches finish.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {matchReports.map((report, i) => (
                  <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 hover:border-[#2a2a2a] transition-colors">
                    {/* Category badge */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn('text-[8px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded',
                        report.category === 'featured' ? 'text-amber-400 bg-amber-400/10' :
                        report.category === 'match-report' ? 'text-[#00ff87] bg-[#00ff87]/10' :
                        'text-blue-400 bg-blue-400/10',
                      )}>
                        {report.category === 'featured' ? '⭐ Featured' : report.category === 'match-report' ? '📊 Match Report' : '📋 Roundup'}
                      </span>
                      {report.league && <span className="text-[8px] text-[#444]">{report.league}</span>}
                      <span className="text-[8px] text-[#333] ml-auto">{new Date(report.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {/* Title */}
                    <h2 className="text-sm font-bold text-white mb-1">{report.title}</h2>

                    {/* Subtitle */}
                    {report.subtitle && <p className="text-[11px] text-[#888] mb-2">{report.subtitle}</p>}

                    {/* Body preview */}
                    <p className="text-xs text-[#666] line-clamp-4 leading-relaxed">{report.body.substring(0, 300).replace(/[#*]/g, '')}...</p>

                    {/* Teams */}
                    {report.teams && report.teams.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {report.teams.map(team => (
                          <div key={team.id} className="flex items-center gap-1.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-full px-2 py-0.5">
                            {team.logo && <img src={team.logo} alt="" className="w-3.5 h-3.5 object-contain" />}
                            <span className="text-[9px] text-[#666]">{team.name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Stats if available */}
                    {report.stats && (
                      <div className="flex gap-4 mt-3 pt-2 border-t border-[#1a1a1a]">
                        {report.stats.possession && (
                          <div className="text-center">
                            <p className="text-[9px] text-[#444] uppercase">Possession</p>
                            <p className="text-xs font-bold text-white">{report.stats.possession[0]}% - {report.stats.possession[1]}%</p>
                          </div>
                        )}
                        {report.stats.shots && (
                          <div className="text-center">
                            <p className="text-[9px] text-[#444] uppercase">Shots</p>
                            <p className="text-xs font-bold text-white">{report.stats.shots[0]} - {report.stats.shots[1]}</p>
                          </div>
                        )}
                        {report.stats.shotsOnTarget && (
                          <div className="text-center">
                            <p className="text-[9px] text-[#444] uppercase">On Target</p>
                            <p className="text-xs font-bold text-white">{report.stats.shotsOnTarget[0]} - {report.stats.shotsOnTarget[1]}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
