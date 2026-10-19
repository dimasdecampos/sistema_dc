-- ========================================================
-- Avisos de mensagem nova no chat (navegador e celular).
--
-- 1) Realtime ligado para messages: o site aberto recebe a mensagem na hora.
-- 2) Mensagens antigas viram "lidas": o campo read nunca tinha sido usado, e sem isso
--    todas apareceriam como não lidas.
-- 3) push_subscriptions: aparelhos que aceitaram receber notificação (com o site fechado).
-- 4) private_settings: chaves e segredo do push. RLS ligada e SEM políticas: a API pública
--    não enxerga; só a função de servidor e as funções "security definer" leem.
-- 5) Gatilho: a cada mensagem nova avisa a Edge Function notify-message (via pg_net),
--    que manda o push só para o destinatário.
-- ========================================================

-- 1) Realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- 2) Linha de base: tudo que existe hoje conta como lido
update public.messages set read = true where read is distinct from true;

-- 3) Aparelhos inscritos para push
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select" on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid())::text);

-- Gravar/remover só pelas funções abaixo (um aparelho pode trocar de conta: o endpoint é único)
create or replace function public.save_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid text := auth.uid()::text;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (uid, p_endpoint, p_p256dh, p_auth, p_user_agent)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent;
end;
$$;

create or replace function public.remove_push_subscription(p_endpoint text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.push_subscriptions
   where endpoint = p_endpoint and user_id = (select auth.uid())::text;
end;
$$;

revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
revoke all on function public.remove_push_subscription(text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
grant execute on function public.remove_push_subscription(text) to authenticated;

-- 4) Configurações privadas (a Edge Function cria as chaves VAPID na primeira chamada)
create table if not exists public.private_settings (
  key text primary key,
  value text not null
);
alter table public.private_settings enable row level security;

insert into public.private_settings (key, value)
values ('webhook_secret', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (key) do nothing;

-- 5) Gatilho de mensagem nova -> Edge Function
create extension if not exists pg_net with schema extensions;

create or replace function public.notify_new_message()
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
      url := 'https://dangvvcagfpbtzjepqkr.supabase.co/functions/v1/notify-message',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', coalesce(secret, '')),
      body := jsonb_build_object(
        'conversation_id', new.conversation_id,
        'sender_id', new.sender_id,
        'recipient_id', recipient,
        'text', left(new.text, 140)
      )
    );
  exception when others then
    null;
  end;

  return new;
end;
$$;

revoke all on function public.notify_new_message() from public, anon, authenticated;

drop trigger if exists messages_notify on public.messages;
create trigger messages_notify
  after insert on public.messages
  for each row execute function public.notify_new_message();
