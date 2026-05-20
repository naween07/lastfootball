import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import SEOHead from '@/components/SEOHead';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Newspaper, Plus, Edit3, Trash2, Eye, Save, Loader2, ArrowLeft, Image, Video, X, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Admin emails allowed to publish
const ADMIN_EMAILS = ['naweenkoemail@gmail.com'];

type EditorMode = 'list' | 'create' | 'edit';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<EditorMode>('list');
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    type: 'NewsArticle' as 'NewsArticle' | 'BlogPosting',
    body: '',
    excerpt: '',
    meta_description: '',
    category: 'Football',
    league: '',
    tags: '',
    teams: '',
    featured_image: '',
    featured_image_alt: '',
    featured_image_caption: '',
    author_name: 'LastFootball Editorial',
    status: 'published' as 'draft' | 'published',
  });

  const isAdmin = user && ADMIN_EMAILS.includes(user.email || '');

  // Load articles
  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    loadArticles();
  }, [isAdmin]);

  const loadArticles = async () => {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(100);
    if (data) setArticles(data);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({
      title: '', subtitle: '', type: 'NewsArticle', body: '', excerpt: '', meta_description: '',
      category: 'Football', league: '', tags: '', teams: '', featured_image: '', featured_image_alt: '',
      featured_image_caption: '', author_name: 'LastFootball Editorial', status: 'published',
    });
    setEditId(null);
  };

  const generateSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const generateJsonLd = (title: string, type: string, slug: string, desc: string, image: string) => ({
    '@context': 'https://schema.org',
    '@type': type,
    headline: title,
    description: desc || title,
    url: `https://lastfootball.com/news/${slug}`,
    datePublished: new Date().toISOString(),
    dateModified: new Date().toISOString(),
    author: { '@type': 'Person', name: form.author_name, url: 'https://lastfootball.com' },
    publisher: { '@type': 'Organization', name: 'LastFootball', url: 'https://lastfootball.com', logo: { '@type': 'ImageObject', url: 'https://lastfootball.com/logo.png' } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://lastfootball.com/news/${slug}` },
    ...(image ? { image: { '@type': 'ImageObject', url: image, width: 1200, height: 630 } } : {}),
    ...(type === 'NewsArticle' ? { dateline: new Date().toISOString(), articleSection: form.category } : {}),
  });

  // Save article
  const handleSave = async () => {
    if (!form.title || !form.body) return toast.error('Title and body are required');
    setSaving(true);

    const slug = generateSlug(form.title);
    const wordCount = form.body.split(/\s+/).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));
    const jsonLd = generateJsonLd(form.title, form.type, slug, form.meta_description || form.excerpt, form.featured_image);

    const payload = {
      type: form.type,
      status: form.status,
      title: form.title,
      slug,
      subtitle: form.subtitle || null,
      body: form.body,
      excerpt: form.excerpt || form.body.substring(0, 200).replace(/[#*\n]/g, '').trim(),
      meta_title: `${form.title} | LastFootball`,
      meta_description: (form.meta_description || form.excerpt || form.title).substring(0, 155),
      category: form.category,
      league: form.league || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
      teams: form.teams ? form.teams.split(',').map(t => t.trim()).filter(Boolean) : null,
      featured_image: form.featured_image || null,
      featured_image_alt: form.featured_image_alt || null,
      featured_image_caption: form.featured_image_caption || null,
      author_name: form.author_name,
      author_id: user?.id,
      json_ld: jsonLd,
      reading_time_mins: readingTime,
      published_at: form.status === 'published' ? new Date().toISOString() : null,
    };

    let error;
    if (editId) {
      ({ error } = await supabase.from('posts').update(payload).eq('id', editId));
    } else {
      ({ error } = await supabase.from('posts').insert(payload));
    }

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editId ? 'Article updated!' : `Article published at /news/${slug}`);
      resetForm();
      setMode('list');
      loadArticles();
    }
    setSaving(false);
  };

  // Delete article
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Article deleted');
    loadArticles();
  };

  // Edit article
  const handleEdit = (article: any) => {
    setForm({
      title: article.title || '',
      subtitle: article.subtitle || '',
      type: article.type || 'NewsArticle',
      body: article.body || '',
      excerpt: article.excerpt || '',
      meta_description: article.meta_description || '',
      category: article.category || 'Football',
      league: article.league || '',
      tags: article.tags?.join(', ') || '',
      teams: article.teams?.join(', ') || '',
      featured_image: article.featured_image || '',
      featured_image_alt: article.featured_image_alt || '',
      featured_image_caption: article.featured_image_caption || '',
      author_name: article.author_name || 'LastFootball Editorial',
      status: article.status || 'published',
    });
    setEditId(article.id);
    setMode('edit');
  };

  // Not admin
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]"><Header />
        <div className="text-center py-20">
          <h2 className="text-xl font-bold text-white mb-2">Admin Access Required</h2>
          <p className="text-sm text-[#555]">You don't have permission to access this page.</p>
          <Link to="/" className="text-[#00ff87] text-sm mt-4 inline-block">← Back to Home</Link>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <SEOHead title="Admin Dashboard | LastFootball" description="Admin publishing dashboard" path="/admin" />
      <Header />

      <div className="container max-w-5xl py-4 pb-20">

        {/* Header bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-[#00ff87]" />
            <h1 className="text-lg font-black text-white uppercase tracking-wider">
              {mode === 'list' ? 'Admin Dashboard' : mode === 'create' ? 'New Article' : 'Edit Article'}
            </h1>
          </div>
          {mode === 'list' ? (
            <button onClick={() => { resetForm(); setMode('create'); }} className="flex items-center gap-1.5 px-4 py-2 bg-[#00ff87] text-black text-xs font-bold rounded-lg hover:opacity-90">
              <Plus className="w-3.5 h-3.5" /> New Article
            </button>
          ) : (
            <button onClick={() => { setMode('list'); resetForm(); }} className="flex items-center gap-1 text-xs text-[#555] hover:text-white">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to List
            </button>
          )}
        </div>

        {/* ─── ARTICLE LIST ──────────────────────────────────────────── */}
        {mode === 'list' && (
          <div>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-white">{articles.length}</p>
                <p className="text-[9px] text-[#555] uppercase tracking-widest">Total</p>
              </div>
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-[#00ff87]">{articles.filter(a => a.status === 'published').length}</p>
                <p className="text-[9px] text-[#555] uppercase tracking-widest">Published</p>
              </div>
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-amber-400">{articles.reduce((s, a) => s + (a.view_count || 0), 0)}</p>
                <p className="text-[9px] text-[#555] uppercase tracking-widest">Total Views</p>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[#00ff87]" /></div>
            ) : articles.length === 0 ? (
              <div className="text-center py-16 bg-[#111] border border-[#1e1e1e] rounded-xl">
                <Newspaper className="w-10 h-10 text-[#222] mx-auto mb-3" />
                <p className="text-sm text-[#555]">No articles yet. Create your first one!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {articles.map(a => (
                  <div key={a.id} className="flex items-center gap-3 bg-[#111] border border-[#1e1e1e] rounded-xl p-3 hover:border-[#2a2a2a] transition-colors">
                    {a.featured_image && <img src={a.featured_image} alt="" className="w-16 h-12 object-cover rounded-lg flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={cn('text-[8px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded',
                          a.status === 'published' ? 'text-[#00ff87] bg-[#00ff87]/10' : 'text-amber-400 bg-amber-400/10',
                        )}>{a.status}</span>
                        <span className="text-[8px] text-[#444]">{a.type === 'NewsArticle' ? '📰' : '📝'} {a.category}</span>
                      </div>
                      <h3 className="text-sm font-bold text-white truncate">{a.title}</h3>
                      <div className="flex items-center gap-3 text-[9px] text-[#444] mt-0.5">
                        <span>{a.author_name}</span>
                        <span>{a.reading_time_mins}m read</span>
                        <span>{a.view_count} views</span>
                        <span>{new Date(a.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Link to={`/news/${a.slug}`} className="p-2 rounded-lg hover:bg-[#1a1a1a] text-[#555] hover:text-white"><Eye className="w-4 h-4" /></Link>
                      <button onClick={() => handleEdit(a)} className="p-2 rounded-lg hover:bg-[#1a1a1a] text-[#555] hover:text-[#00ff87]"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(a.id, a.title)} className="p-2 rounded-lg hover:bg-[#1a1a1a] text-[#555] hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── ARTICLE EDITOR ────────────────────────────────────────── */}
        {(mode === 'create' || mode === 'edit') && (
          <div className="space-y-4">

            {/* Type + Status row */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">Type</label>
                <div className="flex gap-2">
                  {(['NewsArticle', 'BlogPosting'] as const).map(t => (
                    <button key={t} onClick={() => setForm({ ...form, type: t })}
                      className={cn('px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all',
                        form.type === t ? 'bg-[#00ff87] text-black' : 'bg-[#111] text-[#555] border border-[#1e1e1e]',
                      )}>
                      {t === 'NewsArticle' ? '📰 News Article' : '📝 Blog Post'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">Status</label>
                <div className="flex gap-2">
                  {(['published', 'draft'] as const).map(s => (
                    <button key={s} onClick={() => setForm({ ...form, status: s })}
                      className={cn('px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all capitalize',
                        form.status === s ? (s === 'published' ? 'bg-[#00ff87] text-black' : 'bg-amber-400 text-black') : 'bg-[#111] text-[#555] border border-[#1e1e1e]',
                      )}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">Title *</label>
              <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Article headline..."
                className="w-full px-4 py-3 bg-[#111] border border-[#1e1e1e] rounded-xl text-white text-sm font-bold placeholder:text-[#333] focus:outline-none focus:border-[#00ff87]/50" />
              {form.title && <p className="text-[9px] text-[#444] mt-1">Slug: /news/{generateSlug(form.title)}</p>}
            </div>

            {/* Subtitle */}
            <div>
              <label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">Subtitle</label>
              <input type="text" value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} placeholder="Optional subtitle..."
                className="w-full px-4 py-2.5 bg-[#111] border border-[#1e1e1e] rounded-xl text-white text-sm placeholder:text-[#333] focus:outline-none focus:border-[#00ff87]/50" />
            </div>

            {/* Body — Markdown editor */}
            <div>
              <label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">Body (Markdown) *</label>
              <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} placeholder="Write your article in Markdown..."
                rows={16}
                className="w-full px-4 py-3 bg-[#111] border border-[#1e1e1e] rounded-xl text-white text-sm font-mono leading-relaxed placeholder:text-[#333] focus:outline-none focus:border-[#00ff87]/50 resize-y" />
              <p className="text-[9px] text-[#444] mt-1">{form.body.split(/\s+/).filter(Boolean).length} words · ~{Math.max(1, Math.ceil(form.body.split(/\s+/).filter(Boolean).length / 200))} min read</p>
            </div>

            {/* Excerpt */}
            <div>
              <label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">Excerpt / Summary</label>
              <textarea value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} placeholder="Brief summary for article cards..."
                rows={2}
                className="w-full px-4 py-2.5 bg-[#111] border border-[#1e1e1e] rounded-xl text-white text-sm placeholder:text-[#333] focus:outline-none focus:border-[#00ff87]/50 resize-y" />
            </div>

            {/* SEO */}
            <div>
              <label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">Meta Description (SEO)</label>
              <textarea value={form.meta_description} onChange={e => setForm({ ...form, meta_description: e.target.value })} placeholder="155 chars max for Google SERP..."
                rows={2} maxLength={155}
                className="w-full px-4 py-2.5 bg-[#111] border border-[#1e1e1e] rounded-xl text-white text-sm placeholder:text-[#333] focus:outline-none focus:border-[#00ff87]/50 resize-y" />
              <p className="text-[9px] text-[#444] mt-0.5">{form.meta_description.length}/155 characters</p>
            </div>

            {/* Category + League row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#111] border border-[#1e1e1e] rounded-xl text-white text-sm focus:outline-none focus:border-[#00ff87]/50">
                  {['Football', 'World Cup 2026', 'Transfer News', 'Match Report', 'Analysis', 'Opinion', 'Interviews'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">League</label>
                <select value={form.league} onChange={e => setForm({ ...form, league: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#111] border border-[#1e1e1e] rounded-xl text-white text-sm focus:outline-none focus:border-[#00ff87]/50">
                  <option value="">None</option>
                  {['World Cup 2026', 'Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1', 'Champions League', 'Europa League'].map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tags + Teams */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">Tags (comma separated)</label>
                <input type="text" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="e.g. Mbappé, Transfer, World Cup"
                  className="w-full px-3 py-2.5 bg-[#111] border border-[#1e1e1e] rounded-xl text-white text-sm placeholder:text-[#333] focus:outline-none focus:border-[#00ff87]/50" />
              </div>
              <div>
                <label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">Teams (comma separated)</label>
                <input type="text" value={form.teams} onChange={e => setForm({ ...form, teams: e.target.value })} placeholder="e.g. France, Argentina, Brazil"
                  className="w-full px-3 py-2.5 bg-[#111] border border-[#1e1e1e] rounded-xl text-white text-sm placeholder:text-[#333] focus:outline-none focus:border-[#00ff87]/50" />
              </div>
            </div>

            {/* Featured Image */}
            <div>
              <label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">Featured Image URL</label>
              <div className="flex gap-2">
                <input type="text" value={form.featured_image} onChange={e => setForm({ ...form, featured_image: e.target.value })} placeholder="https://..."
                  className="flex-1 px-3 py-2.5 bg-[#111] border border-[#1e1e1e] rounded-xl text-white text-sm placeholder:text-[#333] focus:outline-none focus:border-[#00ff87]/50" />
                {form.featured_image && <img src={form.featured_image} alt="" className="w-16 h-12 object-cover rounded-lg border border-[#1e1e1e]" />}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">Image Alt Text (SEO)</label>
                <input type="text" value={form.featured_image_alt} onChange={e => setForm({ ...form, featured_image_alt: e.target.value })} placeholder="Describe the image..."
                  className="w-full px-3 py-2.5 bg-[#111] border border-[#1e1e1e] rounded-xl text-white text-sm placeholder:text-[#333] focus:outline-none focus:border-[#00ff87]/50" />
              </div>
              <div>
                <label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">Image Caption</label>
                <input type="text" value={form.featured_image_caption} onChange={e => setForm({ ...form, featured_image_caption: e.target.value })} placeholder="Photo credit..."
                  className="w-full px-3 py-2.5 bg-[#111] border border-[#1e1e1e] rounded-xl text-white text-sm placeholder:text-[#333] focus:outline-none focus:border-[#00ff87]/50" />
              </div>
            </div>

            {/* Author */}
            <div>
              <label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">Author Name</label>
              <input type="text" value={form.author_name} onChange={e => setForm({ ...form, author_name: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#111] border border-[#1e1e1e] rounded-xl text-white text-sm focus:outline-none focus:border-[#00ff87]/50" />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button onClick={handleSave} disabled={saving || !form.title || !form.body}
                className={cn('flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all',
                  form.title && form.body ? 'bg-[#00ff87] text-black hover:opacity-90' : 'bg-gray-700 text-gray-500 cursor-not-allowed',
                )}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {editId ? 'Update Article' : form.status === 'published' ? 'Publish Now' : 'Save Draft'}
              </button>
              <button onClick={() => { setMode('list'); resetForm(); }} className="px-4 py-3 rounded-xl text-sm text-[#555] hover:text-white bg-[#111] border border-[#1e1e1e]">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
