import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useTheme } from '@/hooks/use-theme';

export function BookMenuSheet({
  visible,
  bookName,
  onClose,
  onRename,
  onDelete,
}: {
  visible: boolean;
  bookName: string;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const c = useTheme();

  const handleRename = () => {
    onClose();
    setTimeout(onRename, 250);
  };

  const handleDelete = () => {
    onClose();
    setTimeout(() => {
      Alert.alert(
        'Delete Book',
        `Delete "${bookName}"? All entries in this book will be permanently deleted. This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: onDelete },
        ]
      );
    }, 250);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} scroll={false}>
      <View style={styles.head}>
        <Text style={[styles.subtitle, { color: c.textSecondary }]} numberOfLines={1}>
          {bookName}
        </Text>
        <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
          <Ionicons name="close" size={22} color={c.textSecondary} />
        </Pressable>
      </View>

      <View style={[styles.divider, { backgroundColor: c.border }]} />

      <Pressable onPress={handleRename} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
        <Ionicons name="create-outline" size={22} color={c.text} />
        <Text style={[styles.label, { color: c.text }]}>Rename Book</Text>
        <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
      </Pressable>

      <Pressable onPress={handleDelete} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
        <Ionicons name="trash-outline" size={22} color={c.danger} />
        <Text style={[styles.label, { color: c.danger }]}>Delete Book</Text>
        <Ionicons name="chevron-forward" size={18} color={c.danger} />
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subtitle: { flex: 1, fontSize: 14, fontWeight: '600' },
  close: { padding: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  label: { flex: 1, fontSize: 16, fontWeight: '600' },
});
