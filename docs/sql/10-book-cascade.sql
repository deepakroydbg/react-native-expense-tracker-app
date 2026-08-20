-- Cascade book deletes to their entries. Run before shipping a build. Safe to re-run.
-- One statement per line so a partial paste fails loudly instead of silently.

delete from public.transactions t where t.book_id is not null and not exists (select 1 from public.books b where b.id = t.book_id);

alter table public.transactions drop constraint if exists transactions_book_id_fkey;

alter table public.transactions add constraint transactions_book_id_fkey foreign key (book_id) references public.books (id) on delete cascade;

create index if not exists transactions_book_id_idx on public.transactions (book_id);
