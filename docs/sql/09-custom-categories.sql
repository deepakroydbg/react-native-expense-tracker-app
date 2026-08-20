-- Custom categories. Already applied to the live project; kept as the schema record.

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  icon text not null default 'pricetag',
  color text not null default '#6B7280',
  created_at timestamptz not null default now()
);

create unique index if not exists categories_user_name_idx
  on public.categories (user_id, lower(name));

create index if not exists categories_user_created_idx
  on public.categories (user_id, created_at);

alter table public.categories enable row level security;

drop policy if exists "Users read own categories" on public.categories;
create policy "Users read own categories"
  on public.categories for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own categories" on public.categories;
create policy "Users insert own categories"
  on public.categories for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own categories" on public.categories;
create policy "Users update own categories"
  on public.categories for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own categories" on public.categories;
create policy "Users delete own categories"
  on public.categories for delete
  using (auth.uid() = user_id);
