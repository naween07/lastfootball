import { Link, useLocation } from 'react-router-dom';
import { Smartphone } from 'lucide-react';
import { PLAY_URL_FOOTER } from '@/lib/appLinks';

/** Pages that are their own self-contained screen and want no footer. */
const HIDDEN_PATHS = ['/admin', '/auth', '/onboarding'];

/**
 * Site footer. Besides the app link, this is the only route users have to the
 * privacy policy and terms — those pages existed but nothing linked to them.
 */
export default function SiteFooter() {
  const { pathname } = useLocation();
  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;

  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-border bg-card/40">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:flex-row sm:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <img
              src="/icon-192.png"
              alt=""
              width={28}
              height={28}
              loading="lazy"
              className="h-7 w-7 rounded-md"
            />
            <span className="text-sm font-semibold">Last Football</span>
          </div>
          <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
            Live scores, fixtures, results, standings and football news — on
            lastfootball.com and in the Last Football app for Android.
          </p>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm sm:gap-x-14">
          <Link to="/live" className="text-muted-foreground transition-colors hover:text-foreground">
            Live scores
          </Link>
          <Link to="/news" className="text-muted-foreground transition-colors hover:text-foreground">
            News
          </Link>
          <Link to="/fixtures" className="text-muted-foreground transition-colors hover:text-foreground">
            Fixtures
          </Link>
          <Link to="/stats" className="text-muted-foreground transition-colors hover:text-foreground">
            Stats
          </Link>
          <Link to="/privacy" className="text-muted-foreground transition-colors hover:text-foreground">
            Privacy
          </Link>
          <Link to="/terms" className="text-muted-foreground transition-colors hover:text-foreground">
            Terms
          </Link>
        </nav>

        <div className="sm:text-right">
          <a
            href={PLAY_URL_FOOTER}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
          >
            <Smartphone className="h-4 w-4 text-primary" aria-hidden="true" />
            Get the Android app
          </a>
        </div>
      </div>

      <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
        © {year} Last Football · lastfootball.com
      </div>
    </footer>
  );
}
