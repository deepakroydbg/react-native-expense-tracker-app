import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/hooks/use-theme';
import { createSessionFromUrl } from '@/lib/oauth';
import { supabase } from '@/lib/supabase';

/**
 * Handles the OAuth / email-confirmation deep link (mykhata://auth/callback?...).
 * Always navigates away — via success, error, an existing session, or a 12s timeout.
 */
export default function AuthCallback() {
  const c = useTheme();
  const router = useRouter();
  const toast = useToast();
  const url = Linking.useURL();
  const done = useRef(false);

  const finish = (target: '/(tabs)' | '/(auth)/login', message?: string) => {
    if (done.current) return;
    done.current = true;
    if (message) toast.show(message, 'error');
    router.replace(target);
  };

  // Safety net 1: if any path establishes the session, leave immediately.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish('/(tabs)');
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish('/(tabs)');
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Safety net 2: never hang on this screen.
  useEffect(() => {
    const timer = setTimeout(() => {
      finish('/(auth)/login', 'Google sign-in timed out. Please try again.');
    }, 12000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Primary: complete the session from the deep-link URL.
  useEffect(() => {
    const run = async () => {
      if (done.current) return;
      const current = url ?? (await Linking.getInitialURL());
      if (!current) return; // wait for the URL to arrive
      try {
        const { error } = await createSessionFromUrl(current);
        if (error && error !== 'no-session') throw new Error(error);
        // Give onAuthStateChange a beat; if it already navigated, finish() is a no-op.
        finish('/(tabs)');
      } catch (e) {
        console.error('[auth/callback] failed:', e);
        finish('/(auth)/login', 'Google login failed, please try again.');
      }
    };
    run();
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <ActivityIndicator size="large" color="#2563eb" />
      <Text style={[styles.text, { color: c.textSecondary }]}>Signing you in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  text: { fontSize: 15, fontWeight: '600' },
});
