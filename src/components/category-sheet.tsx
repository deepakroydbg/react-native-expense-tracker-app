import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { useTheme } from '@/hooks/use-theme';
import {
  CATEGORY_ICONS,
  CATEGORY_NAME_MAX,
  CATEGORY_PALETTE,
  createCategory,
  DUPLICATE_NAME_ERROR,
  getCustomCategories,
  updateCategory,
  validateCategoryName,
  type Category,
  type IoniconName,
} from '@/lib/categories';

export function CategorySheet({
  visible,
  editing,
  onClose,
  onSaved,
}: {
  visible: boolean;
  editing?: Category | null;
  onClose: () => void;
  onSaved?: (category: Category) => void;
}) {
  const c = useTheme();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState<IoniconName>('pricetag');
  const [color, setColor] = useState(CATEGORY_PALETTE[0]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setSaving(false);
    if (editing) {
      setName(editing.name);
      setIcon(editing.icon);
      setColor(editing.color);
    } else {
      setName('');
      setIcon('pricetag');
      setColor(CATEGORY_PALETTE[getCustomCategories().length % CATEGORY_PALETTE.length]);
    }
  }, [visible, editing]);

  const trimmed = name.trim();

  const onChangeName = (text: string) => {
    setName(text);
    if (error) setError(null);
  };

  const onSave = async () => {
    const invalid = validateCategoryName(name, editing?.id);
    if (invalid) {
      setError(invalid);
      return;
    }

    setSaving(true);
    try {
      const input = { name: trimmed, icon, color };
      const saved =
        editing?.id ? await updateCategory(editing.id, input) : await createCategory(input);
      onSaved?.(saved);
      onClose();
    } catch (e: any) {
      console.error('Save category failed:', e);
      const msg = String(e?.message ?? '').toLowerCase();
      setError(
        msg.includes('network') || msg.includes('fetch')
          ? 'No internet connection. Please try again.'
          : msg.includes('duplicate') || msg.includes('unique')
            ? DUPLICATE_NAME_ERROR
            : 'Could not save the category. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Edit Category' : 'New Category'}
      footer={
        <View style={styles.footerRow}>
          <Button title="Cancel" variant="secondary" onPress={onClose} style={styles.flex} />
          <Button
            title={editing ? 'Save' : 'Create'}
            onPress={onSave}
            loading={saving}
            disabled={!trimmed}
            style={styles.flex}
          />
        </View>
      }>
      <View style={styles.previewWrap}>
        <View style={[styles.previewChip, { backgroundColor: color + '1A', borderColor: color }]}>
          <Ionicons name={icon} size={22} color={color} />
          <Text style={[styles.previewText, { color: c.text }]} numberOfLines={1}>
            {trimmed || 'Category'}
          </Text>
        </View>
      </View>

      <TextField
        label="Name"
        icon="pricetag"
        placeholder="e.g. Petrol"
        value={name}
        onChangeText={onChangeName}
        maxLength={CATEGORY_NAME_MAX}
        autoFocus
        error={error}
        returnKeyType="done"
        onSubmitEditing={onSave}
      />

      <Text style={[styles.label, { color: c.textSecondary }]}>Icon</Text>
      <View style={styles.iconGrid}>
        {CATEGORY_ICONS.map((iconName) => {
          const active = icon === iconName;
          return (
            <Pressable
              key={iconName}
              onPress={() => setIcon(iconName)}
              style={[
                styles.iconCell,
                {
                  backgroundColor: active ? color + '1A' : c.inputBackground,
                  borderColor: active ? color : c.border,
                },
              ]}>
              <Ionicons name={iconName} size={20} color={active ? color : c.textSecondary} />
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: c.textSecondary }]}>Colour</Text>
      <View style={styles.swatchRow}>
        {CATEGORY_PALETTE.map((swatch) => {
          const active = color.toLowerCase() === swatch.toLowerCase();
          return (
            <Pressable
              key={swatch}
              onPress={() => setColor(swatch)}
              style={[
                styles.swatch,
                { backgroundColor: swatch, borderColor: active ? c.text : 'transparent' },
              ]}>
              {active ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  footerRow: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
  previewWrap: { alignItems: 'center', marginBottom: 16 },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '100%',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  previewText: { fontSize: 15, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 8, marginLeft: 4 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconCell: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
