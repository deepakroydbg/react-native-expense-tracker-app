import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PinDots, PinKeypad } from '@/components/pin-pad';
import { ScreenBackground } from '@/components/ui/screen-background';
import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/hooks/use-theme';
import { authenticateBiometric, PIN_LENGTH, useAppLock } from '@/lib/app-lock';
import { useAuth } from '@/lib/auth-context';
import { useThemeMode } from '@/lib/theme-context';
import { SIGN_OUT_AFTER, usePinAttempts } from '@/lib/pin-attempts';

type Stage = 'idle' | 'verify-disable' | 'verify-change' | 'set' | 'confirm';

const STAGE_TITLE: Record<Exclude<Stage, 'idle'>, string> = {
  'verify-disable': 'Enter your PIN',
  'verify-change': 'Enter current PIN',
  set: 'Enter new PIN',
  confirm: 'Confirm PIN',
};

const LOCKOUT_MSG = 'Too many attempts.';
const LAST_WARNING = 'Last attempt before sign out.';

const STAGE_HINT: Record<Exclude<Stage, 'idle'>, string> = {
  'verify-disable': 'Confirm your PIN to turn off App Lock.',
  'verify-change': 'Confirm your current PIN.',
  set: `Choose a ${PIN_LENGTH}-digit PIN.`,
  confirm: 'Enter the same PIN again.',
};

