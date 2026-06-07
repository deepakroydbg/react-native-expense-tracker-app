import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { LegalDoc } from '@/lib/legal-content';

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

/** A document-styled page (serif, warm off-white) for Privacy / Terms / About. */
export function LegalScreen({ doc, logo = false }: { doc: LegalDoc; logo?: boolean }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {doc.title.split('—')[0].trim()}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        {logo ? (
          <View style={styles.aboutHeader}>
            {/* Logo already includes the "MyKhata Book" wordmark — no separate title text. */}
            <Image source={require('@/assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.version}>{doc.updated}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.title}>{doc.title}</Text>
            <Text style={styles.subtitle}>{doc.updated}</Text>
          </>
        )}

        {doc.sections.map((s) => (
          <View key={s.heading} style={styles.section}>
            <Text style={styles.heading}>{s.heading}</Text>
            <Text style={styles.body}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fafaf9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#e7e5e4',
  },
  back: { padding: 4, width: 28 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', textAlign: 'center', color: '#1e293b' },
  content: { paddingHorizontal: 20, paddingTop: 12 },
  title: { fontFamily: SERIF, fontSize: 26, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  subtitle: { fontStyle: 'italic', fontSize: 13, color: '#94a3b8', marginBottom: 24 },
  section: { marginTop: 4 },
  heading: { fontFamily: SERIF, fontSize: 16, fontWeight: '700', color: '#1e293b', marginTop: 20, marginBottom: 6 },
  body: { fontFamily: SERIF, fontSize: 15, lineHeight: 24, color: '#475569' },
  aboutHeader: { alignItems: 'center', paddingTop: 24, marginBottom: 16 },
  logo: {
    width: 140,
    height: 140,
    borderRadius: 16,
    backgroundColor: '#f5f0e8',
    marginBottom: 16,
  },
  version: { fontStyle: 'italic', fontSize: 13, color: '#94a3b8' },
});
