const today = new Date().toISOString().split('T')[0];
export const prefetchedMatches = fetch('/api/football?endpoint=fixtures&date=' + today, {headers: {'Content-Type': 'application/json'}}).then(r => r.json()).then(d => d.response || []).catch(() => null);
