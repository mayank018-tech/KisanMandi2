import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, profileData: Omit<UserProfile, 'id' | 'created_at' | 'updated_at' | 'email'>) => Promise<{ error: Error | null }>;
  signIn: (mobileNumber: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then((res: any) => {
      const session = (res.data?.session as Session) ?? null;
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const normalizeMobile = (m: string) => m.replace(/\D/g, '');

  const signUp = async (
    email: string,
    password: string,
    profileData: Omit<UserProfile, 'id' | 'created_at' | 'updated_at' | 'email'>
  ) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user returned');

      const { error: profileError } = await supabase.from('user_profiles').insert({
        id: authData.user.id,
        email: email,
        ...profileData,
        mobile_number: profileData.mobile_number ? normalizeMobile(profileData.mobile_number) : profileData.mobile_number,
      });

      if (profileError) throw profileError;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (mobileNumber: string, password: string) => {
    try {
      // If user entered an email, sign in directly with it
      if (mobileNumber.includes('@')) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: mobileNumber,
          password,
        });
        if (signInError) throw signInError;
        return { error: null };
      }

      const normalized = normalizeMobile(mobileNumber);

      let mappedEmail: string | null = null;
      const { data: rpcEmail, error: mapError } = await supabase.rpc('get_login_email_by_mobile', {
        p_mobile: normalized,
      });

      if (!mapError) {
        mappedEmail = rpcEmail as string | null;
      } else {
        // Fallback for environments where RPC migration is not applied yet.
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('email')
          .or(`mobile_number.eq.${normalized},mobile_number.like.%${normalized}`)
          .limit(1)
          .maybeSingle();

        if (profileError) throw profileError;
        mappedEmail = profileData?.email ?? null;
      }

      if (!mappedEmail) throw new Error('Mobile number not found');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: mappedEmail,
        password,
      });

      if (signInError) throw signInError;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
