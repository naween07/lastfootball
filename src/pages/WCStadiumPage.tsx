import { useParams, Link } from 'react-router-dom';
import Header from '@/components/Header';
import SEOHead from '@/components/SEOHead';
import { ArrowLeft, MapPin, Users, Calendar, Trophy, Ruler } from 'lucide-react';

interface StadiumData {
  slug: string;
  name: string;
  city: string;
  country: string;
  countryFlag: string;
  capacity: string;
  opened: string;
  surface: string;
  homeTeam: string;
  wcRole: string;
  description: string;
  history: string;
  wcSignificance: string;
  funFacts: string[];
}

const STADIUMS: Record<string, StadiumData> = {
  'metlife-stadium': {
    slug: 'metlife-stadium', name: 'MetLife Stadium', city: 'East Rutherford, New Jersey', country: 'USA', countryFlag: '🇺🇸',
    capacity: '82,500', opened: '2010', surface: 'Artificial turf (to be replaced with natural grass)', homeTeam: 'New York Giants & New York Jets (NFL)',
    wcRole: 'Final Venue',
    description: 'MetLife Stadium is the crown jewel of the 2026 FIFA World Cup, selected to host the tournament\'s Final on July 19, 2026. Located in the New York metropolitan area, it is the most expensive stadium ever built, with construction costs exceeding $1.6 billion. The venue will undergo significant modifications for the World Cup, including the installation of a natural grass pitch to meet FIFA standards.',
    history: 'Opened in April 2010 as a replacement for the old Giants Stadium, MetLife Stadium has hosted numerous high-profile events including multiple Super Bowls, WrestleMania, and major concerts. It is the only NFL stadium shared by two teams — the New York Giants and New York Jets. The stadium features an open-air design that provides dramatic views of the Manhattan skyline.',
    wcSignificance: 'As the venue for the 2026 World Cup Final, MetLife Stadium will host the most-watched single sporting event in history. The stadium\'s proximity to New York City — one of the world\'s most international cities — ensures a truly global atmosphere. The 82,500 capacity will be the largest crowd for a World Cup Final since the 1994 tournament at the Rose Bowl.',
    funFacts: ['Most expensive stadium ever built at $1.6 billion', 'Only NFL stadium shared by two teams', 'Located just 5 miles from Manhattan', 'Will install natural grass specifically for the World Cup'],
  },
  'at-t-stadium': {
    slug: 'at-t-stadium', name: 'AT&T Stadium', city: 'Arlington, Texas', country: 'USA', countryFlag: '🇺🇸',
    capacity: '80,000', opened: '2009', surface: 'Artificial turf (to be converted)', homeTeam: 'Dallas Cowboys (NFL)',
    wcRole: 'Semi-final Venue',
    description: 'AT&T Stadium, commonly known as "Jerry World" after Cowboys owner Jerry Jones, is one of the most technologically advanced stadiums in the world. Its signature feature is a massive retractable roof and the largest column-free interior in the world. The stadium features the world\'s largest video board, stretching 160 feet wide.',
    history: 'Since opening in 2009, AT&T Stadium has established itself as one of America\'s premier sporting venues. It has hosted Super Bowl XLV, multiple College Football Playoff games, NBA All-Star Games, and major boxing events. The stadium\'s versatility and state-of-the-art facilities make it an ideal World Cup venue.',
    wcSignificance: 'AT&T Stadium will host World Cup semi-final matches, bringing the biggest games in world football to the heart of Texas. The stadium\'s 80,000 capacity and climate-controlled environment ensure comfortable viewing regardless of the summer heat. Dallas\'s central location makes it accessible from across the United States.',
    funFacts: ['Features the world\'s largest video board at 160 feet wide', 'Retractable roof can open or close in 12 minutes', 'Cost $1.3 billion to build', 'Has hosted events attended by over 100,000 people'],
  },
  'sofi-stadium': {
    slug: 'sofi-stadium', name: 'SoFi Stadium', city: 'Inglewood, California', country: 'USA', countryFlag: '🇺🇸',
    capacity: '70,240', opened: '2020', surface: 'Natural grass', homeTeam: 'Los Angeles Rams & Los Angeles Chargers (NFL)',
    wcRole: 'Quarter-final & Group Stage',
    description: 'SoFi Stadium represents the future of stadium design. The $5 billion venue is the most expensive stadium ever constructed and features a translucent ETFE roof that allows natural light while protecting fans from the elements. Its innovative design earned it the hosting rights for Super Bowl LVI in 2022 and the opening and closing ceremonies of the 2028 Summer Olympics.',
    history: 'Completed in September 2020, SoFi Stadium quickly became one of the world\'s most celebrated sporting venues. Despite opening during the pandemic, it has since hosted numerous landmark events including the Super Bowl, BTS concerts, and Taylor Swift\'s Eras Tour. The stadium sits at the heart of a 298-acre entertainment district.',
    wcSignificance: 'Located in the entertainment capital of the world, SoFi Stadium brings World Cup football to Hollywood. Los Angeles\'s massive Latin American and international communities will create an electric atmosphere. The stadium\'s natural grass surface already meets FIFA standards, requiring minimal modifications.',
    funFacts: ['Most expensive stadium in the world at $5 billion', 'Features a 70,000 sq ft video board called the "Infinity Screen"', 'Will also host the 2028 Olympics', 'Natural grass pitch — one of few NFL stadiums with real turf'],
  },
  'estadio-azteca': {
    slug: 'estadio-azteca', name: 'Estadio Azteca', city: 'Mexico City', country: 'Mexico', countryFlag: '🇲🇽',
    capacity: '87,523', opened: '1966', surface: 'Natural grass', homeTeam: 'Club América & Mexico National Team',
    wcRole: 'Opening Match Venue',
    description: 'Estadio Azteca is the most iconic football stadium in the Americas and one of the most legendary venues in world sport. It is the only stadium to have hosted two FIFA World Cup Finals — in 1970 and 1986 — and will make history again in 2026 by hosting the tournament\'s opening match. At 2,200 meters above sea level, the thin air of Mexico City has famously affected visiting teams throughout its history.',
    history: 'Built for the 1968 Olympics and 1970 World Cup, Estadio Azteca has witnessed some of football\'s greatest moments. Diego Maradona\'s "Hand of God" and "Goal of the Century" against England both occurred here in the 1986 quarter-final. Pelé lifted the Jules Rimet Trophy here in 1970 after Brazil\'s iconic 4-1 victory over Italy in the final.',
    wcSignificance: 'The 2026 World Cup opening match between Mexico and South Africa on June 11 will be played at this hallowed ground, connecting the tournament\'s future with football\'s past. Estadio Azteca will become the first stadium to host matches at three different World Cups, cementing its place in football immortality.',
    funFacts: ['Only stadium to host two World Cup Finals (1970 and 1986)', 'Site of Maradona\'s "Goal of the Century"', 'Located 2,200m above sea level', 'Will be the first stadium to host matches at three World Cups'],
  },
  'hard-rock-stadium': {
    slug: 'hard-rock-stadium', name: 'Hard Rock Stadium', city: 'Miami Gardens, Florida', country: 'USA', countryFlag: '🇺🇸',
    capacity: '64,767', opened: '1987', surface: 'Natural grass', homeTeam: 'Miami Dolphins (NFL)',
    wcRole: 'Group Stage & Round of 32',
    description: 'Hard Rock Stadium has undergone a remarkable $550 million renovation that transformed it from an aging NFL venue into a world-class, multi-sport facility. The addition of a partial canopy roof provides shade for 92% of seats while maintaining the open-air atmosphere. Miami\'s vibrant Latin American culture and year-round warm weather make it an ideal World Cup host city.',
    history: 'Originally opened as Joe Robbie Stadium in 1987, the venue has hosted six Super Bowls — more than any other stadium. It is also home to the Miami Open tennis tournament, which uses the stadium\'s parking areas for temporary courts. The renovation added premium seating, improved sightlines, and state-of-the-art technology throughout.',
    wcSignificance: 'Miami\'s position as the gateway between North and South America makes Hard Rock Stadium the perfect venue for connecting fans from across the hemisphere. The city\'s enormous Brazilian, Argentine, and Colombian communities will bring authentic South American passion to every match played here.',
    funFacts: ['Has hosted six Super Bowls — more than any other stadium', 'Home to the Miami Open tennis tournament', '$550 million renovation completed in 2016', 'Natural grass surface maintained year-round in Miami\'s tropical climate'],
  },
  'bc-place': {
    slug: 'bc-place', name: 'BC Place', city: 'Vancouver, British Columbia', country: 'Canada', countryFlag: '🇨🇦',
    capacity: '54,500', opened: '1983', surface: 'Artificial turf (to be converted)', homeTeam: 'Vancouver Whitecaps FC (MLS) & BC Lions (CFL)',
    wcRole: 'Group Stage',
    description: 'BC Place is Canada\'s premier covered stadium, featuring a retractable roof that makes it an all-weather venue. Located in downtown Vancouver with stunning views of the North Shore mountains, it provides a spectacular setting for World Cup football. The stadium will install a natural grass pitch for the tournament.',
    history: 'BC Place opened in 1983 as the first covered stadium in Canada. It hosted the opening and closing ceremonies of the 2010 Winter Olympics and has been the home of Vancouver Whitecaps FC since they joined MLS in 2011. A major renovation in 2011 replaced the original air-supported roof with a modern retractable design.',
    wcSignificance: 'As one of two Canadian host cities, Vancouver represents the country\'s Pacific coast football community. The city\'s diverse, sports-passionate population and stunning natural setting will provide a memorable World Cup experience for visiting fans from around the globe.',
    funFacts: ['First covered stadium in Canada', 'Hosted the 2010 Winter Olympics ceremonies', 'Retractable roof installed in 2011', 'Downtown location with mountain views'],
  },
  'bmo-field': {
    slug: 'bmo-field', name: 'BMO Field', city: 'Toronto, Ontario', country: 'Canada', countryFlag: '🇨🇦',
    capacity: '45,736', opened: '2007', surface: 'Natural grass', homeTeam: 'Toronto FC (MLS)',
    wcRole: 'Group Stage',
    description: 'BMO Field is Canada\'s first soccer-specific stadium and the home of Toronto FC. Located on the grounds of Exhibition Place beside Lake Ontario, it offers intimate sightlines that bring fans closer to the action than any other World Cup venue. The stadium has been expanded multiple times to meet growing demand.',
    history: 'Built specifically for Toronto FC\'s inaugural MLS season in 2007, BMO Field represented a turning point for Canadian football. The stadium has hosted numerous international matches, including FIFA World Cup qualifiers and the 2015 Pan American Games. Its natural grass pitch is one of the finest in North American football.',
    wcSignificance: 'Toronto is North America\'s fourth-largest city and one of the most multicultural places on Earth. BMO Field\'s intimate atmosphere will create an intense environment for group-stage matches, with Toronto\'s diverse football communities — including large Italian, Portuguese, and South American populations — guaranteeing passionate crowds.',
    funFacts: ['Canada\'s first soccer-specific stadium', 'Smallest World Cup 2026 venue by capacity', 'Natural grass pitch since opening', 'Located beside Lake Ontario with waterfront views'],
  },
};

