import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

// Keep the native splash up until our animated one is mounted.
SplashScreen.preventAutoHideAsync().catch(() => {});

const LOGO = require('@/assets/images/icon.png');

export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(20)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;
  const tagY = useRef(new Animated.Value(20)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const containerScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    Animated.sequence([
      // Phase 1 — logo springs in
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 100, mass: 1 }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      // Phase 2 — title rises in
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(titleY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      // Phase 3 — tagline rises in
      Animated.parallel([
        Animated.timing(tagOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(tagY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      // Phase 4 — hold
      Animated.delay(400),
      // Phase 5 — fade out + slight scale up
      Animated.parallel([
        Animated.timing(containerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(containerScale, { toValue: 1.05, duration: 400, useNativeDriver: true }),
      ]),
    ]).start(() => onFinish());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: containerOpacity, transform: [{ scale: containerScale }] },
      ]}>
      <Animated.Image
        source={LOGO}
        resizeMode="contain"
        style={[styles.logo, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
      />
      <Animated.Text style={[styles.title, { opacity: titleOpacity, transform: [{ translateY: titleY }] }]}>
        MyKhata Book
      </Animated.Text>
      <Animated.Text style={[styles.tagline, { opacity: tagOpacity, transform: [{ translateY: tagY }] }]}>
        Your money, beautifully tracked.
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f5f0e8',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  logo: { width: 130, height: 130, borderRadius: 28 },
  title: { fontSize: 28, fontWeight: '700', color: '#1e3a5f', marginTop: 24 },
  tagline: { fontSize: 14, fontStyle: 'italic', color: '#64748b', marginTop: 8 },
});
