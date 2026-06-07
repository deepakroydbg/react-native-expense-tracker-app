import type { Session } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useContext, useEffect, useState } from 'react';

import { createSessionFromUrl } from '@/lib/oauth';
import { supabase } from '@/lib/supabase';

// Dismisses the auth browser popup automatically when the redirect comes back.
WebBrowser.maybeCompleteAuthSession();

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
      const redirectTo = makeRedirectUri({ scheme: 'mykhata', path: 'auth/callback' });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          // Force the Google account chooser instead of an email/password form.
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) return { error: friendlyError(error.message) };
      if (!data?.url) return { error: 'Could not start Google sign-in. Please try again.' };

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'cancel' || result.type === 'dismiss') {
        return { error: 'Google sign-in was cancelled.' };
      }
      if (result.type === 'success' && result.url) {
        // The custom tab returned the redirect — finish the session inline.
        const { error: sessErr } = await createSessionFromUrl(result.url);
        if (sessErr && sessErr !== 'no-session') return { error: friendlyError(sessErr) };
        return { error: null };
      }
      // Otherwise the OS deep-linked the app to /auth/callback, which finishes it.
      return { error: null };
    } catch (e: any) {
      console.error('[signInWithGoogle]', e);
      return { error: friendlyError(String(e?.message ?? '')) };
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
