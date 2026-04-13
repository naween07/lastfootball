import { Link } from 'react-router-dom';
import { Match } from '@/types/football';
import { Star } from 'lucide-react';

interface MatchCardProps {
  match: Match;
  isFavoriteHome?: boolean;
  isFavoriteAway?: boolean;
  onToggleFavorite?: (teamId: number) => void;
}

export default function MatchCard({ match, isFavoriteHome, isFavoriteAway, onToggleFavorite }: MatchCardProps) {
  const isLive = match.status === 'LIVE' || match.status === '1H' || match.status === '2H';
  const isHT = match.status === 'HT';
  const isFinished = match.status === 'FT' || match.status === 'AET' || match.status === 'PEN';
  const isNotStarted = match.status === 'NS';

  return (
    <Link
      to={`/match/${match.id}`}
      className="group block bg-card hover:bg-secondary/50 transition-colors border-b border-border last:border-b-0"
    >
      <div className="flex items-center px-4 py-3 gap-3">
        {/* Status / Time column */}
        <div className="w-12 flex-shrink-0 text-center">
          {isLive && (
            <div className="flex flex-col items-center gap-1">
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse-live" />
                <span className="text-[10px] font-bold text-live uppercase">Live</span>
              </span>
              <span className="text-xs font-semibold text-live">{match.minute}</span>
            </div>
          )}
          {isHT && (
            <span className="text-xs font-bold text-amber-400">HT</span>
          )}
          {isFinished && (
            <span className="text-xs font-medium text-muted-foreground">FT</span>
          )}
          {isNotStarted && (
            <span className="text-xs font-medium text-muted-foreground">{match.time}</span>
          )}
        </div>

        {/* Teams & Score */}
        <div className="flex-1 min-w-0">
          <TeamRow
            name={match.homeTeam.name}
            shortName={match.homeTeam.shortName}
            logo={match.homeTeam.logo}
            score={match.homeScore}
            isWinning={match.homeScore !== null && match.awayScore !== null && match.homeScore > match.awayScore}
            isLive={isLive || isHT}
            isFavorite={isFavoriteHome}
            onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(match.homeTeam.id) : undefined}
          />
          <TeamRow
            name={match.awayTeam.name}
            shortName={match.awayTeam.shortName}
            logo={match.awayTeam.logo}
            score={match.awayScore}
            isWinning={match.homeScore !== null && match.awayScore !== null && match.awayScore > match.homeScore}
            isLive={isLive || isHT}
            isFavorite={isFavoriteAway}
            onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(match.awayTeam.id) : undefined}
          />
        </div>
      </div>
    </Link>
  );
}

function TeamRow({
  name,
  shortName,
  logo,
  score,
  isWinning,
  isLive,
  isFavorite,
  onToggleFavorite,
}: {
  name: string;
  shortName: string;
  logo?: string;
  score: number | null;
  isWinning: boolean;
  isLive: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <div className="flex items-center gap-2 min-w-0">
        {onToggleFavorite && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(); }}
            className="flex-shrink-0 p-0.5"
          >
            <Star
              className={`w-3 h-3 transition-colors ${
                isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground/30 hover:text-muted-foreground'
              }`}
            />
          </button>
        )}
        <span className={`text-sm truncate ${isWinning ? 'font-semibold text-foreground' : 'text-secondary-foreground'}`}>
          <span className="hidden sm:inline">{name}</span>
          <span className="sm:hidden">{shortName}</span>
        </span>
      </div>
      <span className={`text-sm font-bold tabular-nums min-w-[1.5rem] text-right ${
        isLive && isWinning ? 'text-foreground' : isLive ? 'text-secondary-foreground' : 'text-muted-foreground'
      }`}>
        {score !== null ? score : '-'}
      </span>
    </div>
  );
}
