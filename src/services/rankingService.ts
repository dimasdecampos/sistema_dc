import { Listing, WantedRankItem, Category } from '../types/marketplace';
import { getStoredCategories } from './categoryService';
import { calculateMatchScore } from './matchingService';

const MATCH_MIN_SCORE = 35;

/**
 * Normaliza título de procura para agrupar termos similares
 * Ex: "Quero comprar um martelo usado" -> "Martelo usado"
 * Ex: "Estou procurando uma bicicleta aro 26" -> "Bicicleta aro 26"
 */
function extractCoreTerm(title: string): string {
  let cleaned = title
    .replace(/^(quero comprar|estou procurando|procuro|preciso de|compro|busco|alguém tem|quem tem|comprar)\s+(um|uma|uns|umas|de)?\s*/i, '')
    .trim();

  if (cleaned.length === 0) return title;
  // Capitaliza primeira letra
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Ranking do que mais procuram. O contador de cada item soma as procuras publicadas
 * com os sininhos ("também procuro"), vindos de `interestCounts` (term_key -> total).
 */
export function computeWantedRanking(
  listings: Listing[],
  categoryId?: string,
  interestCounts: Record<string, number> = {}
): WantedRankItem[] {
  const categories = getStoredCategories();
  const categoryMap = new Map<string, Category>(categories.map((c) => [c.id, c]));

  // Filtra apenas procuras ativas
  const wantedListings = listings.filter(
    (l) => l.type === 'WANTED' && l.status === 'ACTIVE'
  );

  // Vendas ativas para saber quantas ofertas existem
  const salesListings = listings.filter(
    (l) => l.type === 'SALE' && l.status === 'ACTIVE'
  );

  // Agrupamento por termo normalizado e categoria
  const groups = new Map<
    string,
    {
      term: string;
      category_id: string;
      budgets: number[];
      sample_titles: string[];
      seekersCount: number;
      userIds: string[];
    }
  >();

  for (const listing of wantedListings) {
    if (categoryId && categoryId !== 'all' && listing.category_id !== categoryId) {
      continue;
    }

    const core = extractCoreTerm(listing.title);
    const key = `${listing.category_id}__${core.toLowerCase()}`;

    if (!groups.has(key)) {
      groups.set(key, {
        term: core,
        category_id: listing.category_id,
        budgets: [],
        sample_titles: [],
        seekersCount: 0,
        userIds: [],
      });
    }

    const entry = groups.get(key)!;
    entry.seekersCount += 1;
    if (!entry.userIds.includes(listing.user_id)) {
      entry.userIds.push(listing.user_id);
    }
    if (listing.price && listing.price > 0) {
      entry.budgets.push(listing.price);
    }
    if (!entry.sample_titles.includes(listing.title)) {
      entry.sample_titles.push(listing.title);
    }
  }

  // Prepara itens ranqueados
  const rankedItems: WantedRankItem[] = [];

  groups.forEach((group, key) => {
    const cat = categoryMap.get(group.category_id) || {
      id: group.category_id,
      name: 'Geral',
      slug: 'geral',
      icon: '📦',
    };

    // Ofertas à venda que combinam com o termo (mesma regra de nomes parecidos dos matches)
    const termAsWanted: Listing = {
      id: key,
      user_id: '',
      type: 'WANTED',
      title: group.term,
      description: '',
      category_id: group.category_id,
      price: null,
      condition: 'ANY',
      status: 'ACTIVE',
      created_at: '',
      updated_at: '',
    };
    const offersCount = salesListings.filter(
      (sale) => calculateMatchScore(termAsWanted, sale) >= MATCH_MIN_SCORE
    ).length;

    const avgBudget =
      group.budgets.length > 0
        ? Math.round(group.budgets.reduce((a, b) => a + b, 0) / group.budgets.length)
        : null;

    rankedItems.push({
      id: key,
      seeker_user_ids: group.userIds,
      term: group.term,
      category_id: group.category_id,
      category_name: cat.name,
      category_icon: cat.icon,
      total_seekers: group.seekersCount + (interestCounts[key] || 0),
      avg_budget: avgBudget,
      available_offers: offersCount,
      sample_titles: group.sample_titles,
    });
  });

  // Ordena por maior número de procuras, depois por ofertas (mais escasso primeiro)
  return rankedItems.sort((a, b) => {
    if (b.total_seekers !== a.total_seekers) {
      return b.total_seekers - a.total_seekers;
    }
    return a.available_offers - b.available_offers;
  });
}
