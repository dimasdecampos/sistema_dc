import { Usuario } from '../types/auth';
import { SiteConfig } from '../types/marketplace';
import { getSupabase } from '../lib/supabase';

const AUTH_STORAGE_KEY = 'sb_google_auth_user';
export const USER_ADMIN_CONFIG_KEY_PREFIX = 'temaqui_user_admin_config_';

/**
 * Recupera as configurações de admin salvas no perfil do usuário
 */
export function getSavedUserAdminConfig(email?: string | null): SiteConfig | null {
  if (!email) return null;
  try {
    const raw = localStorage.getItem(USER_ADMIN_CONFIG_KEY_PREFIX + email.toLowerCase().trim());
    if (raw) {
      return JSON.parse(raw) as SiteConfig;
    }
  } catch (e) {
    console.warn('Erro ao carregar adminConfig do usuário:', e);
  }
  return null;
}

/**
 * Salva as configurações de admin no storage do perfil do usuário
 */
export function saveUserAdminConfigToLocal(email: string, config: SiteConfig): void {
  try {
    const key = USER_ADMIN_CONFIG_KEY_PREFIX + email.toLowerCase().trim();
    localStorage.setItem(key, JSON.stringify(config));
  } catch (e) {
    console.error('Erro ao salvar adminConfig no perfil local:', e);
  }
}

/**
 * Retorna a foto do Google ou avatar configurado
 */
export function getOfficialGooglePhoto(email: string, officialPicture?: string): string {
  if (officialPicture && officialPicture.trim().length > 0) {
    return officialPicture.trim();
  }
  // Endpoint de fallback para contas públicas
  return `https://unavatar.io/google/${encodeURIComponent(email.trim().toLowerCase())}`;
}

/**
 * Decodifica o JWT retornado pela Google Identity Services (GSI)
 */
export function decodeGoogleJwt(credential: string): {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  locale?: string;
} | null {
  try {
    const parts = credential.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Erro ao decodificar JWT do Google:', e);
    return null;
  }
}

export function getStoredUser(): Usuario | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Usuario;
  } catch (e) {
    console.error('Erro ao recuperar usuário logado:', e);
    return null;
  }
}

export function saveStoredUser(user: Usuario): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Erro ao salvar sessão de usuário:', e);
  }
}

export function clearStoredUser(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (e) {
    console.error('Erro ao remover sessão de usuário:', e);
  }
}

/**
 * Salva ou atualiza os dados do usuário do Google na tabela 'usuarios' do Supabase.
 */
