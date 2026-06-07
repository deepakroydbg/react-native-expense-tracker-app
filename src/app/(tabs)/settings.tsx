import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { EditProfileSheet } from '@/components/edit-profile-sheet';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { useProfile } from '@/lib/profile';
import { useThemeMode, type ThemeMode } from '@/lib/theme-context';

const NOTIF_KEY = 'mykhata.daily-reminder';
const THEME_OPTIONS: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'light', label: 'Light', icon: 'sunny' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'System', icon: 'phone-portrait' },
];

export default function SettingsScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const { mode, setMode } = useThemeMode();
  const { avatarUrl, fullName, email, initials } = useProfile();

  const [editOpen, setEditOpen] = useState(false);
  const [reminder, setReminder] = useState(false);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY).then((v) => setReminder(v === 'true')).catch(() => {});
  }, []);

  const toggleReminder = (v: boolean) => {
    setReminder(v);
    AsyncStorage.setItem(NOTIF_KEY, v ? 'true' : 'false').catch(() => {});
  };

  const onLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const mailTo = (subject: string) =>
    Linking.openURL(`mailto:support@mykhatabook.com?subject=${encodeURIComponent(subject)}`).catch(
      () => Alert.alert('No email app', 'Could not open your email app.')
    );

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top + 12 }}>
      {/* FIXED: title + profile card */}
      <View style={styles.fixedTop}>
        <Text style={[styles.title, { color: c.text }]}>Settings</Text>
        <Pressable
          onPress={() => setEditOpen(true)}
          style={({ pressed }) => [
            styles.profileCard,
            { backgroundColor: c.card, opacity: pressed ? 0.85 : 1 },
          ]}>
          <Avatar size={44} url={avatarUrl} initials={initials} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>{fullName}</Text>
            <Text style={[styles.email, { color: c.textSecondary }]} numberOfLines={1}>{email}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={c.textSecondary} />
        </Pressable>
      </View>
      <View style={[styles.topDivider, { backgroundColor: c.border }]} />

      {/* SCROLLABLE: everything else */}
      <ScrollView contentContainerStyle={styles.content}>
        {/* GENERAL */}
      <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>GENERAL</Text>
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.row}>
          <Ionicons name="notifications-outline" size={20} color={c.textSecondary} />
          <Text style={[styles.rowLabel, { color: c.text }]}>Daily Reminder</Text>
          <Switch
            value={reminder}
            onValueChange={toggleReminder}
            trackColor={{ true: c.primary }}
            thumbColor="#fff"
          />
        </View>
        <View style={[styles.rowDivider, { backgroundColor: c.border }]} />
        <View style={[styles.row, { alignItems: 'flex-start' }]}>
          <Ionicons name="moon-outline" size={20} color={c.textSecondary} style={{ marginTop: 6 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: c.text, marginBottom: 8 }]}>Theme</Text>
            <View style={styles.segment}>
              {THEME_OPTIONS.map((opt) => {
                const active = mode === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setMode(opt.value)}
                    style={[styles.segmentItem, { backgroundColor: active ? c.primary : c.backgroundElement }]}>
                    <Ionicons name={opt.icon} size={15} color={active ? c.onPrimary : c.textSecondary} />
                    <Text style={[styles.segmentText, { color: active ? c.onPrimary : c.textSecondary }]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      {/* APP SETTINGS */}
      <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>APP SETTINGS</Text>
      <Accordion title="App Settings" icon="options-outline">
        <InfoRow label="Language" value="English" />
        <InfoRow label="Currency" value="₹ Indian Rupee" />
        <InfoRow label="Date Format" value="DD/MM/YYYY" last />
      </Accordion>

      {/* HELP & SUPPORT */}
      <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>HELP & SUPPORT</Text>
      <Accordion title="Help & Support" icon="help-buoy-outline">
        <NavRow label="FAQ" onPress={() => router.push('/faq')} />
        <NavRow label="Contact Us" onPress={() => mailTo('MyKhata Book — Support')} />
        <NavRow label="Report a Bug" onPress={() => mailTo('MyKhata Book — Bug Report')} last />
      </Accordion>

      {/* YOUR PROFILE */}
      <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>YOUR PROFILE</Text>
      <Pressable
        onPress={() => setEditOpen(true)}
        style={({ pressed }) => [styles.navCard, { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.7 : 1 }]}>
        <Ionicons name="person-outline" size={22} color={c.textSecondary} />
        <Text style={[styles.navLabel, { color: c.text }]} numberOfLines={1}>{fullName}</Text>
        <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
      </Pressable>

      {/* MYKHATA BOOK APP */}
      <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>MYKHATA BOOK APP</Text>
      <Accordion title="MyKhata Book App" icon="information-circle-outline">
        <NavRow label="About MyKhata Book" onPress={() => router.push('/about')} />
        <InfoRow label="App Version" value={version} />
        <NavRow label="Privacy Policy" onPress={() => router.push('/privacy')} />
        <NavRow label="Terms of Service" onPress={() => router.push('/terms')} />
        <NavRow
          label="Rate this App"
          onPress={() => Linking.openURL('https://play.google.com/store/apps/details?id=com.mykhata.book').catch(() => {})}
          last
        />
      </Accordion>

        <View style={{ height: 24 }} />
        <Button title="Log Out" variant="danger" onPress={onLogout} />
      </ScrollView>

      <EditProfileSheet visible={editOpen} onClose={() => setEditOpen(false)} />
    </View>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const c = useTheme();
  return (
    <View style={[styles.subRow, !last && { borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Text style={[styles.subLabel, { color: c.text }]}>{label}</Text>
      <Text style={[styles.subValue, { color: c.textSecondary }]}>{value}</Text>
    </View>
  );
}

function NavRow({ label, onPress, last }: { label: string; onPress: () => void; last?: boolean }) {
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.subRow,
        !last && { borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth },
        pressed && { opacity: 0.6 },
      ]}>
      <Text style={[styles.subLabel, { color: c.text }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={c.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fixedTop: { paddingHorizontal: 20 },
  topDivider: { height: StyleSheet.hairlineWidth, marginTop: 14 },
  content: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 120 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8, marginTop: 18 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14 },
  navCard: {
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  navLabel: { flex: 1, fontSize: 15, fontWeight: '700' },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 64,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  name: { fontSize: 16, fontWeight: '800' },
  email: { fontSize: 14, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4, minHeight: 36 },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  rowDivider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
  segment: { flexDirection: 'row', gap: 6 },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  segmentText: { fontSize: 13, fontWeight: '600' },
  subRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  subLabel: { fontSize: 15, fontWeight: '500' },
  subValue: { fontSize: 14 },
});
