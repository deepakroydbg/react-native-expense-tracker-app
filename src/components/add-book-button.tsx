import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function AddBookButton({ onPress }: { onPress: () => void }) {
  const c = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  // A shine sweeps across every ~3s to draw attention (Fix 6F).
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1100,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.delay(1900),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-220, 380] });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: c.primary, opacity: pressed ? 0.92 : 1 },
      ]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.shine, { transform: [{ translateX }, { rotate: '18deg' }] }]}
      />
      <View style={styles.content}>
        <Ionicons name="add" size={22} color={c.onPrimary} />
        <Text style={[styles.text, { color: c.onPrimary }]}>ADD NEW BOOK</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  shine: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    width: 60,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  text: { fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
});
