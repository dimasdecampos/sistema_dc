import { Usuario } from '../types/auth';
import { getSupabase } from '../lib/supabase';

const AUTH_STORAGE_KEY = 'sb_google_auth_user';

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
    const payload = {
      google_id: user.google_id || `google_${Date.now()}`,
      email: user.email.toLowerCase().trim(),
      nome: user.nome.trim(),
      foto: user.foto || null,
      cidade: user.cidade || null,
      locale: user.locale || 'pt-BR',
      last_login_at: now,
    };

    // Upsert na tabela 'usuarios'
    const { data, error } = await supabase
      .from('usuarios')
      .upsert(payload, { onConflict: 'email' })
      .select()
      .maybeSingle();

    if (error) {
      console.warn('Aviso ao sincronizar usuário com tabela usuarios:', error.message);
      return {
        synced: false,
        user,
        message: `Aviso do Supabase: ${error.message}`,
      };
    }

    const updatedUser: Usuario = {
      ...user,
      id: data?.id || user.id,
      created_at: data?.created_at || user.created_at || now,
      last_login_at: now,
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
  const baseUser: Usuario = {
    google_id: profile.google_id || `g_${Math.random().toString(36).substring(2, 12)}`,
    email: profile.email.toLowerCase().trim(),
    nome: profile.nome.trim(),
    foto: profile.foto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profile.email)}`,
    cidade: profile.cidade || 'São Paulo',
    locale: profile.locale || 'pt-BR',
    last_login_at: new Date().toISOString(),
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
 * Atualiza os dados do perfil do usuário logado (ex: atualizar cidade ou nome)
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

  // Se conectado ao Supabase, propaga a atualização
  const supabase = getSupabase();
  if (supabase && updated.email) {
    try {
      await supabase
        .from('usuarios')
        .update({
          nome: updated.nome,
          foto: updated.foto,
          cidade: updated.cidade,
          locale: updated.locale,
        })
        .eq('email', updated.email.toLowerCase().trim());
    } catch (e) {
      console.warn('Aviso ao atualizar perfil no Supabase:', e);
    }
  }

  return updated;
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
