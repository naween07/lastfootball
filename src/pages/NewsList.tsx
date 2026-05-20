import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import SEOHead from '@/components/SEOHead';
import { supabase } from '@/integrations/supabase/client';
import { Newspaper, Clock, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NewsList() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('posts').select('id, title, slug, subtitle, excerpt, meta_description, author_name, featured_image, featured_image_alt, category, league, tags, reading_time_mins, view_count, published_at, type').eq('status', 'published').order('published_at', { ascending: false }).limit(50);
      if (data) setArticles(data);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <SEOHead title="Football News & Analysis | LastFootball" description="Latest football news, match reports, transfer updates, and World Cup 2026 coverage." path="/news" />
      <Header />
      <div className="container max-w-4xl py-6 pb-20">
        <div className="flex items-center gap-2 mb-6">
          <Newspaper className="w-5 h-5 text-[#00ff87]" />
          <h1 className="text-xl font-black text-white uppercase tracking-wider">Latest News</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-[#00ff87] border-t-transparent rounded-full animate-spin" /></div>
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
    </div>
  );
}
