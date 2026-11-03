import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { PLAY_URL_BANNER } from '@/lib/appLinks';

const DISMISS_KEY = 'lf-install-banner-dismissed-until';
const DISMISS_DAYS = 30;

/** Pages where an install pitch would be in the way. */
const HIDDEN_PATHS = ['/admin', '/auth', '/onboarding'];

/**
 * A dismissible strip offering the Android app, shown only to Android phones
 * browsing the mobile site. It sits directly above BottomTabBar.
 *
 * While it is visible it sets data-install-banner on <html>; index.css uses
 * that to give .app-shell enough bottom padding that the banner never covers
 * the end of an article.
 */
export default function AppInstallBanner() {
  const { pathname } = useLocation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = navigator.userAgent || '';
    // The app is Android-only, so never pitch it to anyone else.
    if (!/Android/i.test(ua)) return;
    // Tablets and TVs aren't the audience for a phone-sized banner.
    if (/\bTV\b|Tablet/i.test(ua)) return;
    // Already inside a webview (plausibly the app itself) — nothing to install.
    if (/\bwv\b/i.test(ua)) return;

    let dismissedUntil = 0;
    try {
      dismissedUntil = Number(window.localStorage.getItem(DISMISS_KEY)) || 0;
    } catch {
      // Private mode or blocked storage: treat as never dismissed.
    }
    if (Date.now() < dismissedUntil) return;

    setShow(true);
  }, []);

  const hiddenHere = HIDDEN_PATHS.some((p) => pathname.startsWith(p));
  const visible = show && !hiddenHere;

  useEffect(() => {
    const root = document.documentElement;
    if (visible) root.setAttribute('data-install-banner', 'true');
    else root.removeAttribute('data-install-banner');
    return () => root.removeAttribute('data-install-banner');
  }, [visible]);

  if (!visible) return null;

  const dismiss = () => {
    setShow(false);
    try {
      window.localStorage.setItem(
        DISMISS_KEY,
        String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000),
      );
    } catch {
      // Nothing to do — it will simply reappear next visit.
    }
  };

  return (
    <div
      role="region"
      aria-label="Get the Last Football Android app"
      className="md:hidden fixed left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur"
      style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <img
          src="/icon-192.png"
          alt=""
          width={36}
          height={36}
          loading="lazy"
          className="h-9 w-9 shrink-0 rounded-lg"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            Last Football for Android
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Live scores and news, free on Google Play
          </p>
        </div>

        <a
          href={PLAY_URL_BANNER}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-opacity active:opacity-80"
        >
          Get
        </a>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss app banner"
          className="-mr-1 shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors active:bg-secondary"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
