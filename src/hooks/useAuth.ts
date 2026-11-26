/**
 * The signed-in user, from the app backend.
 *
 * Phase 1c. This replaced the Supabase version: the website and the app now
 * authenticate against the same `User` table, so an account works on both.
 *
 * WHY THERE IS A STORE HERE. The Supabase client broadcast session changes
 * through `onAuthStateChange`, so every component calling this hook shared one
 * subscription and one source of truth. A hook that simply fetched `me()` in
 * its own effect would issue one request per consumer -- twelve on a page that
 * renders the header, the tab bar and a page component. So the user is held at
 * module scope, fetched once, and every consumer subscribes to it.
 *
 * `refreshAuth()` is how the auth page tells the rest of the app that someone
 * signed in: authApi has already stored the token, and this re-reads who it
 * belongs to and notifies every consumer, so the header updates without a
 * reload.
 */

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { me, signOut as apiSignOut, currentToken, type BackendUser } from '@/services/authApi';

let cachedUser: BackendUser | null = null;
let settled = false;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Snapshot must be referentially stable between emits, or useSyncExternalStore
 *  re-renders forever. Returning the cached object itself satisfies that. */
function getUserSnapshot(): BackendUser | null {
  return cachedUser;
}

function getSettledSnapshot(): boolean {
  return settled;
}

async function load(): Promise<void> {
  // No token means signed out, and asking the server would be a wasted round
  // trip on every first paint for the many readers who never sign in.
  if (!currentToken()) {
    cachedUser = null;
    settled = true;
    emit();
    return;
  }
  try {
    cachedUser = await me();
  } catch {
    // me() already clears a token the server rejects; treat anything else as
    // signed out rather than leaving a half-state on screen.
    cachedUser = null;
  }
  settled = true;
  emit();
}

function ensureLoaded(): void {
  if (settled || inflight) return;
  inflight = load().finally(() => { inflight = null; });
}

/** Re-read the signed-in user and notify every consumer. Call after a sign-in,
 *  an activation, or anything else that changes the stored token. */
export function refreshAuth(): Promise<void> {
  settled = false;
  inflight = load().finally(() => { inflight = null; });
  return inflight;
}

export function useAuth() {
  const user = useSyncExternalStore(subscribe, getUserSnapshot, getUserSnapshot);
  const isSettled = useSyncExternalStore(subscribe, getSettledSnapshot, getSettledSnapshot);

  useEffect(() => { ensureLoaded(); }, []);

  const signOut = useCallback(async () => {
    apiSignOut();
    cachedUser = null;
    settled = true;
    emit();
  }, []);

  /**
   * Onboarding is skipped for now, deliberately.
   *
   * Its only job was collecting favourite teams into the Supabase
   * `user_favorites` table, which this cutover retires. Until favourites move
   * to the backend's `Follow` model, forcing anyone through that flow would
   * write to a table nothing reads. Reporting it complete keeps the route
   * harmless -- Onboarding redirects home on `true` -- without pretending the
   * step happened.
   */
  const onboardingCompleted = true;
  const completeOnboarding = useCallback(async () => {}, []);

  return {
    user,
    loading: !isSettled,
    onboardingCompleted,
    completeOnboarding,
    signOut,
  };
}
