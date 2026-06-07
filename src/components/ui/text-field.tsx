import { Ionicons } from '@expo/vector-icons';
import { forwardRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import type { IoniconName } from '@/lib/categories';
import { useTheme } from '@/hooks/use-theme';

type Props = TextInputProps & {
  label?: string;
  icon?: IoniconName;
  error?: string | null;
  rightIcon?: IoniconName;
  onRightIconPress?: () => void;
};

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, icon, error, rightIcon, onRightIconPress, style, ...rest },
  ref
) {
  const c = useTheme();
  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          { backgroundColor: c.inputBackground, borderColor: error ? c.danger : c.border },
        ]}>
        {icon ? <Ionicons name={icon} size={18} color={c.textSecondary} style={styles.icon} /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={c.textSecondary}
          style={[styles.input, { color: c.text }, style]}
          {...rest}
        />
        {rightIcon ? (
          <Pressable onPress={onRightIconPress} hitSlop={10} style={styles.rightIcon}>
            <Ionicons name={rightIcon} size={20} color={c.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={[styles.error, { color: c.danger }]}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  icon: {
    marginRight: 10,
  },
  rightIcon: {
    marginLeft: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  error: {
    fontSize: 12,
    marginLeft: 4,
  },
});
