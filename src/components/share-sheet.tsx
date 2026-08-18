import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/hooks/use-theme';
import { useThemeMode } from '@/lib/theme-context';

type Kind = 'image' | 'pdf' | 'excel';

export type ExportVariant = 'share' | 'download';

const COPY: Record<ExportVariant, { title: string; rows: Record<Kind, string> }> = {
  share: {
    title: 'Share & Export',
    rows: {
      image: 'Beautiful summary card for WhatsApp',
      pdf: 'Professional report with all entries',
      excel: 'Spreadsheet with all entries and totals',
    },
  },
  download: {
    title: 'Download',
    rows: {
      image: 'Save the summary card to your device',
      pdf: 'Save the full PDF report to your device',
      excel: 'Save the spreadsheet to your device',
    },
  },
};

export function ShareSheet({
  visible,
  onClose,
  bookName,
  variant = 'share',
  onShareImage,
  onSharePDF,
  onShareExcel,
}: {
  visible: boolean;
  onClose: () => void;
  bookName: string;
  variant?: ExportVariant;
  onShareImage: () => Promise<void>;
  onSharePDF: () => Promise<void | 'cancelled'>;
  onShareExcel: () => Promise<void | 'cancelled'>;
}) {
  const c = useTheme();
  const { scheme } = useThemeMode();
  const toast = useToast();
  const [busy, setBusy] = useState<Kind | null>(null);

  const dark = scheme === 'dark';
  const tint = {
    blue: { bg: dark ? '#17233a' : '#eff6ff', fg: dark ? '#60a5fa' : '#2563eb' },
    red: { bg: dark ? '#3a1d1d' : '#fef2f2', fg: dark ? '#f87171' : '#dc2626' },
    green: { bg: dark ? '#14301f' : '#f0fdf4', fg: dark ? '#4ade80' : '#16a34a' },
  };

  const copy = COPY[variant];
  const failTitle = variant === 'download' ? 'Download failed' : 'Export failed';

  const runImage = async () => {
    if (busy) return;
    setBusy('image');
    try {
      await onShareImage();
    } catch {
      toast.show(
        variant === 'download' ? 'Failed to save image' : 'Failed to generate image',
        'error'
      );
    } finally {
      setBusy(null);
    }
  };

  const runFile = async (kind: 'pdf' | 'excel', fn: () => Promise<void | 'cancelled'>) => {
    if (busy) return;
    setBusy(kind);
    try {
      const result = await fn();
      if (result !== 'cancelled') onClose();
    } catch (e: any) {
      Alert.alert(failTitle, e?.message || 'Could not export this book. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={copy.title} scroll={false}>
      <Text style={[styles.bookName, { color: c.textSecondary }]} numberOfLines={1}>
        {bookName}
      </Text>

      <OptionRow
        icon="image-outline"
        tint={tint.blue}
        title={variant === 'download' ? 'Download as Image' : 'Share as Image'}
        subtitle={busy === 'image' ? 'Generating…' : copy.rows.image}
        loading={busy === 'image'}
        disabled={!!busy}
        onPress={runImage}
      />
      <View style={[styles.divider, { backgroundColor: c.border }]} />

      <OptionRow
        icon="document-text-outline"
        tint={tint.red}
        title={variant === 'download' ? 'Download as PDF' : 'Export as PDF'}
        subtitle={busy === 'pdf' ? 'Preparing…' : copy.rows.pdf}
        loading={busy === 'pdf'}
        disabled={!!busy}
        onPress={() => runFile('pdf', onSharePDF)}
      />
      <View style={[styles.divider, { backgroundColor: c.border }]} />

      <OptionRow
        icon="grid-outline"
        tint={tint.green}
        title={variant === 'download' ? 'Download as Excel' : 'Export as Excel'}
        subtitle={busy === 'excel' ? 'Preparing…' : copy.rows.excel}
        loading={busy === 'excel'}
        disabled={!!busy}
        onPress={() => runFile('excel', onShareExcel)}
      />

      <Button title="Cancel" variant="secondary" onPress={onClose} style={styles.cancel} />
    </BottomSheet>
  );
}

function OptionRow({
  icon,
  tint,
  title,
  subtitle,
  loading,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: { bg: string; fg: string };
  title: string;
  subtitle: string;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        { opacity: disabled && !loading ? 0.45 : pressed ? 0.7 : 1 },
      ]}>
      <View style={[styles.iconWrap, { backgroundColor: tint.bg }]}>
        <Ionicons name={icon} size={20} color={tint.fg} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.title, { color: c.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator color={c.primary} />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bookName: { fontSize: 14, fontWeight: '600', marginTop: -8, marginBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    minHeight: 64,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 12, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  cancel: { marginTop: 12 },
});
