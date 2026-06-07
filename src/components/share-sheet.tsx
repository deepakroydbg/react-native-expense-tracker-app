import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useTheme } from '@/hooks/use-theme';

export function ShareSheet({
  visible,
  onClose,
  bookName,
  onSharePDF,
  onShareExcel,
}: {
  visible: boolean;
  onClose: () => void;
  bookName: string;
  onSharePDF: () => Promise<void>;
  onShareExcel: () => Promise<void>;
}) {
  const c = useTheme();
  const [busy, setBusy] = useState<'pdf' | 'excel' | null>(null);

  const run = async (kind: 'pdf' | 'excel', fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(kind);
    try {
      await fn();
      onClose();
    } catch (e: any) {
      Alert.alert('Export failed', e?.message || 'Could not export this book. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Share Book" scroll={false}>
      <Text style={[styles.bookName, { color: c.textSecondary }]} numberOfLines={1}>
        {bookName}
      </Text>

      <Pressable
        onPress={() => run('pdf', onSharePDF)}
        disabled={!!busy}
        style={({ pressed }) => [
          styles.option,
          { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.7 : 1 },
        ]}>
        <View style={[styles.iconWrap, { backgroundColor: c.dangerSoft }]}>
          <Ionicons name="share-outline" size={20} color={c.danger} />
        </View>
        <Text style={[styles.optionText, { color: c.text }]}>Share as PDF</Text>
        {busy === 'pdf' ? <ActivityIndicator color={c.primary} /> : (
          <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
        )}
      </Pressable>

      <Pressable
        onPress={() => run('excel', onShareExcel)}
        disabled={!!busy}
        style={({ pressed }) => [
          styles.option,
          { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.7 : 1 },
        ]}>
        <View style={[styles.iconWrap, { backgroundColor: c.successSoft }]}>
          <Ionicons name="grid-outline" size={20} color={c.success} />
        </View>
        <Text style={[styles.optionText, { color: c.text }]}>Share as Excel</Text>
        {busy === 'excel' ? <ActivityIndicator color={c.primary} /> : (
          <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
        )}
      </Pressable>

      <Button title="Cancel" variant="secondary" onPress={onClose} style={styles.cancel} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bookName: { fontSize: 14, fontWeight: '600', marginBottom: 14 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, fontSize: 16, fontWeight: '700' },
  cancel: { marginTop: 6 },
});
