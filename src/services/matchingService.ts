import { Listing, Match } from '../types/marketplace';

// Stopwords em português que não agregam valor à busca de produtos
const STOPWORDS = new Set([
  'quero', 'comprar', 'estou', 'procurando', 'procuro', 'preciso', 'de', 'do', 'da',
  'dos', 'das', 'um', 'uma', 'uns', 'umas', 'para', 'pra', 'por', 'favor', 'vendo',
  'venda', 'tenho', 'alguem', 'alguém', 'com', 'sem', 'em', 'bom', 'ótimo', 'otimo',
  'estado', 'novo', 'nova', 'usado', 'usada', 'usados', 'usadas', 'barato', 'urgente',
  'ou', 'e', 'que', 'se', 'no', 'na', 'nos', 'nas', 'qualquer', 'tipo'
]);

/**
 * Normaliza o texto removendo acentos, pontuação e convertendo para minúsculas
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

/**
 * Extrai palavras-chave relevantes de uma frase
 */
export function extractKeywords(text: string): string[] {
  const normalized = normalizeText(text);
  const words = normalized.split(/\s+/).filter(Boolean);
  
  // Filtra stopwords, mas preserva números (como "26" em "aro 26", "110v", etc.)
  return words.filter((w) => {
    if (/^\d+/.test(w)) return true;
    return w.length >= 2 && !STOPWORDS.has(w);
  });
}

/**
 * Verifica se uma palavra-chave bate com outra (incluindo plurais e prefixos)
 */
function keywordsMatch(k1: string, k2: string): boolean {
  if (k1 === k2) return true;
  // Plurais simples em português
  if (k1 + 's' === k2 || k2 + 's' === k1) return true;
  if (k1.endsWith('es') && k1.slice(0, -2) === k2) return true;
  if (k2.endsWith('es') && k2.slice(0, -2) === k1) return true;
  // Substring para raízes com mais de 4 letras
  if (k1.length >= 4 && k2.length >= 4) {
    if (k1.startsWith(k2) || k2.startsWith(k1)) return true;
  }
  return false;
}

/**
 * Calcula a pontuação de similaridade entre um anúncio de PROCURA (WANTED)
 * e um anúncio de VENDA (SALE).
 * Retorna um score de 0 a 100.
 */
export function calculateMatchScore(wanted: Listing, sale: Listing): number {
  if (wanted.type !== 'WANTED' || sale.type !== 'SALE') return 0;
  if (wanted.status !== 'ACTIVE' || sale.status !== 'ACTIVE') return 0;
  if (wanted.user_id === sale.user_id) return 0; // O próprio usuário não recebe match de si mesmo

  let score = 0;

  // 1. Categoria (até 30 pontos)
  const isSameCategory = wanted.category_id === sale.category_id;
  if (isSameCategory) {
    score += 30;
  }

  // 2. Extração de palavras-chave
  const wantedTitleKeywords = extractKeywords(wanted.title);
  const wantedDescKeywords = extractKeywords(wanted.description || '');
  const saleTitleKeywords = extractKeywords(sale.title);
  const saleDescKeywords = extractKeywords(sale.description || '');

  // Todas as palavras da procura
  const allWantedKeywords = Array.from(new Set([...wantedTitleKeywords, ...wantedDescKeywords]));
  if (allWantedKeywords.length === 0) {
    return isSameCategory ? 20 : 0;
  }

  // 3. Similaridade no TÍTULO (até 45 pontos)
  let titleMatchesCount = 0;
  wantedTitleKeywords.forEach((wk) => {
    const foundInSaleTitle = saleTitleKeywords.some((sk) => keywordsMatch(wk, sk));
    if (foundInSaleTitle) {
      titleMatchesCount++;
    }
  });

  if (wantedTitleKeywords.length > 0) {
    const titleRatio = titleMatchesCount / wantedTitleKeywords.length;
    score += Math.round(titleRatio * 45);
  }

  // 4. Similaridade na DESCRIÇÃO (até 15 pontos)
  let descMatchesCount = 0;
  allWantedKeywords.forEach((wk) => {
    const foundInSaleDesc = saleDescKeywords.some((sk) => keywordsMatch(wk, sk));
    if (foundInSaleDesc) {
      descMatchesCount++;
    }
  });

  if (allWantedKeywords.length > 0) {
    const descRatio = Math.min(1, descMatchesCount / allWantedKeywords.length);
    score += Math.round(descRatio * 15);
  }

  // 5. Condição do produto (até 10 pontos)
  if (wanted.condition === 'ANY') {
    score += 10;
  } else if (wanted.condition === sale.condition) {
    score += 10;
  } else if (wanted.condition === 'NEW' && sale.condition === 'USED') {
    score -= 15; // Quem quer novo penaliza item usado
  }

  // 6. Preço máximo desejado vs Preço de venda (ajuste de até +10 / -15)
  if (wanted.price != null && wanted.price > 0 && sale.price != null && sale.price > 0) {
    if (sale.price <= wanted.price) {
      score += 10; // Cabe no orçamento
    } else {
      // Se passa do orçamento, calcula a diferença percentual
      const overPercentage = (sale.price - wanted.price) / wanted.price;
      if (overPercentage > 0.5) {
        score -= 20; // 50% mais caro
      } else {
        score -= 10;
      }
    }
  }

  // Garantir limites entre 0 e 100
  return Math.max(0, Math.min(100, score));
}

