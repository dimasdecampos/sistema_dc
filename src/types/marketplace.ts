export type ListingType = 'WANTED' | 'SALE';
export type ListingCondition = 'NEW' | 'USED' | 'ANY';
export type ListingStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  created_at?: string;
}

export interface UserProfile {
  id: string;
  nome: string;
  email?: string;
  avatar_url?: string;
  cidade: string;
  created_at: string;
  updated_at?: string;
  adminConfig?: SiteConfig;
  /** Recurso premium (concedido pelo admin): loja personalizada do vendedor */
  is_premium?: boolean;
  store_name?: string | null;
  store_color?: string | null;
}

export interface ListingImage {
  id: string;
  listing_id: string;
  image_url: string;
  created_at: string;
}

export interface Listing {
  id: string;
  user_id: string;
  type: ListingType;
  title: string;
  description: string;
  category_id: string;
  price?: number | null; // For SALE: sale price. For WANTED: max budget
  condition: ListingCondition;
  status: ListingStatus;
  /** Anúncio de venda aberto a troca por outro produto de valor parecido */
  accepts_trade?: boolean;
  created_at: string;
  updated_at: string;
  // Relational joins
  images?: string[];
  user?: UserProfile;
  category?: Category;
}

export interface Match {
  id: string;
  wanted_listing_id: string;
  sale_listing_id: string;
  score: number; // 0 - 100
  created_at: string;
  viewed_at?: string | null;
  // Joined listings
  wanted_listing?: Listing;
  sale_listing?: Listing;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  created_at: string;
  read: boolean;
  /** Mensagem que carrega o cartão de uma proposta de troca */
  trade_proposal_id?: string | null;
}

export interface Conversation {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  updated_at: string;
  listing?: Listing;
  buyer?: UserProfile;
  seller?: UserProfile;
  last_message?: string;
  unread_count?: number;
  /** Últimas mensagens já carregadas junto com a lista (abre o chat sem esperar a rede) */
  messages?: Message[];
}

export interface CreateWantedInput {
  title: string;
  category_id: string;
  condition: ListingCondition;
  price?: number | null; // Max price
  description?: string;
  images?: string[];
}

export interface CreateSaleInput {
  title: string;
  description: string;
  category_id: string;
  price: number;
  condition: 'NEW' | 'USED';
  images?: string[];
  accepts_trade?: boolean;
}

export interface SiteConfig {
  siteName: string;
  cityName: string;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  noticeBannerEnabled: boolean;
  noticeBannerText: string;
  noticeBannerType: 'info' | 'warning' | 'success';
  contactPhone: string;
  contactEmail: string;
  autoMatchThreshold: number;
  currencySymbol: string;
  /** Quantos cards aparecem por vez nas listas (padrão 16) */
  cardsPerPage?: number;
  /** "button" = botão Ver mais; "infinite" = carrega ao rolar */
  loadMoreMode?: 'button' | 'infinite';
  adminEmails?: string[];
}

/** Sininho "também procuro": a pessoa quer ser avisada quando anunciarem este item */
export interface WantedInterest {
  id: string;
  user_id: string;
  term_key: string;
  term: string;
  category_id: string | null;
  created_at: string;
}

export interface WantedRankItem {
  /** Mesmo valor de wanted_interests.term_key: "<category_id>__<termo em minúsculas>" */
  id: string;
  /** Quem já tem uma procura ativa publicada para este item */
  seeker_user_ids: string[];
  term: string;
  category_id: string;
  category_name: string;
  category_icon: string;
  total_seekers: number;
  avg_budget: number | null;
  available_offers: number;
  sample_titles: string[];
}

export type TradeProposalStatus = 'PENDING' | 'ACCEPTED' | 'CANCELLED';

/** Dados mínimos de um anúncio dentro de uma proposta de troca */
export interface TradeProposalListing {
  id: string;
  user_id: string;
  title: string;
  price: number | null;
  status: ListingStatus;
  images: string[];
  owner_name?: string;
}

export interface TradeProposal {
  id: string;
  conversation_id: string;
  offered_listing_id: string;
  target_listing_id: string;
  proposer_id: string;
  status: TradeProposalStatus;
  created_at: string;
  responded_at: string | null;
  /** Produto de quem propôs */
  offered?: TradeProposalListing;
  /** Produto desejado (o dono dele recebe a proposta) */
  target?: TradeProposalListing;
}
