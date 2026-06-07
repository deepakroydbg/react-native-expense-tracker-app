import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Easing,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookMenuSheet } from '@/components/book-menu-sheet';
import { EntryCard } from '@/components/entry-card';
import { EntrySheet } from '@/components/entry-sheet';
import { RenameSheet } from '@/components/rename-sheet';
import { ShareSheet } from '@/components/share-sheet';
import { AnimatedAmount } from '@/components/ui/animated-number';
import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/hooks/use-theme';
import { deleteBook, getBook, renameBook, touchBook } from '@/lib/books';
import { useCurrentBook } from '@/lib/current-book';
import { exportBookExcel, exportBookPDF } from '@/lib/export';
import {
  deleteTransaction,
  listByBook,
  runningBalances,
  summarize,
  type Transaction,
  type TxType,
} from '@/lib/transactions';

type SortMode = 'latest' | 'oldest' | 'high' | 'low' | 'name';
const SORT_OPTIONS: { label: string; value: SortMode }[] = [
  { label: 'Latest First', value: 'latest' },
  { label: 'Oldest First', value: 'oldest' },
  { label: 'High to Low', value: 'high' },
  { label: 'Low to High', value: 'low' },
  { label: 'By Name', value: 'name' },
];
type TypeFilter = 'all' | 'credit' | 'debit';
const TYPE_OPTIONS: { label: string; value: TypeFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Cash In', value: 'credit' },
  { label: 'Cash Out', value: 'debit' },
];

