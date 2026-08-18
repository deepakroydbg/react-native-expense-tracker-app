import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PIN_LENGTH } from '@/lib/app-lock';

export function PinDots({
  filled,
  color,
  emptyColor,
  errorColor,
  hasError,
}: {
  filled: number;
  color: string;
  emptyColor: string;
  errorColor?: string;
  hasError?: boolean;
}) {
  const activeColor = hasError && errorColor ? errorColor : color;
  return (
    <View style={styles.dots}>
      {Array.from({ length: PIN_LENGTH }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < filled
              ? { backgroundColor: activeColor, borderColor: activeColor }
              : { backgroundColor: 'transparent', borderColor: emptyColor },
          ]}
        />
      ))}
    </View>
  );
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function PinKeypad({
  onDigit,
  onDelete,
  disabled,
  textColor,
  keyColor,
  mutedColor,
}: {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  disabled?: boolean;
  textColor: string;
  keyColor: string;
  mutedColor: string;
}) {
  return (
    <View style={styles.pad}>
      {KEYS.map((k) => (
        <PadKey key={k} disabled={disabled} onPress={() => onDigit(k)} bg={keyColor}>
          <Text style={[styles.keyText, { color: textColor }]}>{k}</Text>
        </PadKey>
      ))}
      <View style={styles.key} />
      <PadKey disabled={disabled} onPress={() => onDigit('0')} bg={keyColor}>
        <Text style={[styles.keyText, { color: textColor }]}>0</Text>
      </PadKey>
      <PadKey disabled={disabled} onPress={onDelete} bg="transparent">
        <Ionicons name="backspace-outline" size={26} color={mutedColor} />
      </PadKey>
    </View>
  );
}

function PadKey({
  children,
  onPress,
  disabled,
  bg,
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  bg: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.key,
        { backgroundColor: bg, opacity: disabled ? 0.35 : pressed ? 0.55 : 1 },
      ]}>
      {children}
    </Pressable>
  );
}

const KEY_SIZE = 72;

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5 },
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: KEY_SIZE * 3 + 48,
    rowGap: 12,
  },
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: KEY_SIZE / 2,
    marginHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontSize: 28, fontWeight: '600' },
});
