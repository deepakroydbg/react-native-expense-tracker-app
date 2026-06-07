import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoogleButton } from '@/components/google-button';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { useThemeMode } from '@/lib/theme-context';

export default function LoginScreen() {
  const c = useTheme();
  const { scheme } = useThemeMode();
  const insets = useSafeAreaInsets();
  const { signInWithGoogle } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onGoogle = async () => {
    setError(null);
    setLoading(true);
    const { error: err } = await signInWithGoogle();
    setLoading(false);
    if (err) setError(err);
    // On success the root navigator redirects to the app automatically.
  };

  const headingColor = scheme === 'dark' ? '#ffffff' : '#1e3a5f';

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: c.background, paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}>
      <Text style={[styles.welcome, { color: headingColor }]}>Welcome to MyKhata Book</Text>

      <Image source={require('@/assets/images/icon.png')} style={styles.logo} resizeMode="contain" />

      <Text style={styles.tagline}>Your money, beautifully tracked.</Text>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: c.dangerSoft }]}>
          <Ionicons name="alert-circle" size={18} color={c.danger} />
          <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.buttonWrap}>
        <GoogleButton onPress={onGoogle} loading={loading} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  welcome: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 130,
    height: 130,
    borderRadius: 18,
    alignSelf: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  tagline: {
    fontSize: 15,
    fontStyle: 'italic',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 40,
  },
  buttonWrap: { width: '100%' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
  },
  errorText: { flex: 1, fontSize: 14 },
});
