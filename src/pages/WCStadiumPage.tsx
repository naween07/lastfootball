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
  'nrg-stadium': {
    slug: 'nrg-stadium', name: 'NRG Stadium', city: 'Houston, Texas', country: 'USA', countryFlag: '🇺🇸',
    capacity: '72,220', opened: '2002', surface: 'Natural grass', homeTeam: 'Houston Texans (NFL)',
    wcRole: 'Group Stage & Round of 32',
    description: 'NRG Stadium is one of the most versatile sporting venues in the United States, featuring a retractable roof that can be opened or closed in just seven minutes. Located in the heart of Houston — America\'s fourth-largest city — the stadium provides a climate-controlled environment that shields fans and players from Texas\'s intense summer heat.',
    history: 'Opened in 2002 as Reliant Stadium, NRG Stadium was the first retractable-roof stadium in the NFL. It has hosted two Super Bowls (XXXVIII and LI), multiple NCAA Final Fours, and the annual Houston Livestock Show and Rodeo — the world\'s largest. The stadium\'s natural grass surface is grown in trays that can be moved in and out of the venue.',
    wcSignificance: 'Houston\'s massive Latin American community — the city is 45% Hispanic — ensures passionate and knowledgeable football crowds. The retractable roof makes NRG Stadium one of the few World Cup venues where weather is completely controlled. Mexico and several South American nations will likely play group matches here.',
    funFacts: ['Retractable roof opens or closes in just 7 minutes', 'Has hosted two Super Bowls', 'Natural grass grown in removable trays', 'Houston is 45% Hispanic — guaranteeing passionate football crowds'],
  },
  'mercedes-benz-stadium': {
    slug: 'mercedes-benz-stadium', name: 'Mercedes-Benz Stadium', city: 'Atlanta, Georgia', country: 'USA', countryFlag: '🇺🇸',
    capacity: '71,000', opened: '2017', surface: 'Artificial turf (to be converted)', homeTeam: 'Atlanta Falcons (NFL) & Atlanta United FC (MLS)',
    wcRole: 'Group Stage & Round of 32',
    description: 'Mercedes-Benz Stadium is one of the most architecturally stunning sporting venues in the world, featuring a unique retractable roof designed to mimic the petals of a flower. The $1.6 billion stadium has set new standards for fan experience, including affordable food and beverage pricing that has been adopted by venues worldwide.',
    history: 'Since opening in 2017, Mercedes-Benz Stadium has been home to both the Atlanta Falcons and Atlanta United FC, who have drawn record MLS crowds consistently exceeding 70,000. The stadium hosted Super Bowl LIII in 2019 and the College Football Playoff National Championship. Its fan-friendly pricing model — with $2 hot dogs and $3 beers — revolutionized the American sports experience.',
    wcSignificance: 'Atlanta United\'s remarkable success has proven that the American South is passionate about football. The club regularly draws the largest crowds in MLS, creating a genuine football culture in the city. Mercedes-Benz Stadium\'s atmosphere for football matches is widely considered the best in North America.',
    funFacts: ['Unique 8-petal retractable roof design', '$2 hot dogs — cheapest food in major US sports', 'Atlanta United regularly draws 70,000+ for MLS matches', 'Cost $1.6 billion to build'],
  },
  'lincoln-financial-field': {
    slug: 'lincoln-financial-field', name: 'Lincoln Financial Field', city: 'Philadelphia, Pennsylvania', country: 'USA', countryFlag: '🇺🇸',
    capacity: '69,176', opened: '2003', surface: 'Natural grass', homeTeam: 'Philadelphia Eagles (NFL)',
    wcRole: 'Group Stage',
    description: 'Lincoln Financial Field — known locally as "The Linc" — is home to one of American sport\'s most passionate fan bases. Philadelphia Eagles fans are legendary for their intensity, and that energy will translate perfectly to World Cup football. The stadium\'s natural grass surface and open-air design provide an authentic football experience.',
    history: 'Opened in 2003, Lincoln Financial Field replaced the iconic Veterans Stadium. It has hosted numerous international football matches, including a 2015 CONCACAF Gold Cup semi-final. The stadium underwent a significant renovation in 2014 that added premium seating and improved sightlines. Philadelphia\'s blue-collar sporting culture ensures every match at the Linc is played in a cauldron of noise.',
    wcSignificance: 'Philadelphia is one of America\'s most historic cities and sits at the heart of the densely populated Northeast corridor, making it easily accessible for millions of fans. The city\'s large Italian, Irish, and Latin American communities bring diverse football traditions that will create a unique match-day atmosphere.',
    funFacts: ['Philadelphia fans are ranked among the most passionate in US sports', 'Natural grass surface meets FIFA standards', 'Located in the same sports complex as the 76ers and Phillies', 'Eagles fans once booed Santa Claus — World Cup opponents beware'],
  },
  'lumen-field': {
    slug: 'lumen-field', name: 'Lumen Field', city: 'Seattle, Washington', country: 'USA', countryFlag: '🇺🇸',
    capacity: '68,740', opened: '2002', surface: 'Artificial turf (to be converted)', homeTeam: 'Seattle Seahawks (NFL) & Seattle Sounders FC (MLS)',
    wcRole: 'Group Stage',
    description: 'Lumen Field is famous for being one of the loudest stadiums in the world. The partial roof design and steep seating angles trap and amplify crowd noise to levels that have literally registered on seismographs during NFL games — earning it the nickname "The CLink." Seattle Sounders FC have built one of MLS\'s most dedicated fan bases here.',
    history: 'Opened in 2002 as Seahawks Stadium, Lumen Field has set multiple records for crowd noise. In 2013, Seahawks fans generated a crowd roar measured at 137.6 decibels — louder than a jet engine. The Sounders have won two MLS Cups playing at Lumen Field, and the atmosphere for major matches routinely rivals European stadiums.',
    wcSignificance: 'Seattle\'s football culture is arguably the most authentic in the United States. The Sounders\' supporter groups — including the Emerald City Supporters — create tifo displays and non-stop chanting that would feel at home in any European ground. World Cup matches at Lumen Field will benefit from this established football culture.',
    funFacts: ['Crowd noise registered on earthquake monitors (137.6 decibels)', 'Seattle Sounders have one of the best supporter cultures in MLS', 'Partial roof design amplifies sound dramatically', 'Located in downtown Seattle with views of the Olympic Mountains'],
  },
  'gillette-stadium': {
    slug: 'gillette-stadium', name: 'Gillette Stadium', city: 'Foxborough, Massachusetts', country: 'USA', countryFlag: '🇺🇸',
    capacity: '65,878', opened: '2002', surface: 'Artificial turf (to be converted)', homeTeam: 'New England Patriots (NFL) & New England Revolution (MLS)',
    wcRole: 'Group Stage',
    description: 'Gillette Stadium serves the greater Boston metropolitan area, one of America\'s most iconic sports cities. Home to the New England Patriots — the most successful NFL franchise of the 21st century — and the New England Revolution of MLS, the stadium is located in Foxborough, approximately 30 miles southwest of Boston.',
    history: 'Opened in 2002, Gillette Stadium replaced the aging Foxboro Stadium and has since hosted six Super Bowl champion teams. The venue features "The Lighthouse" — a distinctive lighthouse structure at the entrance that has become its architectural signature. It has hosted international football matches including Copa América Centenario games in 2016.',
    wcSignificance: 'Boston\'s large Portuguese, Brazilian, and Irish communities make it a natural football city. The New England Revolution\'s fan base provides a foundation of football knowledge, while the city\'s world-renowned universities ensure a diverse, international crowd for World Cup matches.',
    funFacts: ['Home to the most successful NFL dynasty of the 21st century', 'Features a distinctive lighthouse structure at the entrance', 'Hosted Copa América Centenario matches in 2016', 'Boston area has large Portuguese and Brazilian communities'],
  },
  'arrowhead-stadium': {
    slug: 'arrowhead-stadium', name: 'Arrowhead Stadium', city: 'Kansas City, Missouri', country: 'USA', countryFlag: '🇺🇸',
    capacity: '76,416', opened: '1972', surface: 'Natural grass', homeTeam: 'Kansas City Chiefs (NFL)',
    wcRole: 'Group Stage & Round of 32',
    description: 'Arrowhead Stadium is one of the most legendary venues in American sports history, renowned for holding the Guinness World Record for loudest crowd roar at an outdoor stadium — a staggering 142.2 decibels. Home to the Kansas City Chiefs, the stadium\'s distinctive arrowhead-shaped design and passionate fan base create one of the most intimidating atmospheres in all of sport.',
    history: 'Opened in 1972 as part of the Truman Sports Complex, Arrowhead is one of the oldest NFL stadiums still in use. Its longevity is a testament to its excellent design and the unwavering support of Chiefs fans. The stadium has undergone multiple renovations to modernize facilities while preserving its iconic character. Patrick Mahomes and the Chiefs have won multiple Super Bowls with Arrowhead as their fortress.',
    wcSignificance: 'Kansas City\'s central geographic location makes Arrowhead accessible from virtually anywhere in the United States. The city\'s growing Hispanic population and established sporting culture ensure enthusiastic crowds. At 76,416 capacity, it is one of the larger World Cup venues and its natural grass pitch is already FIFA-ready.',
    funFacts: ['Guinness World Record for loudest outdoor stadium — 142.2 decibels', 'One of the oldest continuously operating NFL stadiums (1972)', 'Natural grass surface already meets FIFA standards', 'Home to Patrick Mahomes and the Super Bowl champion Chiefs'],
  },
  'levis-stadium': {
    slug: 'levis-stadium', name: 'Levi\'s Stadium', city: 'Santa Clara, California', country: 'USA', countryFlag: '🇺🇸',
    capacity: '68,500', opened: '2014', surface: 'Natural grass', homeTeam: 'San Francisco 49ers (NFL)',
    wcRole: 'Group Stage',
    description: 'Levi\'s Stadium serves the San Francisco Bay Area, one of the world\'s most innovative and diverse metropolitan regions. The stadium is the most technologically advanced in the NFL, featuring a dedicated app that allows fans to order food, find restrooms, and watch replays from their seats. Its sustainable design includes a green roof and extensive solar panels.',
    history: 'Opened in 2014 at a cost of $1.3 billion, Levi\'s Stadium immediately established itself as a premier venue by hosting Super Bowl 50 in 2016. The stadium\'s location in Silicon Valley has influenced its design philosophy — it is arguably the most tech-forward sporting venue in the world. College football playoff games and major concerts have made it a year-round entertainment destination.',
    wcSignificance: 'The San Francisco Bay Area is one of America\'s most internationally diverse regions, with large communities from every football-playing continent. The proximity to Silicon Valley adds a tech-savvy element to the fan experience. Natural grass and a capacity of 68,500 make it ideal for World Cup group-stage matches.',
    funFacts: ['Most technologically advanced stadium in the NFL', 'Features a green roof and solar panels', 'Hosted Super Bowl 50 in 2016', 'Located in Silicon Valley — the world\'s tech capital'],
  },
  'estadio-bbva': {
    slug: 'estadio-bbva', name: 'Estadio BBVA', city: 'Monterrey, Nuevo León', country: 'Mexico', countryFlag: '🇲🇽',
    capacity: '53,500', opened: '2015', surface: 'Natural grass', homeTeam: 'CF Monterrey (Liga MX)',
    wcRole: 'Group Stage',
    description: 'Estadio BBVA is widely considered one of the most beautiful stadiums in the Americas. Its striking modern design, featuring a dramatic sloping roof that resembles a mountain range — a nod to Monterrey\'s famous Cerro de la Silla — has won multiple architectural awards. The stadium represents the new wave of Mexican football infrastructure.',
    history: 'Opened in 2015 as the new home of CF Monterrey, Estadio BBVA replaced the historic Estadio Tecnológico. The stadium was designed by international architecture firm Populous and has quickly become one of Liga MX\'s premier venues. Monterrey\'s status as Mexico\'s wealthiest city is reflected in the stadium\'s premium facilities and fan experience.',
    wcSignificance: 'Monterrey is Mexico\'s second-largest city and an industrial powerhouse with strong cultural ties to both Mexico and the United States. The stadium\'s modern design and excellent facilities make it one of the most comfortable World Cup venues. The passionate norteño football culture guarantees an electric atmosphere.',
    funFacts: ['Roof design mimics Monterrey\'s famous Cerro de la Silla mountain', 'Won multiple international architecture awards', 'Monterrey is Mexico\'s wealthiest city', 'One of the newest and most modern stadiums in the Americas'],
  },
  'estadio-akron': {
    slug: 'estadio-akron', name: 'Estadio Akron', city: 'Guadalajara, Jalisco', country: 'Mexico', countryFlag: '🇲🇽',
    capacity: '49,850', opened: '2010', surface: 'Natural grass', homeTeam: 'CD Guadalajara (Chivas)',
    wcRole: 'Group Stage',
    description: 'Estadio Akron, commonly known as Estadio Chivas, is the home of CD Guadalajara — Mexico\'s most popular club that famously fields only Mexican players. The stadium\'s distinctive volcanic rock exterior reflects the geological landscape of Jalisco, while its interior provides one of Liga MX\'s most atmospheric match-day experiences.',
    history: 'Opened in 2010, Estadio Akron was built specifically for Chivas at a cost of approximately $200 million. Its unique design incorporates local volcanic rock in the facade, creating a striking visual identity. Guadalajara, Mexico\'s second-largest city and the birthplace of mariachi music, provides a culturally rich backdrop for World Cup football.',
    wcSignificance: 'Guadalajara hosted matches at the 1970 and 1986 World Cups, giving it a rich tournament heritage. The city is considered the cultural heart of Mexico, and Chivas\' policy of only fielding Mexican players means the stadium is a temple of Mexican football identity. World Cup matches here will feel authentically Mexican in a way few other venues can match.',
    funFacts: ['Home to Chivas — Mexico\'s most popular club that only fields Mexican players', 'Exterior made from local volcanic rock', 'Guadalajara is the birthplace of mariachi music and tequila', 'City has hosted World Cup matches in 1970, 1986, and now 2026'],
  },
};

// Generate slugs for stadiums without detailed profiles
const BASIC_STADIUMS: Record<string, { name: string; city: string; country: string; capacity: string }> = {};

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
