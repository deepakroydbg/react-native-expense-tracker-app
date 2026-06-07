import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { TextField } from '@/components/ui/text-field';
import { useTheme } from '@/hooks/use-theme';
import { createBook, suggestBookName, type Book } from '@/lib/books';

export function AddBookSheet({
  visible,
  onClose,
  onCreated,
  existingNames,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (book: Book) => void;
  existingNames: string[];
}) {
  const c = useTheme();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setError(null);
      setSaving(false);
      setName('');
      suggestBookName()
        .then(setName)
        .catch(() => {});
    }
  }, [visible]);

  const trimmed = name.trim();
  const isDuplicate = useMemo(
    () => !!trimmed && existingNames.some((n) => n.trim().toLowerCase() === trimmed.toLowerCase()),
    [trimmed, existingNames]
  );

  // Duplicate message takes priority; clears automatically as the user types.
  const shownError = isDuplicate
    ? `A book named "${trimmed}" already exists. Please choose a different name.`
    : error;

  const canCreate = !!trimmed && !saving && !isDuplicate;

  const onChange = (text: string) => {
    setName(text);
    if (error) setError(null); // clear manual error as soon as they type
  };

  const onCreate = async () => {
    if (!trimmed) {
      setError('Please enter a book name.');
      return;
    }
    if (isDuplicate) return;
    setSaving(true);
    try {
      const book = await createBook(trimmed);
      setName('');
      onCreated(book);
    } catch (e: any) {
      console.error('Create book failed:', e);
      const msg = String(e?.message ?? '').toLowerCase();
      setError(
        msg.includes('network') || msg.includes('fetch')
          ? 'No internet connection. Please try again.'
          : 'Could not create the book. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Add New Book" scroll={false}>
      <TextField
        label="Book name"
        icon="book"
        placeholder="e.g. July Expenses 2026"
        value={name}
        onChangeText={onChange}
        autoFocus
        error={shownError}
        returnKeyType="done"
        onSubmitEditing={onCreate}
      />
      <View style={styles.row}>
        <Button title="Cancel" variant="secondary" onPress={onClose} style={styles.flex} />
        <Button title="Create" onPress={onCreate} loading={saving} disabled={!canCreate} style={styles.flex} />
      </View>
      <Text style={[styles.hint, { color: c.textSecondary }]}>
        Tip: name it by month so the next book is suggested automatically.
      </Text>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, marginTop: 16 },
  flex: { flex: 1 },
  hint: { fontSize: 12, marginTop: 12, textAlign: 'center' },
});
