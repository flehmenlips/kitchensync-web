import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
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

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CustomerUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string): Promise<CustomerUserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error.message);
        return null;
      }
      return data as CustomerUserProfile | null;
    } catch (err) {
      console.error('Profile fetch error:', err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const p = await fetchProfile(user.id);
      setProfile(p);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    // Use ONLY onAuthStateChange — never call getSession() directly.
    // Supabase fires INITIAL_SESSION immediately with the cached session,
    // which avoids the AbortError from concurrent getSession() calls
    // (especially during React StrictMode double-mount in dev).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
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

          // Fetch profile in the background — don't block the loading state
          fetchProfile(newSession.user.id).then((p) => {
            setProfile(p);
          });

          // Invalidate queries on sign-in or token refresh so data re-fetches
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            console.log('[CustomerAuth] Invalidating queries after', event);
            queryClient.invalidateQueries();
          }
        }

        setIsLoading(false);
        return;
      }

      // For any other event, just stop loading
      setIsLoading(false);
    });

    // Safety timeout in case INITIAL_SESSION never fires
    const safetyTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

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

      // Create user profile if signup successful
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
    // Clear all React Query cache to prevent stale data on next login
    queryClient.clear();
    if (!isSupabaseConfigured) return;
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
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