function sortEntries(list: Transaction[], mode: SortMode): Transaction[] {
  const arr = [...list];
  switch (mode) {
    case 'oldest':
      return arr.sort((a, b) => a.created_at.localeCompare(b.created_at));
    case 'high':
      return arr.sort((a, b) => Number(b.amount) - Number(a.amount));
    case 'low':
      return arr.sort((a, b) => Number(a.amount) - Number(b.amount));
    case 'name':
      return arr.sort((a, b) => (a.note ?? '').localeCompare(b.note ?? ''));
    case 'latest':
    default:
      return arr.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}

export default function BookDetailScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookId = id!;
  const { setCurrentBook } = useCurrentBook();
  const toast = useToast();
  const pulse = useRef(new Animated.Value(1)).current;

  // Fix 6C: gentle looping glow on the Cash In/Out buttons.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.02, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const [bookName, setBookName] = useState('');
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sortMode, setSortMode] = useState<SortMode>('latest');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortMenu, setSortMenu] = useState(false);
  const [typeMenu, setTypeMenu] = useState(false);

  const [entrySheet, setEntrySheet] = useState<{ open: boolean; type: TxType; editing: Transaction | null }>({
    open: false,
    type: 'credit',
    editing: null,
  });
  const [renameOpen, setRenameOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [bookMenu, setBookMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Fix 8: reset every overlay when the app returns to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        setSortMenu(false);
        setTypeMenu(false);
        setEntrySheet((p) => ({ ...p, open: false }));
        setRenameOpen(false);
        setShareOpen(false);
        setBookMenu(false);
      }
    });
    return () => sub.remove();
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [book, entries] = await Promise.all([getBook(bookId), listByBook(bookId)]);
      setBookName(book.name);
      setCurrentBook({ id: book.id, name: book.name });
      setTxs(entries);
    } catch (e: any) {
      const msg = String(e?.message ?? '').toLowerCase();
      setError(
        msg.includes('network') || msg.includes('fetch')
          ? 'No internet connection.'
          : 'Could not load this book.'
      );
    } finally {
      setLoading(false);
    }
  }, [bookId, setCurrentBook]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Running balance is always over ALL entries, chronologically.
  const balances = useMemo(() => runningBalances(txs), [txs]);

  // Type filter applies first; the summary reflects it.
  const filtered = useMemo(
    () => (typeFilter === 'all' ? txs : txs.filter((t) => t.type === typeFilter)),
    [txs, typeFilter]
  );

  const totals = useMemo(() => summarize(filtered), [filtered]);

  // Displayed list = filtered entries in the chosen sort order.
  const displayed = useMemo(() => sortEntries(filtered, sortMode), [filtered, sortMode]);

  const onDeleteEntry = async (txId: string) => {
    setTxs((prev) => prev.filter((t) => t.id !== txId));
    try {
      await deleteTransaction(txId);
      await touchBook(bookId);
    } catch (e) {
      console.error('Delete entry failed:', e);
      Alert.alert('Error', 'Could not delete the entry. Please try again.');
      load();
    }
  };

  const onRenameBook = async (name: string) => {
    await renameBook(bookId, name);
    setBookName(name);
    setCurrentBook({ id: bookId, name });
    setRenameOpen(false);
  };

  const onConfirmDeleteBook = async () => {
    try {
      await deleteBook(bookId);
      router.back();
    } catch (e) {
      console.error('Delete book failed:', e);
      Alert.alert('Error', 'Could not delete the book. Please try again.');
    }
  };

  const onExportExcel = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportBookExcel(bookName, txs);
    } catch (e: any) {
      Alert.alert('Export failed', e?.message || 'Could not export this book. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortMode)!.label;
  const typeLabel = TYPE_OPTIONS.find((o) => o.value === typeFilter)!.label;

  return (
    <View style={[styles.screen, { backgroundColor: c.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]} numberOfLines={1}>
          {bookName || 'Book'}
        </Text>
        <View style={styles.headerRight}>
          <Pressable hitSlop={8} style={styles.headerBtn} onPress={() => setShareOpen(true)}>
            <Ionicons name="share-social-outline" size={21} color={c.text} />
          </Pressable>
          <Pressable hitSlop={8} style={styles.headerBtn} onPress={onExportExcel} disabled={exporting}>
            {exporting ? (
              <ActivityIndicator size="small" color={c.primary} />
            ) : (
              <Ionicons name="document-text-outline" size={21} color={c.text} />
            )}
          </Pressable>
          <Pressable hitSlop={8} style={styles.headerBtn} onPress={() => setBookMenu(true)}>
            <Ionicons name="ellipsis-vertical" size={21} color={c.text} />
          </Pressable>
        </View>
      </View>

      {/* Filter row */}
      <View style={styles.filterRow}>
        <Ionicons name="options-outline" size={20} color={c.textSecondary} />
        <Pressable
          onPress={() => setSortMenu(true)}
          style={[styles.dropdown, { backgroundColor: c.card, borderColor: c.border }]}>
          <Ionicons name="swap-vertical" size={15} color={c.textSecondary} />
          <Text style={[styles.dropdownText, { color: c.text }]} numberOfLines={1}>
            {sortLabel}
          </Text>
          <Ionicons name="chevron-down" size={14} color={c.textSecondary} />
        </Pressable>
        <Pressable
          onPress={() => setTypeMenu(true)}
          style={[styles.dropdown, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.dropdownText, { color: c.text }]} numberOfLines={1}>
            {typeLabel}
          </Text>
          <Ionicons name="chevron-down" size={14} color={c.textSecondary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              <View
                style={[
                  styles.summary,
                  {
                    backgroundColor:
                      totals.net > 0 ? c.successSoft : totals.net < 0 ? c.dangerSoft : c.card,
                    borderColor: c.border,
                  },
                ]}>
                <View style={styles.sumRow}>
                  <Text style={[styles.sumLabel, { color: c.text }]}>Net Balance</Text>
                  <AnimatedAmount value={totals.net} style={[styles.sumValue, { color: c.text }]} />
                </View>
                <View style={[styles.divider, { backgroundColor: c.border }]} />
                <View style={styles.sumRow}>
                  <Text style={[styles.sumLabelSmall, { color: c.textSecondary }]}>Total In (+)</Text>
                  <AnimatedAmount
                    value={totals.totalIn}
                    style={[styles.sumValueSmall, { color: c.success }]}
                  />
                </View>
                <View style={styles.sumRow}>
                  <Text style={[styles.sumLabelSmall, { color: c.textSecondary }]}>Total Out (-)</Text>
                  <AnimatedAmount
                    value={totals.totalOut}
                    style={[styles.sumValueSmall, { color: c.danger }]}
                  />
                </View>
                <Pressable
                  onPress={() => {
                    setCurrentBook({ id: bookId, name: bookName });
                    router.push('/(tabs)/insights');
                  }}
                  style={styles.reportsBtn}>
                  <Text style={[styles.reportsText, { color: c.primary }]}>VIEW REPORTS</Text>
                  <Ionicons name="chevron-forward" size={16} color={c.primary} />
                </Pressable>
              </View>
              <Text style={[styles.showing, { color: c.textSecondary }]}>
                Showing {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
              </Text>
              {error ? (
                <View style={[styles.errorBox, { backgroundColor: c.dangerSoft }]}>
                  <Ionicons name="cloud-offline" size={18} color={c.danger} />
                  <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
                </View>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <EntryCard
              tx={item}
              balance={balances.get(item.id) ?? 0}
              onPress={() => setEntrySheet({ open: true, type: item.type, editing: item })}
              onDelete={onDeleteEntry}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={<EmptyEntries />}
        />
      )}

      {/* Bottom Cash In / Cash Out (Fix 5) */}
      <View
        style={[
          styles.bottomBar,
          { backgroundColor: c.card, paddingBottom: insets.bottom > 0 ? insets.bottom : 12 },
        ]}>
        <Animated.View style={[styles.bottomBtnWrap, { transform: [{ scale: pulse }] }]}>
          <Pressable
            onPress={() => setEntrySheet({ open: true, type: 'credit', editing: null })}
            style={({ pressed }) => [styles.bottomBtn, { backgroundColor: '#16a34a', opacity: pressed ? 0.9 : 1 }]}>
            <Ionicons name="arrow-down-circle" size={20} color="#fff" />
            <Text style={styles.bottomBtnText}>Cash In</Text>
          </Pressable>
        </Animated.View>
        <Animated.View style={[styles.bottomBtnWrap, { transform: [{ scale: pulse }] }]}>
          <Pressable
            onPress={() => setEntrySheet({ open: true, type: 'debit', editing: null })}
            style={({ pressed }) => [styles.bottomBtn, { backgroundColor: '#dc2626', opacity: pressed ? 0.9 : 1 }]}>
            <Ionicons name="arrow-up-circle" size={20} color="#fff" />
            <Text style={styles.bottomBtnText}>Cash Out</Text>
          </Pressable>
        </Animated.View>
      </View>

      {/* Entry add/edit sheet */}
      <EntrySheet
        visible={entrySheet.open}
        onClose={() => setEntrySheet((s) => ({ ...s, open: false }))}
        bookId={bookId}
        initialType={entrySheet.type}
        editing={entrySheet.editing}
        onSaved={() => {
          setEntrySheet((s) => ({ ...s, open: false }));
          toast.show('Entry saved ✓', 'success');
          load();
        }}
      />

      <RenameSheet
        visible={renameOpen}
        initialName={bookName}
        onClose={() => setRenameOpen(false)}
        onSubmit={onRenameBook}
      />

      <ShareSheet
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        bookName={bookName}
        onSharePDF={() => exportBookPDF(bookName, txs)}
        onShareExcel={() => exportBookExcel(bookName, txs)}
      />

      {/* Book 3-dot menu (bottom sheet) */}
      <BookMenuSheet
        visible={bookMenu}
        bookName={bookName}
        onClose={() => setBookMenu(false)}
        onRename={() => setRenameOpen(true)}
        onDelete={onConfirmDeleteBook}
      />

      {/* Sort + type menus */}
      <OptionMenu
        visible={sortMenu}
        title="Sort entries"
        options={SORT_OPTIONS}
        selected={sortMode}
        onSelect={(v) => {
          setSortMode(v as SortMode);
          setSortMenu(false);
        }}
        onClose={() => setSortMenu(false)}
      />
      <OptionMenu
        visible={typeMenu}
        title="Entry type"
        options={TYPE_OPTIONS}
        selected={typeFilter}
        onSelect={(v) => {
          setTypeFilter(v as TypeFilter);
          setTypeMenu(false);
        }}
        onClose={() => setTypeMenu(false)}
      />
    </View>
  );
}

function EmptyEntries() {
  const c = useTheme();
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bounce]);

  const iconY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const arrowY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, 8] });

  return (
    <View style={styles.empty}>
      <Animated.View style={{ transform: [{ translateY: iconY }] }}>
        <Ionicons name="receipt-outline" size={52} color={c.textSecondary} />
      </Animated.View>
      <Text style={[styles.emptyTitle, { color: c.text }]}>No entries yet</Text>
      <Text style={[styles.emptyText, { color: c.textSecondary }]}>
        👆 Tap the buttons below to add your first entry
      </Text>
      <Animated.View style={{ transform: [{ translateY: arrowY }], marginTop: 6 }}>
        <Ionicons name="arrow-down" size={26} color={c.primary} />
      </Animated.View>
    </View>
  );
}

