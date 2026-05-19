import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import SEOHead from '@/components/SEOHead';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { callApi } from '@/services/footballApi';
import { Trophy, Search, X, Loader2, Shield, Crown, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Player Pool (Top WC players with prices) ──────────────────────────────
const PLAYER_POOL = [
  { id: 1, name: 'Kylian Mbappé', pos: 'FWD', nation: 'France', flag: '🇫🇷', club: 'Real Madrid', price: 14.5, power: 98 },
  { id: 2, name: 'Erling Haaland', pos: 'FWD', nation: 'Norway', flag: '🇳🇴', club: 'Man City', price: 14.0, power: 96 },
  { id: 3, name: 'Vinícius Júnior', pos: 'FWD', nation: 'Brazil', flag: '🇧🇷', club: 'Real Madrid', price: 13.5, power: 97 },
  { id: 4, name: 'Lionel Messi', pos: 'FWD', nation: 'Argentina', flag: '🇦🇷', club: 'Inter Miami', price: 12.0, power: 93 },
  { id: 5, name: 'Harry Kane', pos: 'FWD', nation: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', club: 'Bayern', price: 11.5, power: 92 },
  { id: 6, name: 'Victor Osimhen', pos: 'FWD', nation: 'Nigeria', flag: '🇳🇬', club: 'Napoli', price: 10.0, power: 89 },
  { id: 7, name: 'Lautaro Martínez', pos: 'FWD', nation: 'Argentina', flag: '🇦🇷', club: 'Inter Milan', price: 10.5, power: 90 },
  { id: 8, name: 'Julián Álvarez', pos: 'FWD', nation: 'Argentina', flag: '🇦🇷', club: 'Atlético', price: 9.0, power: 87 },
  { id: 9, name: 'Alexander Isak', pos: 'FWD', nation: 'Sweden', flag: '🇸🇪', club: 'Newcastle', price: 9.5, power: 88 },
  { id: 10, name: 'Viktor Gyökeres', pos: 'FWD', nation: 'Sweden', flag: '🇸🇪', club: 'Sporting', price: 9.0, power: 88 },
  { id: 20, name: 'Jude Bellingham', pos: 'MID', nation: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', club: 'Real Madrid', price: 12.0, power: 95 },
  { id: 21, name: 'Bukayo Saka', pos: 'MID', nation: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', club: 'Arsenal', price: 11.5, power: 90 },
  { id: 22, name: 'Jamal Musiala', pos: 'MID', nation: 'Germany', flag: '🇩🇪', club: 'Bayern', price: 10.5, power: 91 },
  { id: 23, name: 'Pedri', pos: 'MID', nation: 'Spain', flag: '🇪🇸', club: 'Barcelona', price: 10.0, power: 89 },
  { id: 24, name: 'Federico Valverde', pos: 'MID', nation: 'Uruguay', flag: '🇺🇾', club: 'Real Madrid', price: 9.5, power: 89 },
  { id: 25, name: 'Florian Wirtz', pos: 'MID', nation: 'Germany', flag: '🇩🇪', club: 'Leverkusen', price: 10.0, power: 90 },
  { id: 26, name: 'Martin Ødegaard', pos: 'MID', nation: 'Norway', flag: '🇳🇴', club: 'Arsenal', price: 9.0, power: 88 },
  { id: 27, name: 'Kevin De Bruyne', pos: 'MID', nation: 'Belgium', flag: '🇧🇪', club: 'Man City', price: 9.5, power: 88 },
  { id: 28, name: 'Bruno Fernandes', pos: 'MID', nation: 'Portugal', flag: '🇵🇹', club: 'Man United', price: 8.5, power: 86 },
  { id: 29, name: 'Arda Güler', pos: 'MID', nation: 'Turkey', flag: '🇹🇷', club: 'Real Madrid', price: 7.5, power: 85 },
  { id: 30, name: 'Moisés Caicedo', pos: 'MID', nation: 'Ecuador', flag: '🇪🇨', club: 'Chelsea', price: 7.0, power: 83 },
  { id: 31, name: 'Rodrigo De Paul', pos: 'MID', nation: 'Argentina', flag: '🇦🇷', club: 'Atlético', price: 7.5, power: 82 },
  { id: 32, name: 'Takefusa Kubo', pos: 'MID', nation: 'Japan', flag: '🇯🇵', club: 'R. Sociedad', price: 7.0, power: 83 },
  { id: 33, name: 'Luis Díaz', pos: 'MID', nation: 'Colombia', flag: '🇨🇴', club: 'Liverpool', price: 8.0, power: 85 },
  { id: 40, name: 'Virgil van Dijk', pos: 'DEF', nation: 'Netherlands', flag: '🇳🇱', club: 'Liverpool', price: 6.5, power: 86 },
  { id: 41, name: 'Joško Gvardiol', pos: 'DEF', nation: 'Croatia', flag: '🇭🇷', club: 'Man City', price: 6.5, power: 84 },
  { id: 42, name: 'William Saliba', pos: 'DEF', nation: 'France', flag: '🇫🇷', club: 'Arsenal', price: 6.5, power: 88 },
  { id: 43, name: 'Theo Hernández', pos: 'DEF', nation: 'France', flag: '🇫🇷', club: 'AC Milan', price: 6.0, power: 85 },
  { id: 44, name: 'Achraf Hakimi', pos: 'DEF', nation: 'Morocco', flag: '🇲🇦', club: 'PSG', price: 6.0, power: 85 },
  { id: 45, name: 'Rúben Dias', pos: 'DEF', nation: 'Portugal', flag: '🇵🇹', club: 'Man City', price: 6.0, power: 85 },
  { id: 46, name: 'Kim Min-jae', pos: 'DEF', nation: 'South Korea', flag: '🇰🇷', club: 'Bayern', price: 5.5, power: 83 },
  { id: 47, name: 'Jeremie Frimpong', pos: 'DEF', nation: 'Netherlands', flag: '🇳🇱', club: 'Leverkusen', price: 5.5, power: 84 },
  { id: 48, name: 'Piero Hincapié', pos: 'DEF', nation: 'Ecuador', flag: '🇪🇨', club: 'Leverkusen', price: 5.0, power: 81 },
  { id: 49, name: 'Alphonso Davies', pos: 'DEF', nation: 'Canada', flag: '🇨🇦', club: 'Real Madrid', price: 6.0, power: 85 },
  { id: 60, name: 'Alisson Becker', pos: 'GK', nation: 'Brazil', flag: '🇧🇷', club: 'Liverpool', price: 6.0, power: 89 },
  { id: 61, name: 'Emiliano Martínez', pos: 'GK', nation: 'Argentina', flag: '🇦🇷', club: 'Aston Villa', price: 5.5, power: 88 },
  { id: 62, name: 'Thibaut Courtois', pos: 'GK', nation: 'Belgium', flag: '🇧🇪', club: 'Real Madrid', price: 5.5, power: 87 },
  { id: 63, name: 'Marc-André ter Stegen', pos: 'GK', nation: 'Germany', flag: '🇩🇪', club: 'Barcelona', price: 5.0, power: 86 },
  { id: 64, name: 'Mike Maignan', pos: 'GK', nation: 'France', flag: '🇫🇷', club: 'AC Milan', price: 5.0, power: 85 },
  { id: 65, name: 'Diogo Costa', pos: 'GK', nation: 'Portugal', flag: '🇵🇹', club: 'Porto', price: 4.5, power: 82 },
  { id: 70, name: 'Cristiano Ronaldo', pos: 'FWD', nation: 'Portugal', flag: '🇵🇹', club: 'Al Nassr', price: 11.0, power: 91 },
  { id: 71, name: 'Mohamed Salah', pos: 'FWD', nation: 'Egypt', flag: '🇪🇬', club: 'Liverpool', price: 12.5, power: 94 },
  { id: 72, name: 'Neymar Jr', pos: 'FWD', nation: 'Brazil', flag: '🇧🇷', club: 'Santos', price: 10.0, power: 88 },
  { id: 73, name: 'Son Heung-min', pos: 'FWD', nation: 'South Korea', flag: '🇰🇷', club: 'Tottenham', price: 10.5, power: 89 },
  { id: 74, name: 'Robert Lewandowski', pos: 'FWD', nation: 'Poland', flag: '🇵🇱', club: 'Barcelona', price: 10.0, power: 89 },
  { id: 75, name: 'Lamine Yamal', pos: 'MID', nation: 'Spain', flag: '🇪🇸', club: 'Barcelona', price: 11.0, power: 92 },
  { id: 76, name: 'Phil Foden', pos: 'MID', nation: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', club: 'Man City', price: 10.0, power: 90 },
  { id: 77, name: 'Rodri', pos: 'MID', nation: 'Spain', flag: '🇪🇸', club: 'Man City', price: 9.5, power: 92 },
  { id: 78, name: 'Toni Kroos', pos: 'MID', nation: 'Germany', flag: '🇩🇪', club: 'Real Madrid', price: 8.0, power: 87 },
  { id: 79, name: 'Declan Rice', pos: 'MID', nation: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', club: 'Arsenal', price: 8.5, power: 87 },
  { id: 80, name: 'Bernardo Silva', pos: 'MID', nation: 'Portugal', flag: '🇵🇹', club: 'Man City', price: 9.0, power: 89 },
  { id: 81, name: 'Antoine Griezmann', pos: 'FWD', nation: 'France', flag: '🇫🇷', club: 'Atlético', price: 9.0, power: 87 },
  { id: 82, name: 'Ousmane Dembélé', pos: 'FWD', nation: 'France', flag: '🇫🇷', club: 'PSG', price: 9.5, power: 88 },
  { id: 83, name: 'Dani Olmo', pos: 'MID', nation: 'Spain', flag: '🇪🇸', club: 'Barcelona', price: 8.5, power: 87 },
  { id: 84, name: 'Aurélien Tchouaméni', pos: 'MID', nation: 'France', flag: '🇫🇷', club: 'Real Madrid', price: 8.0, power: 86 },
  { id: 85, name: 'Marquinhos', pos: 'DEF', nation: 'Brazil', flag: '🇧🇷', club: 'PSG', price: 6.0, power: 85 },
  { id: 86, name: 'Raphaël Varane', pos: 'DEF', nation: 'France', flag: '🇫🇷', club: 'Como', price: 5.0, power: 81 },
  { id: 87, name: 'Trent Alexander-Arnold', pos: 'DEF', nation: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', club: 'Real Madrid', price: 6.5, power: 87 },
  { id: 88, name: 'Kyle Walker', pos: 'DEF', nation: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', club: 'Man City', price: 5.5, power: 83 },
  { id: 89, name: 'Ederson', pos: 'GK', nation: 'Brazil', flag: '🇧🇷', club: 'Man City', price: 5.5, power: 87 },
  { id: 90, name: 'Jan Oblak', pos: 'GK', nation: 'Slovenia', flag: '🇸🇮', club: 'Atlético', price: 5.0, power: 85 },
  { id: 91, name: 'Darwin Núñez', pos: 'FWD', nation: 'Uruguay', flag: '🇺🇾', club: 'Liverpool', price: 9.5, power: 87 },
  { id: 92, name: 'Sadio Mané', pos: 'FWD', nation: 'Senegal', flag: '🇸🇳', club: 'Al Nassr', price: 8.0, power: 84 },
  { id: 93, name: 'Mohammed Kudus', pos: 'MID', nation: 'Ghana', flag: '🇬🇭', club: 'West Ham', price: 7.5, power: 84 },
  { id: 94, name: 'Achraf Hakimi', pos: 'DEF', nation: 'Morocco', flag: '🇲🇦', club: 'PSG', price: 6.0, power: 85 },
  { id: 95, name: 'Christian Pulisic', pos: 'MID', nation: 'USA', flag: '🇺🇸', club: 'AC Milan', price: 8.0, power: 85 },
  { id: 96, name: 'Luka Modrić', pos: 'MID', nation: 'Croatia', flag: '🇭🇷', club: 'Real Madrid', price: 7.5, power: 85 },
];

const POS_LIMITS: Record<string, number> = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
const POS_COLORS: Record<string, string> = { GK: 'border-yellow-400 bg-yellow-500/20', DEF: 'border-blue-400 bg-blue-500/20', MID: 'border-green-400 bg-green-500/20', FWD: 'border-red-400 bg-red-500/20' };
const STARTING_XI: Record<string, number> = { GK: 1, DEF: 4, MID: 4, FWD: 2 };

function posMap(p: string): string {
  if (p?.includes('Goal')) return 'GK';
  if (p?.includes('Defend')) return 'DEF';
  if (p?.includes('Mid')) return 'MID';
  return 'FWD';
}

// Tier A nations get price boost
const TIER_A = ['Argentina', 'France', 'Brazil', 'England', 'Spain'];
const TIER_B = ['Netherlands', 'Portugal', 'Germany', 'Belgium', 'Italy', 'Croatia', 'Uruguay'];

function getPrice(pos: string, nation?: string, power?: number): number {
  // Base price by position
  const base: Record<string, number> = { GK: 4.0, DEF: 4.5, MID: 5.0, FWD: 6.0 };
  let price = base[pos] || 5.0;

  // Add power-based premium (power ranges 70-98)
  if (power) {
    if (power >= 90) price += 6.0;
    else if (power >= 85) price += 4.0;
    else if (power >= 80) price += 2.5;
    else if (power >= 75) price += 1.0;
  }

  // Nation tier boost
  if (nation && TIER_A.includes(nation)) price += 1.0;
  else if (nation && TIER_B.includes(nation)) price += 0.5;

  // Position ceilings
  const caps: Record<string, number> = { GK: 6.0, DEF: 7.0, MID: 14.0, FWD: 15.0 };
  price = Math.min(price, caps[pos] || 15.0);

  // Round to 0.5
  return Math.round(price * 2) / 2;
}

// Generate a realistic power rating for API-loaded players based on position and nation
function generatePower(pos: string, nation: string): number {
  let base = 72 + Math.floor(Math.random() * 12); // 72-83
  if (TIER_A.includes(nation)) base += 5;
  else if (TIER_B.includes(nation)) base += 3;
  if (pos === 'GK') base -= 2; // GKs tend to score lower
  return Math.min(95, Math.max(65, base));
}

export default function FantasyWC() {
  const { user } = useAuth();
  const [squad, setSquad] = useState<typeof PLAYER_POOL>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'power' | 'price'>('power');
  const [teamName, setTeamName] = useState('My Fantasy XI');
  const [teamCreated, setTeamCreated] = useState(false);
  const [apiPlayers, setApiPlayers] = useState<typeof PLAYER_POOL>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [nationsLoaded, setNationsLoaded] = useState(false);
  const searchTimer = useRef<any>(null);

  // All 48 WC nation team IDs for API
  const WC_NATION_IDS = [
    { id: 16, name: 'Mexico', flag: '🇲🇽' }, { id: 15, name: 'South Africa', flag: '🇿🇦' }, { id: 17, name: 'South Korea', flag: '🇰🇷' }, { id: 1530, name: 'Czechia', flag: '🇨🇿' },
    { id: 5529, name: 'Canada', flag: '🇨🇦' }, { id: 15, name: 'Switzerland', flag: '🇨🇭' }, { id: 1569, name: 'Qatar', flag: '🇶🇦' }, { id: 1105, name: 'Bosnia & Herz.', flag: '🇧🇦' },
    { id: 6, name: 'Brazil', flag: '🇧🇷' }, { id: 31, name: 'Morocco', flag: '🇲🇦' }, { id: 1108, name: 'Haiti', flag: '🇭🇹' }, { id: 1106, name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
    { id: 2384, name: 'USA', flag: '🇺🇸' }, { id: 1580, name: 'Paraguay', flag: '🇵🇾' }, { id: 24, name: 'Australia', flag: '🇦🇺' }, { id: 135, name: 'Türkiye', flag: '🇹🇷' },
    { id: 25, name: 'Germany', flag: '🇩🇪' }, { id: 1561, name: 'Curaçao', flag: '🇨🇼' }, { id: 21, name: "Côte d'Ivoire", flag: '🇨🇮' }, { id: 1559, name: 'Ecuador', flag: '🇪🇨' },
    { id: 1118, name: 'Netherlands', flag: '🇳🇱' }, { id: 12, name: 'Japan', flag: '🇯🇵' }, { id: 1106, name: 'Tunisia', flag: '🇹🇳' }, { id: 22, name: 'Sweden', flag: '🇸🇪' },
    { id: 1, name: 'Belgium', flag: '🇧🇪' }, { id: 13, name: 'Egypt', flag: '🇪🇬' }, { id: 22, name: 'IR Iran', flag: '🇮🇷' }, { id: 1530, name: 'New Zealand', flag: '🇳🇿' },
    { id: 9, name: 'Spain', flag: '🇪🇸' }, { id: 1530, name: 'Cabo Verde', flag: '🇨🇻' }, { id: 23, name: 'Saudi Arabia', flag: '🇸🇦' }, { id: 7, name: 'Uruguay', flag: '🇺🇾' },
    { id: 2, name: 'France', flag: '🇫🇷' }, { id: 20, name: 'Senegal', flag: '🇸🇳' }, { id: 1107, name: 'Norway', flag: '🇳🇴' }, { id: 1530, name: 'Iraq', flag: '🇮🇶' },
    { id: 26, name: 'Argentina', flag: '🇦🇷' }, { id: 14, name: 'Algeria', flag: '🇩🇿' }, { id: 1109, name: 'Austria', flag: '🇦🇹' }, { id: 1530, name: 'Jordan', flag: '🇯🇴' },
    { id: 27, name: 'Portugal', flag: '🇵🇹' }, { id: 1530, name: 'Uzbekistan', flag: '🇺🇿' }, { id: 1580, name: 'Colombia', flag: '🇨🇴' }, { id: 1530, name: 'DR Congo', flag: '🇨🇩' },
    { id: 10, name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' }, { id: 3, name: 'Croatia', flag: '🇭🇷' }, { id: 29, name: 'Ghana', flag: '🇬🇭' }, { id: 1530, name: 'Panama', flag: '🇵🇦' },
  ];

  // Load squads from top nations on mount
  useEffect(() => {
    if (nationsLoaded) return;
    const loadNations = async () => {
      setApiLoading(true);
      const topNations = [26, 6, 2, 10, 25, 9, 27, 1118, 768, 3, 31, 12, 2384, 16, 1580, 17, 135, 1, 7, 20]; // Top 20 nations
      const results: typeof PLAYER_POOL = [];
      
      for (const nationId of topNations) {
        try {
          const data = await callApi('players/squads', { team: String(nationId) });
          if (data?.[0]?.players) {
            const nation = WC_NATION_IDS.find(n => n.id === nationId);
            for (const p of data[0].players) {
              const pos = posMap(p.position);
              const nationName = nation?.name || '';
              const power = generatePower(pos, nationName);
              results.push({
                id: p.id,
                name: p.name,
                pos,
                nation: nationName,
                flag: nation?.flag || '',
                club: '',
                price: getPrice(pos, nationName, power),
                power,
              });
            }
          }
        } catch {}
      }
      
      setApiPlayers(results);
      setNationsLoaded(true);
      setApiLoading(false);
    };
    loadNations();
  }, [nationsLoaded]);

  // Combined player list: hardcoded pool + API results, strict dedup by name
  const allPlayers = useMemo(() => {
    const seen = new Map<string, typeof PLAYER_POOL[0]>();
    // Hardcoded stars take priority (accurate pricing)
    for (const p of PLAYER_POOL) {
      const key = p.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      seen.set(key, p);
    }
    // Add API players only if name not already present
    for (const p of apiPlayers) {
      const key = p.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      // Check exact match and partial match (e.g. "Vinicius Junior" vs "Vinícius Júnior")
      const lastName = key.split(' ').pop() || key;
      const firstName = key.split(' ')[0] || '';
      let isDupe = seen.has(key);
      if (!isDupe) {
        for (const [existingKey] of seen) {
          if (existingKey.includes(lastName) && existingKey.includes(firstName)) { isDupe = true; break; }
          if (lastName.length > 4 && existingKey.includes(lastName)) { isDupe = true; break; }
        }
      }
      if (!isDupe) seen.set(key, p);
    }
    return Array.from(seen.values());
  }, [apiPlayers]);

  // Search API when typing
  useEffect(() => {
    if (searchQuery.length < 3) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setApiLoading(true);
      try {
        // Search across all WC nation squads
        const nations = [26, 6, 2, 10, 25, 9, 27, 1118, 768, 3, 31, 12, 2384, 16, 1580, 17, 135, 1024, 20, 24, 15, 1105, 21, 13, 1569, 30, 29, 22, 14, 1530];
        const results: typeof PLAYER_POOL = [];
        const q = searchQuery.toLowerCase();
        
        // Try API search first
        try {
          const data = await callApi('players', { search: searchQuery, league: '1', season: '2026' });
          if (data?.length) {
            for (const item of data) {
              const p = item.player;
              const s = item.statistics?.[0];
              if (!p?.id) continue;
              const pos = posMap(s?.games?.position || 'Midfielder');
              const pwr = Math.round((s?.games?.rating || 7) * 10);
              results.push({
                id: p.id, name: p.name, pos,
                nation: s?.team?.name || '', flag: '', club: s?.team?.name || '',
                price: getPrice(pos, s?.team?.name, pwr), power: pwr,
              });
            }
          }
        } catch {}

        // Also search hardcoded pool by name/nation/club
        // (already handled by filteredPlayers)

        if (results.length > 0) setApiPlayers(prev => [...prev, ...results]);
      } catch {}
      setApiLoading(false);
    }, 600);
  }, [searchQuery]);

  const budget = useMemo(() => 100 - squad.reduce((s, p) => s + p.price, 0), [squad]);
  const getByPos = useCallback((pos: string) => squad.filter(p => p.pos === pos), [squad]);
  const isSelected = useCallback((id: number) => squad.some(p => p.id === id), [squad]);

  const filteredPlayers = useMemo(() => {
    return allPlayers.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.nation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.club.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPos = activeFilter === 'ALL' || p.pos === activeFilter;
      return matchSearch && matchPos;
    }).sort((a, b) => sortBy === 'power' ? b.power - a.power : b.price - a.price);
  }, [searchQuery, activeFilter, sortBy, allPlayers]);

  const addPlayer = (player: typeof PLAYER_POOL[0]) => {
    if (squad.length >= 15) return toast.error('Squad full (15 max)');
    if (budget - player.price < 0) return toast.error('Insufficient budget');
    if (squad.filter(p => p.nation === player.nation).length >= 3) return toast.error(`Max 3 players from ${player.nation}`);
    if (getByPos(player.pos).length >= POS_LIMITS[player.pos]) return toast.error(`${player.pos} slots full`);
    setSquad([...squad, player]);
    toast.success(`${player.name} added`);
  };

  const removePlayer = (id: number) => {
    const p = squad.find(s => s.id === id);
    setSquad(squad.filter(s => s.id !== id));
    if (p) toast.success(`${p.name} removed`);
  };

  const autoPick = () => {
    const newSquad: typeof PLAYER_POOL = [];
    let remaining = 100;
    const targets: Record<string, number> = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
    const nationCount: Record<string, number> = {};

    // Shuffle all available players for randomness
    const shuffled = [...allPlayers].sort(() => Math.random() - 0.5);

    // Phase 1: Fill each position to target
    for (const pos of ['GK', 'DEF', 'MID', 'FWD']) {
      const posPlayers = shuffled.filter(p => p.pos === pos);
      // Mix of star + budget players: pick some top, some random
      const sorted = [...posPlayers].sort((a, b) => {
        // 50% chance to prefer higher power, 50% random
        return Math.random() > 0.5 ? b.power - a.power : Math.random() - 0.5;
      });

      for (const p of sorted) {
        const posCount = newSquad.filter(s => s.pos === pos).length;
        if (posCount >= targets[pos]) break;
        const nc = nationCount[p.nation] || 0;
        if (nc >= 3) continue;
        if (remaining < p.price) continue;
        if (newSquad.some(s => s.id === p.id)) continue;

        // Budget check: leave enough for remaining slots
        const slotsLeft = 15 - newSquad.length - 1;
        const minCostPerSlot = 3.0;
        if (slotsLeft > 3 && remaining - p.price < slotsLeft * minCostPerSlot) continue;

        newSquad.push(p);
        remaining -= p.price;
        nationCount[p.nation] = nc + 1;
      }
    }

    // Phase 2: If not full, fill remaining with cheapest available (relax constraints slightly)
    if (newSquad.length < 15) {
      const available = [...allPlayers, ...PLAYER_POOL]
        .filter(p => !newSquad.some(s => s.id === p.id))
        .sort((a, b) => a.price - b.price);

      for (const p of available) {
        if (newSquad.length >= 15) break;
        const posCount = newSquad.filter(s => s.pos === p.pos).length;
        const maxPos: Record<string, number> = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
        if (posCount >= maxPos[p.pos]) continue;
        const nc = nationCount[p.nation] || 0;
        if (nc >= 3) continue;
        if (remaining < p.price) continue;

        newSquad.push(p);
        remaining -= p.price;
        nationCount[p.nation] = (nationCount[p.nation] || 0) + 1;
      }
    }

    // Phase 3: Set captain (highest power FWD or MID)
    const captainCandidates = newSquad
      .filter(p => p.pos === 'FWD' || p.pos === 'MID')
      .sort((a, b) => b.power - a.power);

    if (captainCandidates.length > 0) {
      // Random between top 3 candidates
      const pick = captainCandidates[Math.floor(Math.random() * Math.min(3, captainCandidates.length))];
      const idx = newSquad.findIndex(p => p.id === pick.id);
      if (idx >= 0) {
        newSquad[idx] = { ...newSquad[idx] };
      }
    }

    setSquad(newSquad);
    toast.success(`🤖 AI picked ${newSquad.length} players! Budget: ${remaining.toFixed(1)}M remaining`);
  };

  if (!user) return (
    <div className="min-h-screen bg-[#0B0E14]"><Header />
      <div className="text-center py-20">
        <Trophy className="w-16 h-16 text-[#00FF66]/20 mx-auto mb-4" />
        <h2 className="text-xl font-black text-white mb-2">Fantasy World Cup 2026</h2>
        <p className="text-sm text-[#555] mb-6">Build your dream team · 100M budget · Compete globally</p>
        <Link to="/auth" className="px-6 py-3 rounded-lg bg-[#00FF66] text-black font-bold text-sm">Sign In to Play</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-100">
      <SEOHead title="Fantasy World Cup 2026 | LastFootball" description="Build your FIFA World Cup 2026 fantasy team." path="/fantasy" />
      <Header />

      {/* ─── STATS HEADER BAR ────────────────────────────────────────── */}
      <div className="bg-[#161B26]/80 backdrop-blur-md border-b border-gray-800 sticky top-14 z-30 px-4 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-black tracking-wider text-white">LAST<span className="text-[#00FF66]">FOOTBALL</span> <span className="text-[10px] text-gray-500 ml-1">FANTASY WC</span></span>

          <div className="flex items-center gap-4 bg-black/40 px-4 py-1.5 rounded-xl border border-gray-800/60">
            <div className="text-center">
              <p className="text-[9px] text-gray-500 uppercase tracking-widest">Budget</p>
              <p className={cn('text-sm font-mono font-bold', budget >= 0 ? 'text-[#00FF66]' : 'text-red-400')}>${budget.toFixed(1)}M</p>
            </div>
            <div className="h-6 w-px bg-gray-800" />
            <div className="text-center">
              <p className="text-[9px] text-gray-500 uppercase tracking-widest">Squad</p>
              <p className="text-sm font-mono font-bold text-white">{squad.length}/15</p>
            </div>
            <div className="h-6 w-px bg-gray-800" />
            <div className="text-center">
              <p className="text-[9px] text-gray-500 uppercase tracking-widest">Transfers</p>
              <p className="text-sm font-mono font-bold text-white">2/2</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={autoPick} className="bg-gray-800 hover:bg-gray-700 text-[10px] font-bold px-3 py-1.5 rounded-lg text-gray-200 flex items-center gap-1">
              🤖 AI Pick
            </button>
            <button onClick={() => { if (squad.length < 15) toast.error(`Need ${15 - squad.length} more`); else toast.success('Squad saved!'); }}
              className="bg-[#00FF66] hover:opacity-90 text-black text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider">
              Save
            </button>
          </div>
        </div>
      </div>

      {/* ─── MAIN SPLIT: PITCH + MARKET ──────────────────────────────── */}
      <main className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* LEFT — PITCH (7 cols) */}
        <section className="lg:col-span-7">
          <div className="relative bg-gradient-to-b from-[#111827] to-[#061F12] rounded-2xl border border-gray-800 p-4 min-h-[540px] flex flex-col justify-between">
            {/* Pitch lines */}
            <div className="absolute inset-[5%] border-2 border-[#00FF66]/10 pointer-events-none rounded" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-[#00FF66]/10 rounded-full pointer-events-none" />

            {/* FWD */}
            <PitchLine pos="FWD" squad={getByPos('FWD')} limit={3} onAdd={() => setActiveFilter('FWD')} onRemove={removePlayer} />
            {/* MID */}
            <PitchLine pos="MID" squad={getByPos('MID')} limit={5} onAdd={() => setActiveFilter('MID')} onRemove={removePlayer} />
            {/* DEF */}
            <PitchLine pos="DEF" squad={getByPos('DEF')} limit={5} onAdd={() => setActiveFilter('DEF')} onRemove={removePlayer} />
            {/* GK */}
            <PitchLine pos="GK" squad={getByPos('GK')} limit={2} onAdd={() => setActiveFilter('GK')} onRemove={removePlayer} />

            {/* Bench */}
            <div className="relative z-10 mt-3 pt-2 border-t border-gray-800/60 bg-black/30 rounded-xl p-2">
              <p className="text-[9px] text-gray-500 uppercase tracking-widest text-center mb-1.5">Bench</p>
              <div className="flex justify-center gap-3 flex-wrap">
                {squad.slice(11).map(p => (
                  <div key={p.id} onClick={() => removePlayer(p.id)} className="text-center w-12 cursor-pointer group">
                    <div className="w-8 h-8 mx-auto bg-gray-800 group-hover:bg-red-500/20 rounded-lg flex items-center justify-center border border-gray-700 text-sm">👕</div>
                    <p className="text-[8px] text-gray-400 truncate mt-0.5">{p.name.split(' ').pop()}</p>
                  </div>
                ))}
                {squad.length <= 11 && <p className="text-[10px] text-gray-600 italic py-1">Fill starting XI first</p>}
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT — MARKET (5 cols) */}
        <section className="lg:col-span-5">
          <div className="bg-[#161B26] border border-gray-800 rounded-2xl p-3 flex flex-col" style={{ height: '540px' }}>

            {/* Search */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input type="text" placeholder="Search player, nation, club..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#0B0E14] border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF66] transition" />
            </div>

            {/* Position filter */}
            <div className="grid grid-cols-5 gap-1 bg-[#0B0E14] p-1 rounded-xl border border-gray-800 mb-2">
              {['ALL', 'GK', 'DEF', 'MID', 'FWD'].map(pos => (
                <button key={pos} onClick={() => setActiveFilter(pos)}
                  className={cn('text-[10px] font-bold py-1.5 rounded-lg transition',
                    activeFilter === pos ? 'bg-[#00FF66] text-black' : 'text-gray-500 hover:text-white',
                  )}>
                  {pos}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex gap-2 mb-2">
              <button onClick={() => setSortBy('power')} className={cn('text-[9px] px-2 py-1 rounded font-bold', sortBy === 'power' ? 'bg-[#00FF66]/20 text-[#00FF66]' : 'text-gray-600')}>⭐ Rating</button>
              <button onClick={() => setSortBy('price')} className={cn('text-[9px] px-2 py-1 rounded font-bold', sortBy === 'price' ? 'bg-[#00FF66]/20 text-[#00FF66]' : 'text-gray-600')}>💰 Price</button>
            </div>

            {/* Player list */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {filteredPlayers.map(player => {
                const selected = isSelected(player.id);
                return (
                  <div key={player.id} className={cn('flex items-center justify-between p-2 rounded-xl border transition group',
                    selected ? 'bg-[#00FF66]/5 border-[#00FF66]/20' : 'bg-[#0B0E14]/60 hover:bg-[#0B0E14] border-gray-800/60',
                  )}>
                    <div className="flex items-center gap-2.5">
                      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center border text-lg', POS_COLORS[player.pos])}>
                        👕
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white group-hover:text-[#00FF66] transition">{player.name}</span>
                          <span className="text-[9px] font-mono bg-gray-800 text-gray-400 px-1 rounded">{player.pos}</span>
                        </div>
                        <p className="text-[10px] text-gray-500">{player.flag} {player.nation} · <span className="text-gray-600 font-mono">{player.club}</span></p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-xs font-mono font-bold text-white">${player.price.toFixed(1)}M</p>
                        <p className="text-[9px] text-gray-600">⭐ {player.power}</p>
                      </div>
                      <button onClick={() => selected ? removePlayer(player.id) : addPlayer(player)}
                        className={cn('w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs transition',
                          selected ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white' : 'bg-[#00FF66] text-black hover:opacity-80',
                        )}>
                        {selected ? '✕' : '+'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredPlayers.length === 0 && !apiLoading && (
                <p className="text-xs text-gray-600 text-center py-10">No matching players{searchQuery.length >= 3 ? ' — try a different name' : ''}</p>
              )}
              {apiLoading && (
                <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-[#00FF66]" /></div>
              )}
              {!apiLoading && nationsLoaded && filteredPlayers.length > 0 && (
                <p className="text-[9px] text-gray-600 text-center py-2">{filteredPlayers.length} players available</p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// ─── Pitch Line Component ───────────────────────────────────────────────────
function PitchLine({ pos, squad, limit, onAdd, onRemove }: {
  pos: string; squad: typeof PLAYER_POOL; limit: number;
  onAdd: () => void; onRemove: (id: number) => void;
}) {
  const empty = Math.max(0, limit - squad.length);
  const gap = pos === 'GK' ? 'gap-6' : pos === 'DEF' ? 'gap-2 sm:gap-3' : 'gap-2 sm:gap-4';

  return (
    <div className={cn('relative z-10 flex justify-center flex-wrap my-1', gap)}>
      {squad.map(p => (
        <div key={p.id} onClick={() => onRemove(p.id)} className="group cursor-pointer text-center w-14 sm:w-16">
          <div className={cn('relative mx-auto w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl border-2 transition shadow-lg group-hover:bg-red-500/20 group-hover:border-red-400', POS_COLORS[p.pos])}>
            <span className="text-xl">👕</span>
            <span className="absolute -top-1 -right-1 bg-black text-[7px] text-white px-1 rounded font-mono border border-gray-700">{p.pos}</span>
          </div>
          <p className="text-[9px] font-bold text-white truncate mt-0.5 drop-shadow">{p.name.split(' ').pop()}</p>
          <p className="text-[8px] font-mono text-[#00FF66]">${p.price}M</p>
        </div>
      ))}
      {Array.from({ length: empty }).map((_, i) => (
        <div key={`e-${i}`} onClick={onAdd} className="cursor-pointer text-center w-14 sm:w-16 group">
          <div className="mx-auto w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center border-2 border-dashed border-gray-600 group-hover:border-[#00FF66] rounded-xl transition bg-black/40">
            <span className="text-gray-600 group-hover:text-[#00FF66] text-lg">+</span>
          </div>
          <p className="text-[8px] text-gray-600 mt-0.5 uppercase tracking-wider">{pos}</p>
        </div>
      ))}
    </div>
  );
}
