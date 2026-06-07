import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { TextField } from '@/components/ui/text-field';
import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';

export function ResetPasswordSheet({
  visible,
  initialEmail,
  onClose,
}: {
  visible: boolean;
  initialEmail: string;
  onClose: () => void;
}) {
  const c = useTheme();
  const toast = useToast();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible) {
      setEmail(initialEmail);
      setError(null);
      setSending(false);
    }
  }, [visible, initialEmail]);

  const onSubmit = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setSending(true);
    const { error: err } = await resetPassword(email);
    setSending(false);
    if (err) {
      setError(err);
      return;
    }
    toast.show('Password reset email sent! Check your inbox.', 'success');
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Reset Password" scroll={false}>
      <Text style={[styles.subtitle, { color: c.textSecondary }]}>Enter your email address</Text>
      <TextField
        icon="mail"
        placeholder="you@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          if (error) setError(null);
        }}
        error={error}
        autoFocus
      />
      <View style={styles.row}>
        <Button title="Cancel" variant="secondary" onPress={onClose} style={styles.flex} />
        <Button title="Send Reset Link" onPress={onSubmit} loading={sending} style={styles.flex} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontSize: 14, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12, marginTop: 16 },
  flex: { flex: 1 },
});
