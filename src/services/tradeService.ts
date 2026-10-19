import { getSupabase } from '../lib/supabase';
import { Listing, TradeProposal, TradeProposalListing, UserProfile } from '../types/marketplace';

/** Opções de diferença de valor que a pessoa pode escolher na tela (padrão 5%) */
export const TRADE_MARGIN_OPTIONS = [0.05, 0.1, 0.15] as const;
export const DEFAULT_TRADE_MARGIN = 0.05;
/** Teto aceito pelo servidor (função propose_trade) */
export const MAX_TRADE_MARGIN = 0.15;

const formatMoney = (value: number) =>
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

function requireSupabase() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase não configurado.');
  }
  return supabase;
}

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

/** O preço de `other` está dentro da margem em relação a `reference`? (50 e 52 cabem em 5%; 50 e 53 não) */
export function isWithinTradeMargin(
  reference: Listing,
  other: Listing,
  margin: number = DEFAULT_TRADE_MARGIN
): boolean {
  if (reference.price == null || other.price == null) return false;
  return Math.abs(other.price - reference.price) <= reference.price * margin + 1e-9;
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
  currentUserId?: string,
  margin: number = DEFAULT_TRADE_MARGIN
): Listing[] {
  if (!currentUserId || !isTradable(reference)) return [];

  const isMine = reference.user_id === currentUserId;

  return allListings
    .filter((l) => l.id !== reference.id)
    .filter(isTradable)
    .filter((l) => (isMine ? l.user_id !== currentUserId : l.user_id === currentUserId))
    .filter((l) => isWithinTradeMargin(reference, l, margin))
    .sort(
      (a, b) =>
        Math.abs((a.price as number) - (reference.price as number)) -
        Math.abs((b.price as number) - (reference.price as number))
    );
}

/** Texto da mensagem que acompanha o cartão da proposta (também aparece na lista de conversas) */
export function buildTradeMessage(offered: Listing, target: Listing): string {
  return (
    `🔄 Proposta de troca: quero trocar o meu "${offered.title}" (${formatMoney(offered.price as number)}) ` +
    `pelo seu "${target.title}" (${formatMoney(target.price as number)}). Você aceita trocar?`
  );
}

/** Traduz os erros das funções do banco em mensagens claras */
function explainTradeError(message: string): Error {
  const rules: [string, string][] = [
    ['not_authenticated', 'Faça login com o Google para continuar.'],
    ['listing_not_found', 'Um dos anúncios não existe mais.'],
    ['not_owner', 'Você só pode oferecer um produto seu.'],
    ['own_listing', 'Escolha o produto de outra pessoa para trocar.'],
    ['not_tradable', 'Um dos produtos não está mais disponível para troca.'],
    ['out_of_margin', 'Os valores passam de 15% de diferença. Escolha um produto mais próximo.'],
    ['proposal_not_found', 'Essa proposta não existe mais.'],
    ['not_recipient', 'Só o dono do produto desejado pode aceitar a troca.'],
    ['not_pending', 'Essa proposta já foi respondida.'],
  ];
  for (const [code, text] of rules) {
    if (message.includes(code)) return new Error(text);
  }
  return new Error(message);
}

/**
 * Propõe a troca: o servidor valida tudo, abre (ou reaproveita) a conversa sobre o produto
 * desejado e registra a proposta com uma mensagem no chat. Repetir a mesma proposta não duplica.
 */
export async function proposeTrade(
  offered: Listing,
  target: Listing,
  me: UserProfile
): Promise<{ conversationId: string; proposalId: string; alreadySent: boolean }> {
  if (!me.id) {
    throw new Error('Faça login com o Google para propor uma troca.');
  }
  if (offered.user_id !== me.id) {
    throw new Error('Você só pode oferecer um produto seu.');
  }
  if (target.user_id === me.id) {
    throw new Error('Escolha o produto de outra pessoa para trocar.');
  }
  if (!isTradable(offered) || !isTradable(target) || !isWithinTradeMargin(target, offered, MAX_TRADE_MARGIN)) {
    throw new Error('Esses produtos não estão aptos para troca (valores a mais de 15% de diferença).');
  }

  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('propose_trade', {
    p_offered: offered.id,
    p_target: target.id,
    p_text: buildTradeMessage(offered, target),
  });
  if (error) throw explainTradeError(error.message);

  return {
    conversationId: data.conversation_id as string,
    proposalId: data.proposal_id as string,
    alreadySent: data.already_sent === true,
  };
}

/**
 * Aceita a proposta (somente o dono do produto desejado): os dois anúncios passam a "concluídos"
 * e as outras propostas pendentes sobre eles são encerradas.
 */
export async function acceptTrade(proposalId: string): Promise<void> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('accept_trade', { p_proposal: proposalId });
  if (error) throw explainTradeError(error.message);
  if (!data?.ok) {
    throw new Error('Um dos anúncios não está mais disponível, então a proposta foi encerrada.');
  }
}

const LISTING_BRIEF =
  'id, user_id, title, price, status, user:profiles(nome), listing_images(image_url)';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toBrief(row: any): TradeProposalListing | undefined {
  if (!row) return undefined;
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    price: row.price,
    status: row.status,
    images: (row.listing_images || []).map((i: { image_url: string }) => i.image_url),
    owner_name: row.user?.nome,
  };
}

/**
 * Propostas de troca indexadas pelo id (para ligar com as mensagens).
 * Sem `conversationId`, traz todas as do usuário (a regra do banco só devolve as das conversas dele).
 */
export async function fetchTradeProposals(conversationId?: string): Promise<Record<string, TradeProposal>> {
  const supabase = requireSupabase();
  let query = supabase
    .from('trade_proposals')
    .select(
      `*,
       offered:listings!trade_proposals_offered_listing_id_fkey(${LISTING_BRIEF}),
       target:listings!trade_proposals_target_listing_id_fkey(${LISTING_BRIEF})`
    );
  if (conversationId) query = query.eq('conversation_id', conversationId);
  const { data, error } = await query;

  if (error) throw new Error(error.message);

  const byId: Record<string, TradeProposal> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (data || []) as any[]) {
    byId[row.id] = { ...row, offered: toBrief(row.offered), target: toBrief(row.target) } as TradeProposal;
  }
  return byId;
}
