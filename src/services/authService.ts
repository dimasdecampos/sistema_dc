import { Usuario } from '../types/auth';
import { getSupabase } from '../lib/supabase';

export const DEFAULT_CITY = 'São Luis do Paraitinga - SP';

/**
 * Retorna a foto do Google ou um avatar de fallback
 */
export function getOfficialGooglePhoto(email: string, officialPicture?: string): string {
  if (officialPicture && officialPicture.trim().length > 0) {
    return officialPicture.trim();
  }
  return `https://unavatar.io/google/${encodeURIComponent(email.trim().toLowerCase())}`;
}

/**
 * Garante a linha do usuário em `profiles` (id = auth.uid()) e devolve os dados salvos no banco.
 * O e-mail não é gravado em profiles para não ficar exposto na leitura pública.
 */
export async function ensureProfile(user: Usuario): Promise<Usuario> {
  const supabase = getSupabase();
  if (!supabase) return user;

  const { data: existing, error } = await supabase
    .from('profiles')
    .select('nome, avatar_url, cidade, created_at')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.warn('Aviso ao carregar perfil:', error.message);
    return user;
  }

  if (existing) {
    return {
      ...user,
      nome: existing.nome || user.nome,
      foto: existing.avatar_url || user.foto,
      cidade: existing.cidade || user.cidade,
      created_at: existing.created_at,
    };
  }

  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      nome: user.nome,
      avatar_url: user.foto ?? null,
      cidade: user.cidade || DEFAULT_CITY,
    })
    .select('created_at')
    .single();

  if (insertError) {
    console.warn('Aviso ao criar perfil:', insertError.message);
    return user;
  }

  return { ...user, created_at: created.created_at };
}

/**
 * Atualiza nome, foto ou cidade do usuário logado em `profiles`.
 */
export async function updateCurrentUserProfile(
  current: Usuario,
  updates: Partial<Pick<Usuario, 'nome' | 'foto' | 'cidade'>>
): Promise<Usuario> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase não configurado.');
  }

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.nome !== undefined) payload.nome = updates.nome.trim();
  if (updates.foto !== undefined) payload.avatar_url = updates.foto;
  if (updates.cidade !== undefined) payload.cidade = updates.cidade.trim();

  const { error } = await supabase.from('profiles').update(payload).eq('id', current.id);
  if (error) {
    throw new Error(error.message);
  }

  return { ...current, ...updates };
}
