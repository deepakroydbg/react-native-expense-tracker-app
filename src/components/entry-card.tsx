import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import ReAnimated, { FadeIn, LinearTransition, SlideOutLeft } from 'react-native-reanimated';

import { ActionDialog } from '@/components/ui/action-dialog';
import { useTheme } from '@/hooks/use-theme';
import { formatCurrency, formatSigned, formatTime, fromISODate, shortDate } from '@/lib/format';
import type { Transaction } from '@/lib/transactions';

export function EntryCard({
  tx,
  balance,
  onPress,
  onDelete,
}: {
  tx: Transaction;
  balance: number;
  onPress: () => void;
  onDelete: (id: string) => void;
}) {
  const c = useTheme();
  const swipeRef = useRef<Swipeable>(null);
  const isCredit = tx.type === 'credit';
  const [confirmOpen, setConfirmOpen] = useState(false);

  const confirmDelete = () => setConfirmOpen(true);

  return (
    <ReAnimated.View
      entering={FadeIn.duration(200)}
      exiting={SlideOutLeft.duration(250)}
      layout={LinearTransition.duration(200)}>
    <Swipeable
      ref={swipeRef}
      renderRightActions={() => (
        <Pressable onPress={confirmDelete} style={[styles.deleteAction, { backgroundColor: c.danger }]}>
          <Ionicons name="trash" size={22} color="#fff" />
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      )}
      overshootRight={false}>
      <Pressable
        onPress={onPress}
        onLongPress={confirmDelete}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.75 : 1 },
        ]}>
        <View style={styles.left}>
          <View style={[styles.tag, { backgroundColor: c.backgroundSelected }]}>
            <Text style={[styles.tagText, { color: c.primary }]}>{tx.payment_method || 'Cash'}</Text>
          </View>
          {tx.note ? (
            <Text style={[styles.note, { color: c.text }]} numberOfLines={2}>
              {tx.note}
            </Text>
          ) : (
            <Text style={[styles.note, { color: c.textSecondary }]} numberOfLines={1}>
              {tx.category || 'Other'}
            </Text>
          )}
          <Text style={[styles.byline, { color: c.textSecondary }]}>
            {shortDate(fromISODate(tx.entry_date))}, {formatTime(tx.created_at)}
          </Text>
        </View>

        <View style={styles.right}>
          <Text style={[styles.amount, { color: isCredit ? c.success : c.danger }]}>
            {formatSigned(Number(tx.amount), tx.type)}
          </Text>
          <Text style={[styles.balance, { color: c.textSecondary }]}>
            Balance: {formatCurrency(balance)}
          </Text>
        </View>
      </Pressable>
    </Swipeable>
    <ActionDialog
      visible={confirmOpen}
      title="Delete Entry?"
      message="This entry will be permanently deleted."
      onClose={() => {
        setConfirmOpen(false);
        swipeRef.current?.close();
      }}
      actions={[
        { label: 'Delete Entry', style: 'destructive', onPress: () => onDelete(tx.id) },
        { label: 'Cancel', style: 'cancel', onPress: () => swipeRef.current?.close() },
      ]}
    />
    </ReAnimated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  left: { flex: 1, gap: 6 },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  tagText: { fontSize: 12, fontWeight: '700' },
  note: { fontSize: 15, fontWeight: '600' },
  byline: { fontSize: 12, fontWeight: '500' },
  right: { alignItems: 'flex-end', justifyContent: 'flex-start', gap: 6 },
  amount: { fontSize: 18, fontWeight: '800' },
  balance: { fontSize: 12, fontWeight: '500' },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    borderRadius: 14,
    marginLeft: 8,
    gap: 2,
  },
  deleteText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
