import { useState, useEffect, createContext, useContext } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  /** null = still loading, false = no prefs yet, true = setup complete */
  hasPreferences: boolean | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  markSetupComplete: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthState(): AuthContextValue {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hasPreferences, setHasPreferences] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial session check — await both fetches before clearing loading
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await Promise.all([
          fetchProfile(session.user.id),
          fetchPreferences(session.user.id),
        ]);
      }
      setLoading(false);
    });

    // Subsequent login/logout events (don't block loading spinner)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchPreferences(session.user.id);
      } else {
        setProfile(null);
        setHasPreferences(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setProfile({
        id: data.id,
        email: data.email ?? '',
        username: data.username ?? undefined,
        isSubscribed: data.is_subscribed ?? false,
        stripeCustomerId: data.stripe_customer_id ?? undefined,
        stripeSubscriptionId: data.stripe_subscription_id ?? undefined,
        createdAt: data.created_at ?? new Date().toISOString(),
      });
    }
  }

  async function fetchPreferences(userId: string) {
    const { data } = await supabase
      .from('user_preferences')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    setHasPreferences(!!data);
  }

  function markSetupComplete() {
    setHasPreferences(true);
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  }

  async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (data.user && !error) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        is_subscribed: false,
      }).select().single(); // ignore conflict — trigger may have already created it
    }
    return { error: error ? new Error(error.message) : null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return { user, session, profile, hasPreferences, loading, signIn, signUp, signOut, markSetupComplete };
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
