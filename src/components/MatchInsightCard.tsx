import { Sparkles, Loader2 } from "lucide-react";
import { useMatchInsight } from "@/hooks/useMatchInsight";
import type { Match } from "@/types/football";

interface Props {
  match: Match;
}

export default function MatchInsightCard({ match }: Props) {
  const { insight, loading, error } = useMatchInsight(match);

  return (
    <section className="bg-card border border-border rounded-xl overflow-hidden">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/30">
        <Sparkles className="w-4 h-4 text-accent" />
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
          AI Insight
        </h2>
        {loading && (
          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground ml-auto" />
        )}
      </header>

      <div className="p-4 space-y-3">
        {loading && !insight && (
          <div className="space-y-2">
            <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
            <div className="h-3 w-full bg-muted rounded animate-pulse" />
            <div className="h-3 w-5/6 bg-muted rounded animate-pulse" />
          </div>
        )}

        {error && !insight && (
          <p className="text-xs text-muted-foreground">{error}</p>
        )}

        {insight && (
          <div className="slide-up space-y-3">
            <h3 className="text-base font-bold text-foreground leading-snug">
              {insight.headline}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {insight.summary}
            </p>

            {insight.keyPoints?.length > 0 && (
              <ul className="space-y-1.5 pt-1">
                {insight.keyPoints.map((point, i) => (
                  <li
                    key={i}
                    className="text-sm text-foreground flex items-start gap-2 leading-snug"
                  >
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-accent flex-shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            )}

            {insight.prediction && match.status === "NS" && (
              <PredictionBar prediction={insight.prediction} match={match} />
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function PredictionBar({
  prediction,
  match,
}: {
  prediction: { home: number; draw: number; away: number };
  match: Match;
}) {
  const total = prediction.home + prediction.draw + prediction.away || 1;
  const h = Math.round((prediction.home / total) * 100);
  const d = Math.round((prediction.draw / total) * 100);
  const a = 100 - h - d;

  return (
    <div className="pt-3 border-t border-border/50">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        Win probability
      </p>
      <div className="flex h-2 rounded-full overflow-hidden bg-muted">
        <div className="bg-foreground" style={{ width: `${h}%` }} />
        <div className="bg-muted-foreground/40" style={{ width: `${d}%` }} />
        <div className="bg-accent" style={{ width: `${a}%` }} />
      </div>
      <div className="flex justify-between text-[11px] font-semibold mt-1.5 tabular-nums">
        <span className="text-foreground">
          {match.homeTeam.shortName} {h}%
        </span>
        <span className="text-muted-foreground">Draw {d}%</span>
        <span className="text-accent">
          {a}% {match.awayTeam.shortName}
        </span>
      </div>
    </div>
  );
}
