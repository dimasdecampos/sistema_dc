import { getSupabase } from '../lib/supabase';
import {
  Listing,
  CreateWantedInput,
  CreateSaleInput,
  Match,
  Conversation,
  Message,
  UserProfile,
  WantedInterest,
} from '../types/marketplace';
import { calculateMatchScore, getMatchesForUser } from './matchingService';
import { getInterestMatches } from './interestService';
import { deleteMultipleImagesFromSupabase } from './storageService';

const MATCH_MIN_SCORE = 35;

const LISTING_SELECT = '*, category:categories(*), user:profiles(*), listing_images(image_url)';

const CONVERSATION_SELECT = `
  *,
  listing:listings(*, category:categories(*), user:profiles(*), listing_images(image_url)),
  buyer:profiles!conversations_buyer_id_fkey(*),
  seller:profiles!conversations_seller_id_fkey(*),
  messages(text, created_at, sender_id, read)
`;

function requireSupabase() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapListing(row: Record<string, any>): Listing {
  const { listing_images, ...rest } = row;
  const images = ((listing_images || []) as { image_url: string }[]).map((i) => i.image_url);
  return { ...rest, images } as Listing;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapConversation(row: Record<string, any>, myId?: string): Conversation {
  const { messages, listing, ...rest } = row;
  const sorted = ((messages || []) as {
    text: string;
    created_at: string;
    sender_id: string;
    read: boolean | null;
  }[])
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  return {
    ...rest,
    listing: listing ? mapListing(listing) : undefined,
    last_message: sorted.length > 0 ? sorted[sorted.length - 1].text : undefined,
    // Não lidas = mensagens da outra pessoa que ainda não foram abertas
    unread_count: myId ? sorted.filter((m) => m.sender_id !== myId && !m.read).length : 0,
  } as Conversation;
}

/**
 * Busca os anúncios no Supabase
 */
export async function fetchListings(filters?: {
  type?: 'WANTED' | 'SALE';
  category_id?: string;
  search?: string;
  user_id?: string;
}): Promise<{ listings: Listing[] }> {
  const supabase = requireSupabase();

  let query = supabase
    .from('listings')
    .select(LISTING_SELECT)
    .order('created_at', { ascending: false });

  if (filters?.type) query = query.eq('type', filters.type);
  if (filters?.category_id && filters.category_id !== 'all') query = query.eq('category_id', filters.category_id);
  if (filters?.user_id) query = query.eq('user_id', filters.user_id);
  if (filters?.search) query = query.ilike('title', `%${filters.search}%`);

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return { listings: (data || []).map(mapListing) };
}

/**
 * Cria o anúncio (WANTED ou SALE), grava as fotos e calcula os matches com os anúncios do lado oposto
 */
async function createListing(
  type: 'WANTED' | 'SALE',
  input: {
    title: string;
    description?: string;
    category_id: string;
    price?: number | null;
    condition: Listing['condition'];
    images?: string[];
    accepts_trade?: boolean;
  },
  currentUser: UserProfile
): Promise<{ listing: Listing; newMatches: Match[] }> {
  const supabase = requireSupabase();
  if (!currentUser.id) {
    throw new Error('Faça login com o Google para publicar.');
  }

  const { data: row, error } = await supabase
    .from('listings')
    .insert({
      user_id: currentUser.id,
      type,
      title: input.title.trim(),
      description: input.description?.trim() || '',
      category_id: input.category_id,
      price: input.price != null && Number(input.price) > 0 ? Number(input.price) : null,
      condition: input.condition,
      status: 'ACTIVE',
      // Troca só existe em anúncio de venda
      accepts_trade: type === 'SALE' && input.accepts_trade === true,
    })
    .select(LISTING_SELECT)
    .single();

  if (error || !row) {
    throw new Error(error?.message || 'Não foi possível salvar o anúncio.');
  }

  const images = input.images || [];
  if (images.length > 0) {
    const { error: imgError } = await supabase
      .from('listing_images')
      .insert(images.map((url) => ({ listing_id: row.id, image_url: url })));
    if (imgError) {
      await supabase.from('listings').delete().eq('id', row.id);
      throw new Error(`Erro ao salvar as fotos: ${imgError.message}`);
    }
  }

  const listing: Listing = { ...mapListing(row), images };

  // Matches com os anúncios ativos do lado oposto, de outras pessoas
  const newMatches: Match[] = [];
  try {
    const { data: others, error: othersError } = await supabase
      .from('listings')
      .select(LISTING_SELECT)
      .eq('type', type === 'WANTED' ? 'SALE' : 'WANTED')
      .eq('status', 'ACTIVE')
      .neq('user_id', currentUser.id);

    if (othersError) throw new Error(othersError.message);

    const candidates = (others || []).map(mapListing);
    const scored = candidates
      .map((other) => {
        const wanted = type === 'WANTED' ? listing : other;
        const sale = type === 'WANTED' ? other : listing;
        return { wanted, sale, score: calculateMatchScore(wanted, sale) };
      })
      .filter((m) => m.score >= MATCH_MIN_SCORE);

    if (scored.length > 0) {
      const { data: saved, error: matchError } = await supabase
        .from('matches')
        .upsert(
          scored.map((m) => ({
            wanted_listing_id: m.wanted.id,
            sale_listing_id: m.sale.id,
            score: m.score,
          })),
          { onConflict: 'wanted_listing_id,sale_listing_id' }
        )
        .select();

      if (matchError) throw new Error(matchError.message);

      for (const m of saved || []) {
        const pair = scored.find(
          (s) => s.wanted.id === m.wanted_listing_id && s.sale.id === m.sale_listing_id
        );
        if (pair) {
          newMatches.push({ ...m, wanted_listing: pair.wanted, sale_listing: pair.sale } as Match);
        }
      }
    }
  } catch (e) {
    // O anúncio já foi publicado; falha nos matches não deve desfazê-lo
    console.warn('Aviso ao calcular matches:', e);
  }

  return { listing, newMatches };
}

/**
 * Cria uma nova PROCURA ("Quero comprar / Estou procurando")
 */
export function createWantedListing(
  input: CreateWantedInput,
  currentUser: UserProfile
): Promise<{ listing: Listing; newMatches: Match[] }> {
  return createListing(
    'WANTED',
    { ...input, condition: input.condition || 'ANY' },
    currentUser
  );
}

/**
 * Cria uma nova VENDA ("Quero vender / Anúncio de produto")
 */
export function createSaleListing(
  input: CreateSaleInput,
  currentUser: UserProfile
): Promise<{ listing: Listing; newMatches: Match[] }> {
  return createListing('SALE', input, currentUser);
}

/**
 * Atualiza o status do anúncio (ex: marcar como CONCLUÍDO / RESOLVIDO)
 */
export async function updateListingStatus(
  listingId: string,
  newStatus: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('listings')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', listingId);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Exclui um anúncio (fotos e matches saem em cascata no banco) e remove os arquivos do Storage
 */
export async function deleteListing(listingId: string): Promise<void> {
  const supabase = requireSupabase();

  const { data: imgs } = await supabase
    .from('listing_images')
    .select('image_url')
    .eq('listing_id', listingId);

  const { error } = await supabase.from('listings').delete().eq('id', listingId);
  if (error) {
    throw new Error(error.message);
  }

  const urls = (imgs || []).map((i) => i.image_url);
  if (urls.length > 0) {
    try {
      await deleteMultipleImagesFromSupabase(urls);
    } catch (e) {
      console.warn('Erro ao excluir fotos do anúncio:', e);
    }
  }
}

/**
 * Atualiza um anúncio (título, descrição, preço, categoria, condição, status e fotos)
 */
export async function updateListing(
  listingId: string,
  updates: Partial<Listing>
): Promise<Listing> {
  const supabase = requireSupabase();

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.price !== undefined) payload.price = updates.price;
  if (updates.category_id !== undefined) payload.category_id = updates.category_id;
  if (updates.condition !== undefined) payload.condition = updates.condition;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.accepts_trade !== undefined) payload.accepts_trade = updates.accepts_trade;

  const { data: row, error } = await supabase
    .from('listings')
    .update(payload)
    .eq('id', listingId)
    .select(LISTING_SELECT)
    .single();

  if (error || !row) {
    throw new Error(error?.message || 'Anúncio não encontrado.');
  }

  let listing = mapListing(row);

  if (updates.images) {
    const { error: delError } = await supabase.from('listing_images').delete().eq('listing_id', listingId);
    if (delError) throw new Error(delError.message);

    if (updates.images.length > 0) {
      const { error: insError } = await supabase
        .from('listing_images')
        .insert(updates.images.map((url) => ({ listing_id: listingId, image_url: url })));
      if (insError) throw new Error(insError.message);
    }
    listing = { ...listing, images: updates.images };
  }

  return listing;
}

