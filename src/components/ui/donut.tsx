import Svg, { Circle, G } from 'react-native-svg';

export type DonutSegment = { value: number; color: string };

/**
 * A donut/ring drawn purely with react-native-svg (Circle + strokeDasharray).
 * No third-party charting library — avoids native chart crashes.
 */
export function Donut({
  size,
  strokeWidth,
  segments,
  trackColor = '#00000000',
}: {
  size: number;
  strokeWidth: number;
  segments: DonutSegment[];
  trackColor?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((sum, s) => sum + (s.value > 0 ? s.value : 0), 0);

  let offset = 0;

  return (
    <Svg width={size} height={size}>
      <G rotation={-90} origin={`${cx}, ${cy}`}>
        <Circle cx={cx} cy={cy} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        {total > 0
          ? segments.map((seg, i) => {
              if (!(seg.value > 0)) return null;
              const len = (seg.value / total) * circumference;
              const el = (
                <Circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={r}
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={`${len} ${circumference - len}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              );
              offset += len;
              return el;
            })
          : null}
      </G>
    </Svg>
  );
}
