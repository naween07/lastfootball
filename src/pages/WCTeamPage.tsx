import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '@/components/Header';
import SEOHead from '@/components/SEOHead';
import { Trophy, ArrowLeft, MapPin, Users, Calendar, ChevronRight, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Team Data ──────────────────────────────────────────────────────────────

interface WCTeamData {
  name: string;
  code: string;
  flag: string;
  group: string;
  confederation: string;
  fifaRanking: number;
  wcAppearances: number;
  bestFinish: string;
  manager: string;
  playingStyle: string;
  keyPlayers: string[];
  strengths: string[];
  weaknesses: string[];
  groupOpponents: string[];
  overview: string;
  tacticalAnalysis: string;
}

const TEAM_DATA: Record<string, WCTeamData> = {
  ARG: { name: 'Argentina', code: 'ARG', flag: '🇦🇷', group: 'G', confederation: 'CONMEBOL', fifaRanking: 1, wcAppearances: 18, bestFinish: 'Winners (1978, 1986, 2022)', manager: 'Lionel Scaloni', playingStyle: '4-3-3 / 4-4-2', keyPlayers: ['Lionel Messi', 'Julián Álvarez', 'Enzo Fernández'], strengths: ['World-class individual talent', 'Tournament experience', 'Winning mentality'], weaknesses: ['Aging key players', 'Depth in defence'], groupOpponents: ['Colombia', 'Austria', 'Uzbekistan'], overview: 'Argentina enter the 2026 World Cup as defending champions, looking to become the first team since Brazil in 1962 to win consecutive World Cups. Under Lionel Scaloni, La Albiceleste have been the dominant force in world football, winning the 2022 World Cup in Qatar and the 2024 Copa América.', tacticalAnalysis: 'Scaloni\'s Argentina operate in a fluid 4-3-3 system that transitions into a 4-4-2 without the ball. The midfield trio of Enzo Fernández, Rodrigo De Paul, and Alexis Mac Allister provides both defensive solidity and creative impetus. The key tactical question is how much longer Lionel Messi can operate at the highest level in a tournament setting.' },
  BRA: { name: 'Brazil', code: 'BRA', flag: '🇧🇷', group: 'C', confederation: 'CONMEBOL', fifaRanking: 3, wcAppearances: 22, bestFinish: 'Winners (1958, 1962, 1970, 1994, 2002)', manager: 'Dorival Júnior', playingStyle: '4-2-3-1', keyPlayers: ['Vinícius Jr.', 'Rodrygo', 'Endrick'], strengths: ['Attacking firepower', 'Individual brilliance', 'Deep squad'], weaknesses: ['Defensive vulnerabilities', 'Recent tournament disappointments'], groupOpponents: ['Morocco', 'Scotland', 'Haiti'], overview: 'Brazil, the most successful nation in World Cup history with five titles, are desperate to end their trophy drought that stretches back to 2002. The Seleção have a new generation of talent led by Vinícius Jr. and are looking to restore their reputation as the world\'s most entertaining football nation.', tacticalAnalysis: 'Under Dorival Júnior, Brazil play a 4-2-3-1 that allows their attacking talents to express themselves. Vinícius Jr. operating from the left flank is their primary threat, with his pace and dribbling ability making him virtually unplayable on his day. The midfield pivot will be crucial in providing the defensive balance to allow the front four to attack with freedom.' },
  ENG: { name: 'England', code: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', group: 'J', confederation: 'UEFA', fifaRanking: 4, wcAppearances: 16, bestFinish: 'Winners (1966)', manager: 'Thomas Tuchel', playingStyle: '4-3-3', keyPlayers: ['Jude Bellingham', 'Phil Foden', 'Bukayo Saka'], strengths: ['Squad depth', 'Premier League quality', 'Set-piece threat'], weaknesses: ['Tournament knockout pressure', 'Goalkeeping concerns'], groupOpponents: ['Ghana', 'Panama', 'Algeria'], overview: 'England arrive at the 2026 World Cup with perhaps their most talented squad in a generation. Under Thomas Tuchel, the Three Lions are looking to go one step further after reaching the Euro 2024 final. With Jude Bellingham, Phil Foden, and Bukayo Saka in their prime, expectations are sky-high.', tacticalAnalysis: 'Tuchel\'s England deploy a possession-based 4-3-3 with Bellingham as the box-to-box engine. The tactical key is how Tuchel balances the attacking riches at his disposal while maintaining the defensive discipline that got Southgate\'s sides to tournament finals. The full-back positions and how they provide width will be critical.' },
  FRA: { name: 'France', code: 'FRA', flag: '🇫🇷', group: 'I', confederation: 'UEFA', fifaRanking: 2, wcAppearances: 16, bestFinish: 'Winners (1998, 2018)', manager: 'Didier Deschamps', playingStyle: '4-3-3 / 3-4-3', keyPlayers: ['Kylian Mbappé', 'Antoine Griezmann', 'Aurélien Tchouaméni'], strengths: ['World-class forwards', 'Tactical flexibility', 'Tournament pedigree'], weaknesses: ['Squad harmony concerns', 'Aging defensive core'], groupOpponents: ['Senegal', 'Norway', 'Iraq'], overview: 'France are two-time World Cup champions and runners-up in 2022, making them perennial favourites. With Kylian Mbappé leading the line, Les Bleus possess arguably the most feared attack in world football. Deschamps\' experience in managing tournament football gives them a significant edge.', tacticalAnalysis: 'Deschamps oscillates between a 4-3-3 and a 3-4-3 depending on the opponent. The constant is Mbappé\'s freedom to roam and create. Griezmann\'s intelligence in dropping between the lines creates space for Mbappé to attack, while Tchouaméni anchors the midfield. France\'s ability to control games without the ball makes them dangerous in knockout football.' },
  ESP: { name: 'Spain', code: 'ESP', flag: '🇪🇸', group: 'H', confederation: 'UEFA', fifaRanking: 5, wcAppearances: 16, bestFinish: 'Winners (2010)', manager: 'Luis de la Fuente', playingStyle: '4-3-3', keyPlayers: ['Lamine Yamal', 'Pedri', 'Gavi'], strengths: ['Youth and energy', 'Possession dominance', 'Tactical intelligence'], weaknesses: ['Lack of a prolific striker', 'Tournament inexperience of young players'], groupOpponents: ['Saudi Arabia', 'Cape Verde', 'Jordan'], overview: 'Spain are the reigning European champions after their stunning Euro 2024 triumph, built around the most exciting generation of young talent in European football. Lamine Yamal, Pedri, and Gavi form the core of a side that plays some of the most attractive football on the planet.', tacticalAnalysis: 'De la Fuente\'s Spain maintain the nation\'s DNA of possession-based football but with more directness than previous iterations. Lamine Yamal\'s emergence as a world-class winger has added a dimension Spain previously lacked — genuine pace and one-on-one ability on the flanks. The midfield trio of Pedri, Gavi, and Rodri remains the heartbeat of the team.' },
  GER: { name: 'Germany', code: 'GER', flag: '🇩🇪', group: 'E', confederation: 'UEFA', fifaRanking: 8, wcAppearances: 20, bestFinish: 'Winners (1954, 1974, 1990, 2014)', manager: 'Julian Nagelsmann', playingStyle: '4-2-3-1', keyPlayers: ['Florian Wirtz', 'Jamal Musiala', 'Kai Havertz'], strengths: ['Emerging young talent', 'Tactical sophistication', 'Tournament DNA'], weaknesses: ['Recent tournament exits', 'Defensive reliability'], groupOpponents: ['Ivory Coast', 'Curaçao', 'Ecuador'], overview: 'Germany, four-time World Cup champions, are rebuilding under Julian Nagelsmann after disappointing early exits at the 2022 World Cup and Euro 2024 on home soil. The emergence of Florian Wirtz and Jamal Musiala as genuine world-class talents has given German football renewed hope.', tacticalAnalysis: 'Nagelsmann employs a high-pressing 4-2-3-1 that maximizes the creativity of Wirtz and Musiala behind striker Kai Havertz. The tactical innovation lies in how the double pivot protects the back four while allowing the attacking midfielders complete freedom. Germany\'s pressing intensity in the first 20 minutes of matches has been among the highest in European football.' },
  POR: { name: 'Portugal', code: 'POR', flag: '🇵🇹', group: 'K', confederation: 'UEFA', fifaRanking: 6, wcAppearances: 8, bestFinish: 'Third place (1966)', manager: 'Roberto Martínez', playingStyle: '4-3-3', keyPlayers: ['Cristiano Ronaldo', 'Bruno Fernandes', 'Rafael Leão'], strengths: ['Squad depth', 'Individual quality', 'Set-piece threat'], weaknesses: ['Over-reliance on Ronaldo', 'Defensive transitions'], groupOpponents: ['DR Congo', 'Nigeria', 'Switzerland'], overview: 'Portugal enter the 2026 World Cup with Cristiano Ronaldo potentially playing in his final major tournament at age 41. The squad boasts incredible depth with players like Bruno Fernandes, Bernardo Silva, and Rafael Leão providing quality across every position.', tacticalAnalysis: 'Martínez plays a 4-3-3 with Ronaldo as the focal point of the attack. The tactical challenge is accommodating Ronaldo\'s diminishing pressing ability while leveraging his still-elite positioning and finishing. Bruno Fernandes operates as the creative hub, with his passing range connecting defence to attack.' },
  ITA: { name: 'Italy', code: 'ITA', flag: '🇮🇹', group: 'L', confederation: 'UEFA', fifaRanking: 7, wcAppearances: 18, bestFinish: 'Winners (1934, 1938, 1982, 2006)', manager: 'Luciano Spalletti', playingStyle: '3-5-2 / 4-3-3', keyPlayers: ['Nicolò Barella', 'Federico Chiesa', 'Gianluigi Donnarumma'], strengths: ['Tactical discipline', 'Defensive organisation', 'Midfield control'], weaknesses: ['Lack of a world-class striker', 'Recent form inconsistency'], groupOpponents: ['Iran', 'Cameroon', 'Peru'], overview: 'Italy return to the World Cup stage after the humiliation of failing to qualify for the 2022 edition. The Azzurri, four-time world champions, are determined to prove that their absence from Qatar was an aberration rather than a decline.', tacticalAnalysis: 'Spalletti alternates between a 3-5-2 and 4-3-3, with Barella as the driving force in midfield. Italy\'s defensive structure remains their foundation — they are masters of controlling space and forcing opponents into low-percentage chances. The question is whether they have enough attacking quality to break down well-organized defences in knockout rounds.' },
  NED: { name: 'Netherlands', code: 'NED', flag: '🇳🇱', group: 'F', confederation: 'UEFA', fifaRanking: 9, wcAppearances: 11, bestFinish: 'Runners-up (1974, 1978, 2010)', manager: 'Ronald Koeman', playingStyle: '4-3-3 / 3-4-3', keyPlayers: ['Cody Gakpo', 'Xavi Simons', 'Virgil van Dijk'], strengths: ['Total Football philosophy', 'Versatile squad', 'Big-game experience'], weaknesses: ['Lack of a natural goalscorer', 'Defensive vulnerability on the counter'], groupOpponents: ['Japan', 'Sweden', 'Tunisia'], overview: 'The Netherlands, three-time World Cup runners-up, continue their quest for a first title. Under Ronald Koeman, Oranje have rebuilt around a mix of established stars like Virgil van Dijk and exciting young talents like Xavi Simons.', tacticalAnalysis: 'Koeman\'s Netherlands remain faithful to the Total Football philosophy, employing a fluid formation that shifts between 4-3-3 and 3-4-3. The key tactical feature is the positional rotation in midfield, with Xavi Simons given license to drift and create overloads. Van Dijk\'s leadership from the back allows the team to play a high defensive line.' },
  USA: { name: 'USA', code: 'USA', flag: '🇺🇸', group: 'D', confederation: 'CONCACAF', fifaRanking: 14, wcAppearances: 11, bestFinish: 'Third place (1930)', manager: 'Mauricio Pochettino', playingStyle: '4-3-3', keyPlayers: ['Christian Pulisic', 'Weston McKennie', 'Giovanni Reyna'], strengths: ['Home advantage', 'Athletic squad', 'European experience'], weaknesses: ['Pressure of hosting', 'Inconsistent form'], groupOpponents: ['Turkey', 'Paraguay', 'Croatia'], overview: 'The United States co-host the 2026 World Cup and carry the weight of a nation\'s expectations. Under Mauricio Pochettino, the USMNT boast a generation of players competing at Europe\'s biggest clubs. Playing on home soil provides a massive advantage.', tacticalAnalysis: 'Pochettino deploys a high-intensity 4-3-3 that leverages the squad\'s athleticism. Pulisic\'s versatility allows him to operate across the front three, while McKennie provides the engine in midfield. The home crowd factor could prove decisive in tight group-stage matches.' },
};

// Generate basic data for teams without detailed profiles
function getDefaultTeamData(code: string, name: string, flag: string, group: string): WCTeamData {
  return {
    name, code, flag, group,
    confederation: 'N/A', fifaRanking: 0, wcAppearances: 0,
    bestFinish: 'N/A', manager: 'TBC', playingStyle: 'TBC',
    keyPlayers: [], strengths: [], weaknesses: [],
    groupOpponents: [],
    overview: `${name} have qualified for the 2026 FIFA World Cup and will compete in Group ${group}. They will be looking to make an impact on the world stage and progress through the group phase.`,
    tacticalAnalysis: `Full tactical analysis for ${name} will be available closer to the tournament kickoff.`,
  };
}

// Groups data (same as WorldCup.tsx)
const GROUPS: Record<string, { name: string; code: string; flag: string }[]> = {
  A: [{ name: 'Mexico', code: 'MEX', flag: '🇲🇽' }, { name: 'South Korea', code: 'KOR', flag: '🇰🇷' }, { name: 'Czechia', code: 'CZE', flag: '🇨🇿' }, { name: 'South Africa', code: 'RSA', flag: '🇿🇦' }],
  B: [{ name: 'Canada', code: 'CAN', flag: '🇨🇦' }, { name: 'Australia', code: 'AUS', flag: '🇦🇺' }, { name: 'Bosnia & Herz.', code: 'BIH', flag: '🇧🇦' }, { name: 'Qatar', code: 'QAT', flag: '🇶🇦' }],
  C: [{ name: 'Brazil', code: 'BRA', flag: '🇧🇷' }, { name: 'Morocco', code: 'MAR', flag: '🇲🇦' }, { name: 'Scotland', code: 'SCO', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' }, { name: 'Haiti', code: 'HAI', flag: '🇭🇹' }],
  D: [{ name: 'USA', code: 'USA', flag: '🇺🇸' }, { name: 'Turkey', code: 'TUR', flag: '🇹🇷' }, { name: 'Paraguay', code: 'PAR', flag: '🇵🇾' }, { name: 'Croatia', code: 'CRO', flag: '🇭🇷' }],
  E: [{ name: 'Germany', code: 'GER', flag: '🇩🇪' }, { name: 'Ivory Coast', code: 'CIV', flag: '🇨🇮' }, { name: 'Curaçao', code: 'CUW', flag: '🇨🇼' }, { name: 'Ecuador', code: 'ECU', flag: '🇪🇨' }],
  F: [{ name: 'Netherlands', code: 'NED', flag: '🇳🇱' }, { name: 'Japan', code: 'JPN', flag: '🇯🇵' }, { name: 'Sweden', code: 'SWE', flag: '🇸🇪' }, { name: 'Tunisia', code: 'TUN', flag: '🇹🇳' }],
  G: [{ name: 'Argentina', code: 'ARG', flag: '🇦🇷' }, { name: 'Colombia', code: 'COL', flag: '🇨🇴' }, { name: 'Austria', code: 'AUT', flag: '🇦🇹' }, { name: 'Uzbekistan', code: 'UZB', flag: '🇺🇿' }],
  H: [{ name: 'Spain', code: 'ESP', flag: '🇪🇸' }, { name: 'Saudi Arabia', code: 'KSA', flag: '🇸🇦' }, { name: 'Cape Verde', code: 'CPV', flag: '🇨🇻' }, { name: 'Jordan', code: 'JOR', flag: '🇯🇴' }],
  I: [{ name: 'France', code: 'FRA', flag: '🇫🇷' }, { name: 'Senegal', code: 'SEN', flag: '🇸🇳' }, { name: 'Norway', code: 'NOR', flag: '🇳🇴' }, { name: 'Iraq', code: 'IRQ', flag: '🇮🇶' }],
  J: [{ name: 'England', code: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' }, { name: 'Ghana', code: 'GHA', flag: '🇬🇭' }, { name: 'Panama', code: 'PAN', flag: '🇵🇦' }, { name: 'Algeria', code: 'ALG', flag: '🇩🇿' }],
  K: [{ name: 'Portugal', code: 'POR', flag: '🇵🇹' }, { name: 'DR Congo', code: 'COD', flag: '🇨🇩' }, { name: 'Nigeria', code: 'NGA', flag: '🇳🇬' }, { name: 'Switzerland', code: 'SUI', flag: '🇨🇭' }],
  L: [{ name: 'Italy', code: 'ITA', flag: '🇮🇹' }, { name: 'Iran', code: 'IRN', flag: '🇮🇷' }, { name: 'Cameroon', code: 'CMR', flag: '🇨🇲' }, { name: 'Peru', code: 'PER', flag: '🇵🇪' }],
};

export default function WCTeamPage() {
  const { code } = useParams<{ code: string }>();
  const upperCode = code?.toUpperCase() || '';

  // Find team in groups
  let teamInfo: { name: string; code: string; flag: string } | null = null;
  let groupName = '';
  for (const [g, teams] of Object.entries(GROUPS)) {
    const found = teams.find(t => t.code === upperCode);
    if (found) { teamInfo = found; groupName = g; break; }
  }

  if (!teamInfo) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container text-center py-20">
          <p className="text-lg font-medium text-muted-foreground">Team not found</p>
          <Link to="/worldcup" className="text-primary hover:underline text-sm mt-2 inline-block">← Back to World Cup</Link>
        </div>
      </div>
    );
  }

  const data = TEAM_DATA[upperCode] || getDefaultTeamData(upperCode, teamInfo.name, teamInfo.flag, groupName);
  const groupTeams = GROUPS[groupName] || [];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${teamInfo.name} — World Cup 2026 Squad, Group, Key Players & Analysis | LastFootball`}
        description={`${teamInfo.name} at the 2026 FIFA World Cup: Group ${groupName} draw, squad, key players, tactical analysis, and tournament history. ${data.manager ? `Manager: ${data.manager}.` : ''} ${data.keyPlayers.length ? `Key players: ${data.keyPlayers.join(', ')}.` : ''}`}
        path={`/worldcup/team/${code}`}
      />
      <Header />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#1a0a2e] via-[#0d1a3a] to-background border-b border-amber-500/20">
        <div className="container max-w-4xl py-8">
          <Link to="/worldcup" className="inline-flex items-center gap-1 text-xs text-amber-400/60 hover:text-amber-400 mb-4 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> World Cup 2026
          </Link>

          <div className="flex items-center gap-5">
            <span className="text-6xl sm:text-7xl">{teamInfo.flag}</span>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full uppercase">Group {groupName}</span>
                {data.fifaRanking > 0 && (
                  <span className="text-[10px] font-bold bg-white/10 text-white/70 px-2 py-0.5 rounded-full">FIFA #{data.fifaRanking}</span>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white">{teamInfo.name}</h1>
              {data.manager && data.manager !== 'TBC' && (
                <p className="text-sm text-white/50 mt-1">Manager: {data.manager} · {data.playingStyle}</p>
              )}
            </div>
          </div>

          {/* Quick facts */}
          {data.wcAppearances > 0 && (
            <div className="grid grid-cols-3 gap-3 mt-5">
              <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                <p className="text-xl font-black text-amber-400">{data.wcAppearances}</p>
                <p className="text-[10px] text-white/50 uppercase">WC Appearances</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                <p className="text-sm font-bold text-amber-400">{data.bestFinish}</p>
                <p className="text-[10px] text-white/50 uppercase">Best Finish</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                <p className="text-sm font-bold text-amber-400">{data.confederation}</p>
                <p className="text-[10px] text-white/50 uppercase">Confederation</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <main className="container max-w-4xl py-6 pb-20 md:pb-6 space-y-5">
        {/* Overview */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" /> {teamInfo.name} at the 2026 World Cup
          </h2>
          <p className="text-sm text-foreground/80 leading-relaxed">{data.overview}</p>
        </section>

        {/* Group */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" /> Group {groupName}
          </h2>
          <div className="space-y-2">
            {groupTeams.map(t => (
              <Link
                key={t.code}
                to={`/worldcup/team/${t.code.toLowerCase()}`}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  t.code === upperCode ? 'bg-amber-500/10 border border-amber-500/20' : 'hover:bg-secondary/30',
                )}
              >
                <span className="text-xl">{t.flag}</span>
                <span className={cn('text-sm font-medium', t.code === upperCode ? 'text-amber-400 font-bold' : 'text-foreground')}>{t.name}</span>
                {t.code === upperCode && <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold ml-auto">YOU ARE HERE</span>}
              </Link>
            ))}
          </div>
        </section>

        {/* Key Players */}
        {data.keyPlayers.length > 0 && (
          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" /> Key Players
            </h2>
            <div className="space-y-2">
              {data.keyPlayers.map(p => (
                <div key={p} className="flex items-center gap-2 px-2 py-1.5">
                  <span className="text-primary">⚽</span>
                  <span className="text-sm font-medium text-foreground">{p}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tactical Analysis */}
        {data.tacticalAnalysis && data.tacticalAnalysis !== `Full tactical analysis for ${teamInfo.name} will be available closer to the tournament kickoff.` && (
          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-bold text-foreground mb-3">Tactical Blueprint</h2>
            <p className="text-sm text-foreground/80 leading-relaxed">{data.tacticalAnalysis}</p>
          </section>
        )}

        {/* Strengths & Weaknesses */}
        {(data.strengths.length > 0 || data.weaknesses.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.strengths.length > 0 && (
              <section className="bg-card border border-emerald-500/20 rounded-xl p-4">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Strengths</h3>
                {data.strengths.map(s => (
                  <p key={s} className="text-sm text-foreground/80 py-1 flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span> {s}
                  </p>
                ))}
              </section>
            )}
            {data.weaknesses.length > 0 && (
              <section className="bg-card border border-red-500/20 rounded-xl p-4">
                <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">Weaknesses</h3>
                {data.weaknesses.map(w => (
                  <p key={w} className="text-sm text-foreground/80 py-1 flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">✗</span> {w}
                  </p>
                ))}
              </section>
            )}
          </div>
        )}

        {/* SEO FAQ */}
        <section className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/30">
            <h2 className="text-sm font-bold text-foreground">People Also Ask about {teamInfo.name}</h2>
          </div>
          <WCTeamFaq name={teamInfo.name} data={data} group={groupName} />
        </section>

        {/* Back to WC */}
        <Link to="/worldcup" className="flex items-center justify-center gap-2 py-3 text-sm text-amber-400 font-semibold hover:text-amber-300 transition-colors">
          ← Back to World Cup 2026 Hub
        </Link>
      </main>
    </div>
  );
}

function WCTeamFaq({ name, data, group }: { name: string; data: WCTeamData; group: string }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const faqs = [
    { q: `What group is ${name} in at the 2026 World Cup?`, a: `${name} have been drawn in Group ${group} for the 2026 FIFA World Cup, alongside ${data.groupOpponents.length ? data.groupOpponents.join(', ') : 'their group opponents'}.` },
    { q: `Who is the manager of ${name}?`, a: data.manager !== 'TBC' ? `${name} are managed by ${data.manager}, who deploys a ${data.playingStyle} formation.` : `The manager of ${name} for the 2026 World Cup is to be confirmed.` },
    { q: `How many World Cups has ${name} played in?`, a: data.wcAppearances > 0 ? `${name} have appeared in ${data.wcAppearances} FIFA World Cup tournaments. Their best finish was ${data.bestFinish}.` : `${name}'s World Cup history details will be updated soon.` },
    { q: `Who are ${name}'s key players for the 2026 World Cup?`, a: data.keyPlayers.length ? `${name}'s key players for the 2026 World Cup include ${data.keyPlayers.join(', ')}. These players will be crucial to their tournament hopes.` : `${name}'s key players for the 2026 World Cup will be confirmed in the squad announcement.` },
    { q: `When do ${name} play their first World Cup 2026 match?`, a: `${name}'s Group ${group} fixtures in the 2026 FIFA World Cup will begin in the group stage starting June 11, 2026. The full schedule with dates and venues will be available on LastFootball.` },
  ];

  return (
    <div className="divide-y divide-border/10">
      {faqs.map((faq, i) => (
        <button key={i} onClick={() => setOpenIdx(openIdx === i ? null : i)} className="w-full text-left px-4 py-3 hover:bg-secondary/20 transition-colors">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-foreground">{faq.q}</span>
            <ChevronRight className={cn('w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform', openIdx === i && 'rotate-90')} />
          </div>
          {openIdx === i && <p className="text-sm text-foreground/75 leading-relaxed mt-2 pr-6">{faq.a}</p>}
        </button>
      ))}
    </div>
  );
}
