-- ========================================================
-- TemAqui: login com Google (Supabase Auth) + RLS por dono + painel admin no banco
--
-- Regras:
--   * Qualquer pessoa logada cria anúncios; só o dono (ou um admin) edita/apaga.
--   * profiles.id e listings.user_id guardam auth.uid()::text.
--   * Admins = e-mails em site_config.config->'adminEmails'.
--   * Nada é apagado: tabelas e linhas existentes ficam como estão.
-- ========================================================

-- --------------------------------------------------------
-- Configuração do site (uma única linha) e função is_admin()
-- --------------------------------------------------------
create table if not exists public.site_config (
  id int primary key default 1 check (id = 1),
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

insert into public.site_config (id, config)
values (1, '{"adminEmails": ["dimasrafting@gmail.com"]}'::jsonb)
on conflict (id) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.site_config s,
         jsonb_array_elements_text(coalesce(s.config -> 'adminEmails', '[]'::jsonb)) as e(email)
    where lower(e.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

alter table public.site_config enable row level security;

-- --------------------------------------------------------
-- Remove as políticas abertas anteriores
-- --------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles','usuarios','listings','listing_images','matches',
                        'conversations','messages','clientes','categories','site_config')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- site_config: leitura pública (banner, nome do site); escrita só admin
create policy "site_config_select" on public.site_config for select using (true);
create policy "site_config_insert" on public.site_config for insert to authenticated
  with check (public.is_admin());
create policy "site_config_update" on public.site_config for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- categories: leitura pública; escrita só admin
create policy "categories_select" on public.categories for select using (true);
create policy "categories_insert" on public.categories for insert to authenticated
  with check (public.is_admin());
create policy "categories_update" on public.categories for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "categories_delete" on public.categories for delete to authenticated
  using (public.is_admin());

-- profiles: leitura pública (nome/foto aparecem nos anúncios); escrita só do próprio.
-- O app NÃO grava e-mail em profiles, para não expor e-mail de ninguém.
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert to authenticated
  with check (id = (select auth.uid())::text);
create policy "profiles_update" on public.profiles for update to authenticated
  using (id = (select auth.uid())::text)
  with check (id = (select auth.uid())::text);

-- usuarios: tabela legada (não usada pelo app). Cada pessoa só vê a própria linha.
create policy "usuarios_select" on public.usuarios for select to authenticated
  using (lower(email) = lower((select auth.jwt()) ->> 'email'));

-- listings: leitura pública; criar só como si mesmo; editar/apagar o dono ou admin
create policy "listings_select" on public.listings for select using (true);
create policy "listings_insert" on public.listings for insert to authenticated
  with check (user_id = (select auth.uid())::text);
create policy "listings_update" on public.listings for update to authenticated
  using (user_id = (select auth.uid())::text or public.is_admin())
  with check (user_id = (select auth.uid())::text or public.is_admin());
create policy "listings_delete" on public.listings for delete to authenticated
  using (user_id = (select auth.uid())::text or public.is_admin());

-- listing_images: leitura pública; escrita do dono do anúncio ou admin
create policy "listing_images_select" on public.listing_images for select using (true);
create policy "listing_images_insert" on public.listing_images for insert to authenticated
  with check (exists (
    select 1 from public.listings l
    where l.id = listing_id and (l.user_id = (select auth.uid())::text or public.is_admin())));
create policy "listing_images_delete" on public.listing_images for delete to authenticated
  using (exists (
    select 1 from public.listings l
    where l.id = listing_id and (l.user_id = (select auth.uid())::text or public.is_admin())));

-- matches: leitura pública; grava quem é dono de um dos dois anúncios
create policy "matches_select" on public.matches for select using (true);
create policy "matches_insert" on public.matches for insert to authenticated
  with check (exists (
    select 1 from public.listings l
    where l.id in (wanted_listing_id, sale_listing_id)
      and l.user_id = (select auth.uid())::text));
create policy "matches_update" on public.matches for update to authenticated
  using (exists (
    select 1 from public.listings l
    where l.id in (wanted_listing_id, sale_listing_id)
      and l.user_id = (select auth.uid())::text));

-- conversations: só comprador e vendedor
create policy "conversations_select" on public.conversations for select to authenticated
  using ((select auth.uid())::text in (buyer_id, seller_id));
create policy "conversations_insert" on public.conversations for insert to authenticated
  with check (buyer_id = (select auth.uid())::text);
create policy "conversations_update" on public.conversations for update to authenticated
  using ((select auth.uid())::text in (buyer_id, seller_id));

-- messages: só quem participa da conversa
create policy "messages_select" on public.messages for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (select auth.uid())::text in (c.buyer_id, c.seller_id)));
create policy "messages_insert" on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())::text
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (select auth.uid())::text in (c.buyer_id, c.seller_id)));
create policy "messages_update" on public.messages for update to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (select auth.uid())::text in (c.buyer_id, c.seller_id)));

-- clientes: tabela legada com e-mail/telefone, sem uso no app.
-- RLS ligada e sem políticas = ninguém acessa pela API pública.

-- --------------------------------------------------------
-- Storage: bucket público 'img'. Leitura livre, upload só logado,
-- alterar/apagar só o próprio arquivo (ou admin).
-- --------------------------------------------------------
drop policy if exists "img_select" on storage.objects;
drop policy if exists "img_insert" on storage.objects;
drop policy if exists "img_update" on storage.objects;
drop policy if exists "img_delete" on storage.objects;

create policy "img_select" on storage.objects for select
  using (bucket_id = 'img');
create policy "img_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'img');
create policy "img_update" on storage.objects for update to authenticated
  using (bucket_id = 'img' and (owner_id = (select auth.uid())::text or public.is_admin()));
create policy "img_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'img' and (owner_id = (select auth.uid())::text or public.is_admin()));
