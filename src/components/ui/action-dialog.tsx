import { useEffect, useRef } from 'react';
import { AppState, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeMode } from '@/lib/theme-context';

export type DialogAction = {
  label: string;
  onPress: () => void;
  style?: 'default' | 'destructive' | 'cancel';
};

export function ActionDialog({
  visible,
  title,
  message,
  actions,
  onClose,
}: {
  visible: boolean;
  title: string;
  message?: string;
  actions: DialogAction[];
  onClose: () => void;
}) {
  const { scheme } = useThemeMode();
  const dark = scheme === 'dark';
  const cardBg = dark ? '#1c1c1e' : '#ffffff';
  const textColor = dark ? '#fff' : '#111';
  const subColor = dark ? '#9BA4AE' : '#666';
  const divider = dark ? '#2c2c2e' : '#ececec';

  // Close on app resume so a stale dialog can't block the UI.
  const wasVisible = useRef(visible);
  useEffect(() => {
    wasVisible.current = visible;
  }, [visible]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && wasVisible.current) onClose();
    });
    return () => sub.remove();
  }, [onClose]);

  const colorFor = (style?: DialogAction['style']) =>
    style === 'destructive' ? '#dc2626' : style === 'cancel' ? subColor : '#2563eb';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: cardBg }]} onPress={() => {}}>
          <View style={styles.head}>
            <Text style={[styles.title, { color: textColor }]}>{title}</Text>
            {message ? <Text style={[styles.message, { color: subColor }]}>{message}</Text> : null}
          </View>
          <View style={[styles.divider, { backgroundColor: divider }]} />
          {actions.map((a, i) => (
            <View key={a.label}>
              {i > 0 ? <View style={[styles.divider, { backgroundColor: divider }]} /> : null}
              <Pressable
                onPress={() => {
                  onClose();
                  a.onPress();
                }}
                style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}>
                <Text
                  style={[
                    styles.actionText,
                    { color: colorFor(a.style), fontWeight: a.style === 'cancel' ? '600' : '700' },
                  ]}>
                  {a.label}
                </Text>
              </Pressable>
            </View>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    overflow: 'hidden',
  },
  head: { padding: 24, paddingBottom: 18, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  message: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  divider: { height: StyleSheet.hairlineWidth, width: '100%' },
  action: { paddingVertical: 16, alignItems: 'center' },
  actionText: { fontSize: 16 },
});