/**
 * Conversas do usuário logado (a RLS só devolve as dele)
 */
export async function fetchConversations(userId?: string): Promise<Conversation[]> {
  if (!userId) return [];
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return (data || []).map((c) => mapConversation(c, userId));
}

/**
 * Inicia ou retoma a conversa do comprador com o dono do anúncio
 */
export async function startOrGetConversation(
  listing: Listing,
  buyer: UserProfile,
  initialText?: string
): Promise<{ conversation: Conversation; isNew: boolean }> {
  const supabase = requireSupabase();

  if (!buyer.id) {
    throw new Error('Faça login com o Google para conversar.');
  }
  if (listing.user_id === buyer.id) {
    throw new Error('Este anúncio é seu.');
  }

  const { data: existing, error: findError } = await supabase
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .eq('listing_id', listing.id)
    .eq('buyer_id', buyer.id)
    .eq('seller_id', listing.user_id)
    .maybeSingle();

  if (findError) {
    throw new Error(findError.message);
  }
  if (existing) {
    return { conversation: mapConversation(existing, buyer.id), isNew: false };
  }

  const { data: created, error: createError } = await supabase
    .from('conversations')
    .insert({ listing_id: listing.id, buyer_id: buyer.id, seller_id: listing.user_id })
    .select('id')
    .single();

  if (createError || !created) {
    throw new Error(createError?.message || 'Não foi possível abrir a conversa.');
  }

  if (initialText) {
    const { error: msgError } = await supabase
      .from('messages')
      .insert({ conversation_id: created.id, sender_id: buyer.id, text: initialText });
    if (msgError) {
      throw new Error(msgError.message);
    }
  }

  const { data: full, error: fullError } = await supabase
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .eq('id', created.id)
    .single();

  if (fullError || !full) {
    throw new Error(fullError?.message || 'Conversa criada, mas não foi possível carregá-la.');
  }
  return { conversation: mapConversation(full, buyer.id), isNew: true };
}

