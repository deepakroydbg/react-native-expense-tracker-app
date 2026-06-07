import * as ImagePicker from 'expo-image-picker';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

const AVATAR_BUCKET = 'avatars';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Decode a base64 string to bytes (no external dep, Hermes-safe). */
function base64ToBytes(input: string): Uint8Array {
  const b64 = input.replace(/[^A-Za-z0-9+/=]/g, '');
  let length = Math.floor((b64.length * 3) / 4);
  if (b64.endsWith('==')) length -= 2;
  else if (b64.endsWith('=')) length -= 1;
  const bytes = new Uint8Array(length);
  let p = 0;
  for (let i = 0; i < b64.length; i += 4) {
    const e1 = B64.indexOf(b64[i]);
    const e2 = B64.indexOf(b64[i + 1]);
    const e3 = B64.indexOf(b64[i + 2]);
    const e4 = B64.indexOf(b64[i + 3]);
    if (p < length) bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (e3 !== -1 && b64[i + 2] !== '=' && p < length) bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (e4 !== -1 && b64[i + 3] !== '=' && p < length) bytes[p++] = ((e3 & 3) << 6) | (e4 & 63);
  }
  return bytes;
}

function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

type ProfileFields = {
  full_name?: string;
  date_of_birth?: string | null;
  gender?: string | null;
  phone_number?: string | null;
};

type ProfileContextValue = {
  avatarUrl: string | null;
  fullName: string;
  email: string;
  initials: string;
  dateOfBirth: string | null;
  gender: string | null;
  phoneNumber: string | null;
  uploading: boolean;
  refresh: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
  updateProfile: (fields: ProfileFields) => Promise<void>;
  pickAndUploadAvatar: (source: 'camera' | 'library') => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const email = session?.user?.email ?? '';

  const metaName =
    (session?.user?.user_metadata?.full_name as string | undefined) ||
    (session?.user?.user_metadata?.name as string | undefined) ||
    '';
  const metaAvatar = (session?.user?.user_metadata?.avatar_url as string | undefined) || null;

  const [dbName, setDbName] = useState<string | null>(null);
  const [dbAvatar, setDbAvatar] = useState<string | null>(null);
  const [dbDob, setDbDob] = useState<string | null>(null);
  const [dbGender, setDbGender] = useState<string | null>(null);
  const [dbPhone, setDbPhone] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, date_of_birth, gender, phone_number')
        .eq('id', userId)
        .maybeSingle();
      if (error) return; // table/columns may not exist yet — degrade gracefully
      if (data) {
        setDbName(data.full_name ?? null);
        setDbAvatar(data.avatar_url ?? null);
        setDbDob(data.date_of_birth ?? null);
        setDbGender(data.gender ?? null);
        setDbPhone(data.phone_number ?? null);
      }
    } catch {
      // ignore — profile features are optional until tables exist
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const fullName = dbName || metaName || (email ? email.split('@')[0] : 'My Account');
  const avatarUrl = dbAvatar || metaAvatar;

  const updateName = useCallback(
    async (name: string) => {
      if (!userId) return;
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: userId, full_name: name.trim(), updated_at: new Date().toISOString() });
      if (error) throw error;
      setDbName(name.trim());
    },
    [userId]
  );

  const updateProfile = useCallback(
    async (fields: ProfileFields) => {
      if (!userId) return;
      const payload: Record<string, unknown> = { id: userId, updated_at: new Date().toISOString() };
      if (fields.full_name !== undefined) payload.full_name = fields.full_name.trim();
      if (fields.date_of_birth !== undefined) payload.date_of_birth = fields.date_of_birth;
      if (fields.gender !== undefined) payload.gender = fields.gender;
      if (fields.phone_number !== undefined) payload.phone_number = fields.phone_number;
      const { error } = await supabase.from('profiles').upsert(payload);
      if (error) throw error;
      if (fields.full_name !== undefined) setDbName(fields.full_name.trim());
      if (fields.date_of_birth !== undefined) setDbDob(fields.date_of_birth);
      if (fields.gender !== undefined) setDbGender(fields.gender);
      if (fields.phone_number !== undefined) setDbPhone(fields.phone_number);
    },
    [userId]
  );

  const pickAndUploadAvatar = useCallback(
    async (source: 'camera' | 'library') => {
      if (!userId) return;

      const perm =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        throw new Error(
          source === 'camera'
            ? 'Camera permission is required to take a photo.'
            : 'Photo library permission is required to choose a photo.'
        );
      }

      const opts: ImagePicker.ImagePickerOptions = {
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
        mediaTypes: ['images'],
      };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(opts)
          : await ImagePicker.launchImageLibraryAsync(opts);

      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.base64) throw new Error('Could not read the selected image.');

      setUploading(true);
      try {
        const bytes = base64ToBytes(asset.base64);
        const path = `${userId}/avatar.jpg`;
        const { error: upErr } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
        if (upErr) throw upErr;

        const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
        const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

        const { error: profErr } = await supabase
          .from('profiles')
          .upsert({ id: userId, avatar_url: publicUrl, updated_at: new Date().toISOString() });
        if (profErr) throw profErr;

        setDbAvatar(publicUrl);
      } finally {
        setUploading(false);
      }
    },
    [userId]
  );

  const value = useMemo<ProfileContextValue>(
    () => ({
      avatarUrl,
      fullName,
      email,
      initials: computeInitials(fullName),
      dateOfBirth: dbDob,
      gender: dbGender,
      phoneNumber: dbPhone,
      uploading,
      refresh,
      updateName,
      updateProfile,
      pickAndUploadAvatar,
    }),
    [avatarUrl, fullName, email, dbDob, dbGender, dbPhone, uploading, refresh, updateName, updateProfile, pickAndUploadAvatar]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
