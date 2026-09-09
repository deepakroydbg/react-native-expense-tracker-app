import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddBookSheet } from '@/components/add-book-sheet';
import { Avatar } from '@/components/avatar';
import { ErrorBoundary } from '@/components/error-boundary';
import { EmptyCard } from '@/components/ui/empty-card';
import { ScreenBackground } from '@/components/ui/screen-background';
import { useTheme } from '@/hooks/use-theme';
import { getCachedBooks, listBooks, type BookWithBalance } from '@/lib/books';
import { useCategoryLookup } from '@/lib/categories';
import { useCurrentBook } from '@/lib/current-book';
import { formatCurrency } from '@/lib/format';
import { useProfile } from '@/lib/profile';
import { getCachedByBook, listByBook, summarize, type Transaction } from '@/lib/transactions';

const MEDIUM = 'Manrope_500Medium';
const SEMIBOLD = 'Manrope_600SemiBold';
const BOLD = 'Manrope_700Bold';

const POSITIVE = '#4ade80';
const NEGATIVE = '#f87171';
const BAR_OLDER = '#1e3a5f';
const BAR_NEGATIVE = '#dc2626';
const MAX_BAR_HEIGHT = 140;
const MIN_BAR_HEIGHT = 48;
const TREND_SLOTS = 6;
const TOP_CATEGORIES = 3;
const HERO_GRADIENT: [string, string] = ['#3f4759', '#232833'];

