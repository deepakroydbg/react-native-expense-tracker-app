import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { clearFailState, readFailState, writeFailState } from '@/lib/app-lock';

export const COOLDOWN_AFTER = 3;
export const SIGN_OUT_AFTER = 5;
export const COOLDOWN_MS = 30000;

export type FailureOutcome = 'warn' | 'cooldown' | 'sign-out';
export type FailureResult = { outcome: FailureOutcome; attempts: number };

export function usePinAttempts() {
  const [attempts, setAttempts] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const attemptsRef = useRef(0);
  const cooldownUntilRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      setAttempts(state.attempts);
      if (state.cooldownUntil && state.cooldownUntil > Date.now()) {
        cooldownUntilRef.current = state.cooldownUntil;
        startTimer();
      }
      setLoaded(true);
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

  const reset = useCallback(async () => {
    attemptsRef.current = 0;
    setAttempts(0);
    cooldownUntilRef.current = null;
    stopTimer();
    setRemaining(0);
    await clearFailState();
  }, [stopTimer]);

  const registerFailure = useCallback(async (): Promise<FailureResult> => {
    const next = attemptsRef.current + 1;
    attemptsRef.current = next;
    setAttempts(next);

    if (next >= SIGN_OUT_AFTER) {
      await writeFailState({ attempts: next, cooldownUntil: null });
      return { outcome: 'sign-out', attempts: next };
    }

    if (next >= COOLDOWN_AFTER) {
      const until = Date.now() + COOLDOWN_MS;
      cooldownUntilRef.current = until;
      await writeFailState({ attempts: next, cooldownUntil: until });
      startTimer();
      return { outcome: 'cooldown', attempts: next };
    }

    await writeFailState({ attempts: next, cooldownUntil: null });
    return { outcome: 'warn', attempts: next };
  }, [startTimer]);

  return { attempts, remaining, loaded, registerFailure, reset };
}
