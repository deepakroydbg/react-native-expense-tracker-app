import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function Avatar({
  size = 72,
  url,
  initials,
}: {
  size?: number;
  url?: string | null;
  initials: string;
}) {
  const c = useTheme();
  const [failed, setFailed] = useState(false);
  const radius = size / 2;

  if (url && !failed) {
    return (
      <Image
        source={{ uri: url }}
        onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: radius, backgroundColor: c.backgroundElement }}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: radius, backgroundColor: c.primary },
      ]}>
      <Text style={{ color: c.onPrimary, fontWeight: '800', fontSize: size * 0.4 }}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
