import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { EditProfileSheet } from '@/components/edit-profile-sheet';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { useProfile } from '@/lib/profile';

export function ProfileSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useTheme();
  const { signOut } = useAuth();
  const { avatarUrl, fullName, email, initials, uploading, pickAndUploadAvatar } = useProfile();
  const toast = useToast();

  const [editOpen, setEditOpen] = useState(false);

  const onChangePhoto = () => {
    Alert.alert('Change Photo', undefined, [
      { text: 'Take Photo', onPress: () => runUpload('camera') },
      { text: 'Choose from Gallery', onPress: () => runUpload('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const runUpload = async (source: 'camera' | 'library') => {
    try {
      await pickAndUploadAvatar(source);
      toast.show('Profile photo updated', 'success');
    } catch (e: any) {
      toast.show(e?.message || 'Could not update photo', 'error');
    }
  };

  const onLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          onClose();
          await signOut();
        },
      },
    ]);
  };

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose} scroll={false}>
        <View style={styles.body}>
          <View>
            <Avatar size={72} url={avatarUrl} initials={initials} />
            {uploading ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : null}
          </View>
          <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
            {fullName}
          </Text>
          {email ? (
            <Text style={[styles.email, { color: c.textSecondary }]} numberOfLines={1}>
              {email}
            </Text>
          ) : null}
        </View>

        <View style={[styles.divider, { backgroundColor: c.border }]} />

        <Row icon="create-outline" label="Edit Profile" color={c.text} onPress={() => setEditOpen(true)} />
        <Row
          icon="camera-outline"
          label="Change Photo"
          color={c.text}
          onPress={onChangePhoto}
          busy={uploading}
        />
        <Row icon="log-out-outline" label="Logout" color={c.danger} onPress={onLogout} />
      </BottomSheet>

      <EditProfileSheet visible={editOpen} onClose={() => setEditOpen(false)} />
    </>
  );
}

function Row({
  icon,
  label,
  color,
  onPress,
  busy,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
  busy?: boolean;
}) {
  const c = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.rowLabel, { color }]}>{label}</Text>
      {busy ? <ActivityIndicator color={c.primary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', paddingTop: 4, paddingBottom: 16, gap: 6 },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 20, fontWeight: '800', marginTop: 6 },
  email: { fontSize: 14 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15 },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: '600' },
});
