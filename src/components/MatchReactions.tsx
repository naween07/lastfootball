import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface MatchReactionsProps {
  matchId: number;
}

const REACTIONS = [
  { emoji: '🔥', label: 'Fire' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '😂', label: 'Funny' },
  { emoji: '👏', label: 'Clap' },
  { emoji: '😡', label: 'Angry' },
  { emoji: '💔', label: 'Heartbreak' },
];

function getStorageKey(matchId: number) {
  return `reaction_${matchId}`;
}

function getCountsKey(matchId: number) {
  return `reaction_counts_${matchId}`;
}

export default function MatchReactions({ matchId }: MatchReactionsProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    // Load user's reaction
    try {
      const saved = window.sessionStorage?.getItem(getStorageKey(matchId));
      if (saved) setSelected(saved);

      // Load counts (simulated — in production this would be a DB)
      const savedCounts = window.sessionStorage?.getItem(getCountsKey(matchId));
      if (savedCounts) {
        setCounts(JSON.parse(savedCounts));
      } else {
        // Seed with random counts for visual appeal
        const seeded: Record<string, number> = {};
        REACTIONS.forEach(r => {
          seeded[r.emoji] = Math.floor(Math.random() * 30) + 1;
        });
        setCounts(seeded);
        window.sessionStorage?.setItem(getCountsKey(matchId), JSON.stringify(seeded));
      }
    } catch {}
  }, [matchId]);

  const handleReaction = (emoji: string) => {
    try {
      const newCounts = { ...counts };

      if (selected === emoji) {
        // Unreact
        newCounts[emoji] = Math.max((newCounts[emoji] || 1) - 1, 0);
        setSelected(null);
        window.sessionStorage?.removeItem(getStorageKey(matchId));
      } else {
        // Remove old reaction
        if (selected) {
          newCounts[selected] = Math.max((newCounts[selected] || 1) - 1, 0);
        }
        // Add new
        newCounts[emoji] = (newCounts[emoji] || 0) + 1;
        setSelected(emoji);
        window.sessionStorage?.setItem(getStorageKey(matchId), emoji);
      }

      setCounts(newCounts);
      window.sessionStorage?.setItem(getCountsKey(matchId), JSON.stringify(newCounts));
    } catch {}
  };

  return (
    <div className="flex items-center justify-center gap-1.5 py-2">
      {REACTIONS.map(r => {
        const isActive = selected === r.emoji;
        const count = counts[r.emoji] || 0;
        return (
          <button
            key={r.emoji}
            onClick={() => handleReaction(r.emoji)}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-full transition-all text-xs',
              isActive
                ? 'bg-primary/15 ring-1 ring-primary/30 scale-105'
                : 'bg-secondary/50 hover:bg-secondary',
            )}
            aria-label={r.label}
          >
            <span className="text-sm">{r.emoji}</span>
            {count > 0 && (
              <span className={cn(
                'text-[10px] font-bold tabular-nums',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
