import { StyleSheet, View } from 'react-native';

import { LockScreen } from '@/components/lock-screen';
import { useAppLock } from '@/lib/app-lock';
import { useAuth } from '@/lib/auth-context';

export function AppLockGate() {
  const { ready, enabled, locked } = useAppLock();
  const { session } = useAuth();

  if (!ready || !enabled || !locked || !session) return null;

  return (
    <View style={styles.overlay}>
      <LockScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 900, elevation: 900 },
});
