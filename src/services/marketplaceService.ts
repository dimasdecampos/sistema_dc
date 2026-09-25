import { getSupabase } from '../lib/supabase';
import {
  Listing,
  CreateWantedInput,
  CreateSaleInput,
  Match,
  Conversation,
  Message,
  UserProfile,
} from '../types/marketplace';
import {
  INITIAL_SAMPLE_LISTINGS,
  INITIAL_CONVERSATIONS,
  INITIAL_MESSAGES,
  SAMPLE_USERS,
} from '../data/sampleMarketplaceData';
import { getCategoryById } from '../data/defaultCategories';
import {
  calculateMatchScore,
  getMatchesForUser,
  getBuyersInterestedInSale,
} from './matchingService';
import { deleteMultipleImagesFromSupabase } from './storageService';

const LOCAL_STORAGE_LISTINGS_KEY = 'tem_aqui_listings_v1';
const LOCAL_STORAGE_MATCHES_KEY = 'tem_aqui_matches_v1';
const LOCAL_STORAGE_CONVERSATIONS_KEY = 'tem_aqui_conversations_v1';
const LOCAL_STORAGE_MESSAGES_KEY = 'tem_aqui_messages_v1';

/**
 * Carrega a lista de anúncios do LocalStorage ou do seed inicial
 */
function getLocalListings(): Listing[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LISTINGS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Erro ao carregar anúncios locais:', e);
  }
  // Inicializa com o seed padrão do MVP
  localStorage.setItem(LOCAL_STORAGE_LISTINGS_KEY, JSON.stringify(INITIAL_SAMPLE_LISTINGS));
  return INITIAL_SAMPLE_LISTINGS;
}

function saveLocalListings(listings: Listing[]) {
  localStorage.setItem(LOCAL_STORAGE_LISTINGS_KEY, JSON.stringify(listings));
}

function getLocalConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CONVERSATIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }
  localStorage.setItem(LOCAL_STORAGE_CONVERSATIONS_KEY, JSON.stringify(INITIAL_CONVERSATIONS));
  return INITIAL_CONVERSATIONS;
}

function saveLocalConversations(convs: Conversation[]) {
  localStorage.setItem(LOCAL_STORAGE_CONVERSATIONS_KEY, JSON.stringify(convs));
}

function getLocalMessages(): Message[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_MESSAGES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }
  localStorage.setItem(LOCAL_STORAGE_MESSAGES_KEY, JSON.stringify(INITIAL_MESSAGES));
  return INITIAL_MESSAGES;
}

function saveLocalMessages(msgs: Message[]) {
  localStorage.setItem(LOCAL_STORAGE_MESSAGES_KEY, JSON.stringify(msgs));
}

/**
 * Busca todos os anúncios ativos (com dados completos de categoria e autor)
 */
export async function fetchListings(filters?: {
  type?: 'WANTED' | 'SALE';
  category_id?: string;
  search?: string;
  user_id?: string;
}): Promise<{ listings: Listing[]; error?: string; isLocalFallback: boolean }> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      let query = supabase
        .from('listings')
        .select(`
          *,
          category:categories(*),
          user:profiles(*),
          listing_images(image_url)
        `)
        .order('created_at', { ascending: false });

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.category_id && filters.category_id !== 'all') {
        query = query.eq('category_id', filters.category_id);
      }
      if (filters?.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        // Enriquecer com URLs de imagens se houver
        const enriched = (data as any[]).map((item) => {
          const remoteImgs: string[] = item.listing_images?.map((img: any) => img.image_url) || [];
          return {
            ...item,
            images: remoteImgs.length > 0 ? remoteImgs : item.images || [],
          } as Listing;
        });
        return { listings: enriched, isLocalFallback: false };
      }
    } catch (err) {
      console.warn('Falha na consulta ao Supabase, alternando para local:', err);
    }
  }

  // Fallback local enriquecido
  let listings = getLocalListings();

  if (filters?.type) {
    listings = listings.filter((l) => l.type === filters.type);
  }
  if (filters?.category_id && filters.category_id !== 'all') {
    listings = listings.filter((l) => l.category_id === filters.category_id);
  }
  if (filters?.user_id) {
    listings = listings.filter((l) => l.user_id === filters.user_id);
  }
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    listings = listings.filter(
      (l) =>
        l.title.toLowerCase().includes(s) ||
        (l.description && l.description.toLowerCase().includes(s))
    );
  }

  return { listings, isLocalFallback: true };
}

/**
 * Cria uma nova PROCURA ("Quero comprar / Estou procurando")
 */
