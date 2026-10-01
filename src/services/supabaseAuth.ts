import { getSupabase } from '../lib/supabase';
import { Usuario } from '../types/auth';
import {
  saveStoredUser,
  clearStoredUser,
  getStoredUser,
  getOfficialGooglePhoto,
  syncUserWithSupabase,
  getSavedUserAdminConfig,
} from './authService';

export interface AuthStateListener {
  (user: Usuario | null): void;
}

/**
 * Mapeia o objeto User retornado pelo Supabase Auth para o nosso tipo Usuario
 */
export function mapSupabaseUserToUsuario(supabaseUser: any): Usuario {
  const email = (supabaseUser.email || '').toLowerCase().trim();
  const meta = supabaseUser.user_metadata || {};
  const nome = meta.full_name || meta.name || (email ? email.split('@')[0] : 'Morador');
  const foto = meta.avatar_url || meta.picture || getOfficialGooglePhoto(email);
  const existing = getStoredUser();
  const resolvedCity = meta.cidade || existing?.cidade || 'São Luis do Paraitinga - SP';

  return {
    id: supabaseUser.id || `usr_${Date.now()}`,
    google_id: supabaseUser.id,
    email: email,
    nome: nome,
    foto: foto,
    cidade: resolvedCity,
    last_login_at: new Date().toISOString(),
    adminConfig: getSavedUserAdminConfig(email) || undefined,
  };
}

/**
 * Inicializa os ouvintes de autenticação do Supabase.
 * Trata retornos de OAuth (ex: Google Redirect), sessões ativas e restauração local.
 */
export function initSupabaseAuth(onUserChanged: AuthStateListener): () => void {
  const supabase = getSupabase();

  // 1. Carrega imediatamente o usuário salvo para experiência instantânea
  const stored = getStoredUser();
  if (stored) {
    onUserChanged(stored);
  }

  if (!supabase) {
    return () => {};
  }

  // 2. Verifica se o Supabase Auth já tem sessão ativa (ex: após redirecionamento do Google OAuth)
  supabase.auth.getSession().then(async ({ data: { session }, error }) => {
    if (error) {
      console.warn('Aviso getSession Supabase:', error.message);
    }
    if (session?.user) {
      const u = mapSupabaseUserToUsuario(session.user);
      saveStoredUser(u);
      try {
        await syncUserWithSupabase(u);
      } catch {
        // ignore
      }
      onUserChanged(u);
    }
  }).catch((e) => {
    console.warn('Aviso getSession Supabase:', e);
  });

  // 3. Ouve mudanças de estado em tempo real no Supabase Auth
  const { data: authListener } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (session?.user) {
        const u = mapSupabaseUserToUsuario(session.user);
        saveStoredUser(u);
        try {
          await syncUserWithSupabase(u);
        } catch {
          // ignore
        }
        onUserChanged(u);
      } else if (event === 'SIGNED_OUT') {
        clearStoredUser();
        onUserChanged(null);
      }
    }
  );

  return () => {
    authListener?.subscription?.unsubscribe();
  };
}

/**
 * Login com Google oficial usando o Supabase Auth (OAuth 2.0 padrão)
 */
export async function signInWithSupabaseGoogle(): Promise<{ redirected?: boolean }> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase não conectado. Configure sua Chave Anon ou utilize o Acesso Rápido abaixo.');
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: origin,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });

  if (error) {
    throw new Error(error.message || 'Erro ao iniciar login com Google no Supabase.');
  }

  if (data?.url && typeof window !== 'undefined') {
    window.location.href = data.url;
    return { redirected: true };
  }
  return { redirected: false };
}

/**
 * Login com E-mail e Senha no Supabase
 */
export async function signInWithSupabasePassword(
  emailInput: string,
  passwordInput: string
): Promise<Usuario> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase não conectado. Configure a URL e Chave Anon nas configurações.');
  }

  const email = emailInput.toLowerCase().trim();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: passwordInput,
  });

  if (error) {
    throw new Error(error.message || 'E-mail ou senha incorretos no Supabase.');
  }

  if (!data?.user) {
    throw new Error('Usuário não retornado pelo Supabase.');
  }

  const u = mapSupabaseUserToUsuario(data.user);
  saveStoredUser(u);
  await syncUserWithSupabase(u);
  return u;
}

