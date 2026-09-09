import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAuth } from '@/lib/auth-context';

const PIN_KEY = 'app_pin';
const ENABLED_KEY = 'app_lock_enabled';
const ATTEMPTS_KEY = 'app_lock_attempts';
const COOLDOWN_KEY = 'app_lock_cooldown_until';
const LAST_FAIL_KEY = 'app_lock_last_fail';

export const PIN_LENGTH = 4;

export const ATTEMPT_WINDOW_MS = 3600000;

const BACKGROUND_GRACE_MS = 60000;

type AppLockContextValue = {
  ready: boolean;
  enabled: boolean;
  locked: boolean;
  biometricsAvailable: boolean;
  enableLock: (pin: string) => Promise<void>;
  disableLock: () => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  unlock: () => void;
  lockNow: () => void;
};

const AppLockContext = createContext<AppLockContextValue | null>(null);

export async function authenticateBiometric(
  promptMessage = 'Unlock MyKhata Book'
): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Use PIN',
      fallbackLabel: 'Use PIN',
      disableDeviceFallback: true,
    });
    return result.success;
  } catch {
    return false;
  }
}

export type LockFailState = { attempts: number; cooldownUntil: number | null };

export const EMPTY_FAIL_STATE: LockFailState = { attempts: 0, cooldownUntil: null };

export async function readFailState(): Promise<LockFailState> {
  try {
    const [rawAttempts, rawCooldown, rawLastFail] = await Promise.all([
      SecureStore.getItemAsync(ATTEMPTS_KEY),
      SecureStore.getItemAsync(COOLDOWN_KEY),
      SecureStore.getItemAsync(LAST_FAIL_KEY),
    ]);
    const attempts = Number(rawAttempts);
    const cooldown = Number(rawCooldown);
    const lastFail = Number(rawLastFail);

    const state: LockFailState = {
      attempts: Number.isFinite(attempts) && attempts > 0 ? attempts : 0,
      cooldownUntil: Number.isFinite(cooldown) && cooldown > 0 ? cooldown : null,
    };

    const now = Date.now();
    const coolingDown = !!state.cooldownUntil && state.cooldownUntil > now;
    const stale =
      Number.isFinite(lastFail) && lastFail > 0 && now - lastFail > ATTEMPT_WINDOW_MS;

    if (state.attempts > 0 && stale && !coolingDown) {
      void clearFailState();
      return EMPTY_FAIL_STATE;
    }

    return state;
  } catch {
    return EMPTY_FAIL_STATE;
  }
}

export async function writeFailState(state: LockFailState): Promise<void> {
  try {
    await SecureStore.setItemAsync(ATTEMPTS_KEY, String(state.attempts));
    await SecureStore.setItemAsync(LAST_FAIL_KEY, String(Date.now()));
    if (state.cooldownUntil) {
      await SecureStore.setItemAsync(COOLDOWN_KEY, String(state.cooldownUntil));
    } else {
      await SecureStore.deleteItemAsync(COOLDOWN_KEY);
    }
  } catch {
    // ignore
  }
}

export async function clearFailState(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(ATTEMPTS_KEY),
      SecureStore.deleteItemAsync(COOLDOWN_KEY),
      SecureStore.deleteItemAsync(LAST_FAIL_KEY),
    ]);
  } catch {
    // ignore
  }
}

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

  const enabledRef = useRef(false);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let on = false;
      try {
        const [flag, pin] = await Promise.all([
          SecureStore.getItemAsync(ENABLED_KEY),
          SecureStore.getItemAsync(PIN_KEY),
        ]);
        on = flag === 'true' && !!pin;
        if (flag === 'true' && !pin) {
          await SecureStore.deleteItemAsync(ENABLED_KEY);
          await clearFailState();
        }
      } catch {
        on = false;
      }

      let bio = false;
      try {
        const [hasHardware, isEnrolled] = await Promise.all([
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
        ]);
        bio = hasHardware && isEnrolled;
      } catch {
        bio = false;
      }

      if (cancelled) return;
      setBiometricsAvailable(bio);
      setEnabled(on);
      setLocked(on);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') {
        const since = backgroundedAt.current;
        backgroundedAt.current = null;
        if (!enabledRef.current || since === null) return;
        if (Date.now() - since >= BACKGROUND_GRACE_MS) setLocked(true);
      } else {
        if (backgroundedAt.current === null) backgroundedAt.current = Date.now();
      }
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  const enableLock = useCallback(async (pin: string) => {
    await SecureStore.setItemAsync(PIN_KEY, pin);
    await SecureStore.setItemAsync(ENABLED_KEY, 'true');
    await clearFailState();
    backgroundedAt.current = null;
    setEnabled(true);
    setLocked(false);
  }, []);

  const disableLock = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync(PIN_KEY);
      await SecureStore.deleteItemAsync(ENABLED_KEY);
    } catch {
      // ignore
    }
    await clearFailState();
    backgroundedAt.current = null;
    setEnabled(false);
    setLocked(false);
  }, []);

  const hadSession = useRef<boolean | null>(null);
  useEffect(() => {
    if (authLoading || !ready) return;
    const has = !!session;
    if (!has) {
      if (enabledRef.current) void disableLock();
    } else if (hadSession.current === false) {
      backgroundedAt.current = null;
      setLocked(false);
    }
    hadSession.current = has;
  }, [session, authLoading, ready, disableLock]);

  const verifyPin = useCallback(async (pin: string) => {
    try {
      const saved = await SecureStore.getItemAsync(PIN_KEY);
      return !!saved && saved === pin;
    } catch {
      return false;
    }
  }, []);

  const unlock = useCallback(() => {
    backgroundedAt.current = null;
    setLocked(false);
  }, []);

  const lockNow = useCallback(() => {
    if (enabledRef.current) setLocked(true);
  }, []);

  const value = useMemo<AppLockContextValue>(
    () => ({
      ready,
      enabled,
      locked,
      biometricsAvailable,
      enableLock,
      disableLock,
      verifyPin,
      unlock,
      lockNow,
    }),
    [ready, enabled, locked, biometricsAvailable, enableLock, disableLock, verifyPin, unlock, lockNow]
  );

  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
}

export function useAppLock(): AppLockContextValue {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error('useAppLock must be used within AppLockProvider');
  return ctx;
}
