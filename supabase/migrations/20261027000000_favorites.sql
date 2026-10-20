-- ========================================================
-- Favoritos: cada pessoa guarda anúncios para ver depois (aparecem no painel dela).
-- Só a própria pessoa enxerga e altera os seus favoritos.
-- Atenção: a chave primária é um id próprio (e não (user_id, listing_id)) de propósito.
-- Com chave composta o PostgREST enxerga a tabela como "ponte" entre profiles e listings
-- e o embed user:profiles(*) dos anúncios fica ambíguo (os anúncios somem do site).
-- ========================================================
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (user_id, listing_id)
);

alter table public.favorites enable row level security;

create policy "favorites_select" on public.favorites for select to authenticated
  using (user_id = (select auth.uid())::text);
create policy "favorites_insert" on public.favorites for insert to authenticated
  with check (user_id = (select auth.uid())::text);
create policy "favorites_delete" on public.favorites for delete to authenticated
  using (user_id = (select auth.uid())::text);