function compactAmount(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${Math.round(value)}`;
}

function newestFirst(list: BookWithBalance[]): BookWithBalance[] {
  return [...list].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function firstNameOf(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0];
  return first || 'there';
}

export default function HomeScreen() {
  return (
    <ErrorBoundary>
      <HomeContent />
    </ErrorBoundary>
  );
}

function HomeContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useTheme();
  const { avatarUrl, fullName, initials } = useProfile();
  const { setCurrentBook } = useCurrentBook();
  const categoryOf = useCategoryLookup();

  const [books, setBooks] = useState<BookWithBalance[]>(() => getCachedBooks() ?? []);
  const [txs, setTxs] = useState<Transaction[]>(() => {
    const first = newestFirst(getCachedBooks() ?? [])[0];
    return first ? getCachedByBook(first.id) ?? [] : [];
  });
  const [loading, setLoading] = useState(() => getCachedBooks() === undefined);
  const [addOpen, setAddOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await listBooks();
      setBooks(list);
      const current = newestFirst(list)[0];
      setTxs(current ? await listByBook(current.id) : []);
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') load();
    });
    return () => sub.remove();
  }, [load]);

  const byNewest = useMemo(() => newestFirst(books), [books]);
  const recent = byNewest[0];
  const totals = useMemo(() => summarize(txs), [txs]);

  const { topCategories, categoryCount } = useMemo(() => {
    const spend = txs.filter((tx) => tx.type === 'debit');
    const byName = new Map<string, number>();
    for (const tx of spend) {
      const name = tx.category || 'Other';
      byName.set(name, (byName.get(name) ?? 0) + Math.abs(Number(tx.amount)));
    }
    const total = Array.from(byName.values()).reduce((sum, n) => sum + n, 0);
    const ranked = Array.from(byName.entries()).sort((a, b) => b[1] - a[1]);
    return {
      categoryCount: ranked.length,
      topCategories: ranked.slice(0, TOP_CATEGORIES).map(([name, amount]) => ({
        name,
        amount,
        percent: total > 0 ? (amount / total) * 100 : 0,
        color: categoryOf(name).color,
        icon: categoryOf(name).icon,
      })),
    };
  }, [txs, categoryOf]);

  const barRecent = c.primary;
  const trend = useMemo(() => {
    const recentSix = byNewest.slice(0, TREND_SLOTS).reverse();
    const peak = Math.max(...recentSix.map((b) => Math.abs(b.balance)), 0);
    const bars = recentSix.map((b, i) => ({
      id: b.id,
      label: b.name,
      amount: b.balance,
      height:
        peak > 0
          ? Math.max(MIN_BAR_HEIGHT, (Math.abs(b.balance) / peak) * MAX_BAR_HEIGHT)
          : MIN_BAR_HEIGHT,
      color: b.balance < 0 ? BAR_NEGATIVE : i === recentSix.length - 1 ? barRecent : BAR_OLDER,
    }));
    const blanks = Array.from({ length: Math.max(0, TREND_SLOTS - bars.length) }, () => null);
    return [...bars, ...blanks];
  }, [byNewest, barRecent]);

  const openEntry = (type: 'credit' | 'debit') => {
    if (!recent) return;
    setCurrentBook({ id: recent.id, name: recent.name });
    router.push({ pathname: '/book/[id]', params: { id: recent.id, action: type } });
  };

  const isEmpty = !loading && !loadFailed && books.length === 0;
  const showRetry = !loading && loadFailed && books.length === 0;
  const balance = recent?.balance ?? 0;
  const balanceColor = balance > 0 ? POSITIVE : balance < 0 ? NEGATIVE : '#ffffff';

  return (
    <ScreenBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/app-icon.png')}
            style={styles.logo}
            resizeMode="cover"
          />
          <Text style={[styles.appName, { color: c.text }]}>MyKhata Book</Text>
          <View style={styles.headerSpacer} />
          <Avatar size={36} url={avatarUrl} initials={initials} />
        </View>

        <Text style={[styles.greeting, { color: c.textSecondary }]}>
          {greetingFor(new Date().getHours())}, {firstNameOf(fullName)} 👋
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={c.primary} style={styles.loader} />
        ) : showRetry ? (
          <View style={[styles.retry, { backgroundColor: c.card, borderColor: c.borderDashed }]}>
            <Ionicons name="cloud-offline-outline" size={22} color={c.textSecondary} />
            <Text style={[styles.retryTitle, { color: c.emptyTitle }]}>Could not load your books</Text>
            <Text style={[styles.retrySub, { color: c.textSecondary }]}>
              Check your connection and try again.
            </Text>
            <Pressable
              onPress={() => {
                setLoading(true);
                load();
              }}
              style={({ pressed }) => [
                styles.retryBtn,
                { backgroundColor: c.primary },
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.retryBtnText, { color: c.onPrimary }]}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <LinearGradient
              colors={HERO_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}>
              <Text style={styles.heroLabel}>
                {isEmpty ? 'No books yet · Net Balance' : `${recent?.name ?? ''} · Net Balance`}
              </Text>
              <Text
                style={[styles.heroAmount, { color: balanceColor }]}
                numberOfLines={1}
                adjustsFontSizeToFit>
                {balance < 0 ? '-' : ''}
                {formatCurrency(Math.abs(balance))}
              </Text>

              {isEmpty ? (
                <Pressable
                  onPress={() => setAddOpen(true)}
                  style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
                  <Ionicons name="add" size={14} color="#ffffff" />
                  <Text style={styles.ctaText}>Create your first book</Text>
                </Pressable>
              ) : (
                <View style={styles.statRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Total In</Text>
                    <Text
                      style={[styles.statValue, { color: POSITIVE }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit>
                      {formatCurrency(totals.totalIn)}
                    </Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Total Out</Text>
                    <Text
                      style={[styles.statValue, { color: NEGATIVE }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit>
                      {formatCurrency(totals.totalOut)}
                    </Text>
                  </View>
                </View>
              )}
            </LinearGradient>

            {isEmpty ? null : (
              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => openEntry('credit')}
                  style={({ pressed }) => [
                    styles.action,
                    { backgroundColor: c.cashInBg, borderColor: c.cashInBorder },
                    pressed && styles.pressed,
                  ]}>
                  <Ionicons name="arrow-down-circle-outline" size={24} color={c.cashInText} />
                  <Text style={[styles.actionTitle, { color: c.cashInText }]}>+ Cash In</Text>
                  <Text style={[styles.actionSub, { color: c.textSecondary }]}>Add income</Text>
                </Pressable>
                <Pressable
                  onPress={() => openEntry('debit')}
                  style={({ pressed }) => [
                    styles.action,
                    { backgroundColor: c.cashOutBg, borderColor: c.cashOutBorder },
                    pressed && styles.pressed,
                  ]}>
                  <Ionicons name="arrow-up-circle-outline" size={24} color={c.cashOutText} />
                  <Text style={[styles.actionTitle, { color: c.cashOutText }]}>- Cash Out</Text>
                  <Text style={[styles.actionSub, { color: c.textSecondary }]}>Add expense</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={[styles.sectionTitle, { color: c.text }]}>Spending by category</Text>
                {categoryCount > TOP_CATEGORIES ? (
                  <Pressable onPress={() => router.push('/(tabs)/insights')} hitSlop={8}>
                    <Text style={[styles.seeAll, { color: c.primary }]}>See all</Text>
                  </Pressable>
                ) : null}
              </View>

              {topCategories.length === 0 ? (
                isEmpty || ready ? (
                  <EmptyCard
                    icon="bar-chart-outline"
                    title="No spending yet"
                    subtext="Add entries to a book and your top categories will show up here"
                  />
                ) : null
              ) : (
                <View style={styles.catList}>
                  {topCategories.map((cat) => (
                    <View key={cat.name} style={styles.catRow}>
                      <View style={[styles.catIcon, { backgroundColor: cat.color + '22' }]}>
                        <Ionicons name={cat.icon} size={17} color={cat.color} />
                      </View>
                      <View style={styles.catMiddle}>
                        <View style={styles.catLine}>
                          <Text style={[styles.catName, { color: c.text }]} numberOfLines={1}>
                            {cat.name}
                          </Text>
                          <Text style={[styles.catAmount, { color: c.text }]}>
                            {formatCurrency(cat.amount)}
                          </Text>
                        </View>
                        <View style={[styles.track, { backgroundColor: c.track }]}>
                          <View
                            style={[
                              styles.fill,
                              { width: `${cat.percent}%`, backgroundColor: cat.color },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: c.text }]}>6-months trend</Text>
              {isEmpty ? (
                <EmptyCard
                  icon="trending-up-outline"
                  title="Nothing to show yet"
                  subtext="Keep a book or two going and your trend will appear here"
                />
              ) : (
                <View style={styles.chart}>
                  {trend.map((bar, i) => (
                    <View key={bar ? bar.id : `slot-${i}`} style={styles.barColumn}>
                      {bar ? (
                        <>
                          <Text style={[styles.barValue, { color: c.textSecondary }]} numberOfLines={1}>
                            {compactAmount(bar.amount)}
                          </Text>
                          <View
                            style={[styles.bar, { height: bar.height, backgroundColor: bar.color }]}>
                            <Text
                              style={[styles.barName, { width: bar.height - 14 }]}
                              numberOfLines={1}
                              ellipsizeMode="tail">
                              {bar.label}
                            </Text>
                          </View>
                        </>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <AddBookSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        existingNames={books.map((b) => b.name)}
        onCreated={(book) => {
          setAddOpen(false);
          setCurrentBook({ id: book.id, name: book.name });
          load();
        }}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  loader: { marginTop: 40 },
  retry: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 6,
  },
  retryTitle: { fontSize: 13, fontFamily: SEMIBOLD },
  retrySub: { fontSize: 11, fontFamily: MEDIUM, textAlign: 'center' },
  retryBtn: {
    marginTop: 8,
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  retryBtnText: { fontSize: 13, fontFamily: SEMIBOLD },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 },
  logo: { width: 36, height: 36, borderRadius: 0 },
  appName: { fontSize: 17, fontFamily: BOLD, fontWeight: '700' },
  headerSpacer: { flex: 1 },
  greeting: { marginTop: 14, paddingHorizontal: 16, fontSize: 13, fontFamily: SEMIBOLD, fontWeight: '600' },
  hero: { marginHorizontal: 16, marginTop: 16, borderRadius: 6, padding: 20 },
  heroLabel: { fontSize: 12, color: '#a9b4c9', fontFamily: MEDIUM },
  heroAmount: { fontSize: 36, fontFamily: BOLD, marginTop: 6 },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statLabel: { fontSize: 11, color: '#c3cad9', fontFamily: MEDIUM },
  statValue: { fontSize: 15, fontFamily: SEMIBOLD, marginTop: 2 },
  cta: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 13,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  ctaText: { fontSize: 14, color: '#ffffff', fontFamily: SEMIBOLD },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14, marginHorizontal: 16 },
  action: { flex: 1, borderRadius: 6, borderWidth: 1, padding: 14 },
  pressed: { opacity: 0.7 },
  actionTitle: { fontSize: 14, fontFamily: SEMIBOLD, marginTop: 8 },
  actionSub: { fontSize: 11, fontFamily: MEDIUM, marginTop: 2 },
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 15, fontFamily: SEMIBOLD },
  seeAll: { fontSize: 12, fontFamily: MEDIUM },
  catList: { marginTop: 10, gap: 12 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catIcon: { width: 38, height: 38, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  catMiddle: { flex: 1 },
  catLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  catName: { flex: 1, fontSize: 13, fontFamily: MEDIUM },
  catAmount: { fontSize: 13, fontFamily: SEMIBOLD },
  track: { height: 4, borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 175, marginTop: 14 },
  barColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  barName: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: SEMIBOLD,
    fontWeight: '600',
    textAlign: 'center',
    transform: [{ rotate: '-90deg' }],
  },
  barValue: { fontSize: 9, fontFamily: MEDIUM, marginBottom: 4 },
});
