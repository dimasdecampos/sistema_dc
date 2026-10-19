-- ========================================================
-- Excluir conversa: qualquer uma das duas pessoas pode apagar a conversa.
-- Mensagens e propostas de troca saem em cascata junto com ela (para as duas pessoas).
-- Pode ser rodada mais de uma vez (apaga e recria a política).
-- ========================================================
drop policy if exists "conversations_delete" on public.conversations;

create policy "conversations_delete" on public.conversations for delete to authenticated
  using ((select auth.uid())::text in (buyer_id, seller_id));
