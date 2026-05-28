const NAME_MAP: Record<string, string> = {
  'Korea Republic': 'South Korea', 'Korea DPR': 'North Korea',
  'IR Iran': 'Iran', 'Czechia': 'Czech Republic',
  'Türkiye': 'Turkey', 'Turkiye': 'Turkey',
  "Côte d'Ivoire": 'Ivory Coast', "Cote d'Ivoire": 'Ivory Coast',
  'Bosnia and Herzegovina': 'Bosnia & Herz.',
  'Bosnia-Herzegovina': 'Bosnia & Herz.',
  'Bosnia & Herzegovina': 'Bosnia & Herz.',
  'United States': 'USA', 'United States of America': 'USA',
  'Cabo Verde': 'Cape Verde', 'DR Congo': 'DR Congo',
  'Congo DR': 'DR Congo', 'FYR Macedonia': 'North Macedonia',
  'Republic of Ireland': 'Ireland',
};
const SEARCH_ALIASES: Record<string, string[]> = {
  'South Korea': ['Korea Republic', 'Korea', 'KOR'],
  'Iran': ['IR Iran', 'IRN'], 'Czech Republic': ['Czechia', 'CZE'],
  'Turkey': ['Türkiye', 'Turkiye', 'TUR'],
  'Ivory Coast': ["Côte d'Ivoire", 'CIV'],
  'Bosnia & Herz.': ['Bosnia and Herzegovina', 'Bosnia', 'BIH'],
  'USA': ['United States', 'US', 'America'],
  'Cape Verde': ['Cabo Verde', 'CPV'],
};
export function normalizeTeamName(name: string): string {
  if (!name) return name;
  return NAME_MAP[name] || name;
}
export function matchesTeamSearch(teamName: string, query: string): boolean {
  const q = query.toLowerCase().trim();
  const normalized = normalizeTeamName(teamName).toLowerCase();
  if (normalized.includes(q) || teamName.toLowerCase().includes(q)) return true;
  for (const [official, aliases] of Object.entries(SEARCH_ALIASES)) {
    if (official.toLowerCase() === normalized) {
      if (aliases.some(a => a.toLowerCase().includes(q))) return true;
    }
  }
  return false;
}
export { NAME_MAP, SEARCH_ALIASES };
