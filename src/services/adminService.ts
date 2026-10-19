import { getSupabase } from '../lib/supabase';

function requireSupabase() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase não configurado.');
  }
  return supabase;
}

export interface AdminStats {
  users_total: number;
  users_last_7d: number;
  listings_total: number;
  listings_active: number;
  listings_completed: number;
  listings_cancelled: number;
  listings_sale: number;
  listings_wanted: number;
  listings_last_7d: number;
  conversations: number;
  messages: number;
  interests: number;
  matches: number;
}

export interface AdminUser {
  id: string;
  nome: string;
  email: string | null;
  avatar_url: string | null;
  cidade: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  listings_count: number;
}

/** Traduz erros do banco em mensagens que dizem o que fazer */
function explain(error: { message: string; code?: string }): Error {
  if (error.code === '42501' || error.message.includes('forbidden')) {
    return new Error('Acesso negado: esta conta não está na lista de administradores.');
  }
  if (error.code === 'PGRST202' || error.message.includes('Could not find the function')) {
    return new Error(
      'Funções do painel não encontradas no banco. Rode as migrações auth_rls e admin_panel no SQL Editor do Supabase.'
    );
  }
  return new Error(error.message);
}

/** Números gerais da plataforma (somente admins) */
export async function fetchAdminStats(): Promise<AdminStats> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('admin_stats');
  if (error) throw explain(error);
  return data as AdminStats;
}

/** Todos os usuários cadastrados, com e-mail e quantidade de anúncios (somente admins) */
export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('admin_users');
  if (error) throw explain(error);
  return ((data || []) as AdminUser[]).map((u) => ({ ...u, listings_count: Number(u.listings_count) }));
}

/**
 * Remove o perfil do usuário e, em cascata, anúncios, fotos, matches, conversas e sininhos.
 * Não apaga a conta de login do Google (isso exige a chave de serviço do Supabase).
 */
export async function deleteUserData(userId: string): Promise<void> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('profiles').delete().eq('id', userId).select('id');
  if (error) throw explain(error);
  if (!data || data.length === 0) {
    throw new Error('Nada foi removido. Confira se a migração de segurança foi aplicada.');
  }
}
