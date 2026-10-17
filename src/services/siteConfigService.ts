import { SiteConfig } from '../types/marketplace';
import { getSupabase } from '../lib/supabase';

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  siteName: 'TemAqui',
  cityName: 'São Luis do Paraitinga - SP',
  tagline: 'Marketplace local baseado em Procura e Oferta',
  heroTitle: 'O que você está procurando em São Luis do Paraitinga?',
  heroSubtitle: 'Diga o que você precisa. Quando um morador anunciar, você recebe recomendação imediata.',
  noticeBannerEnabled: true,
  noticeBannerText: '🎉 Bem-vindo ao TemAqui São Luis do Paraitinga! Publique o que você procura ou tem parado em casa.',
  noticeBannerType: 'success',
  contactPhone: '(12) 99876-5432',
  contactEmail: 'contato@temaquislp.com.br',
  autoMatchThreshold: 35,
  currencySymbol: 'R$',
  adminEmails: [],
};

/**
 * Admin = e-mail listado em adminEmails da configuração salva no banco (tabela site_config).
 * A permissão real de gravação é garantida pela RLS (função is_admin()).
 */
export function isUserAdmin(email?: string | null, config?: SiteConfig): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return (config?.adminEmails || []).some((e) => e.toLowerCase().trim() === normalized);
}

/**
 * Lê a configuração do site salva no Supabase (mescla com os padrões)
 */
export async function fetchSiteConfig(): Promise<SiteConfig> {
  const supabase = getSupabase();
  if (!supabase) return DEFAULT_SITE_CONFIG;

  const { data, error } = await supabase
    .from('site_config')
    .select('config')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.warn('Aviso ao carregar configurações do site:', error.message);
    return DEFAULT_SITE_CONFIG;
  }

  return { ...DEFAULT_SITE_CONFIG, ...((data?.config as Partial<SiteConfig>) || {}) };
}

/**
 * Salva a configuração do site no Supabase (somente admins passam pela RLS)
 */
export async function saveSiteConfig(config: SiteConfig): Promise<SiteConfig> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase não configurado.');
  }

  const { error } = await supabase
    .from('site_config')
    .upsert({ id: 1, config, updated_at: new Date().toISOString() });

  if (error) {
    throw new Error(error.message);
  }
  return config;
}

/**
 * Restaura os padrões mantendo a lista de administradores (para ninguém perder o acesso)
 */
export async function resetSiteConfig(current: SiteConfig): Promise<SiteConfig> {
  return saveSiteConfig({ ...DEFAULT_SITE_CONFIG, adminEmails: current.adminEmails || [] });
}
