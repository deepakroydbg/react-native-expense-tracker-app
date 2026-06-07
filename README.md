# MyKhata 💰

A personal + small-business expense & ledger app (inspired by Khatabook/Cashbook) built with
**Expo (SDK 56) + Expo Router + Supabase**.

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
  - `format.ts` / `categories.ts` — ₹ formatting, date helpers, preset categories.

## Database

Uses the existing `transactions` table (RLS on; `user_id` auto-set). `type = 'credit'` is money in,
`type = 'debit'` is money out.

> Features that need extra tables (Budgets, custom Categories) will ship with SQL to paste into the
> Supabase SQL Editor — see `docs/sql/` (added per feature).

## Status

- ✅ Core (auth, add/edit/delete, dashboard, month switcher, search/filter) — features 1–6.
- ⏳ Insights, Budgets, custom Categories, CSV export, polish — features 7–12 (in progress).