export async function createWantedListing(
  input: CreateWantedInput,
  currentUser: UserProfile
): Promise<{ listing: Listing; newMatches: Match[] }> {
  const newId = `wanted-${Date.now()}`;
  const now = new Date().toISOString();

  const newListing: Listing = {
    id: newId,
    user_id: currentUser.id,
    type: 'WANTED',
    title: input.title.trim(),
    description: input.description?.trim() || '',
    category_id: input.category_id,
    price: input.price != null && input.price > 0 ? Number(input.price) : null,
    condition: input.condition || 'ANY',
    status: 'ACTIVE',
    created_at: now,
    updated_at: now,
    images: input.images || [],
    user: currentUser,
    category: getCategoryById(input.category_id),
  };

  // Salva no banco local
  const current = getLocalListings();
  const updated = [newListing, ...current];
  saveLocalListings(updated);

  // Calcula matches imediatos com as vendas ativas existentes
  const sales = updated.filter((l) => l.type === 'SALE' && l.status === 'ACTIVE');
  const newMatches: Match[] = [];

  for (const sale of sales) {
    const score = calculateMatchScore(newListing, sale);
    if (score >= 35) {
      newMatches.push({
        id: `match-${newListing.id}-${sale.id}`,
        wanted_listing_id: newListing.id,
        sale_listing_id: sale.id,
        score,
        created_at: now,
        viewed_at: null,
        wanted_listing: newListing,
        sale_listing: sale,
      });
    }
  }

  // Se Supabase estiver conectado, persiste em background
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('listings').insert({
        id: newListing.id,
        user_id: currentUser.id,
        type: 'WANTED',
        title: newListing.title,
        description: newListing.description,
        category_id: newListing.category_id,
        price: newListing.price,
        condition: newListing.condition,
        status: newListing.status,
      });

      // Grava fotos do anúncio em listing_images
      if (newListing.images && newListing.images.length > 0) {
        for (const imgUrl of newListing.images) {
          try {
            await supabase.from('listing_images').insert({
              listing_id: newListing.id,
              image_url: imgUrl,
            });
          } catch (imgErr) {
            console.warn('Erro ao inserir foto em listing_images:', imgErr);
          }
        }
      }

      // Grava os matches calculados
      for (const m of newMatches) {
        await supabase.from('matches').insert({
          wanted_listing_id: m.wanted_listing_id,
          sale_listing_id: m.sale_listing_id,
          score: m.score,
        });
      }
    } catch (e) {
      console.warn('Erro ao sincronizar com Supabase:', e);
    }
  }

  return { listing: newListing, newMatches };
}

/**
 * Cria uma nova VENDA ("Quero vender / Anúncio de produto")
 */
export async function createSaleListing(
  input: CreateSaleInput,
  currentUser: UserProfile
): Promise<{ listing: Listing; newMatches: Match[] }> {
  const newId = `sale-${Date.now()}`;
  const now = new Date().toISOString();

  const newListing: Listing = {
    id: newId,
    user_id: currentUser.id,
    type: 'SALE',
    title: input.title.trim(),
    description: input.description.trim(),
    category_id: input.category_id,
    price: Number(input.price),
    condition: input.condition,
    status: 'ACTIVE',
    created_at: now,
    updated_at: now,
    images: input.images || [],
    user: currentUser,
    category: getCategoryById(input.category_id),
  };

  // Salva no banco local
  const current = getLocalListings();
  const updated = [newListing, ...current];
  saveLocalListings(updated);

  // Calcula matches imediatos com pessoas que estão procurando por isso
  const wantings = updated.filter((l) => l.type === 'WANTED' && l.status === 'ACTIVE');
  const newMatches: Match[] = [];

  for (const wanted of wantings) {
    const score = calculateMatchScore(wanted, newListing);
    if (score >= 35) {
      newMatches.push({
        id: `match-${wanted.id}-${newListing.id}`,
        wanted_listing_id: wanted.id,
        sale_listing_id: newListing.id,
        score,
        created_at: now,
        viewed_at: null,
        wanted_listing: wanted,
        sale_listing: newListing,
      });
    }
  }

  // Sincroniza com Supabase se disponível
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('listings').insert({
        id: newListing.id,
        user_id: currentUser.id,
        type: 'SALE',
        title: newListing.title,
        description: newListing.description,
        category_id: newListing.category_id,
        price: newListing.price,
        condition: newListing.condition,
        status: newListing.status,
      });

      // Grava fotos do produto em listing_images
      if (newListing.images && newListing.images.length > 0) {
        for (const imgUrl of newListing.images) {
          try {
            await supabase.from('listing_images').insert({
              listing_id: newListing.id,
              image_url: imgUrl,
            });
          } catch (imgErr) {
            console.warn('Erro ao inserir foto em listing_images:', imgErr);
          }
        }
      }

      for (const m of newMatches) {
        await supabase.from('matches').insert({
          wanted_listing_id: m.wanted_listing_id,
          sale_listing_id: m.sale_listing_id,
          score: m.score,
        });
      }
    } catch (e) {
      console.warn('Erro ao sincronizar venda com Supabase:', e);
    }
  }

  return { listing: newListing, newMatches };
}

/**
 * Atualiza o status do anúncio (ex: marcar como CONCLUÍDO / RESOLVIDO)
 */
export async function updateListingStatus(
  listingId: string,
  newStatus: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
): Promise<void> {
  const current = getLocalListings();
  const updated = current.map((l) =>
    l.id === listingId ? { ...l, status: newStatus, updated_at: new Date().toISOString() } : l
  );
  saveLocalListings(updated);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase
        .from('listings')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', listingId);
    } catch (e) {
      console.warn(e);
    }
  }
}