// Generate slugs for stadiums without detailed profiles
const BASIC_STADIUMS: Record<string, { name: string; city: string; country: string; capacity: string }> = {
  'nrg-stadium': { name: 'NRG Stadium', city: 'Houston, Texas', country: 'USA', capacity: '72,220' },
  'mercedes-benz-stadium': { name: 'Mercedes-Benz Stadium', city: 'Atlanta, Georgia', country: 'USA', capacity: '71,000' },
  'lincoln-financial-field': { name: 'Lincoln Financial Field', city: 'Philadelphia, PA', country: 'USA', capacity: '69,176' },
  'lumen-field': { name: 'Lumen Field', city: 'Seattle, Washington', country: 'USA', capacity: '68,740' },
  'gillette-stadium': { name: 'Gillette Stadium', city: 'Boston, Massachusetts', country: 'USA', capacity: '65,878' },
  'arrowhead-stadium': { name: 'Arrowhead Stadium', city: 'Kansas City, Missouri', country: 'USA', capacity: '76,416' },
  'levis-stadium': { name: 'Levi\'s Stadium', city: 'San Francisco Bay Area', country: 'USA', capacity: '68,500' },
  'estadio-bbva': { name: 'Estadio BBVA', city: 'Monterrey', country: 'Mexico', capacity: '53,500' },
  'estadio-akron': { name: 'Estadio Akron', city: 'Guadalajara', country: 'Mexico', capacity: '49,850' },
};

