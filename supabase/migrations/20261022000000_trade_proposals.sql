-- ========================================================
-- Propostas de troca com aceite no chat.
--
-- * trade_proposals: quem ofereceu o quê, em qual conversa, e o estado da proposta.
-- * messages.trade_proposal_id: a mensagem do chat que carrega o cartão da proposta.
-- * propose_trade(): cria a proposta (e a conversa/mensagem) validando tudo no servidor.
-- * accept_trade(): só o dono do produto desejado aceita; conclui os DOIS anúncios.
--   É função "security definer" porque quem aceita não é dono do anúncio de quem propôs.
-- ========================================================
create table if not exists public.trade_proposals (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  offered_listing_id uuid not null references public.listings(id) on delete cascade,
  target_listing_id uuid not null references public.listings(id) on delete cascade,
  proposer_id text not null references public.profiles(id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'CANCELLED')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  responded_at timestamptz,
  unique (offered_listing_id, target_listing_id)
);

create index if not exists trade_proposals_conversation_idx on public.trade_proposals (conversation_id);

alter table public.trade_proposals enable row level security;

-- Só quem participa da conversa enxerga a proposta. Ninguém grava direto: só pelas funções abaixo.
create policy "trade_proposals_select" on public.trade_proposals for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (select auth.uid())::text in (c.buyer_id, c.seller_id)));

alter table public.messages
  add column if not exists trade_proposal_id uuid references public.trade_proposals(id) on delete set null;

-- --------------------------------------------------------
-- Propor troca
-- --------------------------------------------------------
create or replace function public.propose_trade(p_offered uuid, p_target uuid, p_text text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  o public.listings;
  t public.listings;
  conv uuid;
  prop uuid;
  existed boolean := false;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into o from public.listings where id = p_offered;
  select * into t from public.listings where id = p_target;

  if o.id is null or t.id is null then
    raise exception 'listing_not_found';
  end if;
  if o.user_id <> uid then
    raise exception 'not_owner' using errcode = '42501';
  end if;
  if t.user_id = uid then
    raise exception 'own_listing';
  end if;
  if o.type <> 'SALE' or t.type <> 'SALE'
     or o.status <> 'ACTIVE' or t.status <> 'ACTIVE'
     or not o.accepts_trade or not t.accepts_trade
     or coalesce(o.price, 0) <= 0 or coalesce(t.price, 0) <= 0 then
    raise exception 'not_tradable';
  end if;
  -- Teto de 15% de diferença em relação ao produto desejado (o app oferece 5, 10 ou 15%)
  if abs(o.price - t.price) > 0.15 * t.price + 0.000001 then
    raise exception 'out_of_margin';
  end if;

  -- Conversa sobre o produto desejado (cria se ainda não existe)
  select id into conv from public.conversations
   where listing_id = t.id and buyer_id = uid and seller_id = t.user_id
   limit 1;
  if conv is null then
    insert into public.conversations (listing_id, buyer_id, seller_id)
    values (t.id, uid, t.user_id)
    returning id into conv;
  end if;

  select id into prop from public.trade_proposals
   where offered_listing_id = o.id and target_listing_id = t.id;

  if prop is not null then
    existed := true;
  else
    insert into public.trade_proposals (conversation_id, offered_listing_id, target_listing_id, proposer_id)
    values (conv, o.id, t.id, uid)
    returning id into prop;

    insert into public.messages (conversation_id, sender_id, text, trade_proposal_id)
    values (conv, uid, coalesce(nullif(trim(p_text), ''), 'Proposta de troca'), prop);

    update public.conversations set updated_at = now() where id = conv;
  end if;

  return jsonb_build_object('conversation_id', conv, 'proposal_id', prop, 'already_sent', existed);
end;
$$;

-- --------------------------------------------------------
-- Aceitar troca: conclui os dois anúncios
-- --------------------------------------------------------
create or replace function public.accept_trade(p_proposal uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := auth.uid()::text;
  p public.trade_proposals;
  o public.listings;
  t public.listings;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into p from public.trade_proposals where id = p_proposal for update;
  if p.id is null then
    raise exception 'proposal_not_found';
  end if;

  select * into o from public.listings where id = p.offered_listing_id for update;
  select * into t from public.listings where id = p.target_listing_id for update;

  -- Só o dono do produto desejado pode aceitar
  if t.user_id <> uid then
    raise exception 'not_recipient' using errcode = '42501';
  end if;
  if p.status <> 'PENDING' then
    raise exception 'not_pending';
  end if;

  -- Se um dos anúncios já foi concluído/cancelado, a proposta perde o sentido
  if o.status <> 'ACTIVE' or t.status <> 'ACTIVE' then
    update public.trade_proposals set status = 'CANCELLED', responded_at = now() where id = p.id;
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;

  update public.listings set status = 'COMPLETED', updated_at = now() where id in (o.id, t.id);

  update public.trade_proposals set status = 'ACCEPTED', responded_at = now() where id = p.id;

  -- Outras propostas pendentes envolvendo qualquer um dos dois anúncios ficam encerradas
  update public.trade_proposals
     set status = 'CANCELLED', responded_at = now()
   where status = 'PENDING'
     and id <> p.id
     and (offered_listing_id in (o.id, t.id) or target_listing_id in (o.id, t.id));

  insert into public.messages (conversation_id, sender_id, text)
  values (
    p.conversation_id,
    uid,
    '✅ Troca aceita! "' || o.title || '" ↔ "' || t.title || '". Os dois anúncios foram concluídos. Combinem a entrega por aqui.'
  );
  update public.conversations set updated_at = now() where id = p.conversation_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.propose_trade(uuid, uuid, text) from public, anon;
revoke all on function public.accept_trade(uuid) from public, anon;
grant execute on function public.propose_trade(uuid, uuid, text) to authenticated;
grant execute on function public.accept_trade(uuid) to authenticated;
