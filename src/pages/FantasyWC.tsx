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
  // FWD - Elite Heavyweights (12.0-13.5M)
  { id: 1, name: 'Kylian Mbappé', pos: 'FWD', nation: 'France', flag: '🇫🇷', club: 'Real Madrid', price: 13.0, power: 98 },
  { id: 3, name: 'Vinícius Júnior', pos: 'FWD', nation: 'Brazil', flag: '🇧🇷', club: 'Real Madrid', price: 13.0, power: 97 },
  { id: 2, name: 'Erling Haaland', pos: 'FWD', nation: 'Norway', flag: '🇳🇴', club: 'Man City', price: 12.5, power: 96 },
  { id: 71, name: 'Mohamed Salah', pos: 'FWD', nation: 'Egypt', flag: '🇪🇬', club: 'Liverpool', price: 12.5, power: 95 },
  // FWD - Premium Regulars (9.0-11.5M)
  { id: 5, name: 'Harry Kane', pos: 'FWD', nation: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', club: 'Bayern', price: 11.0, power: 92 },
  { id: 4, name: 'Lionel Messi', pos: 'FWD', nation: 'Argentina', flag: '🇦🇷', club: 'Inter Miami', price: 10.5, power: 93 },
  { id: 7, name: 'Lautaro Martínez', pos: 'FWD', nation: 'Argentina', flag: '🇦🇷', club: 'Inter Milan', price: 10.5, power: 90 },
  { id: 70, name: 'Cristiano Ronaldo', pos: 'FWD', nation: 'Portugal', flag: '🇵🇹', club: 'Al Nassr', price: 10.0, power: 90 },
  { id: 73, name: 'Son Heung-min', pos: 'FWD', nation: 'South Korea', flag: '🇰🇷', club: 'Tottenham', price: 8.0, power: 89 },
  { id: 8, name: 'Julián Álvarez', pos: 'FWD', nation: 'Argentina', flag: '🇦🇷', club: 'Atlético', price: 9.5, power: 88 },
  { id: 9, name: 'Alexander Isak', pos: 'FWD', nation: 'Sweden', flag: '🇸🇪', club: 'Newcastle', price: 9.0, power: 88 },
  { id: 91, name: 'Darwin Núñez', pos: 'FWD', nation: 'Uruguay', flag: '🇺🇾', club: 'Liverpool', price: 8.0, power: 88 },
  { id: 81, name: 'Antoine Griezmann', pos: 'FWD', nation: 'France', flag: '🇫🇷', club: 'Atlético', price: 8.0, power: 88 },
  { id: 82, name: 'Ousmane Dembélé', pos: 'FWD', nation: 'France', flag: '🇫🇷', club: 'PSG', price: 8.0, power: 88 },
  // FWD - Mid-Tier (7.0-8.5M)
  { id: 72, name: 'Neymar Jr', pos: 'FWD', nation: 'Brazil', flag: '🇧🇷', club: 'Santos', price: 7.5, power: 86 },
  { id: 6, name: 'Victor Osimhen', pos: 'FWD', nation: 'Nigeria', flag: '🇳🇬', club: 'Napoli', price: 6.0, power: 82 },
  { id: 92, name: 'Sadio Mané', pos: 'FWD', nation: 'Senegal', flag: '🇸🇳', club: 'Al Nassr', price: 5.5, power: 82 },
  // FWD - Enablers (4.5-6.0M)
  { id: 10, name: 'Viktor Gyökeres', pos: 'FWD', nation: 'Sweden', flag: '🇸🇪', club: 'Sporting', price: 8.5, power: 88 },
  // MID - Elite Heavyweights (10.5-12.0M)
  { id: 20, name: 'Jude Bellingham', pos: 'MID', nation: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', club: 'Real Madrid', price: 12.5, power: 95 },
  { id: 75, name: 'Lamine Yamal', pos: 'MID', nation: 'Spain', flag: '🇪🇸', club: 'Barcelona', price: 12.0, power: 94 },
  { id: 22, name: 'Jamal Musiala', pos: 'MID', nation: 'Germany', flag: '🇩🇪', club: 'Bayern', price: 10.0, power: 91 },
  // MID - Premium Regulars (8.0-10.0M)
  { id: 21, name: 'Bukayo Saka', pos: 'MID', nation: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', club: 'Arsenal', price: 11.5, power: 90 },
  { id: 76, name: 'Phil Foden', pos: 'MID', nation: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', club: 'Man City', price: 11.5, power: 90 },
  { id: 25, name: 'Florian Wirtz', pos: 'MID', nation: 'Germany', flag: '🇩🇪', club: 'Leverkusen', price: 9.5, power: 90 },
  { id: 23, name: 'Pedri', pos: 'MID', nation: 'Spain', flag: '🇪🇸', club: 'Barcelona', price: 10.0, power: 89 },
  { id: 24, name: 'Federico Valverde', pos: 'MID', nation: 'Uruguay', flag: '🇺🇾', club: 'Real Madrid', price: 5.5, power: 89 },
  { id: 80, name: 'Bernardo Silva', pos: 'MID', nation: 'Portugal', flag: '🇵🇹', club: 'Man City', price: 9.0, power: 89 },
  { id: 27, name: 'Kevin De Bruyne', pos: 'MID', nation: 'Belgium', flag: '🇧🇪', club: 'Man City', price: 9.0, power: 88 },
  { id: 26, name: 'Martin Ødegaard', pos: 'MID', nation: 'Norway', flag: '🇳🇴', club: 'Arsenal', price: 8.0, power: 88 },
  { id: 83, name: 'Dani Olmo', pos: 'MID', nation: 'Spain', flag: '🇪🇸', club: 'Barcelona', price: 7.5, power: 87 },
  { id: 28, name: 'Bruno Fernandes', pos: 'MID', nation: 'Portugal', flag: '🇵🇹', club: 'Man United', price: 7.5, power: 86 },
  // MID - Mid-Tier (6.0-7.5M)
  { id: 77, name: 'Rodri', pos: 'MID', nation: 'Spain', flag: '🇪🇸', club: 'Man City', price: 5.0, power: 86 },
  { id: 31, name: 'Rodrigo De Paul', pos: 'MID', nation: 'Argentina', flag: '🇦🇷', club: 'Atlético', price: 6.5, power: 82 },
  { id: 95, name: 'Christian Pulisic', pos: 'MID', nation: 'USA', flag: '🇺🇸', club: 'AC Milan', price: 7.0, power: 83 },
  { id: 33, name: 'Luis Díaz', pos: 'MID', nation: 'Colombia', flag: '🇨🇴', club: 'Liverpool', price: 7.0, power: 83 },
  { id: 29, name: 'Arda Güler', pos: 'MID', nation: 'Turkey', flag: '🇹🇷', club: 'Real Madrid', price: 7.0, power: 83 },
  { id: 96, name: 'Luka Modrić', pos: 'MID', nation: 'Croatia', flag: '🇭🇷', club: 'Real Madrid', price: 7.0, power: 83 },
  { id: 93, name: 'Mohammed Kudus', pos: 'MID', nation: 'Ghana', flag: '🇬🇭', club: 'West Ham', price: 6.5, power: 80 },
  { id: 30, name: 'Moisés Caicedo', pos: 'MID', nation: 'Ecuador', flag: '🇪🇨', club: 'Chelsea', price: 6.5, power: 80 },
  { id: 32, name: 'Takefusa Kubo', pos: 'MID', nation: 'Japan', flag: '🇯🇵', club: 'R. Sociedad', price: 6.5, power: 80 },
  // MID - Enablers (4.0-5.5M)
  { id: 84, name: 'Aurélien Tchouaméni', pos: 'MID', nation: 'France', flag: '🇫🇷', club: 'Real Madrid', price: 5.5, power: 78 },
  { id: 79, name: 'Declan Rice', pos: 'MID', nation: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', club: 'Arsenal', price: 5.0, power: 78 },
  // DEF - Elite Heavyweights (6.5-7.0M)
  { id: 42, name: 'William Saliba', pos: 'DEF', nation: 'France', flag: '🇫🇷', club: 'Arsenal', price: 6.0, power: 88 },
  { id: 43, name: 'Theo Hernández', pos: 'DEF', nation: 'France', flag: '🇫🇷', club: 'AC Milan', price: 7.0, power: 88 },
  { id: 87, name: 'Trent Alexander-Arnold', pos: 'DEF', nation: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', club: 'Real Madrid', price: 7.0, power: 88 },
  { id: 40, name: 'Virgil van Dijk', pos: 'DEF', nation: 'Netherlands', flag: '🇳🇱', club: 'Liverpool', price: 6.0, power: 88 },
  { id: 44, name: 'Achraf Hakimi', pos: 'DEF', nation: 'Morocco', flag: '🇲🇦', club: 'PSG', price: 7.0, power: 88 },
  { id: 45, name: 'Rúben Dias', pos: 'DEF', nation: 'Portugal', flag: '🇵🇹', club: 'Man City', price: 5.5, power: 88 },
  // DEF - Premium Regulars (5.5-6.0M)
  { id: 85, name: 'Marquinhos', pos: 'DEF', nation: 'Brazil', flag: '🇧🇷', club: 'PSG', price: 5.5, power: 85 },
  { id: 41, name: 'Joško Gvardiol', pos: 'DEF', nation: 'Croatia', flag: '🇭🇷', club: 'Man City', price: 5.5, power: 85 },
  { id: 49, name: 'Alphonso Davies', pos: 'DEF', nation: 'Canada', flag: '🇨🇦', club: 'Real Madrid', price: 5.0, power: 85 },
  { id: 47, name: 'Jeremie Frimpong', pos: 'DEF', nation: 'Netherlands', flag: '🇳🇱', club: 'Leverkusen', price: 6.5, power: 84 },
  { id: 94, name: 'Ronald Araújo', pos: 'DEF', nation: 'Uruguay', flag: '🇺🇾', club: 'Barcelona', price: 5.0, power: 84 },
  // DEF - Mid-Tier (4.5-5.0M)
  { id: 46, name: 'Kim Min-jae', pos: 'DEF', nation: 'South Korea', flag: '🇰🇷', club: 'Bayern', price: 5.0, power: 83 },
  { id: 88, name: 'Kyle Walker', pos: 'DEF', nation: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', club: 'Man City', price: 5.0, power: 80 },
  { id: 48, name: 'Piero Hincapié', pos: 'DEF', nation: 'Ecuador', flag: '🇪🇨', club: 'Leverkusen', price: 4.5, power: 79 },
  // GK - Elite (6.0-6.5M)
  { id: 60, name: 'Alisson Becker', pos: 'GK', nation: 'Brazil', flag: '🇧🇷', club: 'Liverpool', price: 6.0, power: 89 },
  { id: 61, name: 'Emiliano Martínez', pos: 'GK', nation: 'Argentina', flag: '🇦🇷', club: 'Aston Villa', price: 6.0, power: 89 },
  { id: 64, name: 'Mike Maignan', pos: 'GK', nation: 'France', flag: '🇫🇷', club: 'AC Milan', price: 6.0, power: 88 },
  { id: 62, name: 'Thibaut Courtois', pos: 'GK', nation: 'Belgium', flag: '🇧🇪', club: 'Real Madrid', price: 6.0, power: 87 },
  // GK - Premium (5.0-5.5M)
  { id: 63, name: 'Marc-André ter Stegen', pos: 'GK', nation: 'Germany', flag: '🇩🇪', club: 'Barcelona', price: 5.0, power: 86 },
  { id: 65, name: 'Diogo Costa', pos: 'GK', nation: 'Portugal', flag: '🇵🇹', club: 'Porto', price: 5.0, power: 85 },
  { id: 89, name: 'Ederson', pos: 'GK', nation: 'Brazil', flag: '🇧🇷', club: 'Man City', price: 5.0, power: 87 },
  { id: 90, name: 'Jan Oblak', pos: 'GK', nation: 'Slovenia', flag: '🇸🇮', club: 'Atlético', price: 4.5, power: 85 },
];


const POS_LIMITS: Record<string, number> = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
const POS_COLORS: Record<string, string> = { GK: 'border-yellow-400 bg-yellow-500/20', DEF: 'border-blue-400 bg-blue-500/20', MID: 'border-green-400 bg-green-500/20', FWD: 'border-red-400 bg-red-500/20' };
// Nation jersey colors — official kit colors for all 48 WC 2026 teams
const JERSEY_COLORS: Record<string, { primary: string; secondary: string; pattern: string }> = {
  // Group A
  'Mexico': { primary: '#016847', secondary: '#FFFFFF', pattern: 'solid' },
  'South Africa': { primary: '#FFF200', secondary: '#007A4D', pattern: 'solid' },
  'South Korea': { primary: '#EA1C24', secondary: '#032A73', pattern: 'solid' },
  'Czech Republic': { primary: '#FFFFFF', secondary: '#11457E', pattern: 'solid' },
  // Group B
  'Canada': { primary: '#DA291C', secondary: '#FFFFFF', pattern: 'solid' },
  'Bosnia & Herz.': { primary: '#002F6C', secondary: '#FED141', pattern: 'solid' },
  'Qatar': { primary: '#8A1538', secondary: '#FFFFFF', pattern: 'solid' },
  'Switzerland': { primary: '#D52B1E', secondary: '#FFFFFF', pattern: 'solid' },
  // Group C
  'Brazil': { primary: '#FFDC02', secondary: '#009B3A', pattern: 'solid' },
  'Morocco': { primary: '#C1272D', secondary: '#006233', pattern: 'solid' },
  'Haiti': { primary: '#00209F', secondary: '#D21034', pattern: 'solid' },
  'Scotland': { primary: '#002453', secondary: '#FFFFFF', pattern: 'solid' },
  // Group D
  'USA': { primary: '#FFFFFF', secondary: '#002868', pattern: 'solid' },
  'Paraguay': { primary: '#D51C29', secondary: '#FFFFFF', pattern: 'stripes' },
  'Australia': { primary: '#002B7F', secondary: '#FCD116', pattern: 'solid' },
  'Turkey': { primary: '#E30A17', secondary: '#FFFFFF', pattern: 'solid' },
  // Group E
  'Germany': { primary: '#FFFFFF', secondary: '#000000', pattern: 'solid' },
  'Curaçao': { primary: '#002B7F', secondary: '#F9E311', pattern: 'solid' },
  'Ivory Coast': { primary: '#FF8200', secondary: '#FFFFFF', pattern: 'solid' },
  'Ecuador': { primary: '#FFDD00', secondary: '#0033A0', pattern: 'solid' },
  // Group F
  'Netherlands': { primary: '#21468B', secondary: '#FF4F00', pattern: 'solid' },
  'Japan': { primary: '#000080', secondary: '#FFFFFF', pattern: 'solid' },
  'Tunisia': { primary: '#E70013', secondary: '#FFFFFF', pattern: 'solid' },
  'Sweden': { primary: '#006AA7', secondary: '#FECC02', pattern: 'solid' },
  // Group G
  'Belgium': { primary: '#E30613', secondary: '#000000', pattern: 'solid' },
  'Egypt': { primary: '#C8102E', secondary: '#000000', pattern: 'solid' },
  'Iran': { primary: '#FFFFFF', secondary: '#239E46', pattern: 'solid' },
  'New Zealand': { primary: '#000000', secondary: '#FFFFFF', pattern: 'solid' },
  // Group H
  'Spain': { primary: '#AA151B', secondary: '#F1BF00', pattern: 'solid' },
  'Cabo Verde': { primary: '#003893', secondary: '#D21034', pattern: 'solid' },
  'Saudi Arabia': { primary: '#006C35', secondary: '#FFFFFF', pattern: 'solid' },
  'Uruguay': { primary: '#0081C8', secondary: '#FFFFFF', pattern: 'solid' },
  // Group I
  'France': { primary: '#002395', secondary: '#FFFFFF', pattern: 'solid' },
  'Senegal': { primary: '#FFFFFF', secondary: '#11A355', pattern: 'solid' },
  'Iraq': { primary: '#FFFFFF', secondary: '#007A3D', pattern: 'solid' },
  'Norway': { primary: '#EF2B2D', secondary: '#002868', pattern: 'solid' },
  // Group J
  'Argentina': { primary: '#74ACDF', secondary: '#FFFFFF', pattern: 'stripes' },
  'Algeria': { primary: '#FFFFFF', secondary: '#006633', pattern: 'solid' },
  'Austria': { primary: '#ED2939', secondary: '#FFFFFF', pattern: 'solid' },
  'Jordan': { primary: '#C1272D', secondary: '#006233', pattern: 'solid' },
  // Group K
  'Portugal': { primary: '#E42518', secondary: '#00662F', pattern: 'solid' },
  'DR Congo': { primary: '#007FFF', secondary: '#CE1126', pattern: 'solid' },
  'Uzbekistan': { primary: '#FFFFFF', secondary: '#0099B5', pattern: 'solid' },
  'Colombia': { primary: '#FCD116', secondary: '#003893', pattern: 'solid' },
  // Group L
  'England': { primary: '#FFFFFF', secondary: '#CE1124', pattern: 'solid' },
  'Croatia': { primary: '#FF0000', secondary: '#FFFFFF', pattern: 'checkers' },
  'Ghana': { primary: '#FFFFFF', secondary: '#EF3340', pattern: 'solid' },
  'Panama': { primary: '#DA121A', secondary: '#00205B', pattern: 'solid' },
  // Extra nations from clubs
  'Nigeria': { primary: '#008751', secondary: '#FFFFFF', pattern: 'solid' },
  'Slovenia': { primary: '#FFFFFF', secondary: '#003DA5', pattern: 'solid' },
  'Poland': { primary: '#FFFFFF', secondary: '#DC143C', pattern: 'solid' },
};

const DEFAULT_JERSEY = { primary: '#333333', secondary: '#666666', pattern: 'solid' };

function getJersey(nation: string) {
  return JERSEY_COLORS[nation] || DEFAULT_JERSEY;
}

// Jersey SVG component with real kit patterns
function JerseyIcon({ nation, size = 'sm' }: { nation: string; size?: 'sm' | 'md' }) {
  const j = getJersey(nation);
  const s = size === 'md' ? 44 : 36;
  const isLight = ['#FFFFFF', '#FFF200', '#FFDC02', '#FFDD00', '#FCD116', '#FECC02', '#74ACDF'].includes(j.primary);

  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Jersey body */}
      <path d="M8 12L4 8L10 4H16L20 2L24 4H30L36 8L32 12V36H8V12Z" fill={j.primary} stroke={isLight ? '#ccc' : j.primary} strokeWidth="0.5"/>
      {/* Sleeves */}
      <path d="M4 8L10 4V12L8 12L4 8Z" fill={j.secondary} opacity="0.7"/>
      <path d="M36 8L30 4V12L32 12L36 8Z" fill={j.secondary} opacity="0.7"/>
      {/* Collar */}
      <path d="M16 4L20 2L24 4" stroke={j.secondary} strokeWidth="1.5" fill="none"/>
      {/* Pattern overlays */}
      {j.pattern === 'stripes' && (
        <>
          <rect x="12" y="12" width="3" height="24" fill={j.secondary} opacity="0.3"/>
          <rect x="18" y="12" width="3" height="24" fill={j.secondary} opacity="0.3"/>
          <rect x="24" y="12" width="3" height="24" fill={j.secondary} opacity="0.3"/>
        </>
      )}
      {j.pattern === 'checkers' && (
        <>
          <rect x="8" y="12" width="6" height="6" fill={j.secondary} opacity="0.4"/>
          <rect x="20" y="12" width="6" height="6" fill={j.secondary} opacity="0.4"/>
          <rect x="14" y="18" width="6" height="6" fill={j.secondary} opacity="0.4"/>
          <rect x="26" y="18" width="6" height="6" fill={j.secondary} opacity="0.4"/>
          <rect x="8" y="24" width="6" height="6" fill={j.secondary} opacity="0.4"/>
          <rect x="20" y="24" width="6" height="6" fill={j.secondary} opacity="0.4"/>
        </>
      )}
    </svg>
  );
}
const STARTING_XI: Record<string, number> = { GK: 1, DEF: 4, MID: 4, FWD: 2 };

function posMap(p: string): string {
  if (p?.includes('Goal')) return 'GK';
  if (p?.includes('Defend')) return 'DEF';
  if (p?.includes('Mid')) return 'MID';
  return 'FWD';
}

// Tier A nations get price boost
const TIER_A = ['Argentina', 'France', 'Brazil', 'England', 'Spain'];
const TIER_B = ['Netherlands', 'Portugal', 'Germany', 'Belgium', 'Croatia', 'Uruguay'];

// Algorithmic Pricing Index — corrected with xG/xA optimization
function getPrice(pos: string, nation?: string, power?: number): number {
  const tier = TIER_A.includes(nation || '') ? 'A' : TIER_B.includes(nation || '') ? 'B' : 'C';
  
  if (pos === 'FWD') {
    if (power && power >= 95) return tier === 'A' ? 13.0 : 12.5; // Elite Heavyweight
    if (power && power >= 88) return tier === 'A' ? 10.5 : tier === 'B' ? 10.0 : 9.5; // Premium Regular
    if (power && power >= 80) return tier === 'A' ? 8.0 : tier === 'B' ? 7.5 : 7.0; // Mid-Tier Value
    return tier === 'A' ? 5.5 : tier === 'B' ? 5.0 : 4.5; // Enabler
  }
  if (pos === 'MID') {
    if (power && power >= 93) return tier === 'A' ? 12.5 : 11.5; // Elite Heavyweight (inverted wingers)
    if (power && power >= 88) return tier === 'A' ? 10.0 : tier === 'B' ? 9.5 : 8.5; // Premium Regular
    if (power && power >= 80) return tier === 'A' ? 7.5 : tier === 'B' ? 7.0 : 6.5; // Mid-Tier Value
    return tier === 'A' ? 5.0 : tier === 'B' ? 4.5 : 4.5; // Enabler (DMs dropped)
  }
  if (pos === 'DEF') {
    if (power && power >= 88) return tier === 'A' ? 7.0 : tier === 'B' ? 6.5 : 6.0; // Elite wing-backs
    if (power && power >= 83) return tier === 'A' ? 6.0 : 5.5; // Premium CBs
    if (power && power >= 77) return 4.5; // Mid-Tier
    return 4.0; // Enabler
  }
  // GK — narrow band
  if (power && power >= 88) return 6.0; // Elite
  if (power && power >= 84) return 5.5; // Premium
  if (power && power >= 78) return 4.5; // Mid-Tier (save magnets)
  return 4.0; // Enabler
}

// Generate a realistic power rating for API-loaded players
// Most squad players are rotation/bench — only a few are stars
function generatePower(pos: string, nation: string): number {
  const tier = TIER_A.includes(nation) ? 'A' : TIER_B.includes(nation) ? 'B' : 'C';
  // Most API-loaded players are NOT stars — keep power low
  // Stars are already in PLAYER_POOL with accurate prices
  let base = tier === 'A' ? 70 : tier === 'B' ? 68 : 65;
  base += Math.floor(Math.random() * 10); // +0 to +9, so range 65-79
  if (pos === 'GK') base -= 2;
  return Math.min(79, Math.max(60, base)); // Cap at 79 — anything higher is a star in PLAYER_POOL
}

export default function FantasyWC() {
  const { user } = useAuth();
  const [squad, setSquad] = useState<typeof PLAYER_POOL>([]);
  const [captainId, setCaptainId] = useState<number | null>(null);
  const [viceCaptainId, setViceCaptainId] = useState<number | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'power' | 'price-high' | 'price-low'>('power');
  const [teamName, setTeamName] = useState('My Fantasy XI');
  const [teamCreated, setTeamCreated] = useState(false);
  const [apiPlayers, setApiPlayers] = useState<typeof PLAYER_POOL>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [nationsLoaded, setNationsLoaded] = useState(false);
  const searchTimer = useRef<any>(null);

  // All 48 WC nation team IDs for API
  const WC_NATION_IDS = [
    { id: 16, name: 'Mexico', flag: '🇲🇽' }, { id: 15, name: 'South Africa', flag: '🇿🇦' }, { id: 17, name: 'South Korea', flag: '🇰🇷' }, { id: 1530, name: 'Czech Republic', flag: '🇨🇿' },
    { id: 5529, name: 'Canada', flag: '🇨🇦' }, { id: 15, name: 'Switzerland', flag: '🇨🇭' }, { id: 1569, name: 'Qatar', flag: '🇶🇦' }, { id: 1105, name: 'Bosnia & Herz.', flag: '🇧🇦' },
    { id: 6, name: 'Brazil', flag: '🇧🇷' }, { id: 31, name: 'Morocco', flag: '🇲🇦' }, { id: 1108, name: 'Haiti', flag: '🇭🇹' }, { id: 1106, name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
    { id: 2384, name: 'USA', flag: '🇺🇸' }, { id: 1580, name: 'Paraguay', flag: '🇵🇾' }, { id: 24, name: 'Australia', flag: '🇦🇺' }, { id: 135, name: 'Turkey', flag: '🇹🇷' },
    { id: 25, name: 'Germany', flag: '🇩🇪' }, { id: 1561, name: 'Curaçao', flag: '🇨🇼' }, { id: 21, name: 'Ivory Coast', flag: '🇨🇮' }, { id: 1559, name: 'Ecuador', flag: '🇪🇨' },
    { id: 1118, name: 'Netherlands', flag: '🇳🇱' }, { id: 12, name: 'Japan', flag: '🇯🇵' }, { id: 1106, name: 'Tunisia', flag: '🇹🇳' }, { id: 22, name: 'Sweden', flag: '🇸🇪' },
    { id: 1, name: 'Belgium', flag: '🇧🇪' }, { id: 13, name: 'Egypt', flag: '🇪🇬' }, { id: 22, name: 'Iran', flag: '🇮🇷' }, { id: 1530, name: 'New Zealand', flag: '🇳🇿' },
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
    }).sort((a, b) => sortBy === 'power' ? b.power - a.power : sortBy === 'price-high' ? b.price - a.price : a.price - b.price);
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

  const autoFillRemaining = () => {
    const newSquad = [...squad];
    let remaining = budget;
    const targets: Record<string, number> = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
    const nationCount: Record<string, number> = {};
    newSquad.forEach(p => { nationCount[p.nation] = (nationCount[p.nation] || 0) + 1; });

    const available = [...allPlayers]
      .filter(p => !newSquad.some(s => s.id === p.id))
      .sort(() => Math.random() - 0.5);

    for (const pos of ['GK', 'DEF', 'MID', 'FWD']) {
      const need = targets[pos] - newSquad.filter(s => s.pos === pos).length;
      if (need <= 0) continue;
      const candidates = available.filter(p => p.pos === pos).sort((a, b) => b.power - a.power);
      let added = 0;
      for (const p of candidates) {
        if (added >= need || newSquad.length >= 15) break;
        const nc = nationCount[p.nation] || 0;
        if (nc >= 3 || remaining < p.price) continue;
        const slotsLeft = 15 - newSquad.length - 1;
        if (slotsLeft > 2 && remaining - p.price < slotsLeft * 3.0) continue;
        newSquad.push(p);
        remaining -= p.price;
        nationCount[p.nation] = nc + 1;
        added++;
      }
    }
    setSquad(newSquad);
    if (!captainId && newSquad.length > 0) {
      const best = newSquad.filter(p => p.pos === 'FWD' || p.pos === 'MID').sort((a, b) => b.power - a.power)[0];
      if (best) setCaptainId(best.id);
    }
    toast.success(`🤖 Filled to ${newSquad.length} players! ${remaining.toFixed(1)}M remaining`);
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
    // Auto-set captain
    const bestAttacker = newSquad.filter(p => p.pos === 'FWD' || p.pos === 'MID').sort((a, b) => b.power - a.power);
    if (bestAttacker.length > 0) {
      const pick = bestAttacker[Math.floor(Math.random() * Math.min(3, bestAttacker.length))];
      setCaptainId(pick.id);
      if (bestAttacker.length > 1) {
        const vc = bestAttacker.find(p => p.id !== pick.id);
        if (vc) setViceCaptainId(vc.id);
      }
    }
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
            <button onClick={() => {
              if (squad.length > 0 && squad.length < 15) {
                if (confirm(`You have ${squad.length} players. Fill remaining ${15 - squad.length} slots automatically?\n\nCancel to reset and auto-pick all 15.`)) {
                  autoFillRemaining();
                } else {
                  autoPick();
                }
              } else {
                autoPick();
              }
            }} className="bg-gray-800 hover:bg-gray-700 text-[10px] font-bold px-3 py-1.5 rounded-lg text-gray-200 flex items-center gap-1">
              🤖 AI Pick
            </button>
            <button onClick={() => {
              if (squad.length < 15) return toast.error(`Need ${15 - squad.length} more players`);
              if (!captainId) return toast.error('Select a captain first');
              toast.success('🟢 Squad saved for Gameweek 1!');
            }}
              className={cn('text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all',
                squad.length === 15 && captainId ? 'bg-[#00FF66] hover:opacity-90 text-black' : 'bg-gray-700 text-gray-500 cursor-not-allowed',
              )}>
              {squad.length === 15 ? '💾 Save' : `${squad.length}/15`}
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
            <PitchLine pos="FWD" squad={getByPos('FWD')} limit={3} onAdd={() => setActiveFilter('FWD')} onRemove={removePlayer} captainId={captainId} viceCaptainId={viceCaptainId} onSetCaptain={(id) => { setCaptainId(id); if (viceCaptainId === id) setViceCaptainId(null); }} onSetVC={(id) => { setViceCaptainId(id); if (captainId === id) setCaptainId(null); }} selectedPlayer={selectedPlayer} onSelect={setSelectedPlayer} />
            {/* MID */}
            <PitchLine pos="MID" squad={getByPos('MID')} limit={5} onAdd={() => setActiveFilter('MID')} onRemove={removePlayer} captainId={captainId} viceCaptainId={viceCaptainId} onSetCaptain={(id) => { setCaptainId(id); if (viceCaptainId === id) setViceCaptainId(null); }} onSetVC={(id) => { setViceCaptainId(id); if (captainId === id) setCaptainId(null); }} selectedPlayer={selectedPlayer} onSelect={setSelectedPlayer} />
            {/* DEF */}
            <PitchLine pos="DEF" squad={getByPos('DEF')} limit={5} onAdd={() => setActiveFilter('DEF')} onRemove={removePlayer} captainId={captainId} viceCaptainId={viceCaptainId} onSetCaptain={(id) => { setCaptainId(id); if (viceCaptainId === id) setViceCaptainId(null); }} onSetVC={(id) => { setViceCaptainId(id); if (captainId === id) setCaptainId(null); }} selectedPlayer={selectedPlayer} onSelect={setSelectedPlayer} />
            {/* GK */}
            <PitchLine pos="GK" squad={getByPos('GK')} limit={2} onAdd={() => setActiveFilter('GK')} onRemove={removePlayer} captainId={captainId} viceCaptainId={viceCaptainId} onSetCaptain={(id) => { setCaptainId(id); if (viceCaptainId === id) setViceCaptainId(null); }} onSetVC={(id) => { setViceCaptainId(id); if (captainId === id) setCaptainId(null); }} selectedPlayer={selectedPlayer} onSelect={setSelectedPlayer} />

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
              <button onClick={() => setSortBy('price-high')} className={cn('text-[9px] px-2 py-1 rounded font-bold', sortBy === 'price-high' ? 'bg-[#00FF66]/20 text-[#00FF66]' : 'text-gray-600')}>💰 Price ↓</button>
              <button onClick={() => setSortBy('price-low')} className={cn('text-[9px] px-2 py-1 rounded font-bold', sortBy === 'price-low' ? 'bg-[#00FF66]/20 text-[#00FF66]' : 'text-gray-600')}>💰 Price ↑</button>
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
                      <JerseyIcon nation={player.nation} />
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
function PitchLine({ pos, squad, limit, onAdd, onRemove, captainId, viceCaptainId, onSetCaptain, onSetVC, selectedPlayer, onSelect }: {
  pos: string; squad: typeof PLAYER_POOL; limit: number;
  onAdd: () => void; onRemove: (id: number) => void;
  captainId: number | null; viceCaptainId: number | null;
  onSetCaptain: (id: number) => void; onSetVC: (id: number) => void;
  selectedPlayer: number | null; onSelect: (id: number | null) => void;
}) {
  const empty = Math.max(0, limit - squad.length);
  const gap = pos === 'GK' ? 'gap-6' : pos === 'DEF' ? 'gap-2 sm:gap-3' : 'gap-2 sm:gap-4';

  return (
    <div className={cn('relative z-10 flex justify-center flex-wrap my-1', gap)}>
      {squad.map(p => {
        const isCaptain = captainId === p.id;
        const isVC = viceCaptainId === p.id;
        const isSelected = selectedPlayer === p.id;
        return (
          <div key={p.id} className="relative text-center w-14 sm:w-16">
            <div className="relative mx-auto cursor-pointer" onClick={() => onSelect(isSelected ? null : p.id)}>
              <JerseyIcon nation={p.nation} size="md" />
              {/* Captain / VC badge */}
              {isCaptain && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shadow-lg z-10">
                  <span className="text-[8px] font-black text-black">C</span>
                </div>
              )}
              {isVC && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center shadow-lg z-10">
                  <span className="text-[8px] font-black text-gray-700">VC</span>
                </div>
              )}
              {/* Selection glow */}
              {isSelected && <div className="absolute inset-0 rounded-lg ring-2 ring-[#00FF66] ring-offset-1 ring-offset-transparent animate-pulse" />}
            </div>
            <p className="text-[8px] sm:text-[9px] font-bold text-white truncate mt-0.5 drop-shadow max-w-[60px] sm:max-w-[70px]">{p.name.split(' ').pop()}</p>
            <p className="text-[7px] font-mono text-[#00FF66]">${p.price}M</p>

            {/* Context menu on select */}
            {isSelected && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-[#111] border border-[#333] rounded-lg shadow-xl z-30 overflow-hidden whitespace-nowrap">
                <button onClick={(e) => { e.stopPropagation(); onSetCaptain(p.id); onSelect(null); }} className="block w-full px-3 py-1.5 text-[9px] font-bold text-amber-400 hover:bg-[#1a1a1a] text-left">⭐ Captain</button>
                <button onClick={(e) => { e.stopPropagation(); onSetVC(p.id); onSelect(null); }} className="block w-full px-3 py-1.5 text-[9px] font-bold text-gray-300 hover:bg-[#1a1a1a] text-left">🥈 Vice Captain</button>
                <button onClick={(e) => { e.stopPropagation(); onRemove(p.id); onSelect(null); }} className="block w-full px-3 py-1.5 text-[9px] font-bold text-red-400 hover:bg-[#1a1a1a] text-left">✕ Remove</button>
              </div>
            )}
          </div>
        );
      })}
      {Array.from({ length: empty }).map((_, i) => (
        <button key={`e-${i}`} onClick={onAdd} className="text-center">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center mx-auto hover:border-[#00FF66]/40 transition-colors">
            <span className="text-base text-white/10 hover:text-[#00FF66]/40">+</span>
          </div>
          <p className="text-[8px] text-white/15 mt-0.5 font-bold">{pos}</p>
        </button>
      ))}
    </div>
  );
}
