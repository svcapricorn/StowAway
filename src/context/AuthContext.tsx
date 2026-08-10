import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { hasSupabaseConfig, supabase } from '@/config/supabase';

type AuthContextValue = {
  getAccessToken: () => Promise<string | null>;
  isAuthenticated: boolean;
  isConfigured: boolean;
  loading: boolean;
  session: Session | null;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  user: User | null;
};

const isMockAuth = import.meta.env.VITE_MOCK_AUTH === 'true';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!isMockAuth);

  useEffect(() => {
    if (isMockAuth || !supabase) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const getAccessToken = async () => {
    if (isMockAuth || !supabase) {
      return null;
    }

    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  };

  const signInWithPassword = async (email: string, password: string) => {
    if (!supabase) {
      return { error: new Error('Supabase auth is not configured.') };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    if (!supabase) {
      return { error: new Error('Supabase auth is not configured.') };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    return { error };
  };

  const signInWithMagicLink = async (email: string) => {
    if (!supabase) {
      return { error: new Error('Supabase auth is not configured.') };
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    return { error };
  };

  const signOut = async () => {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        getAccessToken,
        isAuthenticated: isMockAuth || Boolean(session?.access_token),
        isConfigured: isMockAuth || hasSupabaseConfig,
        loading,
        session,
        signInWithMagicLink,
        signInWithPassword,
        signOut,
        signUp,
        user: session?.user ?? null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
