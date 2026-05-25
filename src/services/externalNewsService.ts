import { supabase } from '@/integrations/supabase/client';

export async function getExternalNews(limit = 50) {
  try {
    const { data, error } = await supabase
      .from('external_news')
      .select('*')
      .eq('is_archived', false)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Get external news error:', err);
    return [];
  }
}

export async function getNewsBySource(sourceName: string, limit = 20) {
  try {
    const { data, error } = await supabase
      .from('external_news')
      .select('*')
      .eq('is_archived', false)
      .ilike('source_name', sourceName)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Get news by source error:', err);
    return [];
  }
}

export async function searchExternalNews(query: string, limit = 20) {
  try {
    const { data, error } = await supabase
      .from('external_news')
      .select('*')
      .eq('is_archived', false)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Search external news error:', err);
    return [];
  }
}
