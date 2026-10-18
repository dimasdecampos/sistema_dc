-- ========================================================
-- "Também procuro" (sininho) no ranking de mais procurados.
-- Cada linha = uma pessoa que quer ser avisada quando anunciarem aquele item.
-- term_key segue o mesmo formato do ranking: "<category_id>__<termo em minúsculas>".
-- ========================================================
create table if not exists public.wanted_interests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  term_key text not null,
  term text not null,
  category_id text references public.categories(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (user_id, term_key)
);

alter table public.wanted_interests enable row level security;

-- Cada pessoa só enxerga e altera os próprios sininhos
create policy "wanted_interests_select" on public.wanted_interests for select to authenticated
  using (user_id = (select auth.uid())::text);
create policy "wanted_interests_insert" on public.wanted_interests for insert to authenticated
  with check (user_id = (select auth.uid())::text);
create policy "wanted_interests_delete" on public.wanted_interests for delete to authenticated
  using (user_id = (select auth.uid())::text);

-- Contador público por item, sem revelar quem segue o quê
create or replace function public.wanted_interest_counts()
returns table (term_key text, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  select wi.term_key, count(*)::bigint as total
  from public.wanted_interests wi
  group by wi.term_key;
$$;

grant execute on function public.wanted_interest_counts() to anon, authenticated;
