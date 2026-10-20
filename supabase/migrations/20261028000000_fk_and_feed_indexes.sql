-- Índices para chaves estrangeiras usadas em joins e filtros (apontados pelo advisor de performance)
-- e para o feed (anúncios ativos por tipo, mais recentes primeiro).
create index if not exists conversations_buyer_id_idx on public.conversations (buyer_id);
create index if not exists conversations_seller_id_idx on public.conversations (seller_id);
create index if not exists conversations_listing_id_idx on public.conversations (listing_id);
create index if not exists favorites_listing_id_idx on public.favorites (listing_id);
create index if not exists listing_images_listing_id_idx on public.listing_images (listing_id);
create index if not exists listings_user_id_idx on public.listings (user_id);
create index if not exists listings_category_id_idx on public.listings (category_id);
create index if not exists listings_feed_idx on public.listings (status, type, created_at desc);
create index if not exists matches_sale_listing_id_idx on public.matches (sale_listing_id);
create index if not exists messages_conversation_id_idx on public.messages (conversation_id, created_at);
create index if not exists messages_sender_id_idx on public.messages (sender_id);
create index if not exists messages_trade_proposal_id_idx on public.messages (trade_proposal_id);
create index if not exists trade_proposals_proposer_id_idx on public.trade_proposals (proposer_id);
create index if not exists trade_proposals_target_listing_id_idx on public.trade_proposals (target_listing_id);
create index if not exists wanted_interests_category_id_idx on public.wanted_interests (category_id);
