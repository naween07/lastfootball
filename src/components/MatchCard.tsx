import { Link } from 'react-router-dom';
import { Match } from '@/types/football';
import { Star, ChevronRight } from 'lucide-react';
import OptimizedImage from './OptimizedImage';
import { cn } from '@/lib/utils';

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
  const hasScore = match.homeScore !== null && match.awayScore !== null;

  return (
    <Link
      to={`/match/${match.id}`}
      className={cn(
        'group block rounded-lg border transition-all duration-300 mx-1 mb-1.5',
        'bg-[#111111] hover:bg-[#1a1a1a] border-[#222]',
        isLive && 'border-l-[3px] border-l-[#00ff87] shadow-[0_0_12px_rgba(0,255,135,0.08)]',
        isHT && 'border-l-[3px] border-l-amber-400',
      )}
    >
      {/* Top bar — league + status */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {match.league.logo && (
            <OptimizedImage src={match.league.logo} alt={match.league.name} className="w-3.5 h-3.5 object-contain opacity-50" />
          )}
          <span className="text-[9px] uppercase tracking-widest text-[#555] font-semibold truncate">{match.league.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {isLive && (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff87] animate-pulse shadow-[0_0_6px_rgba(0,255,135,0.6)]" />
              <span className="text-[10px] font-bold text-[#00ff87] uppercase tracking-widest">{match.minute}'</span>
            </div>
          )}
          {isHT && <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">HT</span>}
          {isFinished && <span className="text-[10px] font-semibold text-[#444] uppercase tracking-widest">{match.status}</span>}
          {isNotStarted && <span className="text-[11px] font-bold text-[#00ff87] tabular-nums">{match.time}</span>}
        </div>
      </div>

      {/* Teams + Score */}
      <div className="px-3 pb-2.5">
        {/* Home */}
        <div className="flex items-center justify-between py-[5px]">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-6 h-6 flex-shrink-0 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center overflow-hidden">
              {match.homeTeam.logo ? (
                <OptimizedImage src={match.homeTeam.logo} alt={match.homeTeam.name} className="w-4 h-4 object-contain" />
              ) : (
                <span className="text-[7px] font-bold text-[#555]">{(match.homeTeam.shortName || match.homeTeam.name).slice(0, 3).toUpperCase()}</span>
              )}
            </div>
            <span className={cn(
              'text-[13px] truncate',
              hasScore && match.homeScore! > match.awayScore! ? 'font-bold text-white' :
              hasScore && match.homeScore! < match.awayScore! && isFinished ? 'text-[#555]' :
              'text-[#999] font-medium',
            )}>
              {match.homeTeam.name}
            </span>
          </div>
          <span className={cn(
            'text-lg font-black tabular-nums min-w-[24px] text-right',
            isLive && hasScore && match.homeScore! >= match.awayScore! ? 'text-white' :
            isLive ? 'text-[#666]' :
            hasScore && match.homeScore! > match.awayScore! ? 'text-white' :
            isFinished ? 'text-[#444]' :
            'text-[#333]',
          )}>
            {match.homeScore !== null ? match.homeScore : ''}
          </span>
        </div>

        {/* Away */}
        <div className="flex items-center justify-between py-[5px]">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-6 h-6 flex-shrink-0 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center overflow-hidden">
              {match.awayTeam.logo ? (
                <OptimizedImage src={match.awayTeam.logo} alt={match.awayTeam.name} className="w-4 h-4 object-contain" />
              ) : (
                <span className="text-[7px] font-bold text-[#555]">{(match.awayTeam.shortName || match.awayTeam.name).slice(0, 3).toUpperCase()}</span>
              )}
            </div>
            <span className={cn(
              'text-[13px] truncate',
              hasScore && match.awayScore! > match.homeScore! ? 'font-bold text-white' :
              hasScore && match.awayScore! < match.homeScore! && isFinished ? 'text-[#555]' :
              'text-[#999] font-medium',
            )}>
              {match.awayTeam.name}
            </span>
          </div>
          <span className={cn(
            'text-lg font-black tabular-nums min-w-[24px] text-right',
            isLive && hasScore && match.awayScore! >= match.homeScore! ? 'text-white' :
            isLive ? 'text-[#666]' :
            hasScore && match.awayScore! > match.homeScore! ? 'text-white' :
            isFinished ? 'text-[#444]' :
            'text-[#333]',
          )}>
            {match.awayScore !== null ? match.awayScore : ''}
          </span>
        </div>
      </div>

      {/* Bottom bar — favorite + arrow */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-[#1e1e1e]">
        {onToggleFavorite ? (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isFavoriteHome) onToggleFavorite(match.homeTeam.id, match.homeTeam.name, match.homeTeam.logo);
              else if (isFavoriteAway) onToggleFavorite(match.awayTeam.id, match.awayTeam.name, match.awayTeam.logo);
              else onToggleFavorite(match.homeTeam.id, match.homeTeam.name, match.homeTeam.logo);
            }}
            className="p-1 rounded hover:bg-[#1e1e1e] transition-colors"
          >
            <Star className={cn('w-3.5 h-3.5',
              isFavoriteHome || isFavoriteAway ? 'fill-[#00ff87] text-[#00ff87]' : 'text-[#333] hover:text-[#555]',
            )} />
          </button>
        ) : (
          <div />
        )}
        <ChevronRight className="w-3.5 h-3.5 text-[#333] group-hover:text-[#00ff87] transition-colors" />
      </div>
    </Link>
  );
}
