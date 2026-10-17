import type { User } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';
import { Usuario } from '../types/auth';
import { DEFAULT_CITY, ensureProfile, getOfficialGooglePhoto } from './authService';

export interface AuthStateListener {
  (user: Usuario | null): void;
}

/**
 * Converte o usuário do Supabase Auth (Google) para o nosso tipo Usuario.
 * O id é o próprio auth.uid(), usado nas políticas RLS.
 */
export function mapSupabaseUser(supabaseUser: User): Usuario {
  const email = (supabaseUser.email || '').toLowerCase().trim();
  const meta = supabaseUser.user_metadata || {};
  return {
    id: supabaseUser.id,
    email,
    nome: meta.full_name || meta.name || (email ? email.split('@')[0] : 'Morador'),
    foto: meta.avatar_url || meta.picture || getOfficialGooglePhoto(email),
    cidade: DEFAULT_CITY,
  };
}

/**
 * Acompanha a sessão do Supabase Auth (inclui o retorno do redirect do Google).
 * Chama o listener com o usuário (já com o perfil do banco) ou com null.
 */
export function initSupabaseAuth(onUserChanged: AuthStateListener): () => void {
  const supabase = getSupabase();
  if (!supabase) {
    onUserChanged(null);
    return () => {};
  }

  let lastUserId: string | null = null;

  const apply = async (user: User | null) => {
    if (!user) {
      lastUserId = null;
      onUserChanged(null);
      return;
    }
    lastUserId = user.id;
    onUserChanged(await ensureProfile(mapSupabaseUser(user)));
  };

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user ?? null;
    if (event === 'TOKEN_REFRESHED' && user?.id === lastUserId) return;
    // Evita chamar o Supabase de dentro do próprio callback de auth (risco de deadlock)
    setTimeout(() => {
      void apply(user);
    }, 0);
  });

  return () => data.subscription.unsubscribe();
}

/**
 * Login com Google via Supabase Auth (OAuth). Redireciona o navegador para o Google.
 */
export async function signInWithSupabaseGoogle(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: { prompt: 'select_account' },
    },
  });

  if (error) {
    throw new Error(error.message || 'Erro ao iniciar login com Google.');
  }
}

/**
 * Encerra a sessão no Supabase
 */
export async function logoutSupabase(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.warn('Aviso signOut Supabase:', error.message);
  }
}
