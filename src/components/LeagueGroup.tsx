import { LeagueMatches } from '@/types/football';
import MatchCard from './MatchCard';

interface LeagueGroupProps {
  group: LeagueMatches;
  isFavorite: (teamId: number) => boolean;
  onToggleFavorite: (teamId: number) => void;
}

export default function LeagueGroup({ group, isFavorite, onToggleFavorite }: LeagueGroupProps) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/50">
        {group.league.logo?.startsWith('http') ? (
          <img src={group.league.logo} alt="" className="w-4 h-4" />
        ) : (
          <span className="text-base">{group.league.logo}</span>
        )}
        <div className="min-w-0">
          <span className="text-xs font-semibold text-foreground">{group.league.name}</span>
          <span className="text-xs text-muted-foreground ml-2">{group.league.country}</span>
        </div>
      </div>
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
