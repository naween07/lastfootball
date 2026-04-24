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
      className={`group block bg-card hover:bg-secondary/60 transition-colors mx-1 mb-px border-b border-border/30 touch-feedback ${
        isLive ? 'border-l-[3px] border-l-live' : ''
      }`}
    >
      <div className="flex items-center px-3 py-2.5">
        {/* Status / Time column */}
        <div className="w-[52px] flex-shrink-0 text-center">
          {isLive && (
            <div className="flex flex-col items-center gap-0">
              <span className="text-[10px] font-extrabold text-live uppercase tracking-wider">Live</span>
              <span className="text-xs font-bold text-live tabular-nums">{match.minute}</span>
            </div>
          )}
          {isHT && (
            <span className="text-xs font-extrabold text-amber-400 tracking-wider">HT</span>
          )}
          {isFinished && (
            <span className="text-xs font-semibold text-muted-foreground/70">FT</span>
          )}
          {isNotStarted && (
            <span className="text-sm font-bold text-primary tabular-nums">{match.time}</span>
          )}
        </div>

        {/* Teams & Score */}
        <div className="flex-1 min-w-0">
          <TeamRow
            name={match.homeTeam.name}
            logo={match.homeTeam.logo}
            shortName={match.homeTeam.shortName}
            score={match.homeScore}
            isWinning={match.homeScore !== null && match.awayScore !== null && match.homeScore > match.awayScore}
            isLive={isLive || isHT}
            isFinished={isFinished}
          />
          <TeamRow
            name={match.awayTeam.name}
            logo={match.awayTeam.logo}
            shortName={match.awayTeam.shortName}
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
              if (isFavoriteHome) {
                // Unfavorite home, favorite away
                onToggleFavorite(match.homeTeam.id, match.homeTeam.name, match.homeTeam.logo);
              } else if (isFavoriteAway) {
                // Unfavorite away
                onToggleFavorite(match.awayTeam.id, match.awayTeam.name, match.awayTeam.logo);
              } else {
                // Favorite home first
                onToggleFavorite(match.homeTeam.id, match.homeTeam.name, match.homeTeam.logo);
              }
            }}
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Double-tap to favorite away team directly
              if (!isFavoriteAway) {
                onToggleFavorite(match.awayTeam.id, match.awayTeam.name, match.awayTeam.logo);
              }
            }}
            className="flex-shrink-0 p-1.5 ml-1 rounded-full hover:bg-secondary transition-colors"
            title={isFavoriteHome ? `★ ${match.homeTeam.shortName}` : isFavoriteAway ? `★ ${match.awayTeam.shortName}` : 'Add to favorites'}
            aria-label={isFavoriteHome ? `Unfavorite ${match.homeTeam.shortName}` : isFavoriteAway ? `Unfavorite ${match.awayTeam.shortName}` : 'Add to favorites'}
          >
            <Star
              className={`w-4 h-4 transition-colors ${
                isFavoriteHome || isFavoriteAway
                  ? 'fill-primary text-primary'
                  : 'text-muted-foreground/30 hover:text-muted-foreground/60'
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
  shortName,
  score,
  isWinning,
  isLive,
  isFinished,
}: {
  name: string;
  logo?: string;
  shortName?: string;
  score: number | null;
  isWinning: boolean;
  isLive: boolean;
  isFinished: boolean;
}) {
  // Fallback: colored initial circle when logo fails
  const initials = (shortName || name.substring(0, 3)).toUpperCase().slice(0, 3);

  return (
    <div className="flex items-center justify-between py-[3px]">
      <div className="flex items-center gap-2 min-w-0">
        {logo ? (
          <OptimizedImage
            src={logo}
            alt=""
            className="w-[18px] h-[18px] flex-shrink-0 object-contain"
          />
        ) : (
          <div className="w-[18px] h-[18px] flex-shrink-0 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-[7px] font-bold text-muted-foreground">{initials}</span>
          </div>
        )}
        <span className={`text-[13px] truncate ${
          isWinning ? 'font-bold text-foreground' : 'text-muted-foreground'
        } ${isFinished && !isWinning ? 'text-muted-foreground/70' : ''}`}>
          {name}
        </span>
      </div>
      <span className={`text-[15px] font-extrabold tabular-nums min-w-[24px] text-right ${
        isLive && isWinning ? 'text-foreground' :
        isLive ? 'text-muted-foreground' :
        isFinished && isWinning ? 'text-foreground' :
        isFinished ? 'text-muted-foreground/60' :
        'text-muted-foreground/40'
      }`}>
        {score !== null ? score : '-'}
      </span>
    </div>
  );
}