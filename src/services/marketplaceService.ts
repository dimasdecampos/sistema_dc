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
} from '../data/sampleMarketplaceData';
import { getCategoryById } from '../data/defaultCategories';
import {
  calculateMatchScore,
  getMatchesForUser,
} from './matchingService';
import { deleteMultipleImagesFromSupabase } from './storageService';

const LOCAL_STORAGE_LISTINGS_KEY = 'tem_aqui_listings_v1';
const LOCAL_STORAGE_CONVERSATIONS_KEY = 'tem_aqui_conversations_v1';
const LOCAL_STORAGE_MESSAGES_KEY = 'tem_aqui_messages_v1';

const MOCK_LISTING_IDS = ['wanted-1', 'wanted-2', 'wanted-3', 'sale-1', 'sale-2', 'sale-3'];

/**
 * Carrega a lista de anúncios do LocalStorage (apenas anúncios reais publicados, sem exemplos)
 */
function getLocalListings(): Listing[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LISTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((l: any) => l && l.id && !MOCK_LISTING_IDS.includes(l.id));
      }
    }
  } catch (e) {
    console.warn('Erro ao carregar anúncios locais:', e);
  }
  return [];
}

function saveLocalListings(listings: Listing[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_LISTINGS_KEY, JSON.stringify(listings));
  } catch (e) {
    console.warn('Erro ao salvar anúncios no localStorage:', e);
  }
}

function getLocalConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CONVERSATIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }
  return INITIAL_CONVERSATIONS;
}

function saveLocalConversations(convs: Conversation[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_CONVERSATIONS_KEY, JSON.stringify(convs));
  } catch (e) {
    console.warn(e);
  }
}

function getLocalMessages(): Message[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_MESSAGES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }
  return INITIAL_MESSAGES;
}

function saveLocalMessages(msgs: Message[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_MESSAGES_KEY, JSON.stringify(msgs));
  } catch (e) {
    console.warn(e);
  }
}

/**
 * Busca todos os anúncios ativos (com sincronização prioritária com a API do servidor compartilhado)
 */
export async function fetchListings(filters?: {
  type?: 'WANTED' | 'SALE';
  category_id?: string;
  search?: string;
  user_id?: string;
}): Promise<{ listings: Listing[]; error?: string; isLocalFallback: boolean }> {
  // 1. Tenta buscar da API REST central (persistência compartilhada entre celular e computador)
  try {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.category_id && filters.category_id !== 'all') params.append('category_id', filters.category_id);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.user_id) params.append('user_id', filters.user_id);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/listings${queryString}`, {
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.listings)) {
        // Se for listagem geral sem filtros, atualiza o cache local
        if (!filters?.type && (!filters?.category_id || filters.category_id === 'all') && !filters?.search && !filters?.user_id) {
          saveLocalListings(data.listings);
        }
        return { listings: data.listings, isLocalFallback: false };
      }
    }
  } catch (apiErr) {
    console.warn('API /api/listings indisponível, verificando alternativas:', apiErr);
  }

  // 2. Tenta Supabase caso esteja configurado
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
        const enriched = (data as any[]).map((item) => {
          const remoteImgs: string[] = item.listing_images?.map((img: any) => img.image_url) || [];
          return {
            ...item,
            images: remoteImgs.length > 0 ? remoteImgs : item.images || [],
          } as Listing;
        });
        saveLocalListings(enriched);
        return { listings: enriched, isLocalFallback: false };
      }
    } catch (err) {
      console.warn('Falha na consulta ao Supabase, alternando para local:', err);
    }
  }

  // 3. Fallback local
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
  const updated = [newListing, ...current.filter((l) => l.id !== newListing.id)];
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

  // 1. Envia para o servidor central compartilhado para aparecer em todos os aparelhos
  try {
    const apiRes = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newListing),
    });
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data.listing) {
        saveLocalListings([data.listing, ...current.filter((l) => l.id !== data.listing.id)]);
        return {
          listing: data.listing,
          newMatches: data.newMatches && data.newMatches.length > 0 ? data.newMatches : newMatches,
        };
      }
    }
  } catch (apiErr) {
    console.warn('Aviso: envio para servidor central falhou, mantido local:', apiErr);
  }

  // 2. Se Supabase estiver conectado, persiste em background
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
  const updated = [newListing, ...current.filter((l) => l.id !== newListing.id)];
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

  // 1. Envia para o servidor central compartilhado para aparecer em todos os aparelhos
  try {
    const apiRes = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newListing),
    });
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data.listing) {
        saveLocalListings([data.listing, ...current.filter((l) => l.id !== data.listing.id)]);
        return {
          listing: data.listing,
          newMatches: data.newMatches && data.newMatches.length > 0 ? data.newMatches : newMatches,
        };
      }
    }
  } catch (apiErr) {
    console.warn('Aviso: envio para servidor central falhou, mantido local:', apiErr);
  }

  // 2. Sincroniza com Supabase se disponível
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

  try {
    await fetch(`/api/listings/${listingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
  } catch (e) {
    console.warn(e);
  }

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
 * Exclui um anúncio e remove suas fotos
 */
