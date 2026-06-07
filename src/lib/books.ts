import { supabase } from '@/lib/supabase';
import { suggestNextBookName } from '@/lib/format';

export type Book = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type BookWithBalance = Book & {
  balance: number;
  entryCount: number;
};

const TABLE = 'books';

/** Preset palette cycled across books (by list order) for visual variety. */
export const BOOK_COLORS = ['#2563eb', '#16a34a', '#7c3aed', '#ea580c', '#0d9488', '#db2777'];

export function bookColor(index: number): string {
  return BOOK_COLORS[index % BOOK_COLORS.length];
}

/** Books for the user (newest activity first), each with its net balance. */
export async function listBooks(): Promise<BookWithBalance[]> {
  const { data: books, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;

  // One query for all of the user's transactions, aggregated client-side.
  const { data: txs, error: txError } = await supabase
    .from('transactions')
    .select('book_id, amount, type');
  if (txError) throw txError;

  const totals = new Map<string, { balance: number; count: number }>();
  for (const t of txs ?? []) {
    if (!t.book_id) continue;
    const cur = totals.get(t.book_id) ?? { balance: 0, count: 0 };
    cur.balance += t.type === 'credit' ? Number(t.amount) : -Number(t.amount);
    cur.count += 1;
    totals.set(t.book_id, cur);
  }

  return (books ?? []).map((b) => {
    const agg = totals.get(b.id);
    return { ...(b as Book), balance: agg?.balance ?? 0, entryCount: agg?.count ?? 0 };
  });
}

export async function getBook(id: string): Promise<Book> {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
  if (error) throw error;
  return data as Book;
}

export async function createBook(name: string): Promise<Book> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ name: name.trim() })
    .select()
    .single();
  if (error) throw error;
  return data as Book;
}

export async function renameBook(id: string, name: string): Promise<Book> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Book;
}

/** Deletes a book and all of its entries. */
export async function deleteBook(id: string): Promise<void> {
  const { error: txErr } = await supabase.from('transactions').delete().eq('book_id', id);
  if (txErr) throw txErr;
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

/** Bump updated_at so the book floats to the top after activity. */
export async function touchBook(id: string): Promise<void> {
  await supabase.from(TABLE).update({ updated_at: new Date().toISOString() }).eq('id', id);
}

/** Suggested name for a new book, based on the most recent book. */
export async function suggestBookName(): Promise<string> {
  const { data } = await supabase
    .from(TABLE)
    .select('name')
    .order('created_at', { ascending: false })
    .limit(1);
  return suggestNextBookName(data?.[0]?.name ?? null);
}
