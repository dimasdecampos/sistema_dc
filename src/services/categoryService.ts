import { Category } from '../types/marketplace';
import { getSupabase } from '../lib/supabase';

// Cópia em memória das categorias do banco (para componentes que leem de forma síncrona)
let categoriesCache: Category[] = [];

function requireSupabase() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase não configurado.');
  }
  return supabase;
}

export function getStoredCategories(): Category[] {
  return categoriesCache;
}

/**
 * Carrega as categorias da tabela `categories` e atualiza a cópia em memória
 */
export async function loadCategories(): Promise<Category[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  categoriesCache = (data || []) as Category[];
  return categoriesCache;
}

export async function createCategory(input: { name: string; slug?: string; icon: string }): Promise<Category> {
  const supabase = requireSupabase();
  const slug =
    input.slug?.trim() ||
    input.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') ||
    `categoria-${Date.now()}`;

  const { data, error } = await supabase
    .from('categories')
    .insert({
      id: `cat-${slug}`,
      name: input.name.trim(),
      slug,
      icon: input.icon.trim() || '📦',
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as Category;
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
  const supabase = requireSupabase();
  const { id: _ignoredId, created_at: _ignoredCreated, ...fields } = updates;

  const { data, error } = await supabase
    .from('categories')
    .update(fields)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as Category;
}

/**
 * Exclui a categoria e move os anúncios dela para a categoria alternativa
 */
export async function deleteCategory(
  id: string,
  fallbackCategoryId: string = 'cat-outros'
): Promise<{ success: boolean; movedCount: number }> {
  const supabase = requireSupabase();

  if (categoriesCache.length <= 1) {
    throw new Error('Não é possível excluir a única categoria restante do sistema.');
  }
  if (id === fallbackCategoryId) {
    throw new Error('A categoria alternativa não pode ser excluída.');
  }

  const { data: moved, error: moveError } = await supabase
    .from('listings')
    .update({ category_id: fallbackCategoryId, updated_at: new Date().toISOString() })
    .eq('category_id', id)
    .select('id');

  if (moveError) {
    throw new Error(moveError.message);
  }

  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) {
    throw new Error(error.message);
  }

  return { success: true, movedCount: moved?.length ?? 0 };
}

/**
 * Move um anúncio para uma nova categoria (Drag and Drop)
 */
export async function moveListingToCategory(
  listingId: string,
  newCategoryId: string
): Promise<{ id: string; title: string }> {
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from('listings')
    .update({ category_id: newCategoryId, updated_at: new Date().toISOString() })
    .eq('id', listingId)
    .select('id, title')
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}
