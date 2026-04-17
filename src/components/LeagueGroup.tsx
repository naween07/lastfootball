import type { CSSProperties } from 'react';
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
      {/* League header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          {group.league.logo?.startsWith('http') ? (
            <OptimizedImage src={group.league.logo} alt="" className="w-7 h-7 flex-shrink-0 object-contain" />
          ) : (
            <span className="text-xl">{group.league.logo}</span>
          )}
          <div className="min-w-0">
            <div className="text-sm font-bold text-foreground truncate">{group.league.name}</div>
            <div className="text-xs text-muted-foreground">{group.league.country}</div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      </div>

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
