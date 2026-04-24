import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('onboarding_completed')
              .eq('user_id', session.user.id)
              .maybeSingle();
            
            if (error) {
              console.warn('Profile query error:', error.message);
              setOnboardingCompleted(true);
            } else if (data) {
              setOnboardingCompleted(data.onboarding_completed ?? true);
            } else {
              // No profile found — create one
              await supabase.from('profiles').insert({ user_id: session.user.id, onboarding_completed: true });
              setOnboardingCompleted(true);
            }
          } catch (err) {
            console.warn('Profile check failed:', err);
            setOnboardingCompleted(true);
          }
        } else {
          setOnboardingCompleted(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('user_id', session.user.id)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) {
              console.warn('Profile query error:', error.message);
              setOnboardingCompleted(true);
            } else {
              setOnboardingCompleted(data?.onboarding_completed ?? true);
            }
            setLoading(false);
          })
          .catch(() => {
            setOnboardingCompleted(true);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
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