export default function AppLockScreen() {
  const c = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { enabled, biometricsAvailable, enableLock, disableLock, verifyPin } = useAppLock();
  const { signOut } = useAuth();
  const { scheme } = useThemeMode();
  const { attempts, remaining, loaded, registerFailure, reset } = usePinAttempts();
  const switchTrackOff = scheme === 'dark' ? c.border : '#C3C9D2';

  const [stage, setStage] = useState<Stage>('idle');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const signOutRan = useRef(false);
  const stageShift = useRef(new Animated.Value(0)).current;

  const isVerifyStage = stage === 'verify-disable' || stage === 'verify-change';
  const cooling = remaining > 0;

  const forceSignOut = () => {
    if (signingOut) return;
    setSigningOut(true);
    const run = () => {
      if (signOutRan.current) return;
      signOutRan.current = true;
      void (async () => {
        await disableLock();
        await signOut();
      })();
    };
    Alert.alert('Signed out for security', 'Too many failed attempts.', [{ text: 'OK', onPress: run }], {
      cancelable: false,
    });
    setTimeout(run, 3000);
  };

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
        if (enabled && (await verifyPin(candidate))) {
          setPin('');
          setError('New PIN must be different from your current PIN.');
          return;
        }
        setFirstPin(candidate);
        await new Promise((resolve) => setTimeout(resolve, 220));
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
        await reset();
        cancel();
        toast.show(enabled ? 'PIN updated ✓' : 'App Lock enabled! ✓', 'success');
        return;
      }

      if (isVerifyStage) {
        const ok = await verifyPin(candidate);
        if (!ok) {
          setPin('');
          const { outcome, attempts: used } = await registerFailure();
          if (outcome === 'sign-out') {
            setError('Too many failed attempts.');
            forceSignOut();
          } else if (outcome === 'cooldown') {
            setError(LOCKOUT_MSG);
          } else {
            const left = SIGN_OUT_AFTER - used;
            setError(`Wrong PIN. ${left} ${left === 1 ? 'attempt' : 'attempts'} left.`);
          }
          return;
        }
        await reset();
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
    if (!isVerifyStage || busy || cooling) return;
    setBusy(true);
    try {
      const ok = await authenticateBiometric(
        stage === 'verify-change' ? 'Confirm to change your PIN' : 'Confirm to turn off App Lock'
      );
      if (!ok) {
        setError('Fingerprint not recognised. Enter your PIN instead.');
        return;
      }
      await reset();
      await onVerified(stage);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!cooling && error === LOCKOUT_MSG) setError(null);
  }, [cooling, error]);

  useEffect(() => {
    if (stage === 'idle') return;
    stageShift.setValue(1);
    Animated.timing(stageShift, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [stage, stageShift]);

  const padDisabled = busy || cooling || signingOut || (isVerifyStage && !loaded);
  const statusText = cooling ? `Too many attempts. Try again in ${remaining}s` : error;
  const showLastWarning = isVerifyStage && attempts === SIGN_OUT_AFTER - 1 && cooling;

  const onDigit = (digit: string) => {
    if (padDisabled || pin.length >= PIN_LENGTH) return;
    setError(null);
    const next = pin + digit;
    setPin(next);
    if (next.length === PIN_LENGTH) void complete(next);
  };

  const onDelete = () => {
    if (padDisabled) return;
    setError(null);
    setPin((p) => p.slice(0, -1));
  };

  return (
    <ScreenBackground style={{ paddingTop: insets.top }}>
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
                trackColor={{ false: switchTrackOff, true: c.primary }}
                thumbColor="#fff"
                ios_backgroundColor={switchTrackOff}
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
              ? `Unlock with your fingerprint or ${PIN_LENGTH}-digit PIN on every launch.`
              : `Unlock with your ${PIN_LENGTH}-digit PIN on every launch.`}
          </Text>
          <Text style={[styles.help, { color: c.textSecondary }]}>
            PIN is saved on this device only. Forgot it? Sign out from the lock screen.
          </Text>
        </ScrollView>
      ) : (
        <View style={styles.pinArea}>
          <Animated.View
            style={[
              styles.stageBlock,
              {
                opacity: stageShift.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                transform: [
                  {
                    translateX: stageShift.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 48],
                    }),
                  },
                ],
              },
            ]}>
            <Text style={[styles.pinTitle, { color: c.text }]}>{STAGE_TITLE[stage]}</Text>
            <Text style={[styles.pinHint, { color: c.textSecondary }]}>{STAGE_HINT[stage]}</Text>

            <View style={styles.dotsWrap}>
              <PinDots
                filled={pin.length}
                color={c.primary}
                emptyColor={c.border}
                errorColor={c.danger}
                hasError={!!error || cooling}
              />
            </View>
          </Animated.View>

          <View style={styles.errorWrap}>
            <Text style={[styles.error, { color: statusText ? c.danger : 'transparent' }]}>
              {statusText || ' '}
            </Text>
            {showLastWarning ? (
              <Text style={[styles.warning, { color: c.danger }]}>{LAST_WARNING}</Text>
            ) : null}
          </View>

          <PinKeypad
            onDigit={onDigit}
            onDelete={onDelete}
            disabled={padDisabled}
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
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { padding: 4, minWidth: 32, alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: 'Manrope_700Bold', fontWeight: '700', textAlign: 'center' },
  content: { padding: 16, gap: 14 },
  card: { borderRadius: 6, borderWidth: 1, padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: 'Manrope_700Bold', fontWeight: '700' },
  rowStatus: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', fontWeight: '600', marginTop: 2 },
  rowDivider: { height: StyleSheet.hairlineWidth, marginVertical: 6 },
  help: { fontFamily: 'Manrope_500Medium', fontSize: 13, lineHeight: 19 },
  pinArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  stageBlock: { alignItems: 'center', width: '100%' },
  pinTitle: { fontSize: 20, fontFamily: 'Manrope_800ExtraBold', fontWeight: '800' },
  pinHint: { fontFamily: 'Manrope_500Medium', fontSize: 13, marginTop: 6, textAlign: 'center' },
  dotsWrap: { marginTop: 28 },
  errorWrap: { minHeight: 58, justifyContent: 'center', marginTop: 12, marginBottom: 14 },
  error: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', fontWeight: '600', textAlign: 'center' },
  warning: { fontSize: 12, fontFamily: 'Manrope_700Bold', fontWeight: '700', textAlign: 'center', marginTop: 4 },
  bioRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 22, padding: 6 },
  bioText: { fontSize: 15, fontFamily: 'Manrope_700Bold', fontWeight: '700' },
  cancel: { marginTop: 12, padding: 8 },
  cancelText: { fontSize: 15, fontFamily: 'Manrope_700Bold', fontWeight: '700' },
});
