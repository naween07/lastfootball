import { Link } from 'react-router-dom';
import { Match } from '@/types/football';
import { Star } from 'lucide-react';
import OptimizedImage from './OptimizedImage';

interface MatchCardProps {
  match: Match;
  isFavoriteHome?: boolean;
  isFavoriteAway?: boolean;
  onToggleFavorite?: (teamId: number, teamName?: string, teamLogo?: string) => void;
}

export default function MatchCard({ match, isFavoriteHome, isFavoriteAway, onToggleFavorite }: MatchCardProps) {
  const isLive = match.status === 'LIVE' || match.status === '1H' || match.status === '2H';
  const isHT = match.status === 'HT';
  const isFinished = match.status === 'FT' || match.status === 'AET' || match.status === 'PEN';
  const isNotStarted = match.status === 'NS';

  return (
    <Link
      to={`/match/${match.id}`}
      className="group block bg-card hover:bg-secondary/50 transition-colors rounded-lg mx-3 mb-2"
    >
      <div className="flex items-center px-3 py-3">
        {/* Status / Time column */}
        <div className="w-14 flex-shrink-0 text-center">
          {isLive && (
            <div className="flex flex-col items-center gap-0.5">
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
            <span className="text-sm font-semibold text-muted-foreground">FT</span>
          )}
          {isNotStarted && (
            <span className="text-sm font-semibold text-primary">{match.time}</span>
          )}
        </div>

        {/* Vertical divider */}
        <div className="w-px h-10 bg-border flex-shrink-0" />

        {/* Teams & Score */}
        <div className="flex-1 min-w-0 pl-3">
          <TeamRow
            name={match.homeTeam.name}
            logo={match.homeTeam.logo}
            score={match.homeScore}
            isWinning={match.homeScore !== null && match.awayScore !== null && match.homeScore > match.awayScore}
            isLive={isLive || isHT}
            isFinished={isFinished}
          />
          <TeamRow
            name={match.awayTeam.name}
            logo={match.awayTeam.logo}
            score={match.awayScore}
            isWinning={match.homeScore !== null && match.awayScore !== null && match.awayScore > match.homeScore}
            isLive={isLive || isHT}
            isFinished={isFinished}
          />
        </div>

        {/* Favorite star */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Toggle favorite for whichever team — use home team as default
              onToggleFavorite(match.homeTeam.id, match.homeTeam.name, match.homeTeam.logo);
            }}
            className="flex-shrink-0 p-1 ml-2"
          >
            <Star
              className={`w-5 h-5 transition-colors ${
                isFavoriteHome || isFavoriteAway
                  ? 'fill-primary text-primary'
                  : 'text-muted-foreground/40 hover:text-muted-foreground'
              }`}
            />
          </button>
        )}
      </div>
    </Link>
  );
}

function TeamRow({
  name,
  logo,
  score,
  isWinning,
  isLive,
  isFinished,
}: {
  name: string;
  logo?: string;
  score: number | null;
  isWinning: boolean;
  isLive: boolean;
  isFinished: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <div className="flex items-center gap-2.5 min-w-0">
        {logo && <OptimizedImage src={logo} alt="" className="w-5 h-5 flex-shrink-0 object-contain" />}
        <span className={`text-sm truncate ${
          isWinning ? 'font-semibold text-foreground' : 'text-secondary-foreground'
        }`}>
          {name}
        </span>
      </div>
      <span className={`text-base font-bold tabular-nums min-w-[2rem] text-right ${
        isLive && isWinning ? 'text-live' : isLive ? 'text-secondary-foreground' :
        isFinished && isWinning ? 'text-foreground' : 'text-muted-foreground'
      }`}>
        {score !== null ? score : ''}
      </span>
    </div>
  );
}
