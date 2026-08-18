import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PinDots, PinKeypad } from '@/components/pin-pad';
import { useTheme } from '@/hooks/use-theme';
import {
  authenticateBiometric,
  clearFailState,
  PIN_LENGTH,
  readFailState,
  useAppLock,
  writeFailState,
} from '@/lib/app-lock';
import { useAuth } from '@/lib/auth-context';

const LOGO = require('@/assets/images/icon.png');

const COOLDOWN_AFTER = 3;
const SIGN_OUT_AFTER = 5;
const COOLDOWN_MS = 30000;

const LOCKOUT_MSG = 'Too many attempts.';
const LAST_WARNING = 'Last attempt — one more wrong PIN signs you out.';

export function LockScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { biometricsAvailable, verifyPin, unlock, disableLock } = useAppLock();
  const { signOut } = useAuth();

  const [usePin, setUsePin] = useState(!biometricsAvailable);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [failLoaded, setFailLoaded] = useState(false);

  const attemptsRef = useRef(0);
  const [attempts, setAttemptsState] = useState(0);

  const cooldownUntilRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const biometricRunning = useRef(false);
  const autoPrompted = useRef(false);
  const signingOut = useRef(false);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    const until = cooldownUntilRef.current;
    if (!until) {
      setRemaining(0);
      stopTimer();
      return;
    }
    const left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
    setRemaining(left);
    if (left <= 0) {
      cooldownUntilRef.current = null;
      stopTimer();
      setError(null);
      void writeFailState({ attempts: attemptsRef.current, cooldownUntil: null });
    }
  }, [stopTimer]);

  const startTimer = useCallback(() => {
    stopTimer();
    tick();
    timerRef.current = setInterval(tick, 1000);
  }, [stopTimer, tick]);

  useEffect(() => {
    let cancelled = false;
    readFailState().then((state) => {
      if (cancelled) return;
      attemptsRef.current = state.attempts;
      setAttemptsState(state.attempts);
      if (state.cooldownUntil && state.cooldownUntil > Date.now()) {
        cooldownUntilRef.current = state.cooldownUntil;
        setError(LOCKOUT_MSG);
        startTimer();
      }
      setFailLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [startTimer]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (cooldownUntilRef.current) startTimer();
      } else {
        stopTimer();
      }
    });
    return () => {
      sub.remove();
      stopTimer();
    };
  }, [startTimer, stopTimer]);

  const resetAndSignOut = useCallback(async () => {
    if (signingOut.current) return;
    signingOut.current = true;
    stopTimer();
    await disableLock();
    await signOut();
  }, [disableLock, signOut, stopTimer]);

  const forceSignOut = useCallback(() => {
    Alert.alert(
      'Signed out for security',
      'Too many failed attempts. You will be signed out for security.',
      [{ text: 'OK', onPress: () => void resetAndSignOut() }],
      { cancelable: false }
    );
    setTimeout(() => void resetAndSignOut(), 3000);
  }, [resetAndSignOut]);

  const runBiometric = useCallback(async () => {
    if (biometricRunning.current) return;
    biometricRunning.current = true;
    const ok = await authenticateBiometric();
    biometricRunning.current = false;

    if (ok) {
      attemptsRef.current = 0;
      setAttemptsState(0);
      cooldownUntilRef.current = null;
      stopTimer();
      setRemaining(0);
      setError(null);
      await clearFailState();
      unlock();
      return;
    }
    setUsePin(true);
  }, [stopTimer, unlock]);

  useEffect(() => {
    if (usePin || !biometricsAvailable || autoPrompted.current) return;
    autoPrompted.current = true;
    void runBiometric();
  }, [usePin, biometricsAvailable, runBiometric]);

  const submit = useCallback(
    async (candidate: string) => {
      setChecking(true);
      const ok = await verifyPin(candidate);
      setPin('');
      setChecking(false);

      if (ok) {
        attemptsRef.current = 0;
        setAttemptsState(0);
        cooldownUntilRef.current = null;
        stopTimer();
        setRemaining(0);
        setError(null);
        await clearFailState();
        unlock();
        return;
      }

      const next = attemptsRef.current + 1;
      attemptsRef.current = next;
      setAttemptsState(next);

      if (next >= SIGN_OUT_AFTER) {
        setError('Too many failed attempts.');
        await writeFailState({ attempts: next, cooldownUntil: null });
        forceSignOut();
        return;
      }

      if (next >= COOLDOWN_AFTER) {
        const until = Date.now() + COOLDOWN_MS;
        cooldownUntilRef.current = until;
        await writeFailState({ attempts: next, cooldownUntil: until });
        setError(LOCKOUT_MSG);
        startTimer();
        return;
      }

      await writeFailState({ attempts: next, cooldownUntil: null });
      const left = SIGN_OUT_AFTER - next;
      setError(`Wrong PIN. ${left} ${left === 1 ? 'attempt' : 'attempts'} left.`);
    },
    [forceSignOut, startTimer, stopTimer, unlock, verifyPin]
  );

  const padDisabled = !failLoaded || checking || remaining > 0;

  const onDigit = (digit: string) => {
    if (padDisabled || pin.length >= PIN_LENGTH) return;
    setError(null);
    const next = pin + digit;
    setPin(next);
    if (next.length === PIN_LENGTH) void submit(next);
  };

  const onDelete = () => {
    if (padDisabled) return;
    setError(null);
    setPin((p) => p.slice(0, -1));
  };

  const statusText =
    remaining > 0 ? `Too many attempts. Try again in ${remaining}s` : error || ' ';
  const showLastWarning = attempts === SIGN_OUT_AFTER - 1 && remaining > 0;

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: c.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 },
      ]}>
      <View style={styles.brand}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.appName, { color: c.text }]}>MyKhata Book</Text>
      </View>

      {usePin ? (
        <View style={styles.body}>
          <Text style={[styles.prompt, { color: c.textSecondary }]}>Enter your PIN</Text>

          <View style={styles.dotsWrap}>
            <PinDots
              filled={pin.length}
              color={c.primary}
              emptyColor={c.border}
              errorColor={c.danger}
              hasError={!!error || remaining > 0}
            />
          </View>

          <View style={styles.statusWrap}>
            <Text
              style={[
                styles.status,
                { color: error || remaining > 0 ? c.danger : 'transparent' },
              ]}>
              {statusText}
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

          {biometricsAvailable ? (
            <Pressable
              onPress={() => {
                setUsePin(false);
                setError(null);
                void runBiometric();
              }}
              hitSlop={10}
              style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.6 }]}>
              <Ionicons name="finger-print" size={18} color={c.primary} />
              <Text style={[styles.link, { color: c.primary }]}>Use fingerprint</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.body}>
          <Pressable
            onPress={() => void runBiometric()}
            hitSlop={16}
            style={({ pressed }) => [
              styles.fingerprint,
              { backgroundColor: c.backgroundElement, opacity: pressed ? 0.7 : 1 },
            ]}>
            <Ionicons name="finger-print" size={72} color={c.primary} />
          </Pressable>
          <Text style={[styles.prompt, { color: c.textSecondary, marginTop: 20 }]}>
            Touch to unlock
          </Text>

          <Pressable
            onPress={() => setUsePin(true)}
            hitSlop={10}
            style={({ pressed }) => [styles.linkRow, { marginTop: 28 }, pressed && { opacity: 0.6 }]}>
            <Text style={[styles.link, { color: c.primary }]}>Use PIN instead</Text>
          </Pressable>
        </View>
      )}

      <Pressable
        onPress={() => void resetAndSignOut()}
        hitSlop={10}
        style={({ pressed }) => [styles.forgot, pressed && { opacity: 0.6 }]}>
        <Text style={[styles.forgotText, { color: c.textSecondary }]}>Forgot PIN? Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', paddingHorizontal: 24 },
  brand: { alignItems: 'center', gap: 12 },
  logo: { width: 80, height: 80, borderRadius: 18 },
  appName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' },
  prompt: { fontSize: 15, fontWeight: '600' },
  dotsWrap: { marginTop: 22 },
  statusWrap: { minHeight: 46, justifyContent: 'center', marginTop: 12, marginBottom: 10 },
  status: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  warning: { fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  fingerprint: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 24, padding: 6 },
  link: { fontSize: 15, fontWeight: '700' },
  forgot: { paddingVertical: 10 },
  forgotText: { fontSize: 14, fontWeight: '600' },
});
