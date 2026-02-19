import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { CustomerUserProfile } from '@/types/database';
import { queryClient } from '@/lib/queryClient';

interface CustomerAuthContextType {
  user: User | null;
  session: Session | null;
  profile: CustomerUserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

// Fetch profile via raw REST to bypass the Supabase client's internal
// _useSession/AbortController that can be transiently broken during
// auth state transitions.
async function fetchProfileRaw(userId: string, accessToken: string): Promise<CustomerUserProfile | null> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(
      `${url}/rest/v1/user_profiles?user_id=eq.${userId}&select=*&limit=1`,
      {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CustomerUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  const refreshProfile = async () => {
    if (user && session?.access_token) {
      const p = await fetchProfileRaw(user.id, session.access_token);
      if (mountedRef.current) setProfile(p);
    }
  };

  // Auth listener: use ONLY onAuthStateChange — never call getSession() directly.
  // Multiple concurrent getSession() calls (or creating multiple clients)
  // corrupt the GoTrueClient's internal AbortController.
  useEffect(() => {
    mountedRef.current = true;

    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mountedRef.current) return;
      console.log('[CustomerAuth] Auth event:', event, newSession?.user?.email);

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        queryClient.clear();
        return;
      }

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
        }
        setIsLoading(false);
      }
    });

    const safetyTimeout = setTimeout(() => {
      if (mountedRef.current) setIsLoading(false);
    }, 5000);

    return () => {
      mountedRef.current = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // Separate effect: fetch profile and invalidate queries when user changes.
  // Runs outside the onAuthStateChange callback scope.
  useEffect(() => {
    if (!user || !session?.access_token) {
      setProfile(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      // Brief delay to let the auth layer finish internal housekeeping
      await new Promise(r => setTimeout(r, 250));
      if (cancelled) return;

      const p = await fetchProfileRaw(user.id, session.access_token);
      if (cancelled) return;
      setProfile(p);
      queryClient.invalidateQueries();
    };

    load();
    return () => { cancelled = true; };
  }, [user?.id, session?.access_token]);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Service not configured') };
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ? new Error(error.message) : null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Sign in failed') };
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Service not configured') };
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
          data: { display_name: displayName },
        },
      });
      if (error) return { error: new Error(error.message) };

      if (data.user) {
        await supabase.from('user_profiles').upsert({
          user_id: data.user.id,
          display_name: displayName,
        }, { onConflict: 'user_id' });
      }

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Sign up failed') };
    }
  };

  const signOut = async () => {
    setUser(null);
    setSession(null);
    setProfile(null);
    queryClient.clear();
    if (!isSupabaseConfigured) return;
    try {
      await supabase.auth.signOut();
    } catch {
      // Suppress — sign-out errors (including AbortError) are harmless
    }
  };

  const value: CustomerAuthContextType = {
    user,
    session,
    profile,
    isLoading,
    isAuthenticated: user !== null,
    isConfigured: isSupabaseConfigured,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (context === undefined) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
}
