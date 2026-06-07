import { useEffect, useRef } from 'react';
import {
  AppState,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeMode } from '@/lib/theme-context';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Sticky content rendered BELOW the ScrollView (e.g. a Save button), flush to the bottom. */
  footer?: React.ReactNode;
  /** Wrap content in a ScrollView (for tall forms). Default true. */
  scroll?: boolean;
};

export function BottomSheet({ visible, onClose, title, children, footer, scroll = true }: Props) {
  const { scheme } = useThemeMode();
  const insets = useSafeAreaInsets();
  const sheetBg = scheme === 'dark' ? '#1c1c1e' : '#ffffff';

  // Fix 8: if the app is backgrounded with a sheet open, close it on resume.
  const wasVisible = useRef(visible);
  useEffect(() => {
    wasVisible.current = visible;
  }, [visible]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && wasVisible.current) onClose();
    });
    return () => sub.remove();
  }, [onClose]);

  // When there's a footer it owns the bottom inset (flush save button, no gap).
  const contentBottomPad = footer ? 8 : insets.bottom + 16;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} style={styles.flex}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: sheetBg }]}>
          <View style={styles.handle} />
          {title ? (
            <Text style={[styles.title, { color: scheme === 'dark' ? '#fff' : '#111' }]}>{title}</Text>
          ) : null}
          {scroll ? (
            <ScrollView
              style={styles.scroll}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[styles.contentH, { paddingBottom: contentBottomPad }]}>
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.contentH, { paddingBottom: contentBottomPad }]}>{children}</View>
          )}
          {footer ? (
            <View
              style={[
                styles.footer,
                { backgroundColor: sheetBg, paddingBottom: insets.bottom > 0 ? insets.bottom : 0 },
              ]}>
              {footer}
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    marginTop: 'auto',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    maxHeight: '92%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  scroll: { flexShrink: 1 },
  contentH: { paddingHorizontal: 20 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});
