const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const today = new Date().toISOString().split('T')[0];
const endpoint = SUPABASE_URL + '/functions/v1/football-api?endpoint=fixtures&date=' + today;
export const prefetchedMatches = SUPABASE_URL && SUPABASE_KEY ? fetch(endpoint, {headers: {'Content-Type': 'application/json', apikey: SUPABASE_KEY}}).then(r => r.json()).then(d => d.response || []).catch(() => null) : null;