export async function deleteListing(listingId: string): Promise<void> {
  const current = getLocalListings();
  const toDelete = current.find((l) => l.id === listingId);
  const updated = current.filter((l) => l.id !== listingId);
  saveLocalListings(updated);

  try {
    await fetch(`/api/listings/${listingId}`, {
      method: 'DELETE',
    });
  } catch (e) {
    console.warn(e);
  }

  if (toDelete?.images && toDelete.images.length > 0) {
    try {
      await deleteMultipleImagesFromSupabase(toDelete.images);
    } catch (err) {
      console.warn('Erro ao excluir fotos do anúncio:', err);
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

  try {
    await fetch(`/api/listings/${listingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  } catch (e) {
    console.warn(e);
  }

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
    } catch (e) {
      console.warn('Erro ao atualizar anúncio no Supabase:', e);
    }
  }

  return updatedListing;
}

/**
 * Busca conversas do usuário ativo (por id e opcionalmente por e-mail)
 */
export async function fetchConversations(userId?: string, userEmail?: string): Promise<Conversation[]> {
  try {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (userEmail) params.append('email', userEmail);
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/conversations${queryStr}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.conversations)) {
        saveLocalConversations(data.conversations);
        return data.conversations;
      }
    }
  } catch (apiErr) {
    console.warn('Erro ao buscar conversas da API:', apiErr);
  }

  const localConvs = getLocalConversations();
  if (userId || userEmail) {
    const emailLower = (userEmail || '').toLowerCase().trim();
    return localConvs.filter((c) => {
      if (userId && (c.buyer_id === userId || c.seller_id === userId)) return true;
      if (emailLower && (
        (c.buyer?.email && c.buyer.email.toLowerCase().trim() === emailLower) ||
        (c.seller?.email && c.seller.email.toLowerCase().trim() === emailLower)
      )) return true;
      return false;
    });
  }
  return localConvs;
}

/**
 * Inicia ou resgata uma conversa existente para um anúncio
 */
export async function startOrGetConversation(
  listing: Listing,
  buyer: UserProfile,
  initialText?: string
): Promise<{ conversation: Conversation; isNew: boolean }> {
  try {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing, buyer, initialText }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.conversation) {
        const convs = getLocalConversations();
        const exists = convs.some((c) => c.id === data.conversation.id);
        if (!exists) {
          saveLocalConversations([data.conversation, ...convs]);
        }
        return { conversation: data.conversation, isNew: !!data.isNew };
      }
    }
  } catch (err) {
    console.warn('Erro ao chamar /api/conversations:', err);
  }

  const convs = getLocalConversations();
  const existing = convs.find(
    (c) =>
      c.listing_id === listing.id &&
      c.buyer_id === buyer.id &&
      c.seller_id === listing.user_id
  );

  if (existing) {
    return { conversation: existing, isNew: false };
  }

  const now = new Date().toISOString();
  const newConv: Conversation = {
    id: `conv-${Date.now()}`,
    listing_id: listing.id,
    buyer_id: buyer.id,
    seller_id: listing.user_id,
    created_at: now,
    updated_at: now,
    last_message: initialText || 'Conversa iniciada',
    listing: listing,
    buyer: buyer,
    seller: listing.user || {
      id: listing.user_id,
      nome: 'Vendedor',
      cidade: 'São Luis do Paraitinga - SP',
      created_at: now,
    },
  };

  const updatedConvs = [newConv, ...convs];
  saveLocalConversations(updatedConvs);

  if (initialText) {
    const msgs = getLocalMessages();
    const newMsg: Message = {
      id: `msg-${Date.now()}-1`,
      conversation_id: newConv.id,
      sender_id: buyer.id,
      text: initialText,
      created_at: now,
      read: true,
    };
    saveLocalMessages([...msgs, newMsg]);
  }

  return { conversation: newConv, isNew: true };
}

/**
 * Envia uma mensagem em uma conversa ativa
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string
): Promise<Message> {
  const now = new Date().toISOString();
  const newMsg: Message = {
    id: `msg-${Date.now()}`,
    conversation_id: conversationId,
    sender_id: senderId,
    text: text.trim(),
    created_at: now,
    read: true,
  };

  try {
    await fetch(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderId, text: text.trim() }),
    });
  } catch (err) {
    console.warn('Erro ao enviar mensagem via API:', err);
  }

  // Atualiza localmente
  const msgs = getLocalMessages();
  saveLocalMessages([...msgs, newMsg]);

  const convs = getLocalConversations();
  const updatedConvs = convs.map((c) =>
    c.id === conversationId ? { ...c, last_message: text.trim(), updated_at: now } : c
  );
  saveLocalConversations(updatedConvs);

  return newMsg;
}

/**
 * Carrega mensagens de uma conversa
 */
export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  try {
    const res = await fetch('/api/conversations');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.conversations)) {
        const found = data.conversations.find((c: any) => c.id === conversationId);
        if (found && Array.isArray(found.messages)) {
          return found.messages;
        }
      }
    }
  } catch (e) {
    // fallback local
  }
  const msgs = getLocalMessages();
  return msgs.filter((m) => m.conversation_id === conversationId);
}

export const fetchConversationMessages = getConversationMessages;

export async function getUserMatches(userOrId: { id?: string; email?: string } | string): Promise<Match[]> {
  const { listings } = await fetchListings();
  return getMatchesForUser(userOrId, listings);
}

