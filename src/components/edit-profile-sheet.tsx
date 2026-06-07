import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/hooks/use-theme';
import { fromISODate, shortDate, toISODate } from '@/lib/format';
import { useProfile } from '@/lib/profile';
import { Alert } from 'react-native';

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

export function EditProfileSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useTheme();
  const toast = useToast();
  const { avatarUrl, fullName, initials, dateOfBirth, gender, phoneNumber, uploading, updateProfile, pickAndUploadAvatar } =
    useProfile();

  const [name, setName] = useState(fullName);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [dob, setDob] = useState<Date | null>(null);
  const [sex, setSex] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(fullName);
      setPhone(phoneNumber ?? '');
      setPhoneError(null);
      setDob(dateOfBirth ? fromISODate(dateOfBirth) : null);
      setSex(gender ?? null);
      setError(null);
      setSaving(false);
    }
  }, [visible, fullName, phoneNumber, dateOfBirth, gender]);

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

  const onSave = async () => {
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    // Mobile is optional; validate only if the user typed something.
    const cleanedPhone = phone.replace(/[\s-]/g, '');
    if (cleanedPhone && !/^[6-9]\d{9}$/.test(cleanedPhone)) {
      setPhoneError('Please enter a valid 10-digit mobile number');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        full_name: name.trim(),
        phone_number: cleanedPhone ? cleanedPhone : null,
        date_of_birth: dob ? toISODate(dob) : null,
        gender: sex,
      });
      toast.show('Profile updated successfully', 'success');
      onClose();
    } catch {
      toast.show('Could not update profile. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveButton = (
    <Button title="Save Changes" onPress={onSave} loading={saving} style={{ height: 52, borderRadius: 12 }} />
  );

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Edit Profile" footer={saveButton}>
      {/* Photo */}
      <View style={styles.photoRow}>
        <Pressable onPress={onChangePhoto}>
          <Avatar size={84} url={avatarUrl} initials={initials} />
          <View style={[styles.cameraBadge, { backgroundColor: c.primary, borderColor: c.card }]}>
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="camera" size={15} color="#fff" />
            )}
          </View>
        </Pressable>
      </View>

      {/* Name */}
      <Text style={[styles.label, { color: '#666' }]}>Full Name</Text>
      <TextInput
        value={name}
        onChangeText={(t) => {
          setName(t);
          if (error) setError(null);
        }}
        placeholder="Your name"
        placeholderTextColor={c.textSecondary}
        style={[styles.input, { backgroundColor: c.inputBackground, borderColor: error ? c.danger : '#e5e7eb', color: c.text }]}
      />
      {error ? <Text style={[styles.err, { color: c.danger }]}>{error}</Text> : null}

      {/* Mobile Number (optional) */}
      <View style={styles.labelRow}>
        <Ionicons name="call-outline" size={14} color="#666" />
        <Text style={[styles.label, { color: '#666', marginTop: 0 }]}>Mobile Number</Text>
      </View>
      <TextInput
        value={phone}
        onChangeText={(t) => {
          setPhone(t.replace(/[^0-9]/g, ''));
          if (phoneError) setPhoneError(null);
        }}
        placeholder="Enter 10-digit mobile number"
        placeholderTextColor={c.textSecondary}
        keyboardType="numeric"
        maxLength={10}
        style={[styles.input, { backgroundColor: c.inputBackground, borderColor: phoneError ? c.danger : '#e5e7eb', color: c.text }]}
      />
      {phoneError ? <Text style={[styles.err, { color: c.danger }]}>{phoneError}</Text> : null}

      {/* DOB */}
      <Text style={[styles.label, { color: '#666' }]}>Date of Birth</Text>
      <Pressable
        onPress={() => setShowPicker(true)}
        style={[styles.input, styles.dobBtn, { backgroundColor: c.inputBackground, borderColor: '#e5e7eb' }]}>
        <Ionicons name="calendar-outline" size={18} color={c.textSecondary} />
        <Text style={[styles.dobText, { color: dob ? c.text : c.textSecondary }]}>
          {dob ? shortDate(dob) : 'DD / MM / YYYY'}
        </Text>
      </Pressable>
      {showPicker && (
        <View>
          <DateTimePicker
            value={dob ?? new Date(2000, 0, 1)}
            mode="date"
            maximumDate={new Date()}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(e, selected) => {
              if (Platform.OS !== 'ios') setShowPicker(false);
              if (e.type === 'set' && selected) setDob(selected);
            }}
          />
          {Platform.OS === 'ios' && (
            <Button title="Done" variant="secondary" onPress={() => setShowPicker(false)} />
          )}
        </View>
      )}

      {/* Gender */}
      <Text style={[styles.label, { color: '#666' }]}>Gender</Text>
      <View style={styles.genderRow}>
        {GENDERS.map((g) => {
          const active = sex === g;
          return (
            <Pressable
              key={g}
              onPress={() => setSex(g)}
              style={[
                styles.genderPill,
                active
                  ? { backgroundColor: '#2563eb', borderColor: '#2563eb' }
                  : { backgroundColor: c.inputBackground, borderColor: '#e5e7eb' },
              ]}>
              <Text style={{ color: active ? '#fff' : c.text, fontWeight: '600', fontSize: 13 }}>{g}</Text>
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  photoRow: { alignItems: 'center', marginBottom: 8 },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 13, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 16,
    justifyContent: 'center',
  },
  err: { fontSize: 12, marginTop: 4 },
  dobBtn: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dobText: { fontSize: 16, fontWeight: '500' },
  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genderPill: { height: 38, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
});
