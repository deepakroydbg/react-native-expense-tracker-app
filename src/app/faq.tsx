import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

const FAQS = [
  {
    q: 'What is a "book" in MyKhata Book?',
    a: 'A book is a separate ledger — for example one per month or per business. Each book has its own entries and balance.',
  },
  {
    q: 'How is the running balance calculated?',
    a: 'Entries are added up in date/time order: Cash In adds to the balance and Cash Out subtracts. Each entry shows the balance right after it.',
  },
  {
    q: 'Can I export my data?',
    a: 'Yes. Open a book, tap the share icon, and choose Excel or PDF. The native share sheet lets you save or send it anywhere.',
  },
  {
    q: 'Is my data private?',
    a: 'Every user can only see their own books and entries. Your data is protected by row-level security on the server.',
  },
  {
    q: 'How do I switch between light and dark mode?',
    a: 'Go to Settings → Theme and pick Light, Dark, or System (follows your phone setting).',
  },
];

export default function FaqScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.screen, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>FAQ</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {FAQS.map((item, i) => (
          <View key={i} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.qRow}>
              <Ionicons name="help-circle" size={20} color={c.primary} />
              <Text style={[styles.q, { color: c.text }]}>{item.q}</Text>
            </View>
            <Text style={[styles.a, { color: c.textSecondary }]}>{item.a}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { padding: 4, width: 28 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  content: { padding: 16, gap: 12 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  qRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  q: { flex: 1, fontSize: 15, fontWeight: '700' },
  a: { fontSize: 14, lineHeight: 20 },
});
