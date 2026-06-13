import { StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';
import { formatCurrency } from '@/lib/format';

export type DonutDatum = { name: string; value: number; color: string };

function getCenterFontSize(amount: number): number {
  const str = Math.round(Math.abs(amount)).toLocaleString('en-IN');
  if (str.length <= 6) return 22;
  if (str.length <= 9) return 18;
  if (str.length <= 12) return 14;
  return 11;
}

const SIZE = 280;
const RADIUS = 110;
const STROKE = 45;
const STROKE_SELECTED = 55;

/**
 * Single thick donut ring with reliable angle-based tap detection.
 * Segments >= 5% get an on-chart label. Center shows the mode label + amount.
 */
export function InsightsDonut({
  data,
  total,
  centerLabel,
  centerAmount,
  centerColor,
  selected,
  onSelect,
}: {
  data: DonutDatum[];
  total: number;
  centerLabel: string;
  centerAmount: number;
  centerColor: string;
  selected: string | null;
  onSelect: (name: string | null) => void;
}) {
  const c = useTheme();
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const circ = 2 * Math.PI * RADIUS;
  const sum = data.reduce((s, d) => s + (d.value > 0 ? d.value : 0), 0);

  let acc = 0;
  const segs = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const frac = sum > 0 ? d.value / sum : 0;
      const startFrac = acc;
      acc += frac;
      return { ...d, frac, startFrac, mid: startFrac + frac / 2 };
    });

  // Angle-based hit testing (Fix 4B): map the tap point to a segment.
  const handleTouch = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    const dx = locationX - cx;
    const dy = locationY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Tap in the center hole or outside the ring → dismiss.
    if (dist < RADIUS - STROKE / 2 - 18 || dist > RADIUS + STROKE / 2 + 18) {
      onSelect(null);
      return;
    }
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI; // 0 at 3 o'clock
    const fromTop = (angle + 360 + 90) % 360; // 0 at top, clockwise
    const frac = fromTop / 360;
    const hit = segs.find((s) => frac >= s.startFrac && frac < s.startFrac + s.frac);
    if (hit) onSelect(selected === hit.name ? null : hit.name);
    else onSelect(null);
  };

  return (
    <View style={styles.wrap} onStartShouldSetResponder={() => true} onResponderRelease={handleTouch}>
      <Svg width={SIZE} height={SIZE} pointerEvents="none">
        <G rotation={-90} origin={`${cx}, ${cy}`}>
          {segs.length === 0 ? (
            <Circle cx={cx} cy={cy} r={RADIUS} stroke={c.backgroundElement} strokeWidth={STROKE} fill="none" />
          ) : (
            segs.map((s) => {
              const len = s.frac * circ;
              const sw = selected === s.name ? STROKE_SELECTED : STROKE;
              return (
                <Circle
                  key={s.name}
                  cx={cx}
                  cy={cy}
                  r={RADIUS}
                  stroke={s.color}
                  strokeWidth={sw}
                  fill="none"
                  strokeDasharray={`${len} ${circ - len}`}
                  strokeDashoffset={-s.startFrac * circ}
                />
              );
            })
          )}
        </G>
      </Svg>

      {segs.map((s) => {
        const pct = total > 0 ? (s.value / total) * 100 : 0;
        if (pct < 5) return null;
        const theta = s.mid * 2 * Math.PI;
        const x = cx + RADIUS * Math.sin(theta);
        const y = cy - RADIUS * Math.cos(theta);
        return (
          <View key={s.name} pointerEvents="none" style={[styles.label, { left: x - 34, top: y - 16 }]}>
            <Text style={styles.labelPct}>{Math.round(pct)}%</Text>
            <Text style={styles.labelName} numberOfLines={1}>
              {s.name}
            </Text>
          </View>
        );
      })}

      <View pointerEvents="none" style={styles.center}>
        <Text style={[styles.centerLabel, { color: c.textSecondary }]}>{centerLabel}</Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.centerValue, { color: centerColor, fontSize: getCenterFontSize(centerAmount) }]}>
          {formatCurrency(centerAmount)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  label: { position: 'absolute', width: 68, alignItems: 'center' },
  labelPct: { color: '#fff', fontSize: 11, fontWeight: '700' },
  labelName: { color: '#fff', fontSize: 10, fontWeight: '600' },
  center: { position: 'absolute', width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
  centerLabel: { fontSize: 12, fontWeight: '600' },
  centerValue: { fontWeight: '800', textAlign: 'center', maxWidth: 130 },
});