/**
 * Cadastro com E-mail e Senha no Supabase
 */
export async function signUpWithSupabase(
  emailInput: string,
  passwordInput: string,
  nomeInput?: string,
  cidadeInput?: string
): Promise<Usuario> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase não conectado. Configure a URL e Chave Anon nas configurações.');
  }

  const email = emailInput.toLowerCase().trim();
  const nome = (nomeInput || '').trim() || email.split('@')[0];
  const cidade = (cidadeInput || '').trim() || 'São Luis do Paraitinga - SP';
  const foto = getOfficialGooglePhoto(email);

  const { data, error } = await supabase.auth.signUp({
    email,
    password: passwordInput,
    options: {
      data: {
        name: nome,
        full_name: nome,
        cidade: cidade,
        avatar_url: foto,
      },
    },
  });

  if (error) {
    throw new Error(error.message || 'Erro ao criar conta no Supabase.');
  }

  const resolvedId = data?.user?.id || `usr_${Date.now()}`;
  const userObj: Usuario = {
    id: resolvedId,
    google_id: resolvedId,
    email: email,
    nome: nome,
    foto: foto,
    cidade: cidade,
    last_login_at: new Date().toISOString(),
  };

  saveStoredUser(userObj);
  await syncUserWithSupabase(userObj);
  return userObj;
}

/**
 * Acesso Rápido Garantido (Supabase + Perfil Direto):
 * Funciona para qualquer pessoa sem dependência de popups, bloqueios de iframe ou senhas.
 * Vincula e grava os dados nas tabelas 'profiles' e 'usuarios' do Supabase e servidor central.
 */
export async function signInWithQuickAccess(
  emailInput: string,
  nomeInput?: string,
  cidadeInput?: string
): Promise<Usuario> {
  const email = emailInput.toLowerCase().trim();
  if (!email || !email.includes('@')) {
    throw new Error('Por favor, informe um endereço de e-mail válido.');
  }

  const existing = getStoredUser();
  const nome =
    (nomeInput && nomeInput.trim()) ||
    (existing?.email === email && existing?.nome) ||
    email.split('@')[0];
  const foto = getOfficialGooglePhoto(email);
  const resolvedCity =
    (cidadeInput && cidadeInput.trim()) ||
    (existing?.email === email && existing?.cidade) ||
    'São Luis do Paraitinga - SP';

  const supabase = getSupabase();
  let resolvedId = existing?.email === email && existing?.id ? existing.id : '';

  if (!resolvedId) {
    // Se o Supabase estiver conectado, tenta achar o ID existente na tabela usuarios ou profiles
    if (supabase) {
      try {
        const { data: usrRow } = await supabase
          .from('usuarios')
          .select('id, nome, foto, cidade')
          .eq('email', email)
          .maybeSingle();

        if (usrRow?.id) {
          resolvedId = usrRow.id;
        } else {
          const { data: profRow } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .maybeSingle();
          if (profRow?.id) {
            resolvedId = profRow.id;
          }
        }
      } catch (e) {
        console.warn('Aviso ao consultar tabela usuarios no Supabase:', e);
      }
    }
  }

  if (!resolvedId) {
    resolvedId = `usr_${email.replace(/[^a-z0-9]/g, '_')}`;
  }

  const userObj: Usuario = {
    id: resolvedId,
    google_id: resolvedId,
    email: email,
    nome: nome,
    foto: foto,
    cidade: resolvedCity,
    last_login_at: new Date().toISOString(),
    adminConfig: getSavedUserAdminConfig(email) || undefined,
  };

  // Salva no storage local
  saveStoredUser(userObj);

  // Sincroniza tanto nas tabelas do Supabase (profiles e usuarios) quanto no servidor central
  try {
    await syncUserWithSupabase(userObj);
  } catch (err) {
    console.warn('Aviso ao sincronizar usuário no Supabase:', err);
  }

  return userObj;
}

/**
 * Encerra a sessão no Supabase e limpa o armazenamento local
 */
export async function logoutSupabase(): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Aviso signOut Supabase:', e);
    }
  }
  clearStoredUser();
}
