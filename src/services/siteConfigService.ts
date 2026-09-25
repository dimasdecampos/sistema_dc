import { SiteConfig } from '../types/marketplace';
import {
  getSavedUserAdminConfig,
  saveUserAdminConfigToLocal,
  saveAdminConfigToUserProfile,
  getStoredUser,
} from './authService';

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
  return adminList.some((e: string) => e.toLowerCase().trim() === normalized);
}

/**
 * Obtém as configurações do site, priorizando as configurações salvas no perfil do usuário
 */
export function getSiteConfig(userEmail?: string | null): SiteConfig {
  try {
    const activeEmail = (userEmail || getStoredUser()?.email || '').toLowerCase().trim();

    // 1. Tenta carregar do perfil do usuário logado
    if (activeEmail) {
      const userSaved = getSavedUserAdminConfig(activeEmail);
      if (userSaved) {
        const adminEmails = Array.from(
          new Set(['dimasrafting@gmail.com', ...(userSaved.adminEmails || [])])
        );
        return { ...DEFAULT_SITE_CONFIG, ...userSaved, adminEmails };
      }
    }

    // 2. Fallback para configuração geral no localStorage
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

/**
 * Salva as configurações do site no storage global E diretamente no perfil do usuário
 */
export function saveSiteConfig(newConfig: SiteConfig, userEmail?: string | null): SiteConfig {
  try {
    // Garante que dimasrafting@gmail.com nunca seja removido acidentalmente
    const adminEmails = Array.from(
      new Set(['dimasrafting@gmail.com', ...(newConfig.adminEmails || [])])
    );
    const configToSave: SiteConfig = { ...newConfig, adminEmails };

    // 1. Salva no localStorage geral do app
    localStorage.setItem(SITE_CONFIG_STORAGE_KEY, JSON.stringify(configToSave));

    // 2. Salva diretamente no perfil do usuário
    const targetEmail = (userEmail || getStoredUser()?.email || 'dimasrafting@gmail.com').toLowerCase().trim();
    if (targetEmail) {
      saveUserAdminConfigToLocal(targetEmail, configToSave);
      // Dispara persistência assíncrona no perfil / Supabase
      saveAdminConfigToUserProfile(configToSave, targetEmail).catch((err) => {
        console.warn('Aviso ao sincronizar config com perfil do usuário:', err);
      });
    }

    return configToSave;
  } catch (e) {
    console.error('Erro ao salvar configurações do site:', e);
  }
  return newConfig;
}

/**
 * Restaura as configurações padrão do site e limpa personalizações do perfil do usuário
 */
export function resetSiteConfig(userEmail?: string | null): SiteConfig {
  try {
    localStorage.removeItem(SITE_CONFIG_STORAGE_KEY);
    const targetEmail = (userEmail || getStoredUser()?.email || '').toLowerCase().trim();
    if (targetEmail) {
      saveAdminConfigToUserProfile(DEFAULT_SITE_CONFIG, targetEmail).catch(() => {});
    }
  } catch (e) {
    console.error('Erro ao resetar configurações:', e);
  }
  return DEFAULT_SITE_CONFIG;
}
