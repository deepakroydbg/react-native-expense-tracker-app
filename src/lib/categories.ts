import { Ionicons } from '@expo/vector-icons';

export type IoniconName = keyof typeof Ionicons.glyphMap;

export type Category = {
  name: string;
  icon: IoniconName;
  color: string;
};

/** Sensible presets shipped with the app. Custom categories arrive in feature 9. */
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

const byName = new Map(PRESET_CATEGORIES.map((c) => [c.name.toLowerCase(), c]));

/** Look up a category's display meta, falling back to a neutral "Other" style. */
export function getCategory(name: string | null | undefined): Category {
  if (!name) return OTHER_CATEGORY;
  return byName.get(name.toLowerCase()) ?? { name, icon: 'pricetag', color: '#6B7280' };
}
