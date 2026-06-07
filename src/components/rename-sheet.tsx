import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { TextField } from '@/components/ui/text-field';
import type { IoniconName } from '@/lib/categories';

export function RenameSheet({
  visible,
  initialName,
  title = 'Rename Book',
  icon = 'book',
  onClose,
  onSubmit,
}: {
  visible: boolean;
  initialName: string;
  title?: string;
  icon?: IoniconName;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void> | void;
}) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setError(null);
    }
  }, [visible, initialName]);

  const submit = async () => {
    if (!name.trim()) {
      setError('Please enter a name.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit(name.trim());
    } catch {
      setError('Could not save. Please try again.');
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} scroll={false}>
      <TextField
        label="Name"
        icon={icon}
        value={name}
        onChangeText={setName}
        autoFocus
        error={error}
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <View style={styles.row}>
        <Button title="Cancel" variant="secondary" onPress={onClose} style={styles.flex} />
        <Button title="Save" onPress={submit} loading={saving} style={styles.flex} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, marginTop: 16 },
  flex: { flex: 1 },
});
