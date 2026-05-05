import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    // 1. Get initial session FIRST — this is the source of truth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        checkProfile(session.user.id).then(completed => {
          if (mounted) {
            setOnboardingCompleted(completed);
            setLoading(false);
          }
        });
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for changes AFTER initial session is set
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        // Ignore INITIAL_SESSION since we handle it above
        if (event === 'INITIAL_SESSION') return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const completed = await checkProfile(session.user.id);
          if (mounted) setOnboardingCompleted(completed);
        } else {
          setOnboardingCompleted(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setOnboardingCompleted(null);
  }, []);

  const completeOnboarding = useCallback(async () => {
    if (!user) return;
    try {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('user_id', user.id);
    } catch {}
    setOnboardingCompleted(true);
  }, [user]);

  return { user, session, loading, onboardingCompleted, signOut, completeOnboarding };
}

async function checkProfile(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return true;
    if (data) return data.onboarding_completed ?? true;

    // No profile — create one
    await supabase.from('profiles').insert({ user_id: userId, onboarding_completed: true }).catch(() => {});
    return true;
  } catch {
    return true;
  }
}
