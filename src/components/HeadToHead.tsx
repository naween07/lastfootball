import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchHeadToHead } from '@/services/footballApi';
import { Match } from '@/types/football';
import OptimizedImage from './OptimizedImage';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeadToHeadProps {
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
}

export default function HeadToHead({
  homeTeamId, awayTeamId, homeTeamName, awayTeamName, homeTeamLogo, awayTeamLogo,
}: HeadToHeadProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchHeadToHead(homeTeamId, awayTeamId)
      .then(setMatches)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [homeTeamId, awayTeamId]);

  const stats = useMemo(() => {
    let homeWins = 0, awayWins = 0, draws = 0, homeGoals = 0, awayGoals = 0;
    let biggestHomeWin: Match | null = null, biggestAwayWin: Match | null = null;
    let biggestHomeMargin = 0, biggestAwayMargin = 0;

    matches.forEach(m => {
      if (m.homeScore === null || m.awayScore === null) return;

      // Determine which side is "home team" in this specific match
      const isHomeTeamHome = m.homeTeam.id === homeTeamId;
      const t1Score = isHomeTeamHome ? m.homeScore : m.awayScore;
      const t2Score = isHomeTeamHome ? m.awayScore : m.homeScore;

      homeGoals += t1Score;
      awayGoals += t2Score;

      if (t1Score > t2Score) {
        homeWins++;
        if (t1Score - t2Score > biggestHomeMargin) {
          biggestHomeMargin = t1Score - t2Score;
          biggestHomeWin = m;
        }
      } else if (t2Score > t1Score) {
        awayWins++;
        if (t2Score - t1Score > biggestAwayMargin) {
          biggestAwayMargin = t2Score - t1Score;
          biggestAwayWin = m;
        }
      } else {
        draws++;
      }
    });

    return { homeWins, awayWins, draws, homeGoals, awayGoals, total: matches.length, biggestHomeWin, biggestAwayWin };
  }, [matches, homeTeamId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading head to head...</span>
      </div>
    );
  }

  if (!matches.length) {
    return <p className="text-sm text-muted-foreground text-center py-8">No previous meetings found</p>;
  }

  const totalMatches = stats.total;
  const homeWinPct = totalMatches > 0 ? (stats.homeWins / totalMatches) * 100 : 0;
  const drawPct = totalMatches > 0 ? (stats.draws / totalMatches) * 100 : 0;
  const awayWinPct = totalMatches > 0 ? (stats.awayWins / totalMatches) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* Summary header */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground mb-4">Last {totalMatches} meetings</p>

        {/* Team logos + record */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="flex flex-col items-center gap-1.5">
            {homeTeamLogo && <OptimizedImage src={homeTeamLogo} alt="" className="w-10 h-10 object-contain" />}
            <span className="text-xs font-bold text-foreground">{homeTeamName}</span>
          </div>

          <div className="flex items-center gap-3 px-4">
            <div className="text-center">
              <span className="text-2xl font-black text-primary tabular-nums">{stats.homeWins}</span>
              <p className="text-[9px] text-muted-foreground uppercase">Wins</p>
            </div>
            <div className="text-center">
              <span className="text-2xl font-black text-muted-foreground/50 tabular-nums">{stats.draws}</span>
              <p className="text-[9px] text-muted-foreground uppercase">Draws</p>
            </div>
            <div className="text-center">
              <span className="text-2xl font-black text-blue-400 tabular-nums">{stats.awayWins}</span>
              <p className="text-[9px] text-muted-foreground uppercase">Wins</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            {awayTeamLogo && <OptimizedImage src={awayTeamLogo} alt="" className="w-10 h-10 object-contain" />}
            <span className="text-xs font-bold text-foreground">{awayTeamName}</span>
          </div>
        </div>

        {/* Win percentage bar */}
        <div className="flex h-3 rounded-full overflow-hidden mx-auto max-w-xs">
          <div className="bg-primary transition-all" style={{ width: `${homeWinPct}%` }} />
          <div className="bg-muted-foreground/20 transition-all" style={{ width: `${drawPct}%` }} />
          <div className="bg-blue-400 transition-all" style={{ width: `${awayWinPct}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1 max-w-xs mx-auto">
          <span>{Math.round(homeWinPct)}%</span>
          <span>{Math.round(drawPct)}%</span>
          <span>{Math.round(awayWinPct)}%</span>
        </div>
      </div>

      {/* Goals summary */}
      <div className="flex justify-center gap-8">
        <div className="text-center">
          <span className="text-lg font-black text-foreground tabular-nums">{stats.homeGoals}</span>
          <p className="text-[10px] text-muted-foreground">Goals</p>
        </div>
        <div className="text-center">
          <span className="text-lg font-black text-foreground tabular-nums">{stats.awayGoals}</span>
          <p className="text-[10px] text-muted-foreground">Goals</p>
        </div>
      </div>

      {/* Past meetings list */}
      <div>
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Past Meetings</h4>
        <div className="space-y-1">
          {matches.map(m => (
            <H2HMatchRow key={m.id} match={m} homeTeamId={homeTeamId} />
          ))}
        </div>
      </div>
    </div>
  );
}

function H2HMatchRow({ match, homeTeamId }: { match: Match; homeTeamId: number }) {
  const isFinished = match.status === 'FT' || match.status === 'AET' || match.status === 'PEN';
  if (!isFinished || match.homeScore === null) return null;

  const isHomeTeamHome = match.homeTeam.id === homeTeamId;
  const t1Score = isHomeTeamHome ? match.homeScore : match.awayScore;
  const t2Score = isHomeTeamHome ? match.awayScore : match.homeScore;
  const won = t1Score! > t2Score!;
  const lost = t1Score! < t2Score!;

  return (
    <Link
      to={`/match/${match.id}`}
      className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-secondary/30 transition-colors"
    >
      {/* Result indicator */}
      <div className={cn(
        'w-1.5 h-8 rounded-full flex-shrink-0',
        won ? 'bg-primary' : lost ? 'bg-red-400' : 'bg-muted-foreground/30',
      )} />

      {/* Date + League */}
      <div className="w-16 flex-shrink-0">
        <p className="text-[11px] font-semibold text-foreground">{formatH2HDate(match.date)}</p>
        <p className="text-[9px] text-muted-foreground truncate">{match.league.name}</p>
      </div>

      {/* Home team */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <OptimizedImage src={match.homeTeam.logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
        <span className={cn(
          'text-xs truncate',
          match.homeTeam.id === homeTeamId ? 'font-bold text-foreground' : 'text-muted-foreground',
        )}>{match.homeTeam.shortName}</span>
      </div>

      {/* Score */}
      <div className="text-center min-w-[40px]">
        <span className="text-sm font-black text-foreground tabular-nums">
          {match.homeScore} - {match.awayScore}
        </span>
      </div>

      {/* Away team */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
        <span className={cn(
          'text-xs truncate',
          match.awayTeam.id === homeTeamId ? 'font-bold text-foreground' : 'text-muted-foreground',
        )}>{match.awayTeam.shortName}</span>
        <OptimizedImage src={match.awayTeam.logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
      </div>
    </Link>
  );
}

function formatH2HDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  } catch {
    return dateStr;
  }
}
