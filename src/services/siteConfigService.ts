import { SiteConfig } from '../types/marketplace';

const SITE_CONFIG_STORAGE_KEY = 'tem_aqui_site_config_v1';

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  siteName: 'TemAqui',
  cityName: 'Socorro - SP',
  tagline: 'Marketplace local baseado em Procura e Oferta',
  heroTitle: 'O que você está procurando em Socorro?',
  heroSubtitle: 'Diga o que você precisa. Quando um morador anunciar, você recebe recomendação imediata.',
  noticeBannerEnabled: true,
  noticeBannerText: '🎉 Bem-vindo ao TemAqui Socorro! Publique o que você procura ou tem parado em casa.',
  noticeBannerType: 'success',
  contactPhone: '(19) 99876-5432',
  contactEmail: 'contato@temaquisocorro.com.br',
  autoMatchThreshold: 35,
  currencySymbol: 'R$',
  adminEmails: ['dimasrafting@gmail.com'],
};

export function isUserAdmin(email?: string | null, config?: SiteConfig): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  if (normalized === 'dimasrafting@gmail.com') return true;
  const adminList = config?.adminEmails || DEFAULT_SITE_CONFIG.adminEmails || ['dimasrafting@gmail.com'];
  return adminList.some((e) => e.toLowerCase().trim() === normalized);
}

export function getSiteConfig(): SiteConfig {
  try {
    const raw = localStorage.getItem(SITE_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Garante que dimasrafting@gmail.com sempre está na lista de admins
      const adminEmails = Array.from(
        new Set(['dimasrafting@gmail.com', ...(parsed.adminEmails || [])])
      );
      return { ...DEFAULT_SITE_CONFIG, ...parsed, adminEmails };
    }
  } catch (e) {
    console.warn('Erro ao carregar configurações do site:', e);
  }
  return DEFAULT_SITE_CONFIG;
}

export function saveSiteConfig(newConfig: SiteConfig): SiteConfig {
  try {
    // Garante que dimasrafting@gmail.com nunca seja removido acidentalmente
    const adminEmails = Array.from(
      new Set(['dimasrafting@gmail.com', ...(newConfig.adminEmails || [])])
    );
    const configToSave = { ...newConfig, adminEmails };
    localStorage.setItem(SITE_CONFIG_STORAGE_KEY, JSON.stringify(configToSave));
    return configToSave;
  } catch (e) {
    console.error('Erro ao salvar configurações do site:', e);
  }
  return newConfig;
}

export function resetSiteConfig(): SiteConfig {
  try {
    localStorage.removeItem(SITE_CONFIG_STORAGE_KEY);
  } catch (e) {
    console.error('Erro ao resetar configurações:', e);
  }
  return DEFAULT_SITE_CONFIG;
}
