import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { AdminRole } from '@/types/database';

interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  role: AdminRole;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  adminUser: AdminUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to get cached admin status from localStorage
function getInitialAdminCache(): { userId: string; admin: AdminUser | null } | null {
  try {
    const cached = localStorage.getItem('adminCache');
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Invalid cache, ignore
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cache admin status to persist across refreshes - initialize synchronously from localStorage
  const adminCacheRef = useRef<{ userId: string; admin: AdminUser | null } | null>(getInitialAdminCache());

  const checkAdminStatus = async (userId: string, email: string, retryCount = 0): Promise<AdminUser | null> => {
    // Return cached result if we already checked this user (including non-admin null result)
    if (adminCacheRef.current?.userId === userId) {
      console.log('Using cached admin status for:', email, adminCacheRef.current.admin ? 'is admin' : 'not admin');
      return adminCacheRef.current.admin;
    }

    try {
      console.log('Checking admin status for userId:', userId, 'email:', email, 'attempt:', retryCount + 1);

      // Query without artificial timeout - let Supabase handle it
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('user_id', userId)
        .maybeSingle();

      console.log('user_profiles check:', profile, 'error:', profileError);

      if (profileError) {
        console.error('Error querying user_profiles:', profileError.message);
        // Retry up to 2 times on error
        if (retryCount < 2) {
          console.log('Retrying admin check...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          return checkAdminStatus(userId, email, retryCount + 1);
        }
        return null;
      }

      if (profile?.is_admin === true) {
        console.log('User is admin via user_profiles.is_admin');
        const result: AdminUser = {
          id: userId,
          user_id: userId,
          email: email,
          role: 'superadmin' as AdminRole,
        };

        // Cache the result in memory and localStorage
        adminCacheRef.current = { userId, admin: result };
        localStorage.setItem('adminCache', JSON.stringify({ userId, admin: result }));

        return result;
      }

      console.log('User is not an admin:', email);
      // Cache the non-admin result too to prevent repeated checks
      adminCacheRef.current = { userId, admin: null };
      localStorage.setItem('adminCache', JSON.stringify({ userId, admin: null }));
      return null;
    } catch (err) {
      console.error('Error checking admin status:', err);
      // Retry on exception
      if (retryCount < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return checkAdminStatus(userId, email, retryCount + 1);
      }
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Safety timeout - always stop loading after 10 seconds no matter what
    const safetyTimeout = setTimeout(() => {
      if (isMounted && isLoading) {
        console.log('Safety timeout reached - forcing loading to false');
        setIsLoading(false);
      }
    }, 10000);

    const initAuth = async () => {
      if (!isSupabaseConfigured) {
        console.log('Supabase not configured, showing login');
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        console.log('Getting session...');
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (!isMounted) return;

        console.log('Session retrieved:', currentSession?.user?.email);

        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);

          // If we have a cached admin status for this user, use it immediately
          // to prevent flash of login screen (works for both admin and non-admin cached results)
          if (adminCacheRef.current?.userId === currentSession.user.id) {
            setAdminUser(adminCacheRef.current.admin);
            setIsLoading(false);
            // Still verify in background but don't block loading
            checkAdminStatus(currentSession.user.id, currentSession.user.email || '').then(admin => {
              if (isMounted) setAdminUser(admin);
            });
          } else {
            console.log('Checking admin status...');
            const admin = await checkAdminStatus(currentSession.user.id, currentSession.user.email || '');
            console.log('Admin check result:', admin);
            if (isMounted) {
              setAdminUser(admin);
              setIsLoading(false);
            }
          }
        } else {
          if (isMounted) setIsLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (isMounted) setIsLoading(false);
      }
    };

    initAuth();

    if (!isSupabaseConfigured) {
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      console.log('Auth state change:', event);

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setAdminUser(null);
        adminCacheRef.current = null;
        localStorage.removeItem('adminCache');
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          const admin = await checkAdminStatus(newSession.user.id, newSession.user.email || '');
          if (isMounted) setAdminUser(admin);
        }
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
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
    // Clear local state and cache immediately
    setUser(null);
    setSession(null);
    setAdminUser(null);
    adminCacheRef.current = null;
    localStorage.removeItem('adminCache');

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
    adminUser,
    isLoading,
    isAdmin: adminUser !== null,
    isSuperAdmin: adminUser?.role === 'superadmin',
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
