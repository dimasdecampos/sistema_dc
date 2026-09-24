import { Category } from '../types/marketplace';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-ferramentas', name: 'Ferramentas', slug: 'ferramentas', icon: '🔨' },
  { id: 'cat-veiculos', name: 'Veículos & Peças', slug: 'veiculos', icon: '🚲' },
  { id: 'cat-moveis', name: 'Casa & Móveis', slug: 'moveis', icon: '🪑' },
  { id: 'cat-eletronicos', name: 'Eletrônicos', slug: 'eletronicos', icon: '📱' },
  { id: 'cat-agro', name: 'Agro & Campo', slug: 'agro', icon: '🌾' },
  { id: 'cat-animais', name: 'Animais & Pet', slug: 'animais', icon: '🐕' },
  { id: 'cat-roupas', name: 'Roupas & Calçados', slug: 'roupas', icon: '👕' },
  { id: 'cat-esportes', name: 'Esportes & Lazer', slug: 'esportes', icon: '⚽' },
  { id: 'cat-outros', name: 'Outros', slug: 'outros', icon: '📦' },
];

export function getCategoryById(id: string): Category {
  try {
    const raw = localStorage.getItem('tem_aqui_categories_v1');
    if (raw) {
      const cats: Category[] = JSON.parse(raw);
      const found = cats.find((c) => c.id === id);
      if (found) return found;
    }
  } catch {
    // fallback
  }

  return (
    DEFAULT_CATEGORIES.find((c) => c.id === id) || {
      id: 'cat-outros',
      name: 'Outros',
      slug: 'outros',
      icon: '📦',
    }
  );
}
