import { Category } from '../types/marketplace';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-veiculos', name: 'Veículos & Peças', slug: 'veiculos', icon: '🚗' },
  { id: 'cat-imoveis', name: 'Imóveis', slug: 'imoveis', icon: '🏠' },
  { id: 'cat-eletronicos', name: 'Eletrônicos & Celulares', slug: 'eletronicos', icon: '📱' },
  { id: 'cat-moveis', name: 'Casa, Móveis & Eletro', slug: 'moveis', icon: '🛋️' },
  { id: 'cat-ferramentas', name: 'Ferramentas & Construção', slug: 'ferramentas', icon: '🔨' },
  { id: 'cat-agro', name: 'Agro & Campo', slug: 'agro', icon: '🌾' },
  { id: 'cat-animais', name: 'Animais & Pet', slug: 'animais', icon: '🐕' },
  { id: 'cat-roupas', name: 'Moda & Acessórios', slug: 'roupas', icon: '👕' },
  { id: 'cat-esportes', name: 'Esportes & Lazer', slug: 'esportes', icon: '⚽' },
  { id: 'cat-servicos', name: 'Serviços & Empregos', slug: 'servicos', icon: '💼' },
  { id: 'cat-outros', name: 'Outros', slug: 'outros', icon: '📦' },
];

export function getCategoryById(id: string): Category {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('tem_aqui_categories_v1') : null;
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
