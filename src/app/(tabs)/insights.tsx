import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/error-boundary';
import { InsightsDonut } from '@/components/insights-donut';
import { AnimatedAmount } from '@/components/ui/animated-number';
import { useTheme } from '@/hooks/use-theme';
import { listBooks, type BookWithBalance } from '@/lib/books';
import { getCategory } from '@/lib/categories';
import { useCurrentBook } from '@/lib/current-book';
import { formatCurrency, formatSigned, fromISODate, shortDate } from '@/lib/format';
import { listByBook, summarize, type Transaction } from '@/lib/transactions';

type Mode = 'credit' | 'debit';
const MODES: { label: string; value: Mode }[] = [
  { label: 'Cash In', value: 'credit' },
  { label: 'Cash Out', value: 'debit' },
];

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#f97316',
  Transport: '#3b82f6',
  Bills: '#a855f7',
  Salary: '#10b981',
  Shopping: '#ec4899',
  Health: '#ef4444',
  Rent: '#14b8a6',
  Other: '#94a3b8',
};
const GREEN_SHADES = ['#065f46', '#16a34a', '#22c55e', '#4ade80', '#14b8a6', '#34d399', '#059669'];

function calculatePercentage(amount: number, total: number): number {
  if (total === 0) return 0;
  const pct = (amount / total) * 100;
  if (pct === 0) return 0;
  if (pct < 1) return parseFloat(pct.toFixed(1));
  return Math.round(pct);
}
function pctLabel(amount: number, total: number): string {
  const p = calculatePercentage(amount, total);
  if (p === 0) return '0%';
  if (p < 1) return '< 1%';
  return `${p}%`;
}

export default function InsightsScreen() {
  return (
    <ErrorBoundary>
      <InsightsContent />
    </ErrorBoundary>
  );
}