function OptionMenu({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: { label: string; value: string }[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const c = useTheme();
  // Close on app resume (Fix 8).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') onClose();
    });
    return () => sub.remove();
  }, [onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.menuBackdrop} onPress={onClose}>
        <View style={[styles.menuCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.menuTitle, { color: c.textSecondary }]}>{title}</Text>
          {options.map((o) => {
            const active = o.value === selected;
            return (
              <Pressable
                key={o.value}
                onPress={() => onSelect(o.value)}
                style={[styles.menuItem, active && { backgroundColor: c.backgroundSelected }]}>
                <Text style={[styles.menuItemText, { color: c.text }]}>{o.label}</Text>
                {active ? <Ionicons name="checkmark" size={18} color={c.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  headerBtn: { padding: 4, minWidth: 28, alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  dropdownText: { flex: 1, fontSize: 14, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 110 },
  summary: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sumLabel: { fontSize: 16, fontWeight: '700' },
  sumValue: { fontSize: 18, fontWeight: '800' },
  sumLabelSmall: { fontSize: 14, fontWeight: '600' },
  sumValueSmall: { fontSize: 15, fontWeight: '800' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  reportsBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  reportsText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
  showing: { fontSize: 13, fontWeight: '500', marginTop: 12, marginBottom: 4, marginLeft: 2 },
  sectionDate: { fontSize: 13, fontWeight: '700', paddingTop: 14, paddingBottom: 8 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  errorText: { flex: 1, fontSize: 14 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 30 },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  bottomBtnWrap: { flex: 1 },
  bottomBtn: {
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  bottomBtnText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  menuBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  menuCard: { width: '100%', maxWidth: 320, borderRadius: 16, borderWidth: 1, padding: 8 },
  menuTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, paddingHorizontal: 10, paddingVertical: 8 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
  },
  menuItemText: { fontSize: 15, fontWeight: '600' },
});
