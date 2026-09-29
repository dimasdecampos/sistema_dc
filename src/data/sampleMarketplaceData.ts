import { Listing, UserProfile, Conversation, Message } from '../types/marketplace';

export const SAMPLE_USERS: Record<string, UserProfile> = {
  dimas: {
    id: 'user-dimas',
    nome: 'Dimas',
    email: 'dimasrafting@gmail.com',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    cidade: 'São Luis do Paraitinga - SP',
    created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
  },
};

// Vazio por padrão: apenas anúncios efetivamente publicados no banco de dados devem aparecer
export const INITIAL_SAMPLE_LISTINGS: Listing[] = [];

export const INITIAL_CONVERSATIONS: Conversation[] = [];

export const INITIAL_MESSAGES: Message[] = [];
