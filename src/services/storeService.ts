import { getSupabase } from '../lib/supabase';
import { normalizeHex } from '../utils/storeTheme';

function requireSupabase() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase não configurado.');
  }
  return supabase;
}

/** Perfil público do vendedor, com os dados da loja */
export interface SellerProfile {
  id: string;
  nome: string;
  avatar_url: string | null;
  cidade: string | null;
  is_premium: boolean;
  store_name: string | null;
  store_color: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSellerProfile(row: Record<string, any>): SellerProfile {
  return {
    id: row.id,
    nome: row.nome,
    avatar_url: row.avatar_url ?? null,
    cidade: row.cidade ?? null,
    is_premium: row.is_premium === true,
    store_name: row.store_name ?? null,
    store_color: row.store_color ?? null,
  };
}

/** Nome exibido da loja: o nome da loja, ou o do vendedor se ainda não personalizou */
export function storeDisplayName(profile: { nome: string; store_name?: string | null }): string {
  return profile.store_name?.trim() || profile.nome;
}

/**
 * Busca o perfil (e os dados da loja) de um vendedor.
 * Usa "*" para continuar funcionando antes da migração das lojas (sem as colunas novas).
 */
export async function fetchSellerProfile(userId: string): Promise<SellerProfile | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toSellerProfile(data) : null;
}

/**
 * Salva nome e cor da loja do próprio vendedor. O banco só aceita de quem é premium
 * (para os demais a alteração é ignorada em silêncio), então conferimos o que foi salvo.
 */
export async function updateStoreSettings(
  userId: string,
  settings: { store_name: string; store_color: string }
): Promise<SellerProfile> {
  const supabase = requireSupabase();

  const name = settings.store_name.trim();
  const color = normalizeHex(settings.store_color);
  if (name.length < 1 || name.length > 40) {
    throw new Error('O nome da loja precisa ter entre 1 e 40 caracteres.');
  }
  if (!color) {
    throw new Error('Escolha uma cor válida.');
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ store_name: name, store_color: color, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  const saved = toSellerProfile(data);
  if (saved.store_name !== name || saved.store_color !== color) {
    throw new Error('A personalização da loja é um recurso premium. Fale com o administrador para ativar.');
  }
  return saved;
}

/** (Admin) Concede ou remove o premium de um usuário */
export async function setUserPremium(userId: string, premium: boolean): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.rpc('admin_set_premium', { p_user_id: userId, p_premium: premium });
  if (error) {
    if (error.code === '42501' || error.message.includes('forbidden')) {
      throw new Error('Acesso negado: esta conta não é administradora.');
    }
    if (error.code === 'PGRST202' || error.message.includes('Could not find the function')) {
      throw new Error('Rode a migração das lojas (seller_stores) no SQL Editor do Supabase.');
    }
    throw new Error(error.message);
  }
}

/** (Admin) Ids dos usuários que têm premium */
export async function fetchPremiumUserIds(): Promise<Set<string>> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('profiles').select('id').eq('is_premium', true);
  if (error) {
    // Antes da migração a coluna não existe: ninguém é premium
    console.warn('Não foi possível ler o premium (migração das lojas aplicada?):', error.message);
    return new Set();
  }
  return new Set((data || []).map((row) => row.id as string));
}
