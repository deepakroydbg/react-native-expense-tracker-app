import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
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
import { TextField } from '@/components/ui/text-field';
import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';

export default function SignupScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { signUp, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const onGoogle = async () => {
    setError(null);
    setGoogleSubmitting(true);
    const { error: err } = await signInWithGoogle();
    setGoogleSubmitting(false);
    if (err) setError(err);
  };

  const onSubmit = async () => {
    setError(null);
    setConfirmError(null);
    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setConfirmError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    const { error: err, needsConfirmation } = await signUp(email, password);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    if (needsConfirmation) {
      Alert.alert(
        'Confirm your email',
        'We sent a confirmation link to your email. Please confirm, then sign in.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
    } else {
      // Email confirmation disabled — a session was created; greet and let the
      // root navigator redirect to Books.
      toast.show('Account created! Welcome to MyKhata Book', 'success');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { flexGrow: 1, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <Image source={require('@/assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.title, { color: c.text }]}>Create account</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            Start tracking in seconds.
          </Text>
        </View>

        <View style={styles.form}>
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
            placeholder="At least 6 characters"
            secureTextEntry={!showPassword}
            rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            onRightIconPress={() => setShowPassword((s) => !s)}
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
          />
          <TextField
            label="Confirm password"
            icon="lock-closed"
            placeholder="Re-enter password"
            secureTextEntry={!showConfirm}
            rightIcon={showConfirm ? 'eye-off-outline' : 'eye-outline'}
            onRightIconPress={() => setShowConfirm((s) => !s)}
            autoCapitalize="none"
            value={confirm}
            onChangeText={(t) => {
              setConfirm(t);
              if (confirmError) setConfirmError(null);
            }}
            error={confirmError}
          />

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: c.dangerSoft }]}>
              <Ionicons name="alert-circle" size={18} color={c.danger} />
              <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
            </View>
          ) : null}

          <Button title="Sign up" onPress={onSubmit} loading={submitting} />

          <View style={styles.divider}>
            <View style={[styles.line, { backgroundColor: c.border }]} />
            <Text style={[styles.orText, { color: c.textSecondary }]}>or</Text>
            <View style={[styles.line, { backgroundColor: c.border }]} />
          </View>

          <GoogleButton onPress={onGoogle} loading={googleSubmitting} disabled={submitting} />

          <View style={styles.switchRow}>
            <Text style={{ color: c.textSecondary }}>Already have an account? </Text>
            <Link href="/(auth)/login" style={[styles.link, { color: c.primary }]}>
              Sign in
            </Link>
          </View>
        </View>
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
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
  },
  form: {
    gap: 16,
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  link: {
    fontWeight: '700',
  },
});