/**
 * Exclui um anúncio e remove suas fotos do Supabase Storage
 */
export async function deleteListing(listingId: string): Promise<void> {
  const current = getLocalListings();
  const toDelete = current.find((l) => l.id === listingId);
  const updated = current.filter((l) => l.id !== listingId);
  saveLocalListings(updated);

  // Exclui fotos associadas do Supabase Storage
  if (toDelete?.images && toDelete.images.length > 0) {
    try {
      await deleteMultipleImagesFromSupabase(toDelete.images);
    } catch (err) {
      console.warn('Erro ao excluir fotos do anúncio no Supabase Storage:', err);
    }
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('listings').delete().eq('id', listingId);
    } catch (e) {
      console.warn(e);
    }
  }
}

/**
 * Atualiza um anúncio (edição de título, descrição, preço, categoria, status, fotos)
 */
export async function updateListing(
  listingId: string,
  updates: Partial<Listing>
): Promise<Listing> {
  const current = getLocalListings();
  const existing = current.find((l) => l.id === listingId);
  if (!existing) {
    throw new Error('Anúncio não encontrado.');
  }

  const updatedListing: Listing = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const updated = current.map((l) => (l.id === listingId ? updatedListing : l));
  saveLocalListings(updated);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const payload: Record<string, any> = {
        updated_at: updatedListing.updated_at,
      };
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.price !== undefined) payload.price = updates.price;
      if (updates.category_id !== undefined) payload.category_id = updates.category_id;
      if (updates.condition !== undefined) payload.condition = updates.condition;
      if (updates.status !== undefined) payload.status = updates.status;

      await supabase.from('listings').update(payload).eq('id', listingId);

      if (updates.images) {
        await supabase.from('listing_images').delete().eq('listing_id', listingId);
        if (updates.images.length > 0) {
          const imgRows = updates.images.map((img) => ({
            listing_id: listingId,
            image_url: img,
          }));
          await supabase.from('listing_images').insert(imgRows);
        }
      }
    } catch (e) {
      console.warn('Erro ao atualizar anúncio no Supabase:', e);
    }
  }

  return updatedListing;
}

/**
 * Obtém todos os matches encontrados para um usuário específico
 * (Área 3 do Painel: "Encontramos para você")
 */
export async function getUserMatches(userId: string): Promise<Match[]> {
  const allListings = getLocalListings();
  return getMatchesForUser(userId, allListings);
}

/**
 * Envia mensagem / Inicia conversa direta entre Comprador e Vendedor
 */
export async function startOrGetConversation(
  listing: Listing,
  buyer: UserProfile,
  initialMessageText?: string
): Promise<{ conversation: Conversation; message?: Message }> {
  const seller = listing.user || SAMPLE_USERS.joao;
  const convs = getLocalConversations();

  // Verifica se já existe conversa entre eles para este anúncio
  let conv = convs.find(
    (c) =>
      c.listing_id === listing.id &&
      c.buyer_id === buyer.id &&
      c.seller_id === seller.id
  );

  const now = new Date().toISOString();

  if (!conv) {
    conv = {
      id: `conv-${Date.now()}`,
      listing_id: listing.id,
      buyer_id: buyer.id,
      seller_id: seller.id,
      created_at: now,
      updated_at: now,
      listing,
      buyer,
      seller,
      last_message: initialMessageText || 'Conversa iniciada',
      unread_count: 0,
    };
    saveLocalConversations([conv, ...convs]);
  }

  let msg: Message | undefined;
  if (initialMessageText) {
    msg = {
      id: `msg-${Date.now()}`,
      conversation_id: conv.id,
      sender_id: buyer.id,
      text: initialMessageText,
      created_at: now,
      read: false,
    };
    const msgs = getLocalMessages();
    saveLocalMessages([...msgs, msg]);
  }

  return { conversation: conv, message: msg };
}

/**
 * Carrega mensagens de uma conversa
 */
export async function fetchConversationMessages(convId: string): Promise<Message[]> {
  const all = getLocalMessages();
  return all.filter((m) => m.conversation_id === convId).sort((a, b) => (a.created_at > b.created_at ? 1 : -1));
}

/**
 * Envia uma mensagem em uma conversa existente
 */
export async function sendMessage(
  convId: string,
  senderId: string,
  text: string
): Promise<Message> {
  const now = new Date().toISOString();
  const newMsg: Message = {
    id: `msg-${Date.now()}`,
    conversation_id: convId,
    sender_id: senderId,
    text,
    created_at: now,
    read: true,
  };

  const msgs = getLocalMessages();
  saveLocalMessages([...msgs, newMsg]);

  // Atualiza conversa
  const convs = getLocalConversations();
  const updatedConvs = convs.map((c) =>
    c.id === convId ? { ...c, last_message: text, updated_at: now } : c
  );
  saveLocalConversations(updatedConvs);

  return newMsg;
}
