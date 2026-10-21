-- ========================================================
-- Avisos por e-mail (mensagem nova com o destinatário offline e match novo).
--
-- 1) user_presence: último sinal de vida de cada usuário (o site manda um "batimento"
--    enquanto a aba está aberta e visível). Sem políticas: a API pública não enxerga;
--    só a Edge Function (service role) lê. É assim que se sabe se a pessoa está online
--    sem expor "visto por último" para todo mundo.
-- 2) email_log: e-mails já enviados, para não repetir (limite por conversa).
-- 3) Gatilhos: mensagem nova e match novo avisam a Edge Function notify-email (via pg_net).
--    A função decide se envia: online -> não envia.
-- ========================================================

-- 1) Presença
create table if not exists public.user_presence (
  user_id text primary key references public.profiles(id) on delete cascade,
  last_seen_at timestamptz not null default timezone('utc'::text, now())
);
alter table public.user_presence enable row level security;

create or replace function public.touch_presence()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid text := auth.uid()::text;
begin
  if uid is null then
    return;
  end if;
  insert into public.user_presence (user_id, last_seen_at)
  values (uid, timezone('utc'::text, now()))
  on conflict (user_id) do update set last_seen_at = excluded.last_seen_at;
end;
$$;

revoke all on function public.touch_presence() from public, anon;
grant execute on function public.touch_presence() to authenticated;

-- 2) Registro de e-mails enviados
create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('message', 'match')),
  ref_id text not null,
  sent_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists email_log_lookup_idx on public.email_log (user_id, kind, ref_id, sent_at desc);
alter table public.email_log enable row level security;

-- 3a) Mensagem nova -> notify-email
create or replace function public.notify_email_new_message()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  recipient text;
  secret text;
begin
  select case when c.buyer_id = new.sender_id then c.seller_id else c.buyer_id end
    into recipient
    from public.conversations c
   where c.id = new.conversation_id;

  if recipient is null or recipient = new.sender_id then
    return new;
  end if;

  select value into secret from public.private_settings where key = 'webhook_secret';

  -- Falha de rede ou função fora do ar nunca pode impedir o envio da mensagem
  begin
    perform net.http_post(
      url := 'https://dangvvcagfpbtzjepqkr.supabase.co/functions/v1/notify-email',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', coalesce(secret, '')),
      body := jsonb_build_object(
        'kind', 'message',
        'recipient_id', recipient,
        'sender_id', new.sender_id,
        'conversation_id', new.conversation_id,
        'text', left(new.text, 300)
      )
    );
  exception when others then
    null;
  end;

  return new;
end;
$$;

revoke all on function public.notify_email_new_message() from public, anon, authenticated;

drop trigger if exists messages_email_notify on public.messages;
create trigger messages_email_notify
  after insert on public.messages
  for each row execute function public.notify_email_new_message();

-- 3b) Match novo -> notify-email (avisa quem está procurando)
create or replace function public.notify_email_new_match()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  recipient text;
  secret text;
begin
  select l.user_id into recipient from public.listings l where l.id = new.wanted_listing_id;
  if recipient is null then
    return new;
  end if;

  select value into secret from public.private_settings where key = 'webhook_secret';

  begin
    perform net.http_post(
      url := 'https://dangvvcagfpbtzjepqkr.supabase.co/functions/v1/notify-email',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', coalesce(secret, '')),
      body := jsonb_build_object(
        'kind', 'match',
        'recipient_id', recipient,
        'match_id', new.id,
        'wanted_listing_id', new.wanted_listing_id,
        'sale_listing_id', new.sale_listing_id
      )
    );
  exception when others then
    null;
  end;

  return new;
end;
$$;

revoke all on function public.notify_email_new_match() from public, anon, authenticated;

drop trigger if exists matches_email_notify on public.matches;
create trigger matches_email_notify
  after insert on public.matches
  for each row execute function public.notify_email_new_match();
