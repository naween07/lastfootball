// Country flag component using flagcdn.com CDN
// Works on all platforms including Windows desktop where emoji flags don't render

// Map FIFA/IOC 3-letter codes to ISO 3166-1 alpha-2 codes
const CODE_MAP: Record<string, string> = {
  MEX: 'mx', KOR: 'kr', CZE: 'cz', RSA: 'za',
  CAN: 'ca', AUS: 'au', BIH: 'ba', QAT: 'qa',
  BRA: 'br', MAR: 'ma', SCO: 'gb-sct', HAI: 'ht',
  USA: 'us', TUR: 'tr', PAR: 'py', CRO: 'hr',
  GER: 'de', CIV: 'ci', CUW: 'cw', ECU: 'ec',
  NED: 'nl', JPN: 'jp', SWE: 'se', TUN: 'tn',
  ARG: 'ar', COL: 'co', AUT: 'at', UZB: 'uz',
  ESP: 'es', KSA: 'sa', CPV: 'cv', JOR: 'jo',
  FRA: 'fr', SEN: 'sn', NOR: 'no', IRQ: 'iq',
  ENG: 'gb-eng', GHA: 'gh', PAN: 'pa', ALG: 'dz',
  POR: 'pt', COD: 'cd', NGA: 'ng', SUI: 'ch',
  ITA: 'it', IRN: 'ir', CMR: 'cm', PER: 'pe',
};

interface FlagProps {
  code: string;  // 3-letter FIFA code like ARG, BRA, ENG
  size?: number; // pixel width, defaults to 24
  className?: string;
}

export default function Flag({ code, size = 24, className }: FlagProps) {
  const iso = CODE_MAP[code.toUpperCase()];
  if (!iso) {
    // Fallback for unknown codes
    return <span className={className} style={{ fontSize: size * 0.8 }}>{code}</span>;
  }

  const height = Math.round(size * 0.75); // 4:3 aspect ratio

  return (
    <img
      src={`https://flagcdn.com/w${size >= 40 ? 80 : 40}/${iso}.png`}
      srcSet={`https://flagcdn.com/w${size >= 40 ? 160 : 80}/${iso}.png 2x`}
      width={size}
      height={height}
      alt={`${code} flag`}
      className={`inline-block object-contain rounded-sm ${className || ''}`}
      loading="lazy"
    />
  );
}

// Helper to get flag URL directly
export function getFlagUrl(code: string, width: number = 40): string {
  const iso = CODE_MAP[code.toUpperCase()];
  if (!iso) return '';
  return `https://flagcdn.com/w${width}/${iso}.png`;
}
