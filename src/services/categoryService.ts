import { Category, Listing } from '../types/marketplace';
import { DEFAULT_CATEGORIES } from '../data/defaultCategories';

const CATEGORIES_STORAGE_KEY = 'tem_aqui_categories_v1';
const LISTINGS_STORAGE_KEY = 'tem_aqui_listings_v1';

export function getStoredCategories(): Category[] {
  try {
    const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Erro ao carregar categorias locais:', e);
  }
  // Inicializa com as categorias padrão
  localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(DEFAULT_CATEGORIES));
  return DEFAULT_CATEGORIES;
}

export function saveStoredCategories(categories: Category[]): void {
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  } catch (e) {
    console.error('Erro ao salvar categorias:', e);
  }
}

export function createCategory(input: { name: string; slug?: string; icon: string }): Category {
  const current = getStoredCategories();
  const slug =
    input.slug?.trim() ||
    input.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const newCategory: Category = {
    id: `cat-${slug || Date.now()}`,
    name: input.name.trim(),
    slug: slug || `categoria-${Date.now()}`,
    icon: input.icon.trim() || '📦',
    created_at: new Date().toISOString(),
  };

  const updated = [...current, newCategory];
  saveStoredCategories(updated);
  return newCategory;
}

export function updateCategory(id: string, updates: Partial<Category>): Category {
  const current = getStoredCategories();
  let updatedCat: Category | null = null;

  const next = current.map((cat) => {
    if (cat.id === id) {
      updatedCat = { ...cat, ...updates };
      return updatedCat;
    }
    return cat;
  });

  if (!updatedCat) {
    throw new Error('Categoria não encontrada.');
  }

  saveStoredCategories(next);
  return updatedCat;
}

export function deleteCategory(id: string, fallbackCategoryId: string = 'cat-outros'): { success: boolean; movedCount: number } {
  const current = getStoredCategories();
  if (current.length <= 1) {
    throw new Error('Não é possível excluir a única categoria restante do sistema.');
  }

  const next = current.filter((c) => c.id !== id);
  saveStoredCategories(next);

  // Reatribui anúncios pertencentes a essa categoria para a categoria fallback
  let movedCount = 0;
  try {
    const rawListings = localStorage.getItem(LISTINGS_STORAGE_KEY);
    if (rawListings) {
      const listings: Listing[] = JSON.parse(rawListings);
      const fallbackCat = next.find((c) => c.id === fallbackCategoryId) || next[0];
      const updatedListings = listings.map((l) => {
        if (l.category_id === id) {
          movedCount++;
          return {
            ...l,
            category_id: fallbackCat.id,
            category: fallbackCat,
            updated_at: new Date().toISOString(),
          };
        }
        return l;
      });
      localStorage.setItem(LISTINGS_STORAGE_KEY, JSON.stringify(updatedListings));
    }
  } catch (e) {
    console.warn('Erro ao reatribuir anúncios após exclusão da categoria:', e);
  }

  return { success: true, movedCount };
}

export function reorderCategories(orderedIds: string[]): Category[] {
  const current = getStoredCategories();
  const map = new Map(current.map((c) => [c.id, c]));
  const reordered: Category[] = [];

  for (const id of orderedIds) {
    const item = map.get(id);
    if (item) {
      reordered.push(item);
      map.delete(id);
    }
  }

  // Anexa quaisquer sobras
  map.forEach((item) => reordered.push(item));

  saveStoredCategories(reordered);
  return reordered;
}

/**
 * Move um anúncio para uma nova categoria (Drag and Drop)
 */
export function moveListingToCategory(listingId: string, newCategoryId: string): Listing {
  const rawListings = localStorage.getItem(LISTINGS_STORAGE_KEY);
  if (!rawListings) {
    throw new Error('Nenhum anúncio encontrado.');
  }

  const categories = getStoredCategories();
  const targetCategory = categories.find((c) => c.id === newCategoryId);
  if (!targetCategory) {
    throw new Error('Categoria de destino não encontrada.');
  }

  const listings: Listing[] = JSON.parse(rawListings);
  let movedListing: Listing | null = null;

  const updatedListings = listings.map((l) => {
    if (l.id === listingId) {
      movedListing = {
        ...l,
        category_id: targetCategory.id,
        category: targetCategory,
        updated_at: new Date().toISOString(),
      };
      return movedListing;
    }
    return l;
  });

  if (!movedListing) {
    throw new Error('Anúncio não encontrado para mover.');
  }

  localStorage.setItem(LISTINGS_STORAGE_KEY, JSON.stringify(updatedListings));
  return movedListing;
}