function InsightsContent() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { currentBook, setCurrentBook } = useCurrentBook();

  const [books, setBooks] = useState<BookWithBalance[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('debit'); // default Cash Out
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  const selectedId = currentBook?.id ?? books[0]?.id ?? null;

  const load = useCallback(async () => {
    try {
      const list = await listBooks();
      setBooks(list);
      const id = currentBook?.id ?? list[0]?.id ?? null;
      if (id) {
        if (!currentBook && list[0]) setCurrentBook({ id: list[0].id, name: list[0].name });
        setTxs(await listByBook(id));
      } else {
        setTxs([]);
      }
    } catch {
      setTxs([]);
    } finally {
      setLoading(false);
    }
  }, [currentBook, setCurrentBook]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  // Reset highlighted segment when the mode or book changes.
  useEffect(() => setSelectedCat(null), [mode, selectedId]);

  const totals = useMemo(() => summarize(txs), [txs]);

  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    fade.setValue(0.3);
    Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [mode, fade]);

  const categoryData = useMemo(() => {
    const src = txs.filter((t) => t.type === mode);
    const map = new Map<string, number>();
    for (const t of src) {
      const name = t.category || 'Other';
      map.set(name, (map.get(name) ?? 0) + Math.abs(Number(t.amount)));
    }
    const rows = Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
    return rows.map((r, i) => ({
      ...r,
      color: mode === 'credit' ? GREEN_SHADES[i % GREEN_SHADES.length] : CATEGORY_COLORS[r.name] ?? '#94a3b8',
    }));
  }, [txs, mode]);

  const hasData = txs.length > 0;
  const centerAmount = mode === 'credit' ? totals.totalIn : totals.totalOut;
  const centerLabel = mode === 'credit' ? 'Cash In' : 'Cash Out';
  const accent = mode === 'credit' ? '#16a34a' : '#dc2626';

  const selectedRow = categoryData.find((r) => r.name === selectedCat) ?? null;
  const selectedEntries = useMemo(() => {
    if (!selectedCat) return [];
    return txs
      .filter((t) => (t.category || 'Other') === selectedCat && t.type === mode)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [txs, selectedCat, mode]);

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top + 12 }}>
      {/* FIXED top: title, chips, toggle, donut, detail card */}
      <View style={styles.fixedTop}>
        <Text style={[styles.title, { color: c.text }]}>Insights</Text>

        {books.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {books.map((b) => {
              const active = b.id === selectedId;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => setCurrentBook({ id: b.id, name: b.name })}
                  style={[
                    styles.chip,
                    active
                      ? { backgroundColor: c.primary, borderColor: c.primary, transform: [{ scale: 1.05 }], ...chipShadow }
                      : { backgroundColor: c.card, borderColor: c.border },
                  ]}>
                  <Text style={{ color: active ? c.onPrimary : c.text, fontWeight: '600', fontSize: 13 }}>{b.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {!loading && hasData && selectedId ? (
          <>
            <ModeToggle mode={mode} onChange={setMode} />
            <Animated.View style={{ opacity: fade }}>
              <InsightsDonut
                data={categoryData.map((r) => ({ name: r.name, value: r.amount, color: r.color }))}
                total={centerAmount}
                centerLabel={centerLabel}
                centerAmount={centerAmount}
                centerColor={accent}
                selected={selectedCat}
                onSelect={setSelectedCat}
              />
            </Animated.View>
            {selectedRow ? (
              <DetailCard
                key={selectedRow.name}
                name={selectedRow.name}
                color={selectedRow.color}
                amount={selectedRow.amount}
                amountColor={accent}
                pct={pctLabel(selectedRow.amount, centerAmount)}
                entries={selectedEntries}
                onClose={() => setSelectedCat(null)}
              />
            ) : null}
          </>
        ) : null}
      </View>

      {/* SCROLLABLE bottom */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : !selectedId || !hasData ? (
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyCircle, { borderColor: c.backgroundElement }]}>
            <Ionicons name="pie-chart-outline" size={44} color={c.textSecondary} />
          </View>
          <Text style={[styles.emptyText, { color: c.textSecondary }]}>
            {books.length === 0 ? 'Create a book and add entries to see insights' : 'Add entries to see insights'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>By category</Text>
          {categoryData.length === 0 ? (
            <Text style={[styles.emptyText, { color: c.textSecondary, marginTop: 4 }]}>
              {mode === 'credit' ? 'No Cash In entries yet.' : 'No Cash Out entries yet.'}
            </Text>
          ) : (
            categoryData.map((r) => {
              const active = selectedCat === r.name;
              return (
                <TouchableOpacity
                  key={r.name}
                  activeOpacity={0.7}
                  onPress={() => setSelectedCat(active ? null : r.name)}
                  style={[
                    styles.catRow,
                    { backgroundColor: active ? c.backgroundSelected : c.card },
                    active ? { borderWidth: 1.5, borderColor: r.color } : { borderWidth: 1, borderColor: 'transparent' },
                    cardShadow,
                  ]}>
                  <View style={[styles.dot, { backgroundColor: r.color }]} />
                  <Text style={[styles.catName, { color: c.text }]} numberOfLines={1}>
                    {r.name}
                  </Text>
                  <Text style={[styles.catPct, { color: c.textSecondary }]}>{pctLabel(r.amount, centerAmount)}</Text>
                  <Text style={[styles.catAmt, { color: c.text }]}>{formatCurrency(r.amount)}</Text>
                  <Ionicons name="chevron-forward" size={16} color={c.textSecondary} />
                </TouchableOpacity>
              );
            })
          )}

          <View style={styles.cardsRow}>
            <View style={[styles.statCard, { backgroundColor: c.successSoft }, cardShadow]}>
              <Text style={[styles.statLabel, { color: c.textSecondary }]}>Cash In</Text>
              <AnimatedAmount value={totals.totalIn} style={[styles.statValue, { color: '#16a34a' }]} />
            </View>
            <View style={[styles.statCard, { backgroundColor: c.dangerSoft }, cardShadow]}>
              <Text style={[styles.statLabel, { color: c.textSecondary }]}>Cash Out</Text>
              <AnimatedAmount value={totals.totalOut} style={[styles.statValue, { color: '#dc2626' }]} />
            </View>
          </View>
          <NetCard net={totals.net} />
        </ScrollView>
      )}
    </View>
  );
}

function DetailCard({
  name,
  color,
  amount,
  amountColor,
  pct,
  entries,
  onClose,
}: {
  name: string;
  color: string;
  amount: number;
  amountColor: string;
  pct: string;
  entries: Transaction[];
  onClose: () => void;
}) {
  const c = useTheme();
  const cat = getCategory(name);
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [v]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const shown = entries.slice(0, 5);

  return (
    <Animated.View
      style={[
        styles.detailCard,
        { backgroundColor: c.card, borderColor: c.border, borderLeftColor: color, opacity: v, transform: [{ translateY }] },
      ]}>
      <View style={styles.detailHead}>
        <View style={[styles.detailIcon, { backgroundColor: color + '22' }]}>
          <Ionicons name={cat.icon} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.detailName, { color: c.text }]}>{name}</Text>
          <Text style={[styles.detailMeta, { color: c.textSecondary }]}>
            {pct} of total · {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </Text>
        </View>
        <Text style={[styles.detailAmount, { color: amountColor }]}>{formatCurrency(amount)}</Text>
        <Pressable onPress={onClose} hitSlop={8} style={{ marginLeft: 8 }}>
          <Ionicons name="close" size={18} color={c.textSecondary} />
        </Pressable>
      </View>
      <View style={[styles.detailDivider, { backgroundColor: c.border }]} />
      {shown.map((t) => (
        <View key={t.id} style={styles.detailRow}>
          <Text style={[styles.detailDate, { color: c.textSecondary }]}>{shortDate(fromISODate(t.entry_date))}</Text>
          <Text style={[styles.detailRowAmt, { color: t.type === 'credit' ? '#16a34a' : '#dc2626' }]}>
            {formatSigned(Number(t.amount), t.type)}
          </Text>
        </View>
      ))}
      {entries.length > 5 ? (
        <Text style={[styles.detailMore, { color: c.textSecondary }]}>and {entries.length - 5} more</Text>
      ) : null}
    </Animated.View>
  );
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const [w, setW] = useState(0);
  const slide = useRef(new Animated.Value(MODES.findIndex((m) => m.value === mode))).current;
  useEffect(() => {
    Animated.timing(slide, {
      toValue: MODES.findIndex((m) => m.value === mode),
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [mode, slide]);
  const pillW = w > 0 ? (w - 6) / 2 : 0;
  return (
    <View style={styles.modeToggle} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Animated.View
        style={[
          styles.modePill,
          { width: pillW, transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [0, pillW] }) }] },
        ]}
      />
      {MODES.map((m) => {
        const active = m.value === mode;
        return (
          <Pressable key={m.value} style={styles.modeHalf} onPress={() => onChange(m.value)}>
            <Text style={{ color: active ? '#fff' : '#64748b', fontWeight: '700', fontSize: 13 }}>{m.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function NetCard({ net }: { net: number }) {
  const x = useRef(new Animated.Value(-1)).current;
  useEffect(() => {
    Animated.timing(x, { toValue: 1, duration: 1100, delay: 300, useNativeDriver: true }).start();
  }, [x]);
  const translateX = x.interpolate({ inputRange: [-1, 1], outputRange: [-220, 420] });
  return (
    <View style={[styles.netCard, { backgroundColor: '#2563eb' }]}>
      <Animated.View pointerEvents="none" style={[styles.shine, { transform: [{ translateX }, { rotate: '18deg' }] }]} />
      <Text style={styles.netLabel}>Net Balance</Text>
      <AnimatedAmount value={net} style={styles.netValue} />
    </View>
  );
}

const chipShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.12,
  shadowRadius: 4,
  elevation: 3,
};
const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 6,
  elevation: 2,
};

const styles = StyleSheet.create({
  fixedTop: { paddingHorizontal: 20 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 12 },
  chips: { gap: 8, paddingVertical: 4, paddingRight: 8, paddingLeft: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 30 },
  emptyCircle: { width: 140, height: 140, borderRadius: 70, borderWidth: 18, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center' },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 3,
    height: 40,
    marginTop: 6,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  modePill: { position: 'absolute', left: 3, top: 3, height: 34, borderRadius: 10, backgroundColor: '#2563eb' },
  modeHalf: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  catName: { flex: 1, fontSize: 15, fontWeight: '700' },
  catPct: { fontSize: 13 },
  catAmt: { fontSize: 14, fontWeight: '800' },
  detailCard: { borderRadius: 14, borderWidth: 1, borderLeftWidth: 4, padding: 14, marginTop: 8, ...cardShadow },
  detailHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  detailName: { fontSize: 17, fontWeight: '800' },
  detailMeta: { fontSize: 12, marginTop: 2 },
  detailAmount: { fontSize: 17, fontWeight: '800' },
  detailDivider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  detailDate: { fontSize: 13 },
  detailRowAmt: { fontSize: 13, fontWeight: '700' },
  detailMore: { fontSize: 12, marginTop: 6, fontStyle: 'italic' },
  cardsRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  statCard: { flex: 1, borderRadius: 16, padding: 14, gap: 6 },
  statLabel: { fontSize: 13, fontWeight: '600' },
  statValue: { fontSize: 18, fontWeight: '800' },
  netCard: { borderRadius: 18, padding: 18, gap: 6, marginTop: 12, overflow: 'hidden' },
  netLabel: { fontSize: 14, fontWeight: '600', color: '#fff', opacity: 0.9 },
  netValue: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  shine: { position: 'absolute', top: -20, bottom: -20, width: 60, backgroundColor: 'rgba(255,255,255,0.25)' },
});
