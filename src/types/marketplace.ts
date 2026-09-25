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
  adminEmails?: string[];
}

export interface WantedRankItem {
  id: string;
  term: string;
  category_id: string;
  category_name: string;
  category_icon: string;
  total_seekers: number;
  avg_budget: number | null;
  available_offers: number;
  sample_titles: string[];
}
