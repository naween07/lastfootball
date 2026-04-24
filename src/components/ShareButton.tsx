import { useState } from 'react';
import { Share2, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Match } from '@/types/football';

interface ShareButtonProps {
  match: Match;
}

function buildShareText(match: Match): string {
  const hasScore = match.homeScore !== null;
  if (hasScore) {
    return `${match.homeTeam.name} ${match.homeScore} - ${match.awayScore} ${match.awayTeam.name} | ${match.league.name}`;
  }
  return `${match.homeTeam.name} vs ${match.awayTeam.name} | ${match.time} | ${match.league.name}`;
}

function buildShareUrl(match: Match): string {
  return `https://lastfootball.com/match/${match.id}`;
}

export default function ShareButton({ match }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const text = buildShareText(match);
  const url = buildShareUrl(match);
  const full = `${text}\n${url}`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: text, text: text, url });
        setOpen(false);
      } catch {}
    } else {
      setOpen(true);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const shareLinks = [
    {
      name: 'WhatsApp',
      icon: '💬',
      url: `https://wa.me/?text=${encodeURIComponent(full)}`,
      color: 'bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366]',
    },
    {
      name: 'Facebook',
      icon: '📘',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
      color: 'bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2]',
    },
    {
      name: 'X',
      icon: '𝕏',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(full)}`,
      color: 'bg-white/10 hover:bg-white/20 text-foreground',
    },
    {
      name: 'Telegram',
      icon: '✈️',
      url: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      color: 'bg-[#0088cc]/10 hover:bg-[#0088cc]/20 text-[#0088cc]',
    },
  ];

  return (
    <>
      <button
        onClick={handleNativeShare}
        className="p-2 rounded-full hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Share match"
      >
        <Share2 className="w-4 h-4" />
      </button>

      {/* Share modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-sm mx-auto bg-card border border-border rounded-t-2xl sm:rounded-2xl p-4 pb-6 sm:mb-0"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-foreground">Share Match</span>
              <button onClick={() => setOpen(false)} className="p-1 rounded-full hover:bg-secondary">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Match preview */}
            <div className="bg-secondary/50 rounded-lg p-3 mb-4">
              <p className="text-xs text-foreground/80 text-center">{text}</p>
            </div>

            {/* Share buttons */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {shareLinks.map(link => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn('flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors', link.color)}
                  onClick={() => setOpen(false)}
                >
                  <span className="text-xl">{link.icon}</span>
                  <span className="text-[10px] font-medium">{link.name}</span>
                </a>
              ))}
            </div>

            {/* Copy link */}
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-primary">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Copy link</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
