import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/ui/screen-background';
import { useTheme } from '@/hooks/use-theme';
import { SUPPORT_EMAIL, type LegalDoc } from '@/lib/legal-content';

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });


function openSupportMail() {
  Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() =>
    Alert.alert('No email app', 'Could not open your email app.')
  );
}

/**
 * Renders a section body, turning the support email into a tappable mailto link.
 * The email sits on its own line and auto-shrinks so a long address always fits
 * on a single line instead of wrapping.
 */
function BodyText({ body }: { body: string }) {
  const c = useTheme();
  const idx = body.indexOf(SUPPORT_EMAIL);
  if (idx === -1) return <Text style={[styles.body, { color: c.text }]}>{body}</Text>;
  const lead = body.slice(0, idx).trimEnd();
  const trail = body.slice(idx + SUPPORT_EMAIL.length).trimStart();
  return (
    <>
      {lead ? <Text style={[styles.body, { color: c.text }]}>{lead}</Text> : null}
      <Text
        style={[styles.body, styles.link, { color: c.primary }]}
        onPress={openSupportMail}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}>
        {SUPPORT_EMAIL}
      </Text>
      {trail ? <Text style={[styles.body, { color: c.text }]}>{trail}</Text> : null}
    </>
  );
}

/** A document-styled page (serif body) for Privacy / Terms / About. */
export function LegalScreen({ doc, logo = false }: { doc: LegalDoc; logo?: boolean }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <ScreenBackground style={{ paddingTop: insets.top }}>
      <View style={[styles.header, { borderColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]} numberOfLines={1}>
          {doc.title.split('—')[0].trim()}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        {logo ? (
          <View style={styles.aboutHeader}>
            {/* Logo already includes the "MyKhata Book" wordmark — no separate title text. */}
            <Image
              source={require('@/assets/images/icon.png')}
              style={[styles.logo, { backgroundColor: c.surfaceMuted }]}
              resizeMode="contain"
            />
            <Text style={[styles.version, { color: c.textSecondary }]}>{doc.updated}</Text>
          </View>
        ) : (
          <>
            <Text style={[styles.title, { color: c.text }]}>{doc.title}</Text>
            <Text style={[styles.subtitle, { color: c.textSecondary }]}>{doc.updated}</Text>
          </>
        )}

        {doc.sections.map((s) => (
          <View key={s.heading} style={styles.section}>
            <Text style={[styles.heading, { color: c.text }]}>{s.heading}</Text>
            <BodyText body={s.body} />
          </View>
        ))}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { padding: 4, width: 28 },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: 'Manrope_700Bold', fontWeight: '700', textAlign: 'center' },
  content: { paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 20, fontFamily: SERIF, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontFamily: 'Manrope_500Medium', fontWeight: '500', fontStyle: 'italic', fontSize: 13, marginBottom: 24 },
  section: { marginTop: 4 },
  heading: { fontSize: 16, fontFamily: SERIF, fontWeight: '700', marginTop: 20, marginBottom: 6 },
  body: { fontFamily: SERIF, fontSize: 15, lineHeight: 24 },
  link: { fontFamily: 'Manrope_700Bold', fontWeight: '700', textDecorationLine: 'underline', marginTop: 4 },
  aboutHeader: { alignItems: 'center', paddingTop: 24, marginBottom: 16 },
  logo: {
    width: 140,
    height: 140,
    borderRadius: 16,
    marginBottom: 16,
  },
  version: { fontFamily: 'Manrope_500Medium', fontWeight: '500', fontStyle: 'italic', fontSize: 13 },
});
