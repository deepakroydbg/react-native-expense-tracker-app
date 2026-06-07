import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { GoogleButton } from '@/components/google-button';
import { ResetPasswordSheet } from '@/components/reset-password-sheet';
import { TextField } from '@/components/ui/text-field';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';

export default function LoginScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setSubmitting(true);
    const { error: err } = await signIn(email, password);
    setSubmitting(false);
    if (err) setError(err);
    // On success the root navigator redirects automatically.
  };

  const onGoogle = async () => {
    setError(null);
    setGoogleSubmitting(true);
    const { error: err } = await signInWithGoogle();
    setGoogleSubmitting(false);
    if (err) setError(err);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
      behavior={Platform.OS === 'ios' ? 'height' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: c.text }]}>MyKhata Book</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            Your money, beautifully tracked.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={[styles.heading, { color: c.text }]}>Welcome back</Text>

          <TextField
            label="Email"
            icon="mail"
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextField
            label="Password"
            icon="lock-closed"
            placeholder="Your password"
            secureTextEntry={!showPassword}
            rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            onRightIconPress={() => setShowPassword((s) => !s)}
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
          />

          <Text
            onPress={() => setResetOpen(true)}
            style={[styles.forgot, { color: c.primary }]}>
            Forgot Password?
          </Text>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: c.dangerSoft }]}>
              <Ionicons name="alert-circle" size={18} color={c.danger} />
              <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
            </View>
          ) : null}

          <Button title="Sign in" onPress={onSubmit} loading={submitting} />

          <View style={styles.divider}>
            <View style={[styles.line, { backgroundColor: c.border }]} />
            <Text style={[styles.orText, { color: c.textSecondary }]}>or</Text>
            <View style={[styles.line, { backgroundColor: c.border }]} />
          </View>

          <GoogleButton onPress={onGoogle} loading={googleSubmitting} disabled={submitting} />

          <View style={styles.switchRow}>
            <Text style={{ color: c.textSecondary }}>New here? </Text>
            <Link href="/(auth)/signup" style={[styles.link, { color: c.primary }]}>
              Create an account
            </Link>
          </View>
        </View>
        <ResetPasswordSheet
          visible={resetOpen}
          initialEmail={email}
          onClose={() => setResetOpen(false)}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 36,
  },
  brand: {
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 14,
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
  },
  form: {
    gap: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  link: {
    fontWeight: '700',
  },
  forgot: {
    alignSelf: 'flex-end',
    fontSize: 13,
    fontWeight: '600',
    marginTop: -4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  orText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
