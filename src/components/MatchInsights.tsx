import { useState, useEffect } from 'react';
import { fetchHeadToHead } from '@/services/footballApi';
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
        // Fetch H2H data for deeper insights
        const h2h = await fetchHeadToHead(match.homeTeam.id, match.awayTeam.id);
        const generated = generateMatchInsights(match, h2h);
        setInsights(generated);
      } catch {
        // Generate insights without H2H
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
