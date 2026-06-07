import { useEffect, useRef, useState } from 'react';
import { Text, type TextStyle } from 'react-native';

import { formatCurrency } from '@/lib/format';

/** Renders a currency value that counts up/down over 600ms when it changes (Fix 6D). */
export function AnimatedAmount({ value, style }: { value: number; style?: TextStyle | TextStyle[] }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) {
      setDisplay(to);
      return;
    }
    const start = Date.now();
    const duration = 600;
    let raf: number;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(to);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <Text style={style}>{formatCurrency(display)}</Text>;
}
