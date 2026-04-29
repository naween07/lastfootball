import { useState, useEffect } from 'react';
import { fetchHeadToHead, fetchTeamStatistics } from '@/services/footballApi';
import { generateMatchInsights, MatchInsight } from '@/services/insightGenerator';
import { Match } from '@/types/football';
import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MatchInsightsProps {
  match: Match;
}

export default function MatchInsights({ match }: MatchInsightsProps) {
  const [insights, setInsights] = useState<MatchInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [h2h, homeStats, awayStats] = await Promise.allSettled([
          fetchHeadToHead(match.homeTeam.id, match.awayTeam.id),
          fetchTeamStatistics(match.homeTeam.id, match.league.id, 2025),
          fetchTeamStatistics(match.awayTeam.id, match.league.id, 2025),
        ]);

        const h2hData = h2h.status === 'fulfilled' ? h2h.value : undefined;
        const homeData = homeStats.status === 'fulfilled' ? homeStats.value : null;
        const awayData = awayStats.status === 'fulfilled' ? awayStats.value : null;

        const generated = generateMatchInsights(match, h2hData, homeData, awayData);
        setInsights(generated);
      } catch {
        const generated = generateMatchInsights(match);
        setInsights(generated);
      }
      setLoading(false);
    };
    load();
  }, [match.id]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary/50" />
        <span className="text-xs text-muted-foreground">Analyzing match patterns...</span>
      </div>
    );
  }

  if (insights.length === 0) return null;

  return (
    <div className="rounded-xl border border-primary/15 bg-primary/[0.03] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-primary/10">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-bold text-primary uppercase tracking-wider">Smart Insights</span>
      </div>

      {/* Insights list */}
      <div className="px-4 py-2.5 space-y-2">
        {insights.map((insight, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="text-sm flex-shrink-0 mt-0.5">{insight.icon}</span>
            <p className="text-sm text-foreground/85 leading-relaxed">{insight.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
