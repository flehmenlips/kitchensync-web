import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface BusinessUser {
  id: string;
  user_id: string;
  email: string;
  role: 'owner' | 'manager' | 'staff';
  business_id: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  businessUser: BusinessUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOwner: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [businessUser, setBusinessUser] = useState<BusinessUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cache business user status to avoid repeated lookups
  const businessCacheRef = useRef<{ userId: string; business: BusinessUser | null } | null>(null);

  const checkBusinessStatus = async (userId: string, email: string): Promise<BusinessUser | null> => {
    // Return cached result if we already checked this user
    if (businessCacheRef.current?.userId === userId) {
      return businessCacheRef.current.business;
    }

    try {
      // For now, return a mock business user for demo purposes
      // In production, this would query the business_accounts table
      const result: BusinessUser = {
        id: userId,
        user_id: userId,
        email: email,
        role: 'owner',
        business_id: 'demo-business',
      };

      // Cache the result
      businessCacheRef.current = { userId, business: result };
      return result;
    } catch (err) {
      console.error('Error checking business status:', err);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      if (!isSupabaseConfigured) {
        // Demo mode - create a mock user
        const mockUser: BusinessUser = {
          id: 'demo-user',
          user_id: 'demo-user',
          email: 'demo@business.com',
          role: 'owner',
          business_id: 'demo-business',
        };
        if (isMounted) {
          setBusinessUser(mockUser);
          setIsLoading(false);
        }
        return;
      }

      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          const business = await checkBusinessStatus(currentSession.user.id, currentSession.user.email || '');
          if (isMounted) setBusinessUser(business);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      }

      if (isMounted) setIsLoading(false);
    };

    initAuth();

    if (!isSupabaseConfigured) {
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setBusinessUser(null);
        businessCacheRef.current = null;
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          const business = await checkBusinessStatus(newSession.user.id, newSession.user.email || '');
          if (isMounted) setBusinessUser(business);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.') };
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ? new Error(error.message) : null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Sign in failed') };
    }
  };

  const signOut = async () => {
    setUser(null);
    setSession(null);
    setBusinessUser(null);
    businessCacheRef.current = null;

    if (!isSupabaseConfigured) return;

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    businessUser,
    isLoading,
    isAuthenticated: businessUser !== null,
    isOwner: businessUser?.role === 'owner',
    isConfigured: isSupabaseConfigured,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
