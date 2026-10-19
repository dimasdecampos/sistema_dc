-- ========================================================
-- Troca de produtos: o anunciante marca "aceito troca" no anúncio de venda.
-- Só adiciona uma coluna; as políticas RLS de listings já cobrem insert/update do dono.
-- ========================================================
alter table public.listings
  add column if not exists accepts_trade boolean not null default false;

create index if not exists listings_accepts_trade_idx
  on public.listings (accepts_trade)
  where accepts_trade;
