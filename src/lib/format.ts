/** Currency + date helpers. All dates handled in local time. */

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

/** ₹1,23,456.78 with Indian thousands separators. */
export function formatCurrency(amount: number): string {
  if (!isFinite(amount)) return '₹0';
  return inr.format(amount);
}

/** Signed amount for a transaction type, e.g. +₹500 / -₹200. */
export function formatSigned(amount: number, type: 'credit' | 'debit'): string {
  const sign = type === 'credit' ? '+' : '-';
  return `${sign}${formatCurrency(Math.abs(amount))}`;
}

/** Local YYYY-MM-DD string (matches a Postgres `date` column). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse a YYYY-MM-DD string as a local Date (avoids UTC shift). */
export function fromISODate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addMonths(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

/** Inclusive start and exclusive end (next month) for a month query. */
export function monthRange(date: Date): { start: string; end: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start: toISODate(start), end: toISODate(end) };
}

export function monthLabel(date: Date): string {
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function shortMonthLabel(date: Date): string {
  return date.toLocaleDateString('en-IN', { month: 'short' });
}

/** "Today" / "Yesterday" / "5 Jun 2026" for a day header. */
export function dayHeading(isoDate: string): string {
  const date = fromISODate(isoDate);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (toISODate(date) === toISODate(today)) return 'Today';
  if (toISODate(date) === toISODate(yesterday)) return 'Yesterday';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** "Mon, 5 Jun" compact row date. */
export function rowDate(isoDate: string): string {
  return fromISODate(isoDate).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** "9:05 pm" lowercase am/pm from an ISO timestamp or Date. */
export function formatTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date
    .toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase()
    .replace(/\s/g, ' ');
}

/** "31 July 2025" — full date header for the book detail list. */
export function fullDateLabel(isoDate: string): string {
  return fromISODate(isoDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** "Updated on 5 Jun 2026" friendly date from an ISO timestamp. */
export function shortDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Smart book-name suggestion. If the last book name contains "<Month> ... <Year>",
 * increment to the next month (rolling the year over). Otherwise suggest the
 * current "<Month> <Year>".
 */
export function suggestNextBookName(lastName?: string | null): string {
  const now = new Date();
  const fallback = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  if (!lastName) return fallback;

  const lower = lastName.toLowerCase();
  const monthIdx = MONTHS.findIndex((m) => lower.includes(m.toLowerCase()));
  const yearMatch = lastName.match(/\b(20\d{2})\b/);
  if (monthIdx === -1 || !yearMatch) return fallback;

  let nextMonth = monthIdx + 1;
  let year = Number(yearMatch[1]);
  if (nextMonth > 11) {
    nextMonth = 0;
    year += 1;
  }
  // Preserve any middle words, e.g. "June Expenses 2026" -> "July Expenses 2026".
  return lastName
    .replace(new RegExp(MONTHS[monthIdx], 'i'), MONTHS[nextMonth])
    .replace(/\b20\d{2}\b/, String(year));
}
