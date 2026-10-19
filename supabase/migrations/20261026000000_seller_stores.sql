-- ========================================================
-- Lojinha do vendedor (recurso premium concedido pelo admin).
--
-- * profiles ganha: is_premium, store_name, store_color (leitura pública, como o resto do perfil).
-- * Gatilho guard_profile_premium: ninguém se dá premium sozinho. Só o admin altera is_premium,
--   e só quem já é premium personaliza nome/cor da loja. Acesso direto ao banco (SQL Editor,
--   sem login de usuário) não é bloqueado, para o admin poder conceder também por lá.
-- * admin_set_premium(): usada pelo painel /admin para conceder/remover o premium.
-- ========================================================
alter table public.profiles
  add column if not exists is_premium boolean not null default false,
  add column if not exists store_name text,
  add column if not exists store_color text;

-- Cor só no formato #RRGGBB (evita texto estranho virar CSS) e nome curto
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_store_color_check') then
    alter table public.profiles
      add constraint profiles_store_color_check
      check (store_color is null or store_color ~ '^#[0-9a-fA-F]{6}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_store_name_check') then
    alter table public.profiles
      add constraint profiles_store_name_check
      check (store_name is null or char_length(store_name) between 1 and 40);
  end if;
end $$;

create or replace function public.guard_profile_premium()
returns trigger
language plpgsql
as $$
begin
  -- Sem usuário logado (SQL Editor / chave de serviço): sem restrição
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if not public.is_admin() then
      new.is_premium := false;
      new.store_name := null;
      new.store_color := null;
    end if;
    return new;
  end if;

  -- UPDATE
  if not public.is_admin() then
    new.is_premium := old.is_premium;
    if not old.is_premium then
      new.store_name := old.store_name;
      new.store_color := old.store_color;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_premium on public.profiles;
create trigger profiles_guard_premium
  before insert or update on public.profiles
  for each row execute function public.guard_profile_premium();

create or replace function public.admin_set_premium(p_user_id text, p_premium boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.profiles
     set is_premium = p_premium, updated_at = now()
   where id = p_user_id;

  if not found then
    raise exception 'user_not_found';
  end if;
end;
$$;

revoke all on function public.admin_set_premium(text, boolean) from public, anon;
grant execute on function public.admin_set_premium(text, boolean) to authenticated;
