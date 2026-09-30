import { Listing, UserProfile, Conversation, Message } from '../types/marketplace';

// Banco limpo: nenhum usuário fictício ou exemplo hardcoded
export const SAMPLE_USERS: Record<string, UserProfile> = {};

// Apenas anúncios reais gravados no banco de dados
export const INITIAL_SAMPLE_LISTINGS: Listing[] = [];

export const INITIAL_CONVERSATIONS: Conversation[] = [];

export const INITIAL_MESSAGES: Message[] = [];
