-- ========================================================
-- Painel /admin: números e lista de usuários.
-- Requer a migração 20261017000000_auth_rls.sql (função is_admin(), site_config e
-- a política profiles_delete). Só quem está em site_config.config.adminEmails executa.
-- ========================================================

create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'users_total',        (select count(*) from auth.users),
    'users_last_7d',      (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'listings_total',     (select count(*) from public.listings),
    'listings_active',    (select count(*) from public.listings where status = 'ACTIVE'),
    'listings_completed', (select count(*) from public.listings where status = 'COMPLETED'),
    'listings_cancelled', (select count(*) from public.listings where status = 'CANCELLED'),
    'listings_sale',      (select count(*) from public.listings where type = 'SALE'),
    'listings_wanted',    (select count(*) from public.listings where type = 'WANTED'),
    'listings_last_7d',   (select count(*) from public.listings where created_at > now() - interval '7 days'),
    'conversations',      (select count(*) from public.conversations),
    'messages',           (select count(*) from public.messages),
    'interests',          (select count(*) from public.wanted_interests),
    'matches',            (select count(*) from public.matches)
  );
end;
$$;

create or replace function public.admin_users()
returns table (
  id text,
  nome text,
  email text,
  avatar_url text,
  cidade text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  listings_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
    select p.id,
           p.nome,
           u.email::text,
           p.avatar_url,
           p.cidade,
           p.created_at,
           u.last_sign_in_at,
           (select count(*) from public.listings l where l.user_id = p.id)
    from public.profiles p
    left join auth.users u on u.id::text = p.id
    order by p.created_at desc;
end;
$$;

revoke all on function public.admin_stats() from public, anon;
revoke all on function public.admin_users() from public, anon;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_users() to authenticated;
