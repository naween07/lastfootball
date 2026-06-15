import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import SEOHead from '@/components/SEOHead';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { callApi } from '@/services/footballApi';
import { lookupPrice } from '@/data/fantasyPrices';
import { normalizeTeamName } from '@/utils/teamNames';
import { Trophy, Search, X, Loader2, Shield, Crown, Coins, Sparkles, Save, Check, AlertTriangle, ChevronDown, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Player Pool (Top WC players with prices) ──────────────────────────────
const PLAYER_POOL: { id: number; name: string; pos: string; nation: string; flag: string; club: string; price: number; power: number; photo?: string }[] = [
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

// Apply curated WC2026 prices to the hardcoded stars (overrides old guesses)
for (const p of PLAYER_POOL) {
  const _ov = lookupPrice(p.name);
  if (_ov !== undefined) {
    p.price = _ov;
    p.power = Math.min(99, Math.max(55, Math.round(50 + _ov * 4)));
  }
}


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
const TIER_B = ['Netherlands', 'Portugal', 'Germany', 'Belgium', 'Croatia', 'Uruguay', 'Norway', 'Morocco', 'Colombia', 'Japan', 'Switzerland', 'Turkey'];

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


// ─── Gameweek mapping (round label -> GW) ───
function roundToGW(r: string | undefined): number {
  if (!r) return 0;
  if (r.startsWith('Group Stage')) { const n = parseInt(r.replace(/\D+/g, '')); return n >= 1 && n <= 3 ? n : 0; }
  const lo = r.toLowerCase();
  if (lo.includes('32')) return 4;
  if (lo.includes('16')) return 5;
  if (lo.includes('quarter')) return 6;
  if (lo.includes('semi')) return 7;
  if (lo.includes('final')) return 8;
  return 0;
}
const GW_LABEL: Record<number, string> = { 1: 'Group Stage 1', 2: 'Group Stage 2', 3: 'Group Stage 3', 4: 'Round of 32', 5: 'Round of 16', 6: 'Quarter-finals', 7: 'Semi-finals', 8: 'Final' };
const GW_NATION_CAP: Record<number, number> = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 5, 7: 6, 8: 8 };

// Nation name -> ISO code for image flags (emoji flags don't render on Windows)
const NATION_ISO: Record<string, string> = {
  'Mexico': 'mx', 'South Africa': 'za', 'South Korea': 'kr', 'Czech Republic': 'cz',
  'Canada': 'ca', 'Switzerland': 'ch', 'Qatar': 'qa', 'Bosnia & Herz.': 'ba', 'Bosnia and Herzegovina': 'ba',
  'Brazil': 'br', 'Morocco': 'ma', 'Haiti': 'ht', 'Scotland': 'gb-sct',
  'USA': 'us', 'Paraguay': 'py', 'Australia': 'au', 'Turkey': 'tr',
  'Germany': 'de', 'Cura\u00e7ao': 'cw', 'Curacao': 'cw', 'Ivory Coast': 'ci', 'Ecuador': 'ec',
  'Netherlands': 'nl', 'Japan': 'jp', 'Tunisia': 'tn', 'Sweden': 'se',
  'Belgium': 'be', 'Egypt': 'eg', 'Iran': 'ir', 'New Zealand': 'nz',
  'Spain': 'es', 'Cape Verde': 'cv', 'Saudi Arabia': 'sa', 'Uruguay': 'uy',
  'France': 'fr', 'Senegal': 'sn', 'Norway': 'no', 'Iraq': 'iq',
  'Argentina': 'ar', 'Algeria': 'dz', 'Austria': 'at', 'Jordan': 'jo',
  'Portugal': 'pt', 'Uzbekistan': 'uz', 'Colombia': 'co', 'DR Congo': 'cd',
  'England': 'gb-eng', 'Croatia': 'hr', 'Ghana': 'gh', 'Panama': 'pa',
};
function NFlag({ nation, fallback, size = 18 }: { nation: string; fallback?: string; size?: number }) {
  const iso = NATION_ISO[nation];
  if (!iso) return <span style={{ fontSize: size * 0.8 }}>{fallback || ''}</span>;
  return (
    <img src={`https://flagcdn.com/w40/${iso}.png`} width={size} height={Math.round(size * 0.75)}
      alt={nation} loading="lazy" className="inline-block rounded-[2px] object-contain flex-shrink-0" />
  );
}

export default function FantasyWC() {
  const { user } = useAuth();
  const [apiPlayers, setApiPlayers] = useState<typeof PLAYER_POOL>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [nationsLoaded, setNationsLoaded] = useState(false);

  // Country flag emojis for qualified nations
  const FLAGS: Record<string, string> = {
    'Mexico': '\u{1F1F2}\u{1F1FD}', 'South Africa': '\u{1F1FF}\u{1F1E6}', 'South Korea': '\u{1F1F0}\u{1F1F7}', 'Czech Republic': '\u{1F1E8}\u{1F1FF}',
    'Canada': '\u{1F1E8}\u{1F1E6}', 'Switzerland': '\u{1F1E8}\u{1F1ED}', 'Qatar': '\u{1F1F6}\u{1F1E6}', 'Bosnia & Herz.': '\u{1F1E7}\u{1F1E6}',
    'Brazil': '\u{1F1E7}\u{1F1F7}', 'Morocco': '\u{1F1F2}\u{1F1E6}', 'Haiti': '\u{1F1ED}\u{1F1F9}', 'Scotland': '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
    'USA': '\u{1F1FA}\u{1F1F8}', 'Paraguay': '\u{1F1F5}\u{1F1FE}', 'Australia': '\u{1F1E6}\u{1F1FA}', 'Turkey': '\u{1F1F9}\u{1F1F7}',
    'Germany': '\u{1F1E9}\u{1F1EA}', 'Cura\u00e7ao': '\u{1F1E8}\u{1F1FC}', 'Curacao': '\u{1F1E8}\u{1F1FC}', 'Ivory Coast': '\u{1F1E8}\u{1F1EE}', 'Ecuador': '\u{1F1EA}\u{1F1E8}',
    'Netherlands': '\u{1F1F3}\u{1F1F1}', 'Japan': '\u{1F1EF}\u{1F1F5}', 'Tunisia': '\u{1F1F9}\u{1F1F3}', 'Sweden': '\u{1F1F8}\u{1F1EA}',
    'Belgium': '\u{1F1E7}\u{1F1EA}', 'Egypt': '\u{1F1EA}\u{1F1EC}', 'Iran': '\u{1F1EE}\u{1F1F7}', 'New Zealand': '\u{1F1F3}\u{1F1FF}',
    'Spain': '\u{1F1EA}\u{1F1F8}', 'Cape Verde': '\u{1F1E8}\u{1F1FB}', 'Saudi Arabia': '\u{1F1F8}\u{1F1E6}', 'Uruguay': '\u{1F1FA}\u{1F1FE}',
    'France': '\u{1F1EB}\u{1F1F7}', 'Senegal': '\u{1F1F8}\u{1F1F3}', 'Norway': '\u{1F1F3}\u{1F1F4}', 'Iraq': '\u{1F1EE}\u{1F1F6}',
    'Argentina': '\u{1F1E6}\u{1F1F7}', 'Algeria': '\u{1F1E9}\u{1F1FF}', 'Austria': '\u{1F1E6}\u{1F1F9}', 'Jordan': '\u{1F1EF}\u{1F1F4}',
    'Portugal': '\u{1F1F5}\u{1F1F9}', 'Uzbekistan': '\u{1F1FA}\u{1F1FF}', 'Colombia': '\u{1F1E8}\u{1F1F4}', 'DR Congo': '\u{1F1E8}\u{1F1E9}',
    'England': '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', 'Croatia': '\u{1F1ED}\u{1F1F7}', 'Ghana': '\u{1F1EC}\u{1F1ED}', 'Panama': '\u{1F1F5}\u{1F1E6}',
  };

  // Load ALL qualified WC 2026 squads (real team IDs fetched from the API)
  useEffect(() => {
    if (nationsLoaded) return;
    const loadNations = async () => {
      setApiLoading(true);
      const results: typeof PLAYER_POOL = [];
      try {
        const teamsData = await callApi('teams', { league: '1', season: '2026' });
        const teams = (teamsData || [])
          .map((t: any) => ({ id: t.team?.id, name: normalizeTeamName(t.team?.name || '') }))
          .filter((t: any) => t.id);
        const CONC = 6;
        for (let i = 0; i < teams.length; i += CONC) {
          const batch = teams.slice(i, i + CONC);
          const settled = await Promise.allSettled(batch.map(async (t: any) => {
            const data = await callApi('players/squads', { team: String(t.id) });
            return { t, players: data?.[0]?.players || [] };
          }));
          for (const s of settled) {
            if (s.status !== 'fulfilled') continue;
            const { t, players } = s.value;
            for (const p of players) {
              const pos = posMap(p.position);
              const ov = lookupPrice(p.name);
              const power = ov !== undefined ? Math.min(99, Math.max(55, Math.round(50 + ov * 4))) : generatePower(pos, t.name);
              results.push({
                photo: p.photo || '',
                id: p.id, name: p.name, pos, nation: t.name,
                flag: FLAGS[t.name] || '\u{1F3F3}\u{FE0F}', club: '',
                price: ov !== undefined ? ov : getPrice(pos, t.name, power), power,
              });
            }
          }
        }
      } catch {}
      setApiPlayers(results);
      setNationsLoaded(true);
      setApiLoading(false);
    };
    loadNations();
  }, [nationsLoaded]);

  // Combined list: official-squad players take priority (real IDs, photos, curated prices).
  // Hardcoded stars only shown while squads are still loading.
  const allPlayers = useMemo(() => {
    const normN = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\./g, '').trim();
    const squadsLoaded = apiPlayers.length >= 400;
    const seen = new Map<string, typeof PLAYER_POOL[0]>();
    for (const p of apiPlayers) seen.set(normN(p.name), p);
    if (!squadsLoaded) {
      for (const p of PLAYER_POOL) {
        const key = normN(p.name);
        const lastName = key.split(' ').pop() || key;
        const firstName = key.split(' ')[0] || '';
        let dupe = seen.has(key);
        if (!dupe) {
          for (const [ek] of seen) {
            if (ek.includes(lastName) && ek.includes(firstName)) { dupe = true; break; }
            if (lastName.length > 4 && ek.includes(lastName)) { dupe = true; break; }
          }
        }
        if (!dupe) seen.set(key, p);
      }
    }
    return Array.from(seen.values());
  }, [apiPlayers]);

  // ───────────────────────── Squad State ─────────────────────────
  type P = (typeof PLAYER_POOL)[number];
  const FORMATIONS: Record<string, [number, number, number]> = {
    '4-3-3': [4, 3, 3], '4-4-2': [4, 4, 2], '3-5-2': [3, 5, 2], '5-3-2': [5, 3, 2], '3-4-3': [3, 4, 3],
  };
  const [formation, setFormation] = useState('4-3-3');
  const [starters, setStarters] = useState<P[]>([]);
  const [bench, setBench] = useState<(P | null)[]>([null, null, null, null]); // [GK, SUB1, SUB2, SUB3]
  const [captainId, setCaptainId] = useState<number | null>(null);
  const [viceId, setViceId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'power' | 'price-high' | 'price-low'>('power');
  const [visibleCount, setVisibleCount] = useState(120);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'success'>('idle');
  const [teamName, setTeamName] = useState('My Fantasy XI');
  const dragData = useRef<{ id: number; source: 'pitch' | 'bench'; benchIdx?: number } | null>(null);
  const [gwInfo, setGwInfo] = useState<{ targetGW: number; deadline: string | null; aliveNations: string[] | null }>({ targetGW: 1, deadline: null, aliveNations: null });
  const nationCap = GW_NATION_CAP[gwInfo.targetGW] || 3;
  const reconciledRef = useRef(false);

  // Determine current gameweek + deadline + alive teams from real fixtures
  useEffect(() => {
    (async () => {
      try {
        const fx = await callApi('fixtures', { league: '1', season: '2026', timezone: 'America/New_York' });
        const list = Array.isArray(fx) ? fx : [];
        if (!list.length) return;
        const gwFirst: Record<number, number> = {};
        const gwTeams: Record<number, Set<string>> = {};
        for (const f of list) {
          const gw = roundToGW(f.league?.round);
          if (!gw) continue;
          const t = new Date(f.fixture?.date).getTime();
          if (!gwFirst[gw] || t < gwFirst[gw]) gwFirst[gw] = t;
          if (!gwTeams[gw]) gwTeams[gw] = new Set();
          const hn = f.teams?.home?.name, an = f.teams?.away?.name;
          if (hn) gwTeams[gw].add(normalizeTeamName(hn));
          if (an) gwTeams[gw].add(normalizeTeamName(an));
        }
        const now = Date.now();
        let target = 8;
        for (let g = 1; g <= 8; g++) { if (gwFirst[g] && gwFirst[g] > now) { target = g; break; } }
        let alive: string[] | null = null;
        if (target >= 4 && gwTeams[target] && gwTeams[target].size >= 2) {
          const names = Array.from(gwTeams[target]).filter(n => n && !/tbd|winner|loser|runner/i.test(n));
          if (names.length >= 2) alive = names;
        }
        setGwInfo({ targetGW: target, deadline: gwFirst[target] ? new Date(gwFirst[target]).toISOString() : null, aliveNations: alive });
      } catch {}
    })();
  }, []);

  const [savedLoaded, setSavedLoaded] = useState(false);
  const [view, setView] = useState<'builder' | 'table'>('builder');
  const [lbRows, setLbRows] = useState<any[]>([]);
  const [lbLoading, setLbLoading] = useState(false);
  const [myGw, setMyGw] = useState<any[]>([]);

  // Load previously saved squad on mount (public SELECT via anon key — reliable raw fetch)
  useEffect(() => {
    if (!user || savedLoaded) return;
    (async () => {
      try {
        const BASE = import.meta.env.VITE_SUPABASE_URL;
        const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const H: Record<string, string> = { apikey: KEY, Authorization: `Bearer ${KEY}` };
        const [teamRes, rowsRes] = await Promise.all([
          fetch(`${BASE}/rest/v1/fantasy_teams?user_id=eq.${user.id}&select=*`, { headers: H }).then(r => r.json()),
          fetch(`${BASE}/rest/v1/fantasy_squad?user_id=eq.${user.id}&select=*`, { headers: H }).then(r => r.json()),
        ]);
        const team = Array.isArray(teamRes) ? teamRes[0] : null;
        const rows = Array.isArray(rowsRes) ? rowsRes : [];
        if (team?.team_name) setTeamName(team.team_name);
        if (rows.length > 0) {
          const toP = (r: any) => ({ id: r.player_id, name: r.player_name, pos: r.position, nation: r.nation || '', flag: r.nation_flag || '', club: '', price: Number(r.price) || 4, power: 70, photo: r.player_photo || '' });
          const st = rows.filter((r: any) => r.is_starting).map(toP);
          const bn = rows.filter((r: any) => !r.is_starting).map(toP);
          const gk = bn.find((p: any) => p.pos === 'GK') || null;
          const rest = bn.filter((p: any) => p !== gk).slice(0, 3);
          setStarters(st as any);
          setBench([gk, rest[0] || null, rest[1] || null, rest[2] || null] as any);
          const d = st.filter((p: any) => p.pos === 'DEF').length, m = st.filter((p: any) => p.pos === 'MID').length, fw = st.filter((p: any) => p.pos === 'FWD').length;
          if (d && m && fw) setFormation(`${d}-${m}-${fw}`);
          const cap = rows.find((r: any) => r.is_captain); if (cap) setCaptainId(cap.player_id);
          const vc = rows.find((r: any) => r.is_vice_captain); if (vc) setViceId(vc.player_id);
        }
      } catch {}
      setSavedLoaded(true);
    })();
  }, [user, savedLoaded]);

  // Reconcile saved squad with the live pool (real player IDs + photos + current prices)
  useEffect(() => {
    if (!savedLoaded || apiPlayers.length < 400 || reconciledRef.current) return;
    reconciledRef.current = true;
    const normN = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\./g, '').trim();
    const idx = new Map<string, typeof PLAYER_POOL[0]>();
    for (const p of allPlayers) {
      const k = normN(p.name); idx.set(k, p);
      const parts = k.split(' ');
      if (parts.length >= 2) {
        idx.set(parts[0][0] + '|' + parts[parts.length - 1], p);
        idx.set(parts[parts.length - 1][0] + '|' + parts[0], p);
      }
    }
    const remap = (p: typeof PLAYER_POOL[0]) => {
      const k = normN(p.name); const parts = k.split(' ');
      return idx.get(k) || (parts.length >= 2 ? (idx.get(parts[0][0] + '|' + parts[parts.length - 1]) || idx.get(parts[parts.length - 1][0] + '|' + parts[0])) : undefined) || p;
    };
    const oldCap = [...starters, ...(bench.filter(Boolean) as typeof PLAYER_POOL)].find(p => p.id === captainId);
    const oldVice = [...starters, ...(bench.filter(Boolean) as typeof PLAYER_POOL)].find(p => p.id === viceId);
    setStarters(s => s.map(remap));
    setBench(b => b.map(p => (p ? remap(p) : p)));
    if (oldCap) setCaptainId(remap(oldCap).id);
    if (oldVice) setViceId(remap(oldVice).id);
  }, [savedLoaded, apiPlayers.length]);

  // Fantasy league table
  useEffect(() => {
    if (view !== 'table') return;
    setLbLoading(true);
    (async () => {
      try {
        const BASE = import.meta.env.VITE_SUPABASE_URL;
        const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const r = await fetch(`${BASE}/rest/v1/fantasy_teams?select=user_id,team_name,total_points,updated_at&order=total_points.desc,updated_at.asc&limit=100`,
          { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
        const d = await r.json();
        if (Array.isArray(d)) setLbRows(d);
        if (user) {
          const g = await fetch(`${BASE}/rest/v1/fantasy_gw_points?user_id=eq.${user.id}&select=gameweek,points&order=gameweek.asc`,
            { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }).then(x => x.json()).catch(() => []);
          if (Array.isArray(g)) setMyGw(g);
        }
      } catch {}
      setLbLoading(false);
    })();
  }, [view]);

  const caps = FORMATIONS[formation] || [4, 3, 3];
  const capFor = (pos: string) => pos === 'GK' ? 1 : pos === 'DEF' ? caps[0] : pos === 'MID' ? caps[1] : caps[2];
  const line = (pos: string) => starters.filter(p => p.pos === pos);
  const squadAll = useMemo(() => [...starters, ...bench.filter(Boolean) as P[]], [starters, bench]);
  const budget = useMemo(() => 100 - squadAll.reduce((s, p) => s + p.price, 0), [squadAll]);
  const inSquad = useCallback((id: number) => squadAll.some(p => p.id === id), [squadAll]);
  const nationCount = useCallback((nation: string) => squadAll.filter(p => p.nation === nation).length, [squadAll]);

  // ───────────────────────── Market list ─────────────────────────
  const filteredPlayers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return allPlayers.filter(p => {
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.nation.toLowerCase().includes(q) || (p.club || '').toLowerCase().includes(q);
      const matchPos = activeFilter === 'ALL' || p.pos === activeFilter;
      const aliveOk = !gwInfo.aliveNations || gwInfo.aliveNations.includes(p.nation);
      return matchSearch && matchPos && aliveOk;
    }).sort((a, b) => sortBy === 'power' ? b.power - a.power : sortBy === 'price-high' ? b.price - a.price : a.price - b.price);
  }, [searchQuery, activeFilter, sortBy, allPlayers, gwInfo.aliveNations]);

  // ───────────────────────── Roster mutations ─────────────────────────
  const addPlayer = (p: P) => {
    if (inSquad(p.id)) return removePlayer(p.id);
    if (squadAll.length >= 15) return toast.error('Squad full (15 max)');
    if (budget - p.price < 0) return toast.error('Insufficient budget');
    if (nationCount(p.nation) >= nationCap) return toast.error(`Max ${nationCap} players from ${p.nation} this gameweek`);
    if (line(p.pos).length < capFor(p.pos)) {
      setStarters(s => [...s, p]);
      toast.success(`${p.name} → starting XI`);
      return;
    }
    // line full → try bench
    if (p.pos === 'GK') {
      if (bench[0]) return toast.error('Both GK slots filled');
      setBench(b => { const n = [...b]; n[0] = p; return n; });
      toast.success(`${p.name} → bench (GK)`);
      return;
    }
    const idx = bench.findIndex((b, i) => i > 0 && !b);
    if (idx === -1) return toast.error(`${p.pos} line full and bench full`);
    setBench(b => { const n = [...b]; n[idx] = p; return n; });
    toast.success(`${p.name} → bench (SUB ${idx})`);
  };

  const removePlayer = (id: number) => {
    setStarters(s => s.filter(p => p.id !== id));
    setBench(b => b.map(p => (p && p.id === id ? null : p)));
    if (captainId === id) setCaptainId(null);
    if (viceId === id) setViceId(null);
    if (selectedId === id) setSelectedId(null);
  };

  const changeFormation = (f: string) => {
    const nc = FORMATIONS[f];
    if (!nc) return;
    let s = [...starters];
    let b = [...bench];
    let dropped = 0;
    (['DEF', 'MID', 'FWD'] as const).forEach((pos, i) => {
      const cap = nc[i];
      const inLine = s.filter(p => p.pos === pos);
      while (inLine.length > cap) {
        const out = inLine.pop()!;
        s = s.filter(p => p.id !== out.id);
        const free = b.findIndex((x, j) => j > 0 && !x);
        if (free !== -1) b[free] = out; else { dropped++; if (captainId === out.id) setCaptainId(null); if (viceId === out.id) setViceId(null); }
      }
    });
    setStarters(s); setBench(b); setFormation(f); setSelectedId(null);
    if (dropped > 0) toast.warning(`${dropped} player(s) removed — no bench space`);
  };

  // ───────────────────────── Swap engine ─────────────────────────
  const selectedPlayer = useMemo(() => starters.find(p => p.id === selectedId) || null, [selectedId, starters]);

  const swapLegal = (starter: P, sub: P): string | null => {
    if (starter.pos === 'GK' || sub.pos === 'GK') {
      return starter.pos === 'GK' && sub.pos === 'GK' ? formation : null;
    }
    const counts: Record<string, number> = { DEF: line('DEF').length, MID: line('MID').length, FWD: line('FWD').length };
    counts[starter.pos] -= 1; counts[sub.pos] += 1;
    const ok = counts.DEF >= 3 && counts.DEF <= 5 && counts.MID >= 3 && counts.MID <= 5 && counts.FWD >= 1 && counts.FWD <= 3;
    return ok ? `${counts.DEF}-${counts.MID}-${counts.FWD}` : null;
  };

  const benchEligible = (sub: P | null): boolean => {
    if (!sub || !selectedPlayer) return false;
    return swapLegal(selectedPlayer, sub) !== null;
  };

  const executeSwap = (starterId: number, benchIdx: number) => {
    const starter = starters.find(p => p.id === starterId);
    const sub = bench[benchIdx];
    if (!starter || !sub) return;
    const newFormation = swapLegal(starter, sub);
    if (!newFormation) return toast.error('Swap would break formation rules');
    setStarters(s => s.map(p => (p.id === starterId ? sub : p)));
    setBench(b => { const n = [...b]; n[benchIdx] = starter; return n; });
    if (captainId === starterId) setCaptainId(sub.id);
    if (viceId === starterId) setViceId(sub.id);
    if (!(newFormation in FORMATIONS)) {
      // custom shape from swap — still legal bounds
      setFormation(newFormation);
    } else {
      setFormation(newFormation);
    }
    setSelectedId(null);
    toast.success(`${sub.name} ↔ ${starter.name}`);
  };

  const onBenchClick = (idx: number) => {
    const sub = bench[idx];
    if (selectedPlayer && sub) {
      if (benchEligible(sub)) executeSwap(selectedPlayer.id, idx);
      else toast.error('Not an eligible swap for this position');
      return;
    }
    if (sub) toast.info('Select a starter first to swap');
  };

  // ───────────────────────── Drag & drop ─────────────────────────
  const onDragStartCard = (e: React.DragEvent, id: number, source: 'pitch' | 'bench', benchIdx?: number) => {
    dragData.current = { id, source, benchIdx };
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDropOnBench = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    const d = dragData.current; dragData.current = null;
    if (!d) return;
    if (d.source === 'pitch') {
      const starter = starters.find(p => p.id === d.id);
      const sub = bench[idx];
      if (!starter) return;
      if (sub) { if (swapLegal(starter, sub)) executeSwap(starter.id, idx); else toast.error('Illegal swap'); }
      else {
        // move starter to empty bench slot (GK slot only takes GK)
        if (idx === 0 && starter.pos !== 'GK') return toast.error('GK slot only');
        if (idx > 0 && starter.pos === 'GK') return toast.error('GK goes to the GK slot');
        setStarters(s => s.filter(p => p.id !== starter.id));
        setBench(b => { const n = [...b]; n[idx] = starter; return n; });
        if (captainId === starter.id) setCaptainId(null);
        if (viceId === starter.id) setViceId(null);
      }
    } else if (d.source === 'bench' && d.benchIdx !== undefined && d.benchIdx !== idx) {
      // reorder bench (outfield slots only, GK locked)
      if (idx === 0 || d.benchIdx === 0) return;
      setBench(b => { const n = [...b]; const t = n[idx]; n[idx] = n[d.benchIdx!]; n[d.benchIdx!] = t; return n; });
    }
  };
  const onDropOnStarter = (e: React.DragEvent, starterId: number) => {
    e.preventDefault();
    const d = dragData.current; dragData.current = null;
    if (!d || d.source !== 'bench' || d.benchIdx === undefined) return;
    executeSwap(starterId, d.benchIdx);
  };
  const onDropOnEmptySlot = (e: React.DragEvent, pos: string) => {
    e.preventDefault();
    const d = dragData.current; dragData.current = null;
    if (!d || d.source !== 'bench' || d.benchIdx === undefined) return;
    const sub = bench[d.benchIdx];
    if (!sub) return;
    if (sub.pos !== pos) return toast.error(`That slot needs a ${pos}`);
    if (line(pos).length >= capFor(pos)) return toast.error(`${pos} line is full`);
    setBench(b => { const n = [...b]; n[d.benchIdx!] = null; return n; });
    setStarters(s => [...s, sub]);
  };

  // ───────────────────────── AI Pick (full 15) ─────────────────────────
  const handleAIPick = () => {
    if (allPlayers.length < 100) return toast.error('Player pool still loading — try again in a moment');
    const MIN = 3.5;
    for (let attempt = 0; attempt < 30; attempt++) {
      const slots: { pos: string; bench: boolean }[] = [
        { pos: 'GK', bench: false },
        ...Array(caps[0]).fill(0).map(() => ({ pos: 'DEF', bench: false })),
        ...Array(caps[1]).fill(0).map(() => ({ pos: 'MID', bench: false })),
        ...Array(caps[2]).fill(0).map(() => ({ pos: 'FWD', bench: false })),
        { pos: 'GK', bench: true }, { pos: 'DEF', bench: true }, { pos: 'MID', bench: true }, { pos: 'FWD', bench: true },
      ];
      const picked: P[] = [];
      const nations: Record<string, number> = {};
      let left = 100;
      let ok = true;
      for (let i = 0; i < slots.length; i++) {
        const remaining = slots.length - i - 1;
        const cands = allPlayers.filter(p =>
          p.pos === slots[i].pos &&
          !picked.some(x => x.id === p.id) &&
          (nations[p.nation] || 0) < nationCap &&
          (!gwInfo.aliveNations || gwInfo.aliveNations.includes(p.nation)) &&
          p.price <= left - MIN * remaining
        );
        if (cands.length === 0) { ok = false; break; }
        let choice: P;
        if (slots[i].bench) {
          const cheap = [...cands].sort((a, b) => a.price - b.price).slice(0, 25);
          choice = cheap[Math.floor(Math.random() * cheap.length)];
        } else if (i <= 2) {
          const top = [...cands].sort((a, b) => b.power - a.power).slice(0, 12);
          choice = top[Math.floor(Math.random() * top.length)];
        } else {
          const mid = [...cands].sort((a, b) => b.power - a.power).slice(0, Math.max(10, Math.floor(cands.length * 0.5)));
          choice = mid[Math.floor(Math.random() * mid.length)];
        }
        picked.push(choice);
        nations[choice.nation] = (nations[choice.nation] || 0) + 1;
        left -= choice.price;
      }
      if (!ok) continue;
      const startersNew = picked.slice(0, 1 + caps[0] + caps[1] + caps[2]);
      const benchNew: (P | null)[] = [picked[11], picked[12], picked[13], picked[14]];
      const byPower = [...startersNew].sort((a, b) => b.power - a.power);
      setStarters(startersNew);
      setBench(benchNew);
      setCaptainId(byPower[0]?.id ?? null);
      setViceId(byPower[1]?.id ?? null);
      setSelectedId(null);
      toast.success(`AI squad assembled — $${(100 - left).toFixed(1)}M spent`);
      return;
    }
    toast.error('Could not assemble a legal squad — try again');
  };

  // ───────────────────────── Validation ─────────────────────────
  const errors = useMemo(() => {
    const errs: string[] = [];
    const total = starters.length + bench.filter(Boolean).length;
    if (total !== 15) errs.push(`Squad incomplete (${total}/15 players)`);
    if (budget < 0) errs.push(`Over budget by $${Math.abs(budget).toFixed(1)}M`);
    const nc: Record<string, number> = {};
    for (const p of squadAll) nc[p.nation] = (nc[p.nation] || 0) + 1;
    const over = Object.entries(nc).find(([, n]) => n > nationCap);
    if (over) errs.push(`Max ${nationCap} per nation (${over[0]}: ${over[1]})`);
    if (line('GK').length !== 1) errs.push('Need exactly 1 starting GK');
    if (line('DEF').length < 3) errs.push('Minimum 3 defenders');
    if (line('MID').length < 3) errs.push('Minimum 3 midfielders');
    if (line('FWD').length < 1) errs.push('Minimum 1 forward');
    if (bench[0] && bench[0]!.pos !== 'GK') errs.push('Bench slot 1 must be a GK');
    if (total === 15 && !bench[0]) errs.push('Bench needs a GK');
    return errs;
  }, [starters, bench, budget, squadAll, nationCap]);

  // ───────────────────────── Save (raw fetch — reliable path) ─────────────────────────
  const saveSquad = async () => {
    if (errors.length > 0 || saveState !== 'idle') return;
    if (!user) return toast.error('Sign in to save your squad');
    setSaveState('saving');
    try {
      let accessToken = '';
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
          const v = JSON.parse(localStorage.getItem(k) || '{}');
          accessToken = v?.access_token || (Array.isArray(v) ? v[0] : '') || '';
          if (accessToken) break;
        }
      }
      if (!accessToken) { toast.error('Session expired — sign in again'); setSaveState('idle'); return; }
      const BASE = import.meta.env.VITE_SUPABASE_URL;
      const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const H = { apikey: KEY, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

      // 1. upsert fantasy_teams
      const existing = await fetch(`${BASE}/rest/v1/fantasy_teams?user_id=eq.${user.id}&select=id`, { headers: H }).then(r => r.json()).catch(() => []);
      const teamBody = JSON.stringify({ team_name: teamName, budget_remaining: budget, captain_id: captainId, vice_captain_id: viceId, updated_at: new Date().toISOString() });
      let teamId: string;
      if (Array.isArray(existing) && existing[0]?.id) {
        teamId = existing[0].id;
        const r = await fetch(`${BASE}/rest/v1/fantasy_teams?id=eq.${teamId}`, { method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: teamBody });
        if (!r.ok) throw new Error('Team update failed (' + r.status + ')');
      } else {
        const r = await fetch(`${BASE}/rest/v1/fantasy_teams`, { method: 'POST', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify({ user_id: user.id, team_name: teamName, budget_remaining: budget, captain_id: captainId, vice_captain_id: viceId }) });
        if (!r.ok) throw new Error('Team create failed (' + r.status + ')');
        const rows = await r.json();
        teamId = rows[0]?.id;
      }

      // 2. replace squad rows
      await fetch(`${BASE}/rest/v1/fantasy_squad?user_id=eq.${user.id}`, { method: 'DELETE', headers: { ...H, Prefer: 'return=minimal' } });
      const rows = [
        ...starters.map(p => ({ row: p, st: true })),
        ...(bench.filter(Boolean) as P[]).map(p => ({ row: p, st: false })),
      ].map(({ row: p, st }) => ({
        team_id: teamId, user_id: user.id, player_id: p.id, player_name: p.name, player_photo: (p as any).photo || null,
        nation: p.nation, nation_flag: p.flag, position: p.pos, price: p.price,
        is_starting: st, is_captain: p.id === captainId, is_vice_captain: p.id === viceId,
      }));
      const ins = await fetch(`${BASE}/rest/v1/fantasy_squad`, { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(rows) });
      if (!ins.ok) { const t = await ins.text().catch(() => ''); throw new Error('Squad save failed: ' + t.substring(0, 120)); }

      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (e: any) {
      toast.error(e?.message || 'Save failed');
      setSaveState('idle');
    }
  };

  // ───────────────────────── UI helpers ─────────────────────────
  const surname = (n: string) => { const parts = n.split(' '); return parts.length > 1 ? parts.slice(1).join(' ') : n; };

  const PlayerCard = ({ p, onPitch, benchIdx }: { p: P; onPitch: boolean; benchIdx?: number }) => {
    const isSel = selectedId === p.id;
    const eligible = !onPitch && benchEligible(p);
    return (
      <div
        draggable
        onDragStart={(e) => onDragStartCard(e, p.id, onPitch ? 'pitch' : 'bench', benchIdx)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onPitch ? onDropOnStarter(e, p.id) : onDropOnBench(e, benchIdx!)}
        onClick={() => onPitch ? setSelectedId(isSel ? null : p.id) : onBenchClick(benchIdx!)}
      >
      <motion.div
        layout
        layoutId={`pl-${p.id}`}
        animate={isSel ? { y: -6 } : { y: 0 }}
        className={cn(
          'relative w-[78px] sm:w-[92px] cursor-pointer select-none rounded-xl px-1.5 py-2 text-center backdrop-blur-md transition-shadow',
          'bg-[#1e293b]/85 border',
          isSel ? 'border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.45)]' :
          eligible ? 'border-[#00FF66]/70 shadow-[0_0_14px_rgba(0,255,102,0.35)] animate-pulse' :
          'border-white/10 hover:border-white/25',
        )}
      >
        <span className="absolute top-1 left-1.5 w-1.5 h-1.5 rounded-full bg-[#00FF66] shadow-[0_0_6px_#00FF66]" title="Fit" />
        {captainId === p.id && <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded-md shadow">C</span>}
        {viceId === p.id && <span className="absolute -top-1.5 -right-1.5 bg-slate-300 text-black text-[9px] font-black px-1 py-0.5 rounded-md shadow">VC</span>}
        <div className="relative w-9 h-9 mx-auto mb-1">
          <div className="w-9 h-9 rounded-full bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center">
            {(p as any).photo ? (
              <img src={(p as any).photo} alt="" loading="lazy" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <span className="text-[10px] font-black text-slate-400">{surname(p.name).slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <span className="absolute -bottom-0.5 -right-1"><NFlag nation={p.nation} fallback={p.flag} size={12} /></span>
        </div>
        <p className="text-[11px] sm:text-xs font-bold text-white truncate leading-tight">{surname(p.name)}</p>
        <p className="text-[9px] sm:text-[10px] font-mono text-slate-400 mt-0.5">${p.price.toFixed(1)}M</p>
        <p className="text-[8px] uppercase tracking-widest text-slate-500">{p.pos}</p>
      </motion.div>
      </div>
    );
  };

  const EmptySlot = ({ pos }: { pos: string }) => (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDropOnEmptySlot(e, pos)}
      onClick={() => { setActiveFilter(pos); toast.info(`Pick a ${pos} from the market →`); }}
      className="w-[78px] sm:w-[92px] h-[64px] sm:h-[70px] rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-white/25 cursor-pointer hover:border-[#00FF66]/40 hover:text-[#00FF66]/60 transition-colors"
    >
      <Plus className="w-4 h-4" />
      <span className="text-[9px] font-bold uppercase tracking-widest">{pos}</span>
    </div>
  );

  const PitchRow = ({ pos }: { pos: string }) => {
    const players = line(pos);
    const empties = Math.max(0, capFor(pos) - players.length);
    return (
      <div className="flex justify-evenly items-center gap-1 sm:gap-2 py-2 sm:py-3 relative z-10">
        {players.map(p => <PlayerCard key={p.id} p={p} onPitch />)}
        {Array(empties).fill(0).map((_, i) => <EmptySlot key={`e-${pos}-${i}`} pos={pos} />)}
      </div>
    );
  };

  const benchLabel = ['GK', 'SUB 1', 'SUB 2', 'SUB 3'];

  // ───────────────────────── Render ─────────────────────────
  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-200">
      <SEOHead title="Fantasy World Cup 2026 | LastFootball" description="Build your FIFA World Cup 2026 fantasy squad — all 48 official squads, $100M budget, dynamic formations." path="/fantasy" />
      <Header />

      <div className="container max-w-7xl py-4 pb-24 md:pb-8 space-y-4">

        {/* ─── Top status bar ─── */}
        <div className="bg-[#1e293b]/60 backdrop-blur-xl border border-white/5 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3 shadow-lg shadow-black/30">
          <div className="flex items-center gap-2 mr-auto">
            <Trophy className="w-5 h-5 text-[#00FF66]" />
            <input value={teamName} onChange={e => setTeamName(e.target.value)} maxLength={28}
              className="bg-transparent text-sm font-black tracking-wide text-white focus:outline-none focus:border-b focus:border-[#00FF66]/50 w-36 sm:w-44" />
          </div>

          {/* Budget pill */}
          <div className="flex items-center gap-2 bg-white/5 backdrop-blur rounded-full pl-2.5 pr-4 py-1.5 border border-white/10">
            <span className={cn('w-2.5 h-2.5 rounded-full transition-all',
              budget > 0 ? 'bg-[#00FF66] shadow-[0_0_10px_#00FF66]' : budget === 0 ? 'bg-slate-500' : 'bg-red-500 shadow-[0_0_10px_#ef4444]')} />
            <Coins className="w-3.5 h-3.5 text-slate-400" />
            <span className={cn('text-sm font-mono font-bold tabular-nums', budget >= 0 ? 'text-[#00FF66]' : 'text-red-400')}>
              ${budget.toFixed(1)}M
            </span>
          </div>

          {/* Squad counter */}
          <div className="bg-white/5 rounded-full px-3.5 py-1.5 border border-white/10 text-xs font-bold text-slate-300 tabular-nums">
            {squadAll.length}<span className="text-slate-500">/15</span>
          </div>

          {/* Formation */}
          <div className="relative">
            <select value={formation} onChange={e => changeFormation(e.target.value)}
              className="appearance-none bg-white/5 border border-white/10 rounded-full pl-3.5 pr-8 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-[#00FF66]/50 cursor-pointer">
              {!(formation in FORMATIONS) && <option value={formation}>{formation} (custom)</option>}
              {Object.keys(FORMATIONS).map(f => <option key={f} value={f} className="bg-[#1e293b]">{f}</option>)}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* AI Pick */}
          <button onClick={handleAIPick}
            className="flex items-center gap-1.5 border border-[#00FF66]/40 text-[#00FF66] hover:bg-[#00FF66]/10 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors">
            <Sparkles className="w-3.5 h-3.5" /> AI Pick
          </button>

          {/* Save — multi-state */}
          <button onClick={saveSquad} disabled={errors.length > 0 || saveState !== 'idle'}
            className={cn('flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition-all',
              saveState === 'saving' ? 'bg-slate-600 text-slate-200 cursor-wait' :
              saveState === 'success' ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.5)]' :
              errors.length > 0 ? 'bg-[#00FF66]/40 text-black/60 opacity-40 cursor-not-allowed' :
              'bg-[#00FF66] text-black shadow-[0_4px_14px_rgba(0,255,102,0.35)] hover:shadow-[0_4px_20px_rgba(0,255,102,0.5)]')}>
            {saveState === 'saving' ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing squad with Supabase database...</>) :
             saveState === 'success' ? (<><Check className="w-3.5 h-3.5" /> Squad Saved Successfully!</>) :
             errors.length > 0 ? (<><AlertTriangle className="w-3.5 h-3.5" /> Squad Incomplete</>) :
             (<><Save className="w-3.5 h-3.5" /> Save Squad</>)}
          </button>
        </div>

        {/* ─── Gameweek banner ─── */}
        <div className="bg-[#1e293b]/40 backdrop-blur border border-white/5 rounded-2xl px-4 py-2.5 flex flex-wrap items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Gameweek {gwInfo.targetGW}</span>
          <span className="text-xs font-bold text-white">{GW_LABEL[gwInfo.targetGW]}</span>
          {gwInfo.deadline && (
            <span className="text-[10px] text-slate-400">Deadline: <span className="text-amber-300 font-bold">{new Date(gwInfo.deadline).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></span>
          )}
          {gwInfo.targetGW >= 4 && (
            <span className="text-[9px] font-black bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/30 rounded-full px-2.5 py-0.5 uppercase tracking-widest">Wildcard — free full reset</span>
          )}
          <span className="text-[10px] text-slate-500 ml-auto">Max {nationCap} per nation{gwInfo.aliveNations ? ` · ${gwInfo.aliveNations.length} teams alive` : ''}</span>
        </div>

        {/* Validation errors strip */}
        {errors.length > 0 && squadAll.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {errors.map(e => (
              <span key={e} className="text-[10px] font-semibold text-amber-300/90 bg-amber-400/10 border border-amber-400/20 rounded-full px-2.5 py-1">{e}</span>
            ))}
          </div>
        )}

        {/* ─── View tabs ─── */}
        <div className="flex gap-2">
          {([['builder', 'Squad Builder'], ['table', 'League Table']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setView(k)}
              className={cn('text-xs font-black rounded-xl px-4 py-2 transition-colors',
                view === k ? 'bg-[#00FF66] text-black' : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white')}>
              {label}
            </button>
          ))}
        </div>

        {/* ─── Swap helper banner ─── */}
        <AnimatePresence>
          {selectedPlayer && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="bg-amber-400/10 backdrop-blur border border-amber-400/30 rounded-2xl px-4 py-2.5 flex flex-wrap items-center gap-3">
              <span className="text-xs text-amber-200 font-semibold">
                <span className="font-black">{selectedPlayer.name}</span> selected — pick an eligible bench substitute to execute the positional swap.
              </span>
              <div className="flex gap-2 ml-auto">
                <button onClick={() => { setCaptainId(selectedPlayer.id); if (viceId === selectedPlayer.id) setViceId(null); setSelectedId(null); }}
                  className="text-[10px] font-bold bg-amber-400 text-black rounded-full px-2.5 py-1 flex items-center gap-1"><Crown className="w-3 h-3" /> Captain</button>
                <button onClick={() => { setViceId(selectedPlayer.id); if (captainId === selectedPlayer.id) setCaptainId(null); setSelectedId(null); }}
                  className="text-[10px] font-bold bg-slate-300 text-black rounded-full px-2.5 py-1">Vice</button>
                <button onClick={() => removePlayer(selectedPlayer.id)}
                  className="text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 rounded-full px-2.5 py-1 flex items-center gap-1"><X className="w-3 h-3" /> Remove</button>
                <button onClick={() => setSelectedId(null)}
                  className="text-[10px] font-bold bg-white/10 text-slate-300 rounded-full px-2.5 py-1">Cancel</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Main grid ─── */}
        {view === 'table' && (
          <div className="bg-[#1e293b]/50 backdrop-blur-xl border border-white/5 rounded-2xl p-5 shadow-lg shadow-black/30">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Fantasy League Table</p>
              <span className="text-[10px] text-slate-500">Points update automatically after every World Cup match</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white/5 rounded-lg mb-1">
              <span className="w-8 text-center">#</span>
              <span className="flex-1">Team</span>
              <span className="w-16 text-right">Points</span>
            </div>
            {myGw.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {myGw.map((g: any) => (
                  <span key={g.gameweek} className="text-[10px] font-bold bg-white/5 border border-white/10 rounded-full px-2.5 py-1 text-slate-300">
                    GW{g.gameweek}: <span className="text-[#00FF66] font-mono">{g.points}</span>
                  </span>
                ))}
              </div>
            )}
            {lbLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[#00FF66]" /></div>
            ) : lbRows.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-10">No teams yet — save a squad to join the league!</p>
            ) : (
              lbRows.map((row, i) => {
                const isMe = user?.id === row.user_id;
                return (
                  <div key={row.user_id} className={cn('flex items-center gap-2 px-3 py-2.5 rounded-lg border-b border-white/5 last:border-0',
                    isMe && 'bg-[#00FF66]/5 border border-[#00FF66]/20')}>
                    <span className={cn('w-8 text-center text-sm font-black tabular-nums',
                      i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-400' : 'text-slate-500')}>
                      {i === 0 ? <Crown className="w-4 h-4 mx-auto" /> : i + 1}
                    </span>
                    <span className={cn('flex-1 text-sm font-semibold truncate', isMe ? 'text-[#00FF66]' : 'text-white')}>
                      {row.team_name || 'Unnamed XI'} {isMe && '(You)'}
                    </span>
                    <span className="w-16 text-right text-sm font-mono font-black text-[#00FF66] tabular-nums">{row.total_points || 0}</span>
                  </div>
                );
              })
            )}
          </div>
        )}

        <div className={cn('grid lg:grid-cols-[55fr_45fr] gap-4 items-start', view !== 'builder' && 'hidden')}>

          {/* LEFT — Pitch + Dugout */}
          <div className="space-y-4">
            <div className="relative rounded-3xl overflow-hidden border border-white/5 bg-gradient-to-b from-[#0d2b1a] via-[#0a2114] to-[#07180e] p-3 sm:p-5 shadow-xl shadow-black/40">
              {/* pitch markings */}
              <div className="absolute inset-3 sm:inset-5 border border-white/10 rounded-2xl pointer-events-none" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-32 sm:h-32 border border-white/10 rounded-full pointer-events-none" />
              <div className="absolute left-3 right-3 sm:left-5 sm:right-5 top-1/2 h-px bg-white/10 pointer-events-none" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-3 sm:bottom-5 w-40 h-14 border border-white/10 border-b-0 rounded-t-xl pointer-events-none" />
              <div className="absolute left-1/2 -translate-x-1/2 top-3 sm:top-5 w-40 h-14 border border-white/10 border-t-0 rounded-b-xl pointer-events-none" />

              <PitchRow pos="FWD" />
              <PitchRow pos="MID" />
              <PitchRow pos="DEF" />
              <PitchRow pos="GK" />
            </div>

            {/* DUGOUT */}
            <div className="bg-[#111827] border border-white/5 rounded-2xl p-4 shadow-lg shadow-black/30">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-3">Bench / Substitutes Management</p>
              <div className="flex flex-wrap gap-3 sm:gap-4">
                {bench.map((sub, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <span className="text-[9px] font-black tracking-widest text-slate-500 bg-white/5 border border-white/10 rounded-full px-2 py-0.5">[{benchLabel[i]}]</span>
                    {sub ? (
                      <PlayerCard p={sub} onPitch={false} benchIdx={i} />
                    ) : (
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => onDropOnBench(e, i)}
                        onClick={() => { setActiveFilter(i === 0 ? 'GK' : 'ALL'); toast.info(i === 0 ? 'Pick a backup GK from the market →' : 'Pick a substitute from the market →'); }}
                        className="w-[78px] sm:w-[92px] h-[64px] sm:h-[70px] rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center text-white/25 cursor-pointer hover:border-[#00FF66]/40 transition-colors">
                        <Plus className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — Player market */}
          <div className="bg-[#1e293b]/50 backdrop-blur-xl border border-white/5 rounded-2xl p-4 flex flex-col lg:max-h-[calc(100vh-160px)] lg:sticky lg:top-4 shadow-lg shadow-black/30">
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setVisibleCount(120); }} placeholder="Search 48 official squads..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#00FF66]/40" />
              </div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-2.5 text-xs font-bold text-slate-300 focus:outline-none cursor-pointer">
                <option value="power" className="bg-[#1e293b]">Top rated</option>
                <option value="price-high" className="bg-[#1e293b]">Price ↓</option>
                <option value="price-low" className="bg-[#1e293b]">Price ↑</option>
              </select>
            </div>

            <div className="flex gap-1.5 mb-3">
              {['ALL', 'GK', 'DEF', 'MID', 'FWD'].map(f => (
                <button key={f} onClick={() => { setActiveFilter(f); setVisibleCount(120); }}
                  className={cn('flex-1 text-[11px] font-black rounded-lg py-1.5 transition-colors',
                    activeFilter === f ? 'bg-[#00FF66] text-black' : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white')}>
                  {f}
                </button>
              ))}
            </div>

            {apiLoading && (
              <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-white/5 rounded-lg px-3 py-2 mb-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00FF66]" /> Loading all 48 official squads...
              </div>
            )}

            <div className="overflow-y-auto divide-y divide-white/5 -mx-2 px-2">
              {filteredPlayers.slice(0, visibleCount).map(p => {
                const added = inSquad(p.id);
                return (
                  <div key={p.id} className="flex items-center gap-2.5 py-2 group">
                    <div className="relative w-8 h-8 flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center">
                        {(p as any).photo ? (
                          <img src={(p as any).photo} alt="" loading="lazy" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <span className="text-[8px] font-black text-slate-500">{p.pos}</span>
                        )}
                      </div>
                      <span className="absolute -bottom-0.5 -right-1"><NFlag nation={p.nation} fallback={p.flag} size={11} /></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-white truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{p.nation} · {p.pos}{p.club ? ` · ${p.club}` : ''}</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#00FF66] tabular-nums">${p.price.toFixed(1)}M</span>
                    <button onClick={() => addPlayer(p)}
                      className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0',
                        added ? 'bg-[#00FF66]/15 text-[#00FF66] border border-[#00FF66]/30' : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-[#00FF66] hover:text-black')}>
                      {added ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                );
              })}
              {filteredPlayers.length > visibleCount && (
                <button onClick={() => setVisibleCount(v => v + 150)} className="w-full text-center text-xs font-bold text-[#00FF66] py-3 hover:bg-white/5 rounded-lg">
                  Show more ({filteredPlayers.length - visibleCount} remaining)
                </button>
              )}
              {filteredPlayers.length === 0 && !apiLoading && (
                <p className="text-center text-xs text-slate-500 py-8">No players match your search</p>
              )}
            </div>
          </div>
        </div>

        {!user && (
          <div className="text-center text-xs text-slate-400">
            <Link to="/auth" className="text-[#00FF66] font-bold hover:underline">Sign in</Link> to save your squad and compete.
          </div>
        )}
      </div>
    </div>
  );
}
