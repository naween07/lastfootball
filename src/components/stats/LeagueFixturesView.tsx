import { useState, useEffect } from 'react';
import { Match, fetchLeagueFixtures, fetchLeagueRounds } from '@/services/footballApi';
import MatchCard from '@/components/MatchCard';

interface LeagueFixturesViewProps {
  leagueId: number;
  season: number;
}

export default function LeagueFixturesView({ leagueId, season }: LeagueFixturesViewProps) {
  const [rounds, setRounds] = useState<string[]>([]);
  const [selectedRound, setSelectedRound] = useState<string>('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchLeagueRounds(leagueId, season)
      .then(r => {
        setRounds(r);
        if (r.length > 0) {
          // Pick last round as default (most recent)
          setSelectedRound(r[r.length - 1]);
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [leagueId, season]);

  useEffect(() => {
    if (!selectedRound) return;
    setLoading(true);
    fetchLeagueFixtures(leagueId, season, selectedRound)
      .then(setMatches)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [leagueId, season, selectedRound]);

  return (
    <div>
      {/* Round selector */}
      {rounds.length > 0 && (
        <div className="px-4 py-3 border-b border-border">
          <select
            value={selectedRound}
            onChange={(e) => setSelectedRound(e.target.value)}
            className="bg-secondary text-foreground text-sm rounded-lg px-3 py-1.5 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {rounds.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">Loading fixtures...</span>
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No fixtures available</div>
      ) : (
        <div className="divide-y divide-border/50">
          {matches.map(match => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}
