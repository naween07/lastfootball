import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import SEOHead from '@/components/SEOHead';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Newspaper, Plus, Edit3, Trash2, Eye, Save, Loader2, ArrowLeft, Image, Video, X, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ADMIN_EMAILS = ['naweenkoemail@gmail.com', 'kundanshrestha31@gmail.com'];

type EditorMode = 'list' | 'create' | 'edit';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<EditorMode>('list');
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [form, setForm] = useState({
    title: '', subtitle: '', type: 'NewsArticle' as 'NewsArticle' | 'BlogPosting',
    body: '', excerpt: '', meta_description: '', category: 'Football', league: '',
    tags: '', teams: '', featured_image: '', featured_image_alt: '',
    featured_image_caption: '', author_name: 'LastFootball Editorial',
    status: 'published' as 'draft' | 'published',
  });

  const isAdmin = user && ADMIN_EMAILS.includes(user.email || '');

  useEffect(() => { if (!isAdmin) { setLoading(false); return; } loadArticles(); }, [isAdmin]);

  const loadArticles = async () => {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(100);
    if (data) setArticles(data);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ title: '', subtitle: '', type: 'NewsArticle', body: '', excerpt: '', meta_description: '',
      category: 'Football', league: '', tags: '', teams: '', featured_image: '', featured_image_alt: '',
      featured_image_caption: '', author_name: 'LastFootball Editorial', status: 'published' });
    setEditId(null);
  };

  const generateSlug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleSave = async () => {
    if (!form.title || !form.body) return toast.error('Title and body required');
    if (!user) return toast.error('You must be signed in to publish');
    setSaving(true);
    try {
      const finalSlug = generateSlug(form.title);
      const wordCount = form.body.split(/\s+/).filter(Boolean).length;
      const readingTime = Math.max(1, Math.ceil(wordCount / 200));

      const payload: Record<string, any> = {
        type: form.type, status: form.status, title: form.title,
        subtitle: form.subtitle || null, body: form.body,
        excerpt: (form.excerpt || form.body)?.replace(/\"/g, "'").substring(0, 200).replace(/[#*\n]/g, '').trim() || null,
        meta_title: form.title + ' | LastFootball',
        meta_description: (form.meta_description || form.excerpt || form.title).substring(0, 155),
        category: form.category || 'Football', league: form.league || null,
        tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : null,
        teams: form.teams ? form.teams.split(',').map((t: string) => t.trim()).filter(Boolean) : null,
        featured_image: form.featured_image || null,
        featured_image_alt: form.featured_image_alt || null,
        featured_image_caption: form.featured_image_caption || null,
        author_name: form.author_name || 'LastFootball Editorial',
        reading_time_mins: readingTime, updated_at: new Date().toISOString(),
      };
      if (!editId) {
        payload.slug = finalSlug;
        payload.author_id = user?.id;
        payload.published_at = form.status === 'published' ? new Date().toISOString() : null;
      } else if (form.status === 'published') {
        payload.published_at = new Date().toISOString();
      }

      const writePromise = editId
        ? supabase.from('posts').update(payload).eq('id', editId)
        : supabase.from('posts').insert(payload).select();
      const timeout = new Promise((resolve) => setTimeout(() => resolve({ error: { message: 'Request timed out after 15s - likely a server/proxy issue.' } }), 20000));
      const { error } = await Promise.race([writePromise, timeout]);

      if (error) { console.error('Publish error:', error); toast.error('Failed: ' + (error.message || 'Unknown error')); }
      else { toast.success(editId ? 'Updated!' : 'Published at /news/' + finalSlug); resetForm(); setMode('list'); loadArticles(); }
    } catch (err: any) {
      console.error('Publish exception:', err);
      toast.error(err?.message || 'Unexpected error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm('Delete ' + title + '?')) return;
    await supabase.from('posts').delete().eq('id', id);
    toast.success('Deleted'); loadArticles();
  };

  const handleEdit = (a: any) => {
    setForm({ title: a.title||'', subtitle: a.subtitle||'', type: a.type||'NewsArticle', body: a.body||'',
      excerpt: a.excerpt||'', meta_description: a.meta_description||'', category: a.category||'Football',
      league: a.league||'', tags: a.tags?.join(', ')||'', teams: a.teams?.join(', ')||'',
      featured_image: a.featured_image||'', featured_image_alt: a.featured_image_alt||'',
      featured_image_caption: a.featured_image_caption||'', author_name: a.author_name||'LastFootball Editorial',
      status: a.status||'published' });
    setEditId(a.id); setMode('edit');
  };

  const handleImageUpload = async (file: File) => {
    if (file.size > 5*1024*1024) return toast.error('Max 5MB');
    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop();
      const name = Date.now() + '-' + Math.random().toString(36).slice(2,8) + '.' + ext;
      const { error } = await supabase.storage.from('articles').upload(name, file, { cacheControl: '31536000' });
      if (error) { toast.error('Upload failed: ' + error.message); setUploadingImage(false); return; }
      const { data } = supabase.storage.from('articles').getPublicUrl(name);
      setForm(prev => ({ ...prev, featured_image: data.publicUrl }));
      toast.success('Image uploaded!');
    } catch (e: any) { toast.error(e.message); }
    setUploadingImage(false);
  };

  if (!user || !isAdmin) return (<div className="min-h-screen bg-[#0a0a0a]"><Header /><div className="text-center py-20"><h2 className="text-xl font-bold text-white mb-2">Admin Access Required</h2><Link to="/" className="text-[#00ff87] text-sm mt-4 inline-block">Back</Link></div></div>);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <SEOHead title="Admin | LastFootball" description="Admin" path="/admin" />
      <Header />
      <div className="container max-w-5xl py-4 pb-20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2"><Newspaper className="w-5 h-5 text-[#00ff87]" /><h1 className="text-lg font-black text-white uppercase tracking-wider">{mode === 'list' ? 'Admin Dashboard' : mode === 'create' ? 'New Article' : 'Edit Article'}</h1></div>
          {mode === 'list' ? (<button onClick={() => { resetForm(); setMode('create'); }} className="flex items-center gap-1.5 px-4 py-2 bg-[#00ff87] text-black text-xs font-bold rounded-lg"><Plus className="w-3.5 h-3.5" /> New Article</button>)
          : (<button onClick={() => { setMode('list'); resetForm(); }} className="flex items-center gap-1 text-xs text-[#555] hover:text-white"><ArrowLeft className="w-3.5 h-3.5" /> Back</button>)}
        </div>

        {mode === 'list' && (<div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 text-center"><p className="text-2xl font-black text-white">{articles.length}</p><p className="text-[9px] text-[#555] uppercase tracking-widest">Total</p></div>
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 text-center"><p className="text-2xl font-black text-[#00ff87]">{articles.filter(a=>a.status==='published').length}</p><p className="text-[9px] text-[#555] uppercase tracking-widest">Published</p></div>
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 text-center"><p className="text-2xl font-black text-amber-400">{articles.reduce((s,a)=>s+(a.view_count||0),0)}</p><p className="text-[9px] text-[#555] uppercase tracking-widest">Views</p></div>
          </div>
          {loading ? <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[#00ff87]" /></div>
          : articles.length === 0 ? <div className="text-center py-16 bg-[#111] border border-[#1e1e1e] rounded-xl"><p className="text-sm text-[#555]">No articles yet</p></div>
          : <div className="space-y-2">{articles.map(a => (
            <div key={a.id} className="flex items-center gap-3 bg-[#111] border border-[#1e1e1e] rounded-xl p-3">
              {a.featured_image && <img src={a.featured_image} alt="" className="w-16 h-12 object-cover rounded-lg flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5"><span className={cn('text-[8px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded', a.status==='published'?'text-[#00ff87] bg-[#00ff87]/10':'text-amber-400 bg-amber-400/10')}>{a.status}</span><span className="text-[8px] text-[#444]">{a.category}</span></div>
                <h3 className="text-sm font-bold text-white truncate">{a.title}</h3>
                <div className="flex items-center gap-3 text-[9px] text-[#444] mt-0.5"><span>{a.author_name}</span><span>{a.view_count} views</span><span>{new Date(a.created_at).toLocaleDateString()}</span></div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Link to={'/news/'+a.slug} className="p-2 rounded-lg hover:bg-[#1a1a1a] text-[#555] hover:text-white"><Eye className="w-4 h-4" /></Link>
                <button onClick={()=>handleEdit(a)} className="p-2 rounded-lg hover:bg-[#1a1a1a] text-[#555] hover:text-[#00ff87]"><Edit3 className="w-4 h-4" /></button>
                <button onClick={()=>handleDelete(a.id,a.title)} className="p-2 rounded-lg hover:bg-[#1a1a1a] text-[#555] hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>))}</div>}
        </div>)}

        {(mode === 'create' || mode === 'edit') && (<div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1"><label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">Type</label><div className="flex gap-2">
              {(['NewsArticle','BlogPosting'] as const).map(t=>(<button key={t} onClick={()=>setForm({...form,type:t})} className={cn('px-3 py-1.5 rounded-lg text-[10px] font-bold',form.type===t?'bg-[#00ff87] text-black':'bg-[#111] text-[#555] border border-[#1e1e1e]')}>{t==='NewsArticle'?'News':'Blog'}</button>))}
            </div></div>
            <div><label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">Status</label><div className="flex gap-2">
              {(['published','draft'] as const).map(s=>(<button key={s} onClick={()=>setForm({...form,status:s})} className={cn('px-3 py-1.5 rounded-lg text-[10px] font-bold capitalize',form.status===s?(s==='published'?'bg-[#00ff87] text-black':'bg-amber-400 text-black'):'bg-[#111] text-[#555] border border-[#1e1e1e]')}>{s}</button>))}
            </div></div>
          </div>

          <div><label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">Title *</label>
            <input type="text" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Article headline..."
              className="w-full px-4 py-3 bg-[#111] border border-[#1e1e1e] rounded-xl text-white text-sm font-bold placeholder:text-[#333] focus:outline-none focus:border-[#00ff87]/50" />
            {form.title && <p className="text-[9px] text-[#444] mt-1">Slug: /news/{generateSlug(form.title)}</p>}
          </div>

          <div><label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">Subtitle</label>
            <input type="text" value={form.subtitle} onChange={e=>setForm({...form,subtitle:e.target.value})} placeholder="Optional..."
              className="w-full px-4 py-2.5 bg-[#111] border border-[#1e1e1e] rounded-xl text-white text-sm placeholder:text-[#333] focus:outline-none focus:border-[#00ff87]/50" />
          </div>

          <div><label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">Body (Markdown) *</label>
            <textarea value={form.body} onChange={e=>setForm({...form,body:e.target.value})} placeholder="Write your article..." rows={16}
              className="w-full px-4 py-3 bg-[#111] border border-[#1e1e1e] rounded-xl text-white text-sm font-mono leading-relaxed placeholder:text-[#333] focus:outline-none focus:border-[#00ff87]/50 resize-y" />
            <p className="text-[9px] text-[#444] mt-1">{form.body.split(/\s+/).filter(Boolean).length} words</p>
          </div>

          <div><label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">Excerpt</label>
            <textarea value={form.excerpt} onChange={e=>setForm({...form,excerpt:e.target.value})} placeholder="Brief summary..." rows={2}
              className="w-full px-4 py-2.5 bg-[#111] border border-[#1e1e1e] rounded-xl text-white text-sm placeholder:text-[#333] focus:outline-none focus:border-[#00ff87]/50 resize-y" />
          </div>

          <div><label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">Meta Description (SEO)</label>
            <textarea value={form.meta_description} onChange={e=>setForm({...form,meta_description:e.target.value})} placeholder="155 chars max..." rows={2} maxLength={155}
              className="w-full px-4 py-2.5 bg-[#111] border border-[#1e1e1e] rounded-xl text-white text-sm placeholder:text-[#333] focus:outline-none focus:border-[#00ff87]/50 resize-y" />
            <p className="text-[9px] text-[#444] mt-0.5">{form.meta_description.length}/155</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">Category</label>
              <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="w-full px-3 py-2.5 bg-[#111] border border-[#1e1e1e] rounded-xl text-white text-sm focus:outline-none">
                {['Football','World Cup 2026','Transfer News','Match Report','Analysis','Opinion','Interviews'].map(c=><option key={c} value={c}>{c}</option>)}
              </select></div>
            <div><label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">League</label>
              <select value={form.league} onChange={e=>setForm({...form,league:e.target.value})} className="w-full px-3 py-2.5 bg-[#111] border border-[#1e1e1e] rounded-xl text-white text-sm focus:outline-none">
                <option value="">None</option>
                {['World Cup 2026','Premier League','La Liga','Bundesliga','Serie A','Ligue 1','Champions League'].map(l=><option key={l} value={l}>{l}</option>)}
              </select></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">Tags (comma sep)</label>
              <input type="text" value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="Mbappé, Transfer"
                className="w-full px-3 py-2.5 bg-[#111] border border-[#1e1e1e] rounded-xl text-white text-sm placeholder:text-[#333] focus:outline-none" /></div>
            <div><label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">Teams (comma sep)</label>
              <input type="text" value={form.teams} onChange={e=>setForm({...form,teams:e.target.value})} placeholder="France, Brazil"
                className="w-full px-3 py-2.5 bg-[#111] border border-[#1e1e1e] rounded-xl text-white text-sm placeholder:text-[#333] focus:outline-none" /></div>
          </div>

          <div><label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">Featured Image</label>
            <div className="flex gap-3 items-start">
              <label className="flex-1 cursor-pointer">
                <div className={cn('flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed transition-colors', form.featured_image ? 'border-[#00ff87]/30 bg-[#00ff87]/5' : 'border-[#1e1e1e] bg-[#111] hover:border-[#333]')}>
                  <Image className="w-4 h-4 text-[#555]" />
                  <span className="text-xs text-[#555]">{uploadingImage ? 'Uploading...' : form.featured_image ? 'Change image (max 5MB)' : 'Upload image (max 5MB)'}</span>
                  {uploadingImage && <Loader2 className="w-3 h-3 animate-spin text-[#00ff87]" />}
                </div>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" title="Max 5MB · JPG, PNG, WebP, GIF" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5*1024*1024) { toast.error('Max 5MB'); return; }
                  setUploadingImage(true);
                  try {
                    const ext = file.name.split('.').pop();
                    const name = Date.now() + '-' + Math.random().toString(36).slice(2,8) + '.' + ext;
                    const { error } = await supabase.storage.from('articles').upload(name, file, { cacheControl: '31536000' });
                    if (error) { toast.error('Upload failed: ' + error.message); } 
                    else {
                      const { data } = supabase.storage.from('articles').getPublicUrl(name);
                      setForm(prev => ({ ...prev, featured_image: data.publicUrl }));
                      toast.success('Image uploaded!');
                    }
                  } catch (e2: any) { toast.error(e2.message); }
                  setUploadingImage(false);
                  e.target.value = '';
                }} />
              </label>
              {form.featured_image && (<div className="relative flex-shrink-0"><img src={form.featured_image} alt="" className="w-20 h-16 object-cover rounded-lg border border-[#1e1e1e]" />
                <button type="button" onClick={()=>setForm({...form,featured_image:'',featured_image_alt:'',featured_image_caption:''})} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white"><X className="w-3 h-3" /></button></div>)}
            </div>
            <div className="flex items-center gap-2 mt-2"><span className="text-[8px] text-[#333] uppercase">or url:</span>
              <input type="text" value={form.featured_image} onChange={e=>setForm({...form,featured_image:e.target.value})} placeholder="https://..." className="flex-1 px-2 py-1.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg text-white text-[10px] placeholder:text-[#333] focus:outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">Image Alt (SEO)</label>
              <input type="text" value={form.featured_image_alt} onChange={e=>setForm({...form,featured_image_alt:e.target.value})} placeholder="Describe image..."
                className="w-full px-3 py-2.5 bg-[#111] border border-[#1e1e1e] rounded-xl text-white text-sm placeholder:text-[#333] focus:outline-none" /></div>
            <div><label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">Caption</label>
              <input type="text" value={form.featured_image_caption} onChange={e=>setForm({...form,featured_image_caption:e.target.value})} placeholder="Photo credit..."
                className="w-full px-3 py-2.5 bg-[#111] border border-[#1e1e1e] rounded-xl text-white text-sm placeholder:text-[#333] focus:outline-none" /></div>
          </div>

          <div><label className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-1 block">Author</label>
            <input type="text" value={form.author_name} onChange={e=>setForm({...form,author_name:e.target.value})}
              className="w-full px-3 py-2.5 bg-[#111] border border-[#1e1e1e] rounded-xl text-white text-sm focus:outline-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving||!form.title||!form.body} className={cn('flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold', form.title&&form.body?'bg-[#00ff87] text-black':'bg-gray-700 text-gray-500 cursor-not-allowed')}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {editId ? 'Update' : form.status==='published' ? 'Publish Now' : 'Save Draft'}
            </button>
            <button onClick={()=>{setMode('list');resetForm();}} className="px-4 py-3 rounded-xl text-sm text-[#555] hover:text-white bg-[#111] border border-[#1e1e1e]">Cancel</button>
          </div>
        </div>)}
      </div>
    </div>
  );
}
