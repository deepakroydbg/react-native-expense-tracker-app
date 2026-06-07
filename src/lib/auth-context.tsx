import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

type AuthResult = { error: string | null; needsConfirmation?: boolean };

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Turn raw Supabase/network errors into friendly, user-facing messages. */
function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('network') || m.includes('fetch') || m.includes('failed to fetch')) {
    return 'No internet connection. Please check your network and try again.';
  }
  if (m.includes('invalid login credentials')) {
    return 'Incorrect email or password. Please try again.';
  }
  if (m.includes('email not confirmed')) {
    return 'Please check your email and click the confirmation link, or contact support.';
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (m.includes('password should be at least')) {
    return 'Password is too short. Use at least 6 characters.';
  }
  if (m.includes('unable to validate email') || m.includes('invalid email')) {
    return 'That email address looks invalid.';
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  return message || 'Something went wrong. Please try again.';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signUp: AuthContextValue['signUp'] = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      // If email confirmation IS enabled, the link opens the app instead of localhost.
      // For development, confirmation is turned OFF in the Supabase dashboard
      // (Authentication → Providers → Email → "Confirm email") — re-enable before production.
      options: { emailRedirectTo: 'mykhata://auth/callback' },
    });
    if (error) return { error: friendlyError(error.message) };
    // If email confirmation is required, there's no active session yet.
    const needsConfirmation = !data.session;
    return { error: null, needsConfirmation };
  };

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) return { error: friendlyError(error.message) };
    return { error: null };
  };

  const signInWithGoogle: AuthContextValue['signInWithGoogle'] = async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response: any = await GoogleSignin.signIn();

      // v13+ returns { type: 'cancelled' } on cancel.
      if (response?.type === 'cancelled') return { error: null };

      const idToken = response?.data?.idToken ?? response?.idToken;
      if (!idToken) return { error: 'Could not get Google credentials. Please try again.' };

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (error) return { error: friendlyError(error.message) };
      // onAuthStateChange picks up the session and the root navigator redirects.
      return { error: null };
    } catch (e: any) {
      const code = e?.code;
      if (code === statusCodes.SIGN_IN_CANCELLED || code === statusCodes.IN_PROGRESS) {
        return { error: null }; // user cancelled / already in progress — no-op
      }
      if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { error: 'Google Play Services not available or outdated.' };
      }
      console.error('Google sign in error:', e);
      return { error: 'Could not sign in with Google. Please try again.' };
    }
  };

  const resetPassword: AuthContextValue['resetPassword'] = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'mykhata://auth/callback',
    });
    if (error) return { error: friendlyError(error.message) };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ session, loading, signUp, signIn, signInWithGoogle, resetPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
