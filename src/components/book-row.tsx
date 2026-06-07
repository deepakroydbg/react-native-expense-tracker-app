import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { BookMenuSheet } from '@/components/book-menu-sheet';
import { useTheme } from '@/hooks/use-theme';
import { type BookWithBalance } from '@/lib/books';
import { formatCurrency, shortDate } from '@/lib/format';

export function BookRow({
  book,
  color,
  highlight = false,
  onPress,
  onRename,
  onDelete,
}: {
  book: BookWithBalance;
  color: string;
  highlight?: boolean;
  onPress: () => void;
  onRename: (book: BookWithBalance) => void;
  onDelete: (book: BookWithBalance) => void;
}) {
  const c = useTheme();
  const positive = book.balance >= 0;
  const [menuOpen, setMenuOpen] = useState(false);

  const scale = useRef(new Animated.Value(1)).current;
  const flash = useRef(new Animated.Value(0)).current;

  // Fix 6I: briefly flash a newly created book card.
  useEffect(() => {
    if (highlight) {
      flash.setValue(1);
      Animated.timing(flash, { toValue: 0, duration: 1200, useNativeDriver: false }).start();
    }
  }, [highlight, flash]);

  const animatedBg = flash.interpolate({
    inputRange: [0, 1],
    outputRange: [c.card, color + '22'],
  });

  return (
    <>
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: animatedBg,
            borderColor: c.border,
            borderLeftColor: '#2563eb',
            transform: [{ scale }],
          },
        ]}>
        <Pressable
          onPress={onPress}
          onPressIn={() =>
            Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start()
          }
          onPressOut={() =>
            Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start()
          }
          style={styles.inner}>
          <View style={[styles.icon, { backgroundColor: color }]}>
            <Ionicons name="book" size={22} color="#fff" />
          </View>
          <View style={styles.middle}>
            <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
              {book.name}
            </Text>
            <Text style={[styles.updated, { color: c.textSecondary }]} numberOfLines={1}>
              Updated on {shortDate(book.updated_at)}
            </Text>
          </View>
          <View style={styles.rightArea}>
            <Text
              style={[styles.balance, { color: positive ? c.success : c.danger }]}
              numberOfLines={1}>
              {positive ? '' : '-'}
              {formatCurrency(Math.abs(book.balance))}
            </Text>
            <Pressable onPress={() => setMenuOpen(true)} hitSlop={10} style={styles.menuBtn}>
              <Ionicons name="ellipsis-vertical" size={20} color={c.textSecondary} />
            </Pressable>
          </View>
        </Pressable>
      </Animated.View>

      <BookMenuSheet
        visible={menuOpen}
        bookName={book.name}
        onClose={() => setMenuOpen(false)}
        onRename={() => onRename(book)}
        onDelete={() => onDelete(book)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '700' },
  updated: { fontSize: 12 },
  rightArea: {
    width: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  balance: { flexShrink: 1, fontSize: 15, fontWeight: '800', textAlign: 'right' },
  menuBtn: { paddingLeft: 2, paddingVertical: 4 },
});
