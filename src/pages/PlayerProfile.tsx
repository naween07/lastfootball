import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '@/components/Header';
import SEOHead from '@/components/SEOHead';
import OptimizedImage from '@/components/OptimizedImage';
import { fetchPlayerProfile, PlayerProfile as PlayerProfileType } from '@/services/footballApi';
import { ArrowLeft, ArrowLeftRight, Loader2, MapPin, Calendar, Ruler, Weight, Shield, Zap, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PlayerProfile() {
  const { playerId } = useParams<{ playerId: string }>();
  const [player, setPlayer] = useState<PlayerProfileType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    fetchPlayerProfile(parseInt(playerId))
      .then(setPlayer)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [playerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container text-center py-20">
          <p className="text-lg font-medium text-muted-foreground">Player not found</p>
          <Link to="/live" className="text-primary hover:underline text-sm mt-2 inline-block">← Back to matches</Link>
        </div>
      </div>
    );
  }

  const s = player.stats;
  const posColors: Record<string, string> = {
    Goalkeeper: 'bg-amber-500/20 text-amber-400',
    Defender: 'bg-blue-500/20 text-blue-400',
    Midfielder: 'bg-emerald-500/20 text-emerald-400',
    Attacker: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${player.name} — Player Profile | LastFootball`}
        description={`${player.name} stats, profile, and performance. ${player.position} for ${player.team.name}. ${s.goals} goals, ${s.assists} assists this season.`}
        path={`/player/${playerId}`}
      />
      <Header />

      {/* Hero */}
      <section className="bg-gradient-to-b from-card to-background border-b border-border">
        <div className="container max-w-4xl py-6">
          <Link to="/live" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>

          <div className="flex items-center gap-5">
            <img
              src={player.photo}
              alt={player.name}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-border bg-secondary"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full', posColors[player.position] || 'bg-secondary text-muted-foreground')}>
                  {player.position}
                </span>
                {parseFloat(s.rating) > 0 && (
                  <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                    ★ {parseFloat(s.rating).toFixed(1)}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground">{player.name}</h1>

              {/* Team link */}
              <Link to={`/team/${player.team.id}`} className="flex items-center gap-2 mt-2 hover:text-primary transition-colors">
                {player.team.logo && <img src={player.team.logo} alt="" className="w-5 h-5 object-contain" />}
                <span className="text-sm font-semibold text-foreground">{player.team.name}</span>
              </Link>

              {/* Info row */}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                {player.nationality && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {player.nationality}</span>}
                {player.age > 0 && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {player.age} yrs</span>}
                {player.height && <span className="flex items-center gap-1"><Ruler className="w-3 h-3" /> {player.height}</span>}
                {player.weight && <span className="flex items-center gap-1"><Weight className="w-3 h-3" /> {player.weight}</span>}
              </div>
            </div>
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-5">
            <KeyStat label="Apps" value={s.appearances} />
            <KeyStat label="Goals" value={s.goals} color="text-emerald-400" />
            <KeyStat label="Assists" value={s.assists} color="text-blue-400" />
            <KeyStat label="Minutes" value={s.minutes} />
            <KeyStat label="Rating" value={parseFloat(s.rating).toFixed(1)} color="text-primary" />
            <KeyStat label="Yellow" value={s.yellowCards} color="text-amber-400" />
          </div>
        </div>
      </section>

      {/* Stats sections */}
      <main className="container max-w-4xl py-5 pb-20 md:pb-6 space-y-4">
        {/* Attack */}
        <StatsSection title="Attack" icon={<Zap className="w-4 h-4 text-amber-400" />} stats={[
          { label: 'Goals', value: s.goals },
          { label: 'Assists', value: s.assists },
          { label: 'Shots', value: s.shots },
          { label: 'Shots on Target', value: s.shotsOn },
          { label: 'Key Passes', value: s.keyPasses },
          { label: 'Dribbles Attempted', value: s.dribbles },
          { label: 'Dribbles Successful', value: s.dribblesSuccess },
          { label: 'Penalties Scored', value: s.penaltyScored },
          { label: 'Penalties Missed', value: s.penaltyMissed },
        ]} />

        {/* Passing */}
        <StatsSection title="Passing" icon={<Swords className="w-4 h-4 text-primary" />} stats={[
          { label: 'Total Passes', value: s.passes },
          { label: 'Pass Accuracy', value: `${s.passAccuracy}%` },
          { label: 'Key Passes', value: s.keyPasses },
        ]} />

        {/* Defense */}
        <StatsSection title="Defense" icon={<Shield className="w-4 h-4 text-blue-400" />} stats={[
          { label: 'Tackles', value: s.tackles },
          { label: 'Interceptions', value: s.interceptions },
          { label: 'Duels Won', value: s.duelsWon },
          { label: 'Fouls Drawn', value: s.foulsDrawn },
        ]} />

        {/* Discipline */}
        <StatsSection title="Discipline" icon={<span className="text-sm">🟨</span>} stats={[
          { label: 'Yellow Cards', value: s.yellowCards },
          { label: 'Red Cards', value: s.redCards },
          { label: 'Fouls Committed', value: s.foulsCommitted },
        ]} />

        {/* Compare CTA */}
        <Link
          to={`/compare?p1=${player.id}`}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-sm hover:bg-primary/20 transition-colors"
        >
          <ArrowLeftRight className="w-4 h-4" />
          Compare {player.lastname || player.name.split(' ').pop()} with another player
        </Link>

        {/* SEO text */}
        <div className="pt-4 border-t border-border/30">
          <p className="text-sm text-foreground/70 leading-relaxed">
            {player.name} is a {player.age > 0 ? `${player.age}-year-old ` : ''}{player.position.toLowerCase()} currently playing for {player.team.name}.
            {s.appearances > 0 ? ` This season, ${player.lastname || player.name} has made ${s.appearances} appearances, scoring ${s.goals} goal${s.goals !== 1 ? 's' : ''} and providing ${s.assists} assist${s.assists !== 1 ? 's' : ''} in ${s.minutes} minutes of action.` : ''}
            {parseFloat(s.rating) > 0 ? ` Carrying an average rating of ${parseFloat(s.rating).toFixed(1)}, ` : ' '}
            {s.passes > 0 ? `${player.lastname || player.name} has completed ${s.passes} passes with ${s.passAccuracy}% accuracy.` : ''}
          </p>
        </div>
      </main>
    </div>
  );
}

function KeyStat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="bg-secondary/30 rounded-lg p-2.5 text-center">
      <p className={cn('text-lg font-black tabular-nums', color || 'text-foreground')}>{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase font-semibold">{label}</p>
    </div>
  );
}

function StatsSection({ title, icon, stats }: { title: string; icon: React.ReactNode; stats: { label: string; value: number | string }[] }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border/30 flex items-center gap-2">
        {icon}
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">{title}</h3>
      </div>
      <div className="divide-y divide-border/10">
        {stats.map(s => (
          <div key={s.label} className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm text-muted-foreground">{s.label}</span>
            <span className="text-sm font-bold text-foreground tabular-nums">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
