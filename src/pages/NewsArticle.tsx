import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '@/components/Header';
import SEOHead from '@/components/SEOHead';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, Eye, User, ArrowLeft, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NewsArticle() {
  const { slug } = useParams();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase.from('posts').select('*').eq('slug', slug).eq('status', 'published').single();
      if (data) {
        setArticle(data);
        // Increment views
        await supabase.from('posts').update({ view_count: (data.view_count || 0) + 1 }).eq('id', data.id);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="min-h-screen bg-[#0a0a0a]"><Header /><div className="flex justify-center py-20"><div className="w-5 h-5 border-2 border-[#00ff87] border-t-transparent rounded-full animate-spin" /></div></div>;
  if (!article) return <div className="min-h-screen bg-[#0a0a0a]"><Header /><div className="text-center py-20"><h2 className="text-xl font-bold text-white">Article not found</h2><Link to="/news" className="text-[#00ff87] text-sm mt-2 inline-block">← Back to News</Link></div></div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <SEOHead 
        title={`${article.meta_title || article.title} | LastFootball`}
        description={article.meta_description || article.excerpt || article.title}
        path={`/news/${slug}`}
      />
      {/* JSON-LD */}
      {article.json_ld && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article.json_ld) }} />
      )}
      <Header />

      <article className="container max-w-3xl py-6 pb-20">
        {/* Back */}
        <Link to="/news" className="inline-flex items-center gap-1 text-xs text-[#555] hover:text-[#00ff87] mb-4">
          <ArrowLeft className="w-3 h-3" /> Back to News
        </Link>

        {/* Category + Type badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[9px] uppercase tracking-widest font-bold text-[#00ff87] bg-[#00ff87]/10 px-2 py-0.5 rounded">{article.category}</span>
          {article.league && <span className="text-[9px] uppercase tracking-widest font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">{article.league}</span>}
          <span className="text-[9px] text-[#444]">{article.type === 'NewsArticle' ? '📰 News' : '📝 Blog'}</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-2">{article.title}</h1>
        {article.subtitle && <p className="text-base text-[#888] mb-4">{article.subtitle}</p>}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#555] mb-6 pb-4 border-b border-[#1a1a1a]">
          <span className="flex items-center gap-1"><User className="w-3 h-3" />{article.author_name}</span>
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{article.reading_time_mins} min read</span>
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{article.view_count} views</span>
        </div>

        {/* Featured image */}
        {article.featured_image && (
          <div className="mb-6 rounded-xl overflow-hidden border border-[#1e1e1e]">
            <img src={article.featured_image} alt={article.featured_image_alt || article.title} className="w-full object-cover max-h-[400px]" />
            {article.featured_image_caption && <p className="text-[10px] text-[#555] p-2 bg-[#111]">{article.featured_image_caption}</p>}
          </div>
        )}

        {/* Article body */}
        <div className="prose prose-invert prose-sm max-w-none 
          prose-headings:text-white prose-headings:font-bold
          prose-p:text-[#ccc] prose-p:leading-relaxed
          prose-a:text-[#00ff87] prose-a:no-underline hover:prose-a:underline
          prose-strong:text-white
          prose-blockquote:border-[#00ff87] prose-blockquote:text-[#888]
          prose-li:text-[#ccc]
        ">
          {/* Render markdown as HTML */}
          <div dangerouslySetInnerHTML={{ __html: markdownToHtml(article.body) }} />
        </div>

        {/* Tags */}
        {article.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8 pt-4 border-t border-[#1a1a1a]">
            <Tag className="w-3.5 h-3.5 text-[#444]" />
            {article.tags.map((tag: string) => (
              <span key={tag} className="text-[10px] text-[#555] bg-[#111] border border-[#1e1e1e] px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
        )}

        {/* Teams */}
        {article.teams?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {article.teams.map((team: string) => (
              <span key={team} className="text-[10px] text-[#00ff87] bg-[#00ff87]/5 border border-[#00ff87]/20 px-2 py-0.5 rounded-full">{team}</span>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}

// Simple markdown to HTML converter
function markdownToHtml(md: string): string {
  if (!md) return '';
  return md
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-lg" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[h|u|l|p|i])/gm, '<p>')
    .replace(/<p><\/p>/g, '');
}
