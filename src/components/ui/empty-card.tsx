import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { IoniconName } from '@/lib/categories';

export function EmptyCard({
  icon,
  title,
  subtext,
  style,
}: {
  icon: IoniconName;
  title: string;
  subtext: string;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.borderDashed }, style]}>
      <View style={[styles.icon, { backgroundColor: c.surfaceMuted }]}>
        <Ionicons name={icon} size={18} color={c.textSecondary} />
      </View>
      <Text style={[styles.title, { color: c.emptyTitle }]}>{title}</Text>
      <Text style={[styles.sub, { color: c.textSecondary }]}>{subtext}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  sub: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 240,
  },
});
