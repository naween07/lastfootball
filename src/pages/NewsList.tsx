import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import SEOHead from '@/components/SEOHead';
import { supabase } from '@/integrations/supabase/client';
import { fetchMatchesByDate } from '@/services/footballApi';
import { generateDailyReports, Article } from '@/services/articleGenerator';
import { fetchFootballNews, NewsItem } from '@/services/newsApi';
import { Newspaper, FileText, Clock, Eye, Loader2, Globe, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'latest' | 'reports' | 'sources';

export default function NewsList() {
  const [activeTab, setActiveTab] = useState<Tab>('latest');
  const [articles, setArticles] = useState<any[]>([]);
  const [matchReports, setMatchReports] = useState<Article[]>([]);
  const [sourceNews, setSourceNews] = useState<NewsItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingSources, setLoadingSources] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('posts').select('id, title, slug, subtitle, excerpt, meta_description, author_name, featured_image, featured_image_alt, category, league, tags, reading_time_mins, view_count, published_at, type').eq('status', 'published').order('published_at', { ascending: false }).limit(50);
      if (data) setArticles(data);
      setLoadingNews(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const today = new Date();
        const dates = [0, 1, 2].map(d => { const date = new Date(today); date.setDate(date.getDate() - d); return date.toISOString().split('T')[0]; });
        const results = await Promise.all(dates.map(date => fetchMatchesByDate(date)));
        const allMatches = results.flat();
        const reports = generateDailyReports(allMatches);
        reports.sort((a, b) => {
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        });
        setMatchReports(reports);
      } catch {}
      setLoadingReports(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try { const news = await fetchFootballNews(); setSourceNews(news); } catch {}
      setLoadingSources(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <SEOHead title="Football News & Match Reports | LastFootball" description="Latest football news, match reports, transfer updates, and World Cup 2026 coverage." path="/news" />
      <Header />
      <div className="container max-w-4xl py-4 pb-20">
        <div className="flex items-center gap-2 mb-4">
          <Newspaper className="w-5 h-5 text-[#00ff87]" />
          <h1 className="text-lg font-black text-white uppercase tracking-wider">News</h1>
        </div>
        <div className="flex gap-2 mb-4 border-b border-[#1a1a1a] pb-2 overflow-x-auto">
          <button onClick={() => setActiveTab('latest')} className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap', activeTab === 'latest' ? 'bg-[#00ff87]/10 text-[#00ff87] border border-[#00ff87]/20' : 'text-[#555] hover:text-[#888]')}>
            <Newspaper className="w-3.5 h-3.5" /> Latest News
            {articles.length > 0 && <span className="ml-1 text-[9px] bg-[#00ff87]/20 text-[#00ff87] px-1.5 rounded-full">{articles.length}</span>}
          </button>
          <button onClick={() => setActiveTab('reports')} className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap', activeTab === 'reports' ? 'bg-[#00ff87]/10 text-[#00ff87] border border-[#00ff87]/20' : 'text-[#555] hover:text-[#888]')}>
            <FileText className="w-3.5 h-3.5" /> Match Reports
            {matchReports.length > 0 && <span className="ml-1 text-[9px] bg-amber-400/20 text-amber-400 px-1.5 rounded-full">{matchReports.length}</span>}
          </button>
          <button onClick={() => setActiveTab('sources')} className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap', activeTab === 'sources' ? 'bg-[#00ff87]/10 text-[#00ff87] border border-[#00ff87]/20' : 'text-[#555] hover:text-[#888]')}>
            <Globe className="w-3.5 h-3.5" /> External Sources
            {sourceNews.length > 0 && <span className="ml-1 text-[9px] bg-blue-400/20 text-blue-400 px-1.5 rounded-full">{sourceNews.length}</span>}
          </button>
        </div>

        {activeTab === 'latest' && (
          <div>
            {loadingNews ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[#00ff87]" /></div>
            ) : articles.length === 0 ? (
              <div className="text-center py-16 bg-[#111] border border-[#1e1e1e] rounded-xl">
                <Newspaper className="w-10 h-10 text-[#222] mx-auto mb-3" />
                <p className="text-sm text-[#555]">No articles published yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {articles.map(a => (
                  <Link key={a.id} to={"/news/" + a.slug} className="flex gap-4 bg-[#111] border border-[#1e1e1e] rounded-xl p-3 hover:border-[#2a2a2a] transition-colors group">
                    {a.featured_image && <img src={a.featured_image} alt={a.featured_image_alt || a.title} className="w-24 h-20 sm:w-32 sm:h-24 object-cover rounded-lg flex-shrink-0" />}
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
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div>
            {loadingReports ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[#00ff87]" /></div>
            ) : matchReports.length === 0 ? (
              <div className="text-center py-16 bg-[#111] border border-[#1e1e1e] rounded-xl">
                <FileText className="w-10 h-10 text-[#222] mx-auto mb-3" />
                <p className="text-sm text-[#555]">No match reports available.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {matchReports.map((report, i) => (
                  <div key={report.id || i} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 hover:border-[#2a2a2a] transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn('text-[8px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded', report.isFeatured ? 'text-amber-400 bg-amber-400/10' : 'text-[#00ff87] bg-[#00ff87]/10')}>
                        {report.isFeatured ? 'Featured' : report.category === 'roundup' ? 'Roundup' : 'Match Report'}
                      </span>
                      {report.leagueName && <span className="text-[8px] text-[#444]">{report.leagueName}</span>}
                    </div>
                    <h2 className="text-sm font-bold text-white mb-1">{report.title}</h2>
                    {report.summary && <p className="text-[11px] text-[#888] mb-2">{report.summary}</p>}
                    {report.body && <p className="text-xs text-[#666] line-clamp-3 leading-relaxed">{report.body.substring(0, 250).replace(/[#*]/g, '')}...</p>}
                    <div className="flex gap-2 mt-3">
                      {report.homeTeam && (
                        <div className="flex items-center gap-1.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-full px-2 py-0.5">
                          {report.homeTeam.logo && <img src={report.homeTeam.logo} alt="" className="w-3.5 h-3.5 object-contain" />}
                          <span className="text-[9px] text-[#666]">{report.homeTeam.name}</span>
                        </div>
                      )}
                      {report.awayTeam && (
                        <div className="flex items-center gap-1.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-full px-2 py-0.5">
                          {report.awayTeam.logo && <img src={report.awayTeam.logo} alt="" className="w-3.5 h-3.5 object-contain" />}
                          <span className="text-[9px] text-[#666]">{report.awayTeam.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'sources' && (
          <div>
            {loadingSources ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[#00ff87]" /></div>
            ) : sourceNews.length === 0 ? (
              <div className="text-center py-16 bg-[#111] border border-[#1e1e1e] rounded-xl">
                <Globe className="w-10 h-10 text-[#222] mx-auto mb-3" />
                <p className="text-sm text-[#555]">No external news available.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sourceNews.map((item, idx) => (
                  <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer" className="flex gap-3 bg-[#111] border border-[#1e1e1e] rounded-xl p-3 hover:border-[#2a2a2a] transition-colors group">
                    {item.imageUrl && <img src={item.imageUrl} alt="" className="w-24 h-20 object-cover rounded-lg flex-shrink-0" loading="lazy" />}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2">{item.title}</h3>
                      {item.description && <p className="text-[11px] text-[#666] mt-1 line-clamp-2">{item.description}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-medium text-blue-400">{item.source}</span>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-[#333] flex-shrink-0 mt-1 group-hover:text-blue-400" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