/**
 * Envia uma mensagem em uma conversa
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string
): Promise<Message> {
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, text: text.trim() })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Não foi possível enviar a mensagem.');
  }

  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data as Message;
}

/**
 * Mensagens de uma conversa, da mais antiga para a mais nova
 */
export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return (data || []) as Message[];
}

export const fetchConversationMessages = getConversationMessages;

/**
 * Marca como lidas as mensagens da outra pessoa na conversa (quando o chat está aberto na tela).
 * Retorna quantas mensagens foram marcadas.
 */
export async function markConversationRead(conversationId: string, myId: string): Promise<number> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', myId)
    .eq('read', false)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  return data?.length ?? 0;
}

/**
 * Matches das procuras do usuário. Se `listings` já foi carregado, evita nova consulta.
 */
export async function getUserMatches(
  userOrId: { id?: string; email?: string } | string,
  listings?: Listing[],
  interests: WantedInterest[] = []
): Promise<Match[]> {
  const all = listings ?? (await fetchListings()).listings;
  const own = getMatchesForUser(userOrId, all, MATCH_MIN_SCORE);

  // Sininhos: anúncios novos que combinam com itens seguidos (sem repetir o que já veio das próprias procuras)
  const alreadyMatched = new Set(own.map((m) => m.sale_listing_id));
  const fromInterests = getInterestMatches(interests, all, MATCH_MIN_SCORE).filter(
    (m) => !alreadyMatched.has(m.sale_listing_id)
  );

  return [...own, ...fromInterests].sort((a, b) => b.score - a.score);
}
