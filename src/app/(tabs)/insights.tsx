import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/error-boundary";
import { InsightsDonut } from "@/components/insights-donut";
import { ScreenBackground } from "@/components/ui/screen-background";
import { AnimatedAmount } from "@/components/ui/animated-number";
import { useTheme } from "@/hooks/use-theme";
import { getCachedBooks, listBooks, type BookWithBalance } from "@/lib/books";
import { getCategory, useCategoryLookup } from "@/lib/categories";
import { useCurrentBook } from "@/lib/current-book";
import {
  dayMonth,
  formatCurrency,
  formatSigned,
  fromISODate,
} from "@/lib/format";
import {
  getCachedByBook,
  listByBook,
  summarize,
  type Transaction,
} from "@/lib/transactions";

type Mode = "credit" | "debit";
const MODES: { label: string; value: Mode }[] = [
  { label: "Cash In", value: "credit" },
  { label: "Cash Out", value: "debit" },
];

function calculatePercentage(amount: number, total: number): number {
  if (total === 0) return 0;
  const pct = (amount / total) * 100;
  if (pct === 0) return 0;
  if (pct < 1) return parseFloat(pct.toFixed(1));
  return Math.round(pct);
}
function pctLabel(amount: number, total: number): string {
  const p = calculatePercentage(amount, total);
  if (p === 0) return "0%";
  if (p < 1) return "< 1%";
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
  const categoryOf = useCategoryLookup();

  const initialId = currentBook?.id ?? getCachedBooks()?.[0]?.id ?? null;
  const [books, setBooks] = useState<BookWithBalance[]>(
    () => getCachedBooks() ?? [],
  );
  const [txs, setTxs] = useState<Transaction[]>(() =>
    initialId ? (getCachedByBook(initialId) ?? []) : [],
  );
  const [loading, setLoading] = useState(() =>
    initialId
      ? getCachedByBook(initialId) === undefined
      : getCachedBooks() === undefined,
  );
  const [mode, setMode] = useState<Mode>("debit"); // default Cash Out
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  const selectedId = currentBook?.id ?? books[0]?.id ?? null;

  const firstLoad = useRef(true);

  const load = useCallback(async () => {
    try {
      const list = await listBooks();
      setBooks(list);
      const id = currentBook?.id ?? list[0]?.id ?? null;
      if (id) {
        if (!currentBook && list[0])
          setCurrentBook({ id: list[0].id, name: list[0].name });
        const cached = getCachedByBook(id);
        if (cached) setTxs(cached); // instant paint before the network refresh
        setTxs(await listByBook(id));
      } else {
        setTxs([]);
      }
    } catch {
      setTxs([]);
    } finally {
      setLoading(false);
      firstLoad.current = false;
    }
  }, [currentBook, setCurrentBook]);

  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      const id = currentBook?.id ?? getCachedBooks()?.[0]?.id ?? null;
      const haveSomething =
        (id != null && getCachedByBook(id) !== undefined) ||
        getCachedBooks() !== undefined;
      if (firstLoad.current && !haveSomething) setLoading(true);
      load();
    }, [load, currentBook]),
  );

  // Reset highlighted segment when the mode or book changes.
  useEffect(() => setSelectedCat(null), [mode, selectedId]);

  const totals = useMemo(() => summarize(txs), [txs]);

  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    fade.setValue(0.3);
    Animated.timing(fade, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [mode, fade]);

  const categoryData = useMemo(() => {
    const src = txs.filter((t) => t.type === mode);
    const map = new Map<string, number>();
    for (const t of src) {
      const name = t.category || "Other";
      map.set(name, (map.get(name) ?? 0) + Math.abs(Number(t.amount)));
    }
    const rows = Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
    return rows.map((r) => ({
      ...r,
      color: categoryOf(r.name).color,
    }));
  }, [txs, mode, categoryOf]);

  const hasData = txs.length > 0;
  const centerAmount = mode === "credit" ? totals.totalIn : totals.totalOut;
  const centerLabel = mode === "credit" ? "Cash In" : "Cash Out";
  const accent = mode === "credit" ? c.cashInText : c.cashOutText;

  const selectedRow = categoryData.find((r) => r.name === selectedCat) ?? null;
  const selectedEntries = useMemo(() => {
    if (!selectedCat) return [];
    return txs
      .filter((t) => (t.category || "Other") === selectedCat && t.type === mode)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [txs, selectedCat, mode]);

  // Shared header pieces (title + book bar) — these scroll away above the sticky toggle.
  const header = (
    <Text style={[styles.title, styles.hPad, { color: c.text }]}>Insights</Text>
  );

  const bookChips =
    books.length > 0 ? (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsBar}
        contentContainerStyle={styles.chips}
      >
        {books.map((b) => {
          const active = b.id === selectedId;
          return (
            <Pressable
              key={b.id}
              onPress={() => setCurrentBook({ id: b.id, name: b.name })}
              style={[
                styles.chip,
                active
                  ? {
                      backgroundColor: c.primary,
                      borderColor: c.primary,
                      transform: [{ scale: 1.05 }],
                    }
                  : { backgroundColor: c.card, borderColor: c.border },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? c.onPrimary : c.text }]}>
                {b.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    ) : null;

  if (loading) {
    return (
      <ScreenBackground style={{ paddingTop: insets.top + 12 }}>
        {header}
        {bookChips}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      </ScreenBackground>
    );
  }

  if (!selectedId || !hasData) {
    return (
      <ScreenBackground style={{ paddingTop: insets.top + 12 }}>
        {header}
        {bookChips}
        <View style={styles.emptyWrap}>
          <View
            style={[styles.emptyCircle, { borderColor: c.backgroundElement }]}
          >
            <Ionicons
              name="pie-chart-outline"
              size={44}
              color={c.textSecondary}
            />
          </View>
          <Text style={[styles.emptyText, { color: c.textSecondary }]}>
            {books.length === 0
              ? "Create a book and add entries to see insights"
              : "Add entries to see insights"}
          </Text>
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground style={{ paddingTop: insets.top + 12 }}>
      <ScrollView
        ref={scrollRef}
        stickyHeaderIndices={[2]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {header}
        {bookChips ?? <View />}

        <View style={[styles.stickyToggle, { backgroundColor: c.gradientFrom }]}>
          <ModeToggle mode={mode} onChange={setMode} />
        </View>

        {/* Everything below scrolls under the sticky toggle */}
        <Animated.View style={[styles.hPad, { opacity: fade }]}>
          <InsightsDonut
            data={categoryData.map((r) => ({
              name: r.name,
              value: r.amount,
              color: r.color,
            }))}
            total={centerAmount}
            centerLabel={centerLabel}
            centerAmount={centerAmount}
            centerColor={accent}
            selected={selectedCat}
            onSelect={setSelectedCat}
          />
        </Animated.View>

        {selectedRow ? (
          <View style={styles.hPad}>
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
          </View>
        ) : null}

        <View style={[styles.hPad, styles.categorySection]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>
            By category
          </Text>
          {categoryData.length === 0 ? (
            <Text
              style={[
                styles.emptyText,
                { color: c.textSecondary, marginTop: 4 },
              ]}
            >
              {mode === "credit"
                ? "No Cash In entries yet."
                : "No Cash Out entries yet."}
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
                    active
                      ? { borderWidth: 1.5, borderColor: r.color }
                      : { borderWidth: 1, borderColor: "transparent" },
                  ]}
                >
                  <View style={[styles.dot, { backgroundColor: r.color }]} />
                  <Text
                    style={[styles.catName, { color: c.text }]}
                    numberOfLines={1}
                  >
                    {r.name}
                  </Text>
                  <Text style={[styles.catPct, { color: c.textSecondary }]}>
                    {pctLabel(r.amount, centerAmount)}
                  </Text>
                  <Text style={[styles.catAmt, { color: c.text }]}>
                    {formatCurrency(r.amount)}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={c.textSecondary}
                  />
                </TouchableOpacity>
              );
            })
          )}

          <FlowCard
            totalIn={totals.totalIn}
            totalOut={totals.totalOut}
            net={totals.net}
          />
        </View>
      </ScrollView>
    </ScreenBackground>
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
    Animated.timing(v, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [v]);
  const translateY = v.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });

  return (
    <Animated.View
      style={[
        styles.detailCard,
        {
          backgroundColor: c.card,
          borderColor: c.border,
          borderLeftColor: color,
          opacity: v,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.detailHead}>
        <View style={[styles.detailIcon, { backgroundColor: color + "22" }]}>
          <Ionicons name={cat.icon} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.detailName, { color: c.text }]}>{name}</Text>
          <Text style={[styles.detailMeta, { color: c.textSecondary }]}>
            {pct} of total · {entries.length}{" "}
            {entries.length === 1 ? "entry" : "entries"}
          </Text>
        </View>
        <Text style={[styles.detailAmount, { color: amountColor }]}>
          {formatCurrency(amount)}
        </Text>
        <Pressable onPress={onClose} hitSlop={8} style={{ marginLeft: 8 }}>
          <Ionicons name="close" size={18} color={c.textSecondary} />
        </Pressable>
      </View>
      <View style={[styles.detailDivider, { backgroundColor: c.border }]} />
      <ScrollView
        style={styles.detailScroll}
        nestedScrollEnabled
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        {entries.map((t) => (
          <View key={t.id} style={styles.detailRow}>
            <Text style={[styles.detailDate, { color: c.textSecondary }]}>
              {dayMonth(fromISODate(t.entry_date))}
            </Text>
            <Text
              style={[styles.detailNote, { color: c.text }]}
              numberOfLines={1}
            >
              {t.note?.trim() ? t.note : name}
            </Text>
            <Text
              style={[
                styles.detailRowAmt,
                { color: t.type === "credit" ? c.cashInText : c.cashOutText },
              ]}
            >
              {formatSigned(Number(t.amount), t.type)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  const c = useTheme();
  const [w, setW] = useState(0);
  const slide = useRef(
    new Animated.Value(MODES.findIndex((m) => m.value === mode)),
  ).current;
  useEffect(() => {
    Animated.timing(slide, {
      toValue: MODES.findIndex((m) => m.value === mode),
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [mode, slide]);
  const pillW = w > 0 ? (w - 6) / 2 : 0;
  return (
    <View
      style={[styles.modeToggle, { backgroundColor: c.card, borderColor: c.border }]}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[
          styles.modePill,
          { backgroundColor: c.primary },
          {
            width: pillW,
            transform: [
              {
                translateX: slide.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, pillW],
                }),
              },
            ],
          },
        ]}
      />
      {MODES.map((m) => {
        const active = m.value === mode;
        return (
          <Pressable
            key={m.value}
            style={styles.modeHalf}
            onPress={() => onChange(m.value)}
          >
            <Text
              style={{
                color: active ? c.onPrimary : c.textSecondary,
                fontFamily: "Manrope_700Bold", fontWeight: "700",
                fontSize: 13,
              }}
            >
              {m.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function FlowRow({
  color,
  label,
  amount,
  share,
}: {
  color: string;
  label: string;
  amount: number;
  share: number;
}) {
  const c = useTheme();
  return (
    <View style={styles.flowRow}>
      <View style={[styles.flowDot, { backgroundColor: color }]} />
      <Text style={[styles.flowRowLabel, { color: c.text }]}>{label}</Text>
      <Text style={[styles.flowShare, { color: c.textSecondary }]}>
        {share > 0 ? `${Math.round(share)}%` : "—"}
      </Text>
      <AnimatedAmount
        value={amount}
        style={[styles.flowAmount, { color: c.text }]}
      />
    </View>
  );
}

function FlowCard({
  totalIn,
  totalOut,
  net,
}: {
  totalIn: number;
  totalOut: number;
  net: number;
}) {
  const c = useTheme();
  const flow = totalIn + totalOut;
  const inShare = flow > 0 ? (totalIn / flow) * 100 : 0;
  const outShare = flow > 0 ? (totalOut / flow) * 100 : 0;
  const netColor = net > 0 ? c.cashInText : net < 0 ? c.cashOutText : c.text;
  const trendIcon =
    net > 0 ? "trending-up" : net < 0 ? "trending-down" : "remove";

  return (
    <View
      style={[
        styles.flowCard,
        {
          backgroundColor: c.card,
          borderColor: c.border,
          borderLeftColor: netColor,
        },
      ]}
    >
      <View style={styles.flowHead}>
        <Text style={[styles.flowLabel, { color: c.textSecondary }]}>
          NET BALANCE
        </Text>
        <Ionicons name={trendIcon} size={16} color={netColor} />
      </View>
      <AnimatedAmount value={net} style={[styles.flowNet, { color: netColor }]} />

      <View style={[styles.flowBar, { backgroundColor: c.track }]}>
        <View
          style={[
            styles.flowFill,
            { width: `${inShare}%`, backgroundColor: c.cashInText },
          ]}
        />
        <View
          style={[
            styles.flowFill,
            { width: `${outShare}%`, backgroundColor: c.cashOutText },
          ]}
        />
      </View>

      <FlowRow
        color={c.cashInText}
        label="Cash In"
        amount={totalIn}
        share={inShare}
      />
      <FlowRow
        color={c.cashOutText}
        label="Cash Out"
        amount={totalOut}
        share={outShare}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hPad: { paddingHorizontal: 16 },
  title: {
    fontSize: 20,
    fontFamily: "Manrope_700Bold",
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  // flexGrow:0 stops the horizontal bar from expanding vertically (on Fabric a
  // horizontal ScrollView otherwise splits the column and its chips stretch into
  // tall cards); alignItems:center keeps each chip sized to its own text.
  chipsBar: { flexGrow: 0, flexShrink: 0, alignSelf: "stretch" },
  chips: {
    gap: 8,
    paddingVertical: 4,
    paddingRight: 8,
    paddingLeft: 16,
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 14,
    minHeight: 34,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontFamily: "Manrope_600SemiBold",
    fontWeight: "600",
    fontSize: 13,
    lineHeight: 17,
    textAlign: "center",
    includeFontPadding: false,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 30,
  },
  emptyCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { fontFamily: 'Manrope_500Medium', fontSize: 14, textAlign: "center" },
  stickyToggle: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 8 },
  modeToggle: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    padding: 3,
    height: 40,
    marginTop: 6,
    marginBottom: 4,
  },
  modePill: {
    position: "absolute",
    left: 3,
    top: 3,
    height: 34,
    borderRadius: 10,
  },
  modeHalf: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { paddingBottom: 40 },
  categorySection: { paddingTop: 8 },
  sectionTitle: { fontSize: 15, fontFamily: "Manrope_600SemiBold", fontWeight: "600", marginBottom: 12 },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  catName: { flex: 1, fontSize: 15, fontFamily: "Manrope_700Bold", fontWeight: "700" },
  catPct: { fontFamily: 'Manrope_500Medium', fontSize: 13 },
  catAmt: { fontSize: 14, fontFamily: "Manrope_800ExtraBold", fontWeight: "800" },
  detailCard: {
    borderRadius: 6,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 14,
    marginTop: 8,
  },
  detailHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  detailIcon: {
    width: 38,
    height: 38,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  detailName: { fontSize: 17, fontFamily: "Manrope_800ExtraBold", fontWeight: "800" },
  detailMeta: { fontFamily: 'Manrope_500Medium', fontSize: 12, marginTop: 2 },
  detailAmount: { fontSize: 17, fontFamily: "Manrope_800ExtraBold", fontWeight: "800" },
  detailDivider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 5,
  },
  detailDate: { fontFamily: 'Manrope_500Medium', fontSize: 13, width: 52 },
  detailNote: { flex: 1, fontSize: 13, fontFamily: "Manrope_600SemiBold", fontWeight: "600" },
  detailRowAmt: { fontSize: 13, fontFamily: "Manrope_700Bold", fontWeight: "700" },
  detailScroll: { maxHeight: 300 },
  flowCard: {
    borderRadius: 6,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 16,
    marginTop: 18,
  },
  flowHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  flowLabel: {
    fontSize: 11,
    fontFamily: "Manrope_700Bold",
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  flowNet: {
    fontSize: 26,
    fontFamily: "Manrope_800ExtraBold",
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  flowBar: {
    flexDirection: "row",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 14,
    marginBottom: 10,
  },
  flowFill: { height: 8 },
  flowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 5,
  },
  flowDot: { width: 8, height: 8, borderRadius: 4 },
  flowRowLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Manrope_600SemiBold",
    fontWeight: "600",
  },
  flowShare: {
    fontSize: 12,
    fontFamily: "Manrope_500Medium",
    fontWeight: "500",
    minWidth: 34,
    textAlign: "right",
  },
  flowAmount: {
    fontSize: 14,
    fontFamily: "Manrope_700Bold",
    fontWeight: "700",
    minWidth: 88,
    textAlign: "right",
  },
});
