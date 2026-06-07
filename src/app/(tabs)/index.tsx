import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AddBookSheet } from '@/components/add-book-sheet';
import { AddBookButton } from '@/components/add-book-button';
import { Avatar } from '@/components/avatar';
import { BookRow } from '@/components/book-row';
import { ProfileSheet } from '@/components/profile-sheet';
import { RenameSheet } from '@/components/rename-sheet';
import { useTheme } from '@/hooks/use-theme';
import { bookColor, deleteBook, listBooks, renameBook, type Book, type BookWithBalance } from '@/lib/books';
import { useCurrentBook } from '@/lib/current-book';
import { useProfile } from '@/lib/profile';

type SortMode = 'recent' | 'name' | 'balance';

export default function BooksScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setCurrentBook } = useCurrentBook();
  const { avatarUrl, initials } = useProfile();

  const [books, setBooks] = useState<BookWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sort, setSort] = useState<SortMode>('recent');

  const [addOpen, setAddOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<BookWithBalance | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Fix 8: clear any open overlay when the app returns to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        setAddOpen(false);
        setRenameTarget(null);
        setProfileOpen(false);
      }
    });
    return () => sub.remove();
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await listBooks();
      setBooks(data);
    } catch (e: any) {
      const msg = String(e?.message ?? '').toLowerCase();
      setError(
        msg.includes('network') || msg.includes('fetch')
          ? 'No internet connection. Pull down to retry.'
          : 'Could not load your books. Pull down to retry.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const openBook = (book: Book) => {
    setCurrentBook({ id: book.id, name: book.name });
    router.push({ pathname: '/book/[id]', params: { id: book.id } });
  };

  const performDelete = async (book: BookWithBalance) => {
    setBooks((prev) => prev.filter((b) => b.id !== book.id)); // optimistic
    try {
      await deleteBook(book.id);
    } catch (e) {
      console.error('Delete book failed:', e);
      Alert.alert('Error', 'Could not delete the book. Please try again.');
      load();
    }
  };

  const onRenameSubmit = async (name: string) => {
    if (!renameTarget) return;
    await renameBook(renameTarget.id, name);
    setRenameTarget(null);
    load();
  };

  const visibleBooks = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = q ? books.filter((b) => b.name.toLowerCase().includes(q)) : books;
    list = [...list];
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'balance') list.sort((a, b) => b.balance - a.balance);
    // 'recent' keeps the server order (updated_at desc).
    return list;
  }, [books, search, sort]);

  const cycleSort = () => {
    setSort((s) => (s === 'recent' ? 'name' : s === 'name' ? 'balance' : 'recent'));
  };

  const sortLabel = sort === 'recent' ? 'Recent' : sort === 'name' ? 'Name' : 'Balance';

  return (
    <View style={[styles.screen, { backgroundColor: c.background, paddingTop: insets.top }]}>
      {/* Top header: left = brand (→ About), right = profile photo (→ Profile sheet) */}
      <View style={styles.topHeader}>
        <Pressable style={styles.account} hitSlop={6} onPress={() => router.push('/about')}>
          <Image source={require('@/assets/images/icon.png')} style={styles.brandLogo} resizeMode="contain" />
          <Text style={styles.brandName} numberOfLines={1}>
            MyKhata Book
          </Text>
        </Pressable>
        <Pressable hitSlop={8} onPress={() => setProfileOpen(true)} style={styles.avatarBtn}>
          <Avatar size={38} url={avatarUrl} initials={initials} />
        </Pressable>
      </View>

      {/* "Your Books" + actions */}
      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: c.text }]}>Your Books</Text>
        <View style={styles.sectionActions}>
          <Pressable onPress={cycleSort} hitSlop={8} style={styles.sortBtn}>
            <Ionicons name="swap-vertical" size={18} color={c.textSecondary} />
            <Text style={[styles.sortText, { color: c.textSecondary }]}>{sortLabel}</Text>
          </Pressable>
          <Pressable onPress={() => setSearchOpen((s) => !s)} hitSlop={8}>
            <Ionicons name="search" size={20} color={c.textSecondary} />
          </Pressable>
        </View>
      </View>

      {searchOpen ? (
        <View style={[styles.searchBox, { backgroundColor: c.card, borderColor: c.border }]}>
          <Ionicons name="search" size={18} color={c.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search books"
            placeholderTextColor={c.textSecondary}
            style={[styles.searchInput, { color: c.text }]}
            autoFocus
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={c.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : (
        <FlatList
          data={visibleBooks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 80).springify().damping(18)}>
              <BookRow
                book={item}
                color={bookColor(index)}
                highlight={item.id === highlightId}
                onPress={() => openBook(item)}
                onRename={setRenameTarget}
                onDelete={performDelete}
              />
            </Animated.View>
          )}
          ListHeaderComponent={
            error ? (
              <View style={[styles.errorBox, { backgroundColor: c.dangerSoft }]}>
                <Ionicons name="cloud-offline" size={18} color={c.danger} />
                <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="book-outline" size={52} color={c.textSecondary} />
              <Text style={[styles.emptyTitle, { color: c.text }]}>
                {search ? 'No books match' : 'No books yet'}
              </Text>
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                {search ? 'Try a different search.' : 'Create your first book to start tracking.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Add new book pill */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
        <AddBookButton onPress={() => setAddOpen(true)} />
      </View>

      <AddBookSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        existingNames={books.map((b) => b.name)}
        onCreated={(book) => {
          setAddOpen(false);
          setHighlightId(book.id);
          openBook(book);
        }}
      />
      <RenameSheet
        visible={!!renameTarget}
        initialName={renameTarget?.name ?? ''}
        onClose={() => setRenameTarget(null)}
        onSubmit={onRenameSubmit}
      />

      <ProfileSheet visible={profileOpen} onClose={() => setProfileOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12,
  },
  account: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  brandLogo: { width: 36, height: 36, borderRadius: 10 },
  brandName: { fontSize: 17, fontWeight: '700', color: '#1e3a5f', flexShrink: 1 },
  avatarBtn: {
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  sectionActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortText: { fontSize: 13, fontWeight: '600' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    marginHorizontal: 20,
    marginTop: 8,
  },
  searchInput: { flex: 1, fontSize: 15, height: '100%' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 120 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: { flex: 1, fontSize: 14 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 70, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 30 },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  addPill: {
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  addPillText: { fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
});