export default function WCStadiumPage() {
  const { slug } = useParams<{ slug: string }>();

  const stadium = slug ? STADIUMS[slug] : null;
  const basic = slug ? BASIC_STADIUMS[slug] : null;

  if (!stadium && !basic) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container text-center py-20">
          <p className="text-lg font-medium text-muted-foreground">Stadium not found</p>
          <Link to="/worldcup" className="text-primary hover:underline text-sm mt-2 inline-block">← Back to World Cup</Link>
        </div>
      </div>
    );
  }

  // Basic stadium page (no detailed description yet)
  if (!stadium && basic) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead
          title={`${basic.name} — World Cup 2026 Venue | LastFootball`}
          description={`${basic.name} in ${basic.city}, ${basic.country}. Capacity: ${basic.capacity}. FIFA World Cup 2026 host stadium.`}
          path={`/worldcup/stadium/${slug}`}
        />
        <Header />
        <div className="container max-w-4xl py-6 pb-20">
          <Link to="/worldcup" className="inline-flex items-center gap-1 text-xs text-amber-400/60 hover:text-amber-400 mb-4 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> World Cup 2026
          </Link>
          <h1 className="text-2xl font-black text-foreground mb-2">{basic.name}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4" /> {basic.city}, {basic.country}
            <span>·</span>
            <Users className="w-4 h-4" /> Capacity: {basic.capacity}
          </p>
          <div className="bg-card border border-border rounded-xl p-5 mt-6">
            <p className="text-sm text-foreground/80 leading-relaxed">
              {basic.name} in {basic.city} is one of the 16 host venues for the 2026 FIFA World Cup. With a capacity of {basic.capacity}, it will host group stage matches during the tournament. Full details about this venue will be updated soon.
            </p>
          </div>
          <Link to="/worldcup" className="flex items-center justify-center gap-2 py-3 mt-6 text-sm text-amber-400 font-semibold hover:text-amber-300 transition-colors">
            ← Back to World Cup 2026 Hub
          </Link>
        </div>
      </div>
    );
  }

  const s = stadium!;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${s.name} — World Cup 2026 ${s.wcRole} Venue | LastFootball`}
        description={`${s.name} in ${s.city}: capacity ${s.capacity}, ${s.wcRole} venue for FIFA World Cup 2026. ${s.description.slice(0, 150)}...`}
        path={`/worldcup/stadium/${slug}`}
      />
      <Header />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#1a0a2e] via-[#0d1a3a] to-background border-b border-amber-500/20">
        <div className="container max-w-4xl py-8">
          <Link to="/worldcup" className="inline-flex items-center gap-1 text-xs text-amber-400/60 hover:text-amber-400 mb-4 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> World Cup 2026
          </Link>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full uppercase">{s.wcRole}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">{s.name}</h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {s.city}, {s.country}</span>
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {s.capacity}</span>
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Opened {s.opened}</span>
          </div>

          {/* Quick facts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
              <p className="text-sm font-bold text-amber-400">{s.capacity}</p>
              <p className="text-[10px] text-white/50 uppercase">Capacity</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
              <p className="text-sm font-bold text-amber-400">{s.surface.split('(')[0].trim()}</p>
              <p className="text-[10px] text-white/50 uppercase">Surface</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
              <p className="text-sm font-bold text-amber-400">{s.opened}</p>
              <p className="text-[10px] text-white/50 uppercase">Opened</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
              <p className="text-sm font-bold text-amber-400">{s.wcRole}</p>
              <p className="text-[10px] text-white/50 uppercase">WC Role</p>
            </div>
          </div>
        </div>
      </section>

      <main className="container max-w-4xl py-6 pb-20 md:pb-6 space-y-5">
        {/* Description */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" /> About {s.name}
          </h2>
          <p className="text-sm text-foreground/80 leading-relaxed">{s.description}</p>
        </section>

        {/* History */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-bold text-foreground mb-3">Stadium History</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">{s.history}</p>
        </section>

        {/* World Cup significance */}
        <section className="bg-card border border-amber-500/20 rounded-xl p-5">
          <h2 className="text-sm font-bold text-amber-400 mb-3">World Cup 2026 Significance</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">{s.wcSignificance}</p>
        </section>

        {/* Fun Facts */}
        {s.funFacts.length > 0 && (
          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-bold text-foreground mb-3">Quick Facts</h2>
            {s.funFacts.map((fact, i) => (
              <p key={i} className="text-sm text-foreground/80 py-1.5 flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">⚡</span> {fact}
              </p>
            ))}
          </section>
        )}

        {/* Home team + info */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Ruler className="w-4 h-4 text-primary" /> Venue Details
          </h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-1.5">
              <span className="text-sm text-muted-foreground">Home Team</span>
              <span className="text-sm font-semibold text-foreground">{s.homeTeam}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-sm text-muted-foreground">Playing Surface</span>
              <span className="text-sm font-semibold text-foreground">{s.surface}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-sm text-muted-foreground">Location</span>
              <span className="text-sm font-semibold text-foreground">{s.city}, {s.country}</span>
            </div>
          </div>
        </section>

        <Link to="/worldcup" className="flex items-center justify-center gap-2 py-3 text-sm text-amber-400 font-semibold hover:text-amber-300 transition-colors">
          ← Back to World Cup 2026 Hub
        </Link>
      </main>
    </div>
  );
}
