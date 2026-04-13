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
          // Check onboarding status
          const { data } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('user_id', session.user.id)
            .single();
          setOnboardingCompleted(data?.onboarding_completed ?? false);
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
          .single()
          .then(({ data }) => {
            setOnboardingCompleted(data?.onboarding_completed ?? false);
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
    await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('user_id', user.id);
    setOnboardingCompleted(true);
  }, [user]);

  return { user, session, loading, onboardingCompleted, signOut, completeOnboarding };
}