export async function syncUserWithSupabase(user: Usuario): Promise<{
  synced: boolean;
  user: Usuario;
  message?: string;
}> {
  const supabase = getSupabase();

  if (!supabase) {
    // Retorna usuário com persistência local mesmo sem Supabase configurado
    return {
      synced: false,
      user,
      message: 'Supabase não conectado. Usuário autenticado localmente.',
    };
  }

  try {
    const now = new Date().toISOString();
    const photoToSave = user.foto || getOfficialGooglePhoto(user.email);

    const savedConfig = user.adminConfig || getSavedUserAdminConfig(user.email);

    const payload: Record<string, unknown> = {
      google_id: user.google_id || `google_${Date.now()}`,
      email: user.email.toLowerCase().trim(),
      nome: user.nome.trim(),
      foto: photoToSave,
      cidade: user.cidade || null,
      locale: user.locale || 'pt-BR',
      last_login_at: now,
    };
    if (savedConfig) {
      payload.admin_config = savedConfig;
    }

    // Upsert na tabela 'usuarios'
    let data: any = null;
    const res = await supabase
      .from('usuarios')
      .upsert(payload, { onConflict: 'email' })
      .select()
      .maybeSingle();

    if (res.error) {
      // Se falhar por causa da coluna admin_config, tenta novamente sem ela
      if (res.error.message?.includes('admin_config') || res.error.code === '42703') {
        delete payload.admin_config;
        const retryRes = await supabase
          .from('usuarios')
          .upsert(payload, { onConflict: 'email' })
          .select()
          .maybeSingle();
        data = retryRes.data;
      } else {
        console.warn('Aviso ao sincronizar usuário com tabela usuarios:', res.error.message);
        return {
          synced: false,
          user,
          message: `Aviso do Supabase: ${res.error.message}`,
        };
      }
    } else {
      data = res.data;
    }

    const remoteConfig = data?.admin_config as SiteConfig | undefined;
    const finalConfig = remoteConfig || savedConfig || undefined;
    if (finalConfig) {
      saveUserAdminConfigToLocal(user.email, finalConfig);
    }

    const updatedUser: Usuario = {
      ...user,
      id: data?.id || user.id,
      foto: data?.foto || photoToSave,
      created_at: data?.created_at || user.created_at || now,
      last_login_at: now,
      adminConfig: finalConfig,
    };

    saveStoredUser(updatedUser);

    return {
      synced: true,
      user: updatedUser,
      message: 'Usuário sincronizado com a tabela usuarios no Supabase!',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Erro ao conectar tabela usuarios:', msg);
    return {
      synced: false,
      user,
      message: msg,
    };
  }
}

/**
 * Executa login do usuário, salvando na sessão local e na tabela usuarios do Supabase
 */
export async function loginWithGoogleData(profile: {
  nome: string;
  email: string;
  foto?: string;
  cidade?: string;
  google_id?: string;
  locale?: string;
}): Promise<{ user: Usuario; synced: boolean; message?: string }> {
  const photo = getOfficialGooglePhoto(profile.email, profile.foto);
  const savedAdminConfig = getSavedUserAdminConfig(profile.email);

  const baseUser: Usuario = {
    google_id: profile.google_id || `g_${Math.random().toString(36).substring(2, 12)}`,
    email: profile.email.toLowerCase().trim(),
    nome: profile.nome.trim(),
    foto: photo,
    cidade: profile.cidade || 'São Paulo',
    locale: profile.locale || 'pt-BR',
    last_login_at: new Date().toISOString(),
    adminConfig: savedAdminConfig || undefined,
  };

  // Salva no storage local primeiro para garantir persistência imediata
  saveStoredUser(baseUser);

  // Sincroniza com Supabase tabela usuarios
  const syncResult = await syncUserWithSupabase(baseUser);

  return {
    user: syncResult.user,
    synced: syncResult.synced,
    message: syncResult.message,
  };
}

/**
 * Atualiza os dados do perfil do usuário logado (ex: foto, cidade, nome ou adminConfig)
 */
export async function updateCurrentUserProfile(updates: Partial<Usuario>): Promise<Usuario> {
  const current = getStoredUser();
  if (!current) {
    throw new Error('Nenhum usuário logado.');
  }

  const updated: Usuario = {
    ...current,
    ...updates,
  };

  saveStoredUser(updated);

  if (updated.email && updated.adminConfig) {
    saveUserAdminConfigToLocal(updated.email, updated.adminConfig);
  }

  // Se conectado ao Supabase, propaga a atualização
  const supabase = getSupabase();
  if (supabase && updated.email) {
    try {
      const updateData: Record<string, unknown> = {
        nome: updated.nome,
        foto: updated.foto,
        cidade: updated.cidade,
        locale: updated.locale,
      };
      if (updated.adminConfig) {
        updateData.admin_config = updated.adminConfig;
      }

      const { error } = await supabase
        .from('usuarios')
        .update(updateData)
        .eq('email', updated.email.toLowerCase().trim());

      if (error && (error.message?.includes('admin_config') || error.code === '42703')) {
        // Tenta sem coluna admin_config se não existir no banco
        await supabase
          .from('usuarios')
          .update({
            nome: updated.nome,
            foto: updated.foto,
            cidade: updated.cidade,
            locale: updated.locale,
          })
          .eq('email', updated.email.toLowerCase().trim());
      }
    } catch (e) {
      console.warn('Aviso ao atualizar perfil no Supabase:', e);
    }
  }

  return updated;
}

/**
 * Salva as configurações do painel admin diretamente no perfil do usuário
 */
export async function saveAdminConfigToUserProfile(
  config: SiteConfig,
  targetEmail?: string
): Promise<Usuario | null> {
  const current = getStoredUser();
  const emailToUse = (targetEmail || current?.email || 'dimasrafting@gmail.com').toLowerCase().trim();

  // 1. Salva imediatamente no localStorage com a chave dedicada do usuário
  saveUserAdminConfigToLocal(emailToUse, config);

  // 2. Se for o usuário da sessão ativa ou se nenhum usuário estiver ativo mas for dimas, atualiza objeto da sessão
  if (current && (!targetEmail || current.email.toLowerCase().trim() === emailToUse)) {
    const updated: Usuario = {
      ...current,
      adminConfig: config,
    };
    saveStoredUser(updated);

    // 3. Sincroniza remotamente com Supabase
    const supabase = getSupabase();
    if (supabase && current.email) {
      try {
        const { error } = await supabase
          .from('usuarios')
          .update({ admin_config: config })
          .eq('email', current.email.toLowerCase().trim());

        if (error) {
          console.warn('Supabase: aviso ao persistir admin_config na tabela usuarios:', error.message);
        }
      } catch (e) {
        console.warn('Aviso ao salvar admin_config no Supabase:', e);
      }
    }
    return updated;
  }

  return current;
}

/**
 * Faz logout do usuário, limpando a sessão
 */
export async function logoutUser(): Promise<void> {
  clearStoredUser();
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  }
}
