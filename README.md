# MyKhata 💰

A personal + small-business expense & ledger app (inspired by Khatabook/Cashbook) built with
**Expo (SDK 54) + Expo Router + Supabase**.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file (already present locally, git-ignored) with:
   ```
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   ```
3. Start the dev server and scan the QR with **Expo Go** (phone on the same Wi-Fi):
   ```bash
   npx expo start
   ```

## Architecture

- **Routing** (`src/app`): `(auth)` group (login/signup) and `(tabs)` group (Home, Insights,
  Settings); `entry.tsx` is the add/edit modal. Auth gating lives in `src/app/_layout.tsx`.
- **Data** (`src/lib`):
  - `supabase.ts` — client with AsyncStorage session persistence + AppState auto-refresh.
  - `auth-context.tsx` — session + sign in/up/out with friendly errors.
  - `theme-context.tsx` — light/dark/system theme preference (persisted).
  - `transactions.ts` — CRUD against the `transactions` table.
  - `format.ts` / `categories.ts` — ₹ formatting, date helpers, preset + custom categories.

## Database

Uses the `transactions` table (RLS on; `user_id` auto-set). `type = 'credit'` is money in,
`type = 'debit'` is money out.

Custom categories live in the `categories` table (RLS on; `user_id` auto-set) holding just the
name, icon and colour. Entries store their category as plain text: deleting a category leaves past
entries untouched, while **renaming one rewrites matching entries** so history stays consistent.

Schema for tables beyond `transactions` is kept in `docs/sql/`, applied in order:

- `09-custom-categories.sql` — the `categories` table.
- `10-book-cascade.sql` — makes `transactions.book_id` cascade on delete. **Run this before
  shipping a build**: `deleteBook()` now issues a single delete and relies on the cascade.

## Status

- ✅ Core (auth, add/edit/delete, dashboard, month switcher, search/filter) — features 1–6.
- ✅ Insights, custom Categories, Excel/PDF export — features 7–9, 11.
- ⏳ Budgets, polish — features 10, 12 (in progress).
