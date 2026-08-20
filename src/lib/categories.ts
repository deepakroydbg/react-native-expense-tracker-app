import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useSyncExternalStore } from 'react';

import { supabase } from '@/lib/supabase';
import { invalidateTxCache } from '@/lib/transactions';

export type IoniconName = keyof typeof Ionicons.glyphMap;

export type Category = {
  id?: string;
  name: string;
  icon: IoniconName;
  color: string;
};

export const PRESET_CATEGORIES: Category[] = [
  { name: 'Food', icon: 'fast-food', color: '#F97316' },
  { name: 'Transport', icon: 'car', color: '#3B82F6' },
  { name: 'Bills', icon: 'receipt', color: '#8B5CF6' },
  { name: 'Salary', icon: 'cash', color: '#10B981' },
  { name: 'Shopping', icon: 'bag-handle', color: '#EC4899' },
  { name: 'Health', icon: 'medkit', color: '#EF4444' },
  { name: 'Rent', icon: 'home', color: '#14B8A6' },
  { name: 'Other', icon: 'pricetag', color: '#6B7280' },
];

export const OTHER_CATEGORY: Category = PRESET_CATEGORIES[PRESET_CATEGORIES.length - 1];

export const CATEGORY_ICONS: IoniconName[] = [
  'pricetag', 'car', 'home', 'heart', 'star', 'gift',
  'briefcase', 'basket', 'school', 'fitness', 'cafe', 'bus',
];

export const CATEGORY_PALETTE: string[] = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#64748b', '#6b7280',
];

export const CATEGORY_NAME_MIN = 2;
export const CATEGORY_NAME_MAX = 30;

const TABLE = 'categories';
const STORAGE_KEY = 'mykhata.custom-categories';

let customCategories: Category[] = [];
let allCategories: Category[] = buildAll([]);
let byName = buildIndex(allCategories);
const listeners = new Set<() => void>();

function buildAll(custom: Category[]): Category[] {
  return [...custom, ...PRESET_CATEGORIES];
}

function buildIndex(list: Category[]): Map<string, Category> {
  return new Map(list.map((c) => [c.name.toLowerCase(), c]));
}

function setCustom(list: Category[]): void {
  customCategories = list;
  allCategories = buildAll(list);
  byName = buildIndex(allCategories);
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list)).catch(() => {});
  for (const listener of listeners) listener();
}

function rowToCategory(row: { id: string; name: string; icon: string; color: string }): Category {
  return { id: row.id, name: row.name, icon: row.icon as IoniconName, color: row.color };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getAllCategories(): Category[] {
  return allCategories;
}

export function getCustomCategories(): Category[] {
  return customCategories;
}

function resolve(index: Map<string, Category>, name: string | null | undefined): Category {
  if (!name) return OTHER_CATEGORY;
  return index.get(name.toLowerCase()) ?? { name, icon: 'pricetag', color: '#6B7280' };
}

export function getCategory(name: string | null | undefined): Category {
  return resolve(byName, name);
}

export const DUPLICATE_NAME_ERROR = 'You already have a category with this name';

export function validateCategoryName(name: string, exceptId?: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Please enter a category name.';
  if (trimmed.length < CATEGORY_NAME_MIN) {
    return `Category name must be at least ${CATEGORY_NAME_MIN} characters.`;
  }

  const existing = byName.get(trimmed.toLowerCase());
  if (!existing || existing.id === exceptId) return null;
  return existing.id
    ? DUPLICATE_NAME_ERROR
    : `"${existing.name}" is a built-in category. Please choose another name.`;
}

async function hydrateFromStorage(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored && customCategories.length === 0) setCustom(JSON.parse(stored) as Category[]);
  } catch {}
}

async function refreshCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, name, icon, color')
    .order('created_at', { ascending: true });
  if (error) throw error;

  const list = (data ?? []).map(rowToCategory);
  setCustom(list);
  return list;
}

let loadOnce: Promise<void> | null = null;

function ensureLoaded(): Promise<void> {
  loadOnce ??= (async () => {
    await hydrateFromStorage();
    try {
      await refreshCategories();
    } catch {}
  })();
  return loadOnce;
}

export function resetCategories(): void {
  loadOnce = null;
  setCustom([]);
}

export type CategoryInput = { name: string; icon: IoniconName; color: string };

export async function createCategory(input: CategoryInput): Promise<Category> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ name: input.name.trim(), icon: input.icon, color: input.color })
    .select('id, name, icon, color')
    .single();
  if (error) throw error;

  const created = rowToCategory(data);
  setCustom([...customCategories, created]);
  return created;
}

export async function updateCategory(id: string, input: CategoryInput): Promise<Category> {
  const previousName = customCategories.find((c) => c.id === id)?.name;
  const nextName = input.name.trim();

  const { data, error } = await supabase
    .from(TABLE)
    .update({ name: nextName, icon: input.icon, color: input.color })
    .eq('id', id)
    .select('id, name, icon, color')
    .single();
  if (error) throw error;

  const updated = rowToCategory(data);
  setCustom(customCategories.map((c) => (c.id === id ? updated : c)));

  if (previousName && previousName !== nextName) {
    const { error: txError } = await supabase
      .from('transactions')
      .update({ category: nextName })
      .eq('category', previousName);
    if (txError) throw txError;
    invalidateTxCache();
  }

  return updated;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;

  setCustom(customCategories.filter((c) => c.id !== id));
}

export function useCategories(): Category[] {
  const list = useSyncExternalStore(subscribe, getAllCategories);
  useEffect(() => {
    void ensureLoaded();
  }, []);
  return list;
}

export function useCategoryLookup(): (name: string | null | undefined) => Category {
  const list = useCategories();
  return useMemo(() => {
    const index = buildIndex(list);
    return (name: string | null | undefined) => resolve(index, name);
  }, [list]);
}
