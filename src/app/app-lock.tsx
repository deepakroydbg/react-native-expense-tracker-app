import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PinDots, PinKeypad } from '@/components/pin-pad';
import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/hooks/use-theme';
import { authenticateBiometric, PIN_LENGTH, useAppLock } from '@/lib/app-lock';

type Stage = 'idle' | 'verify-disable' | 'verify-change' | 'set' | 'confirm';

const STAGE_TITLE: Record<Exclude<Stage, 'idle'>, string> = {
  'verify-disable': 'Enter your PIN',
  'verify-change': 'Enter current PIN',
  set: 'Enter new PIN',
  confirm: 'Confirm PIN',
};

const STAGE_HINT: Record<Exclude<Stage, 'idle'>, string> = {
  'verify-disable': 'Confirm your PIN to turn off App Lock.',
  'verify-change': 'Confirm your current PIN before choosing a new one.',
  set: `Choose a ${PIN_LENGTH}-digit PIN to lock the app.`,
  confirm: 'Enter the same PIN again to confirm.',
};

export default function AppLockScreen() {
  const c = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { enabled, biometricsAvailable, enableLock, disableLock, verifyPin } = useAppLock();

  const [stage, setStage] = useState<Stage>('idle');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isVerifyStage = stage === 'verify-disable' || stage === 'verify-change';

  const cancel = () => {
    setStage('idle');
    setPin('');
    setFirstPin('');
    setError(null);
  };

  const onToggle = (next: boolean) => {
    setPin('');
    setFirstPin('');
    setError(null);
    setStage(next ? 'set' : 'verify-disable');
  };

  const startChangePin = () => {
    setPin('');
    setFirstPin('');
    setError(null);
    setStage('verify-change');
  };

  const onVerified = async (from: 'verify-disable' | 'verify-change') => {
    if (from === 'verify-change') {
      setPin('');
      setStage('set');
      return;
    }
    await disableLock();
    cancel();
    toast.show('App Lock turned off', 'success');
  };

  const complete = async (candidate: string) => {
    setBusy(true);
    try {
      if (stage === 'set') {
        setFirstPin(candidate);
        setPin('');
        setStage('confirm');
        return;
      }

      if (stage === 'confirm') {
        if (candidate !== firstPin) {
          setPin('');
          setFirstPin('');
          setStage('set');
          setError('PINs did not match. Try again.');
          return;
        }
        await enableLock(candidate);
        cancel();
        toast.show(enabled ? 'PIN updated ✓' : 'App Lock enabled! ✓', 'success');
        return;
      }

      if (isVerifyStage) {
        const ok = await verifyPin(candidate);
        if (!ok) {
          setPin('');
          setError('Wrong PIN. Try again.');
          return;
        }
        await onVerified(stage);
      }
    } catch {
      setPin('');
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const verifyWithBiometrics = async () => {
    if (!isVerifyStage || busy) return;
    setBusy(true);
    try {
      const ok = await authenticateBiometric(
        stage === 'verify-change' ? 'Confirm to change your PIN' : 'Confirm to turn off App Lock'
      );
      if (!ok) {
        setError('Fingerprint not recognised. Enter your PIN instead.');
        return;
      }
      await onVerified(stage);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onDigit = (digit: string) => {
    if (busy || pin.length >= PIN_LENGTH) return;
    setError(null);
    const next = pin + digit;
    setPin(next);
    if (next.length === PIN_LENGTH) void complete(next);
  };

  const onDelete = () => {
    if (busy) return;
    setError(null);
    setPin((p) => p.slice(0, -1));
  };

  return (
    <View style={[styles.screen, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderColor: c.border }]}>
        <Pressable
          onPress={() => (stage === 'idle' ? router.back() : cancel())}
          hitSlop={10}
          style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>App Lock</Text>
        <View style={styles.headerBtn} />
      </View>

      {stage === 'idle' ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.row}>
              <Ionicons name="lock-closed-outline" size={20} color={c.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: c.text }]}>App Lock</Text>
                <Text style={[styles.rowStatus, { color: enabled ? c.primary : c.textSecondary }]}>
                  App Lock: {enabled ? 'ON' : 'OFF'}
                </Text>
              </View>
              <Switch
                value={enabled}
                onValueChange={onToggle}
                trackColor={{ true: c.primary }}
                thumbColor="#fff"
              />
            </View>

            {enabled ? (
              <>
                <View style={[styles.rowDivider, { backgroundColor: c.border }]} />
                <Pressable
                  onPress={startChangePin}
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
                  <Ionicons name="keypad-outline" size={20} color={c.textSecondary} />
                  <Text style={[styles.rowLabel, { color: c.text }]}>Change PIN</Text>
                  <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
                </Pressable>
              </>
            ) : null}
          </View>

          <Text style={[styles.help, { color: c.textSecondary }]}>
            {biometricsAvailable
              ? `When App Lock is on, MyKhata Book asks for your fingerprint or ${PIN_LENGTH}-digit PIN every time you open it.`
              : `When App Lock is on, MyKhata Book asks for your ${PIN_LENGTH}-digit PIN every time you open it.`}
          </Text>
          <Text style={[styles.help, { color: c.textSecondary }]}>
            Your PIN is stored securely on this device only. If you forget it, use “Forgot PIN?
            Sign out” on the lock screen — your books and entries stay safe and come back when you
            sign in again.
          </Text>
        </ScrollView>
      ) : (
        <View style={styles.pinArea}>
          <Text style={[styles.pinTitle, { color: c.text }]}>{STAGE_TITLE[stage]}</Text>
          <Text style={[styles.pinHint, { color: c.textSecondary }]}>{STAGE_HINT[stage]}</Text>

          <View style={styles.dotsWrap}>
            <PinDots
              filled={pin.length}
              color={c.primary}
              emptyColor={c.border}
              errorColor={c.danger}
              hasError={!!error}
            />
          </View>

          <Text style={[styles.error, { color: error ? c.danger : 'transparent' }]}>
            {error || ' '}
          </Text>

          <PinKeypad
            onDigit={onDigit}
            onDelete={onDelete}
            disabled={busy}
            textColor={c.text}
            keyColor={c.backgroundElement}
            mutedColor={c.textSecondary}
          />

          {isVerifyStage && biometricsAvailable ? (
            <Pressable
              onPress={() => void verifyWithBiometrics()}
              disabled={busy}
              hitSlop={10}
              style={({ pressed }) => [styles.bioRow, pressed && { opacity: 0.6 }]}>
              <Ionicons name="finger-print" size={18} color={c.primary} />
              <Text style={[styles.bioText, { color: c.primary }]}>Use fingerprint instead</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={cancel}
            hitSlop={10}
            style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.6 }]}>
            <Text style={[styles.cancelText, { color: c.textSecondary }]}>Cancel</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { padding: 4, minWidth: 32, alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  content: { padding: 20, gap: 14 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '700' },
  rowStatus: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  rowDivider: { height: StyleSheet.hairlineWidth, marginVertical: 6 },
  help: { fontSize: 13, lineHeight: 19 },
  pinArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  pinTitle: { fontSize: 20, fontWeight: '800' },
  pinHint: { fontSize: 13, marginTop: 6, textAlign: 'center' },
  dotsWrap: { marginTop: 28 },
  error: { fontSize: 13, fontWeight: '600', marginTop: 14, marginBottom: 18, textAlign: 'center' },
  bioRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 22, padding: 6 },
  bioText: { fontSize: 15, fontWeight: '700' },
  cancel: { marginTop: 12, padding: 8 },
  cancelText: { fontSize: 15, fontWeight: '700' },
});
