import { Conversation, Listing, UserProfile } from '../types/marketplace';
import {
  getConversationMessages,
  sendMessage,
  startOrGetConversation,
} from './marketplaceService';

/** Diferença máxima de valor entre os dois produtos, em relação ao produto aberto (5%) */
export const TRADE_PRICE_MARGIN = 0.05;

const formatMoney = (value: number) =>
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

/** Anúncio que pode participar de uma troca: venda ativa, com troca marcada e com preço */
export function isTradable(listing: Listing): boolean {
  return (
    listing.type === 'SALE' &&
    listing.status === 'ACTIVE' &&
    listing.accepts_trade === true &&
    listing.price != null &&
    listing.price > 0
  );
}

/** O preço de `other` está dentro da margem em relação a `reference`? (50 e 52 sim; 50 e 53 não) */
export function isWithinTradeMargin(reference: Listing, other: Listing): boolean {
  if (reference.price == null || other.price == null) return false;
  return Math.abs(other.price - reference.price) <= reference.price * TRADE_PRICE_MARGIN + 1e-9;
}

/**
 * Produtos que combinam para troca com o produto aberto (`reference`):
 * - se o produto aberto é do usuário, lista os de outras pessoas;
 * - se é de outra pessoa, lista os do próprio usuário.
 * Só entram anúncios com troca marcada e preço dentro da margem, do mais próximo ao mais distante.
 */
export function findTradeCandidates(
  reference: Listing,
  allListings: Listing[],
  currentUserId?: string
): Listing[] {
  if (!currentUserId || !isTradable(reference)) return [];

  const isMine = reference.user_id === currentUserId;

  return allListings
    .filter((l) => l.id !== reference.id)
    .filter(isTradable)
    .filter((l) => (isMine ? l.user_id !== currentUserId : l.user_id === currentUserId))
    .filter((l) => isWithinTradeMargin(reference, l))
    .sort(
      (a, b) =>
        Math.abs((a.price as number) - (reference.price as number)) -
        Math.abs((b.price as number) - (reference.price as number))
    );
}

/** Texto enviado ao dono do produto desejado */
export function buildTradeMessage(offered: Listing, target: Listing): string {
  return (
    `🔄 Proposta de troca: quero trocar o meu "${offered.title}" (${formatMoney(offered.price as number)}) ` +
    `pelo seu "${target.title}" (${formatMoney(target.price as number)}). Você aceita trocar?`
  );
}

/**
 * Propõe a troca: abre (ou retoma) a conversa sobre o produto desejado e envia a proposta.
 * Se a mesma proposta já foi enviada nessa conversa, não repete.
 */
export async function proposeTrade(
  offered: Listing,
  target: Listing,
  me: UserProfile
): Promise<{ conversation: Conversation; alreadySent: boolean }> {
  if (!me.id) {
    throw new Error('Faça login com o Google para propor uma troca.');
  }
  if (offered.user_id !== me.id) {
    throw new Error('Você só pode oferecer um produto seu.');
  }
  if (target.user_id === me.id) {
    throw new Error('Escolha o produto de outra pessoa para trocar.');
  }
  if (!isTradable(offered) || !isTradable(target) || !isWithinTradeMargin(target, offered)) {
    throw new Error('Esses produtos não estão aptos para troca (valores fora da margem de 5%).');
  }

  const { conversation } = await startOrGetConversation(target, me);
  const text = buildTradeMessage(offered, target);

  const messages = await getConversationMessages(conversation.id);
  const alreadySent = messages.some((m) => m.sender_id === me.id && m.text === text);
  if (!alreadySent) {
    await sendMessage(conversation.id, me.id, text);
  }

  return { conversation, alreadySent };
}
