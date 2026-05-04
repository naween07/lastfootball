import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { LeagueMatches } from '@/types/football';
import MatchCard from './MatchCard';
import { ChevronRight } from 'lucide-react';
import OptimizedImage from './OptimizedImage';

const groupVisibilityStyle: CSSProperties = {
  contentVisibility: 'auto',
  containIntrinsicSize: '320px',
};

interface LeagueGroupProps {
  group: LeagueMatches;
  isFavorite: (teamId: number) => boolean;
  onToggleFavorite: (teamId: number, teamName?: string, teamLogo?: string) => void;
}

export default function LeagueGroup({ group, isFavorite, onToggleFavorite }: LeagueGroupProps) {
  return (
    <div className="mb-4" style={groupVisibilityStyle}>
      {/* League header — clickable */}
      <Link to={`/stats?league=${group.league.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/20 rounded-lg transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          {group.league.logo?.startsWith('http') ? (
            <div className="w-7 h-7 flex-shrink-0 rounded-md bg-white/10 p-0.5 flex items-center justify-center">
              <OptimizedImage src={group.league.logo} alt={group.league.name} className="w-full h-full object-contain" />
            </div>
          ) : (
            <span className="text-xl">{group.league.logo}</span>
          )}
          <div className="min-w-0">
            <div className="text-sm font-bold text-foreground truncate hover:text-primary transition-colors">{group.league.name}</div>
            <div className="text-xs text-muted-foreground">{group.league.country}</div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      </Link>

      {/* Matches */}
      <div>
        {group.matches.map(match => (
          <MatchCard
            key={match.id}
            match={match}
            isFavoriteHome={isFavorite(match.homeTeam.id)}
            isFavoriteAway={isFavorite(match.awayTeam.id)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </div>
  );
}