/**
 * Encontra todos os matches compatíveis para uma lista de anúncios
 */
export function findMatchesForListings(
  allListings: Listing[],
  minScore = 35
): Match[] {
  const wantedListings = allListings.filter(
    (l) => l.type === 'WANTED' && l.status === 'ACTIVE'
  );
  const saleListings = allListings.filter(
    (l) => l.type === 'SALE' && l.status === 'ACTIVE'
  );

  const matches: Match[] = [];

  for (const wanted of wantedListings) {
    for (const sale of saleListings) {
      const score = calculateMatchScore(wanted, sale);
      if (score >= minScore) {
        matches.push({
          id: `match-${wanted.id}-${sale.id}`,
          wanted_listing_id: wanted.id,
          sale_listing_id: sale.id,
          score,
          created_at: new Date().toISOString(),
          viewed_at: null,
          wanted_listing: wanted,
          sale_listing: sale,
        });
      }
    }
  }

  // Ordena por score decrescente
  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Encontra matches específicos para as procuras ativas de um usuário
 */
export function getMatchesForUser(
  userId: string,
  allListings: Listing[],
  minScore = 35
): Match[] {
  const userWanted = allListings.filter(
    (l) => l.user_id === userId && l.type === 'WANTED' && l.status === 'ACTIVE'
  );
  const otherSales = allListings.filter(
    (l) => l.user_id !== userId && l.type === 'SALE' && l.status === 'ACTIVE'
  );

  const userMatches: Match[] = [];

  for (const wanted of userWanted) {
    for (const sale of otherSales) {
      const score = calculateMatchScore(wanted, sale);
      if (score >= minScore) {
        userMatches.push({
          id: `match-${wanted.id}-${sale.id}`,
          wanted_listing_id: wanted.id,
          sale_listing_id: sale.id,
          score,
          created_at: new Date().toISOString(),
          viewed_at: null,
          wanted_listing: wanted,
          sale_listing: sale,
        });
      }
    }
  }

  return userMatches.sort((a, b) => b.score - a.score);
}

/**
 * Encontra compradores interessados em um anúncio que o usuário está vendendo
 * (Match reverso: quem está procurando pelo que eu vendo?)
 */
export function getBuyersInterestedInSale(
  saleListing: Listing,
  allListings: Listing[],
  minScore = 35
): Match[] {
  const allWanted = allListings.filter(
    (l) => l.type === 'WANTED' && l.status === 'ACTIVE' && l.user_id !== saleListing.user_id
  );

  const interested: Match[] = [];

  for (const wanted of allWanted) {
    const score = calculateMatchScore(wanted, saleListing);
    if (score >= minScore) {
      interested.push({
        id: `match-${wanted.id}-${saleListing.id}`,
        wanted_listing_id: wanted.id,
        sale_listing_id: saleListing.id,
        score,
        created_at: new Date().toISOString(),
        viewed_at: null,
        wanted_listing: wanted,
        sale_listing: saleListing,
      });
    }
  }

  return interested.sort((a, b) => b.score - a.score);
}
