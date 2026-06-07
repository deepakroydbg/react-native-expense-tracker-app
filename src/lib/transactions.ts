import { supabase } from '@/lib/supabase';

export type TxType = 'credit' | 'debit';
export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Bank';

export const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'UPI', 'Card', 'Bank'];

export type Transaction = {
  id: string;
  user_id: string;
  book_id: string | null;
  entry_date: string; // YYYY-MM-DD
  amount: number;
  type: TxType;
  category: string;
  note: string | null;
  payment_method: string;
  created_at: string; // ISO timestamp — used as the effective entry datetime
};

export type TransactionInput = {
  entry_date: string;
  amount: number;
  type: TxType;
  category: string;
  note: string | null;
  book_id: string | null;
  payment_method: string;
  /** Effective entry datetime (date + chosen time). Optional on update. */
  created_at?: string;
};

export type BookFilter = {
  type?: TxType; // omit for "All"
  start?: string; // inclusive YYYY-MM-DD
  end?: string; // exclusive YYYY-MM-DD
};

const TABLE = 'transactions';

/** All entries within [start, end) for the logged-in user, newest first. */
export async function listByMonth(start: string, end: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .gte('entry_date', start)
    .lt('entry_date', end)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Transaction[];
}

/** Entries for a single book, newest first, with optional type/date filtering. */
export async function listByBook(bookId: string, filter: BookFilter = {}): Promise<Transaction[]> {
  let query = supabase.from(TABLE).select('*').eq('book_id', bookId);
  if (filter.type) query = query.eq('type', filter.type);
  if (filter.start) query = query.gte('entry_date', filter.start);
  if (filter.end) query = query.lt('entry_date', filter.end);

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Transaction[];
}

export async function getTransaction(id: string): Promise<Transaction> {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
  if (error) throw error;
  return data as Transaction;
}

export async function createTransaction(input: TransactionInput): Promise<Transaction> {
  // user_id is set automatically by RLS / default — do not send it.
  const { data, error } = await supabase.from(TABLE).insert(input).select().single();
  if (error) throw error;
  return data as Transaction;
}

export async function updateTransaction(
  id: string,
  input: TransactionInput
): Promise<Transaction> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Transaction;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

/** Sum totals for summary cards/box. */
export function summarize(txs: Transaction[]): { totalIn: number; totalOut: number; net: number } {
  let totalIn = 0;
  let totalOut = 0;
  for (const t of txs) {
    if (t.type === 'credit') totalIn += Number(t.amount);
    else totalOut += Number(t.amount);
  }
  return { totalIn, totalOut, net: totalIn - totalOut };
}

/**
 * Running balance per entry, computed chronologically (oldest first) across the
 * given set. Credit adds, debit subtracts. Returns id -> balance-after-entry.
 * Pass the book's FULL entry set so balances are correct even when the view is filtered.
 */
export function runningBalances(txs: Transaction[]): Map<string, number> {
  const chronological = [...txs].sort((a, b) => {
    const t = a.created_at.localeCompare(b.created_at);
    return t !== 0 ? t : a.id.localeCompare(b.id);
  });
  const map = new Map<string, number>();
  let balance = 0;
  for (const t of chronological) {
    balance += t.type === 'credit' ? Number(t.amount) : -Number(t.amount);
    map.set(t.id, balance);
  }
  return map;
}
