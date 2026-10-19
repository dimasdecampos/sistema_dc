import { Listing, Match } from '../types/marketplace';

// Palavras que não identificam um produto: intenção de compra/venda, ligações, estado, preço e conversa
const STOPWORDS = new Set([
  'quero', 'comprar', 'estou', 'procurando', 'procuro', 'preciso', 'de', 'do', 'da',
  'dos', 'das', 'um', 'uma', 'uns', 'umas', 'para', 'pra', 'por', 'favor', 'vendo',
  'venda', 'tenho', 'alguem', 'com', 'sem', 'em', 'bom', 'boa', 'bons', 'boas',
  'otimo', 'otima', 'otimos', 'otimas', 'estado', 'novo', 'nova', 'novos', 'novas',
  'usado', 'usada', 'usados', 'usadas', 'barato', 'urgente', 'ou', 'e', 'que', 'se',
  'no', 'na', 'nos', 'nas', 'qualquer', 'tipo', 'ate', 'reais', 'real', 'rs', 'mil',
  'quem', 'tem', 'tenha', 'algum', 'alguma', 'aceito', 'proposta', 'troco', 'retirar',
  'retirada', 'funcionando', 'perfeito', 'perfeita', 'conservado', 'conservada',
  'menos', 'abaixo', 'maximo', 'minimo',
]);

// Palavras diferentes que significam o mesmo produto (já no singular, sem acento)
const SYNONYM_GROUPS: string[][] = [
  ['celular', 'smartphone', 'telefone'],
  ['bicicleta', 'bike'],
  ['notebook', 'laptop'],
  ['geladeira', 'refrigerador'],
  ['televisao', 'tv', 'televisor'],
  ['carro', 'automovel'],
  ['moto', 'motocicleta'],
];

const CANONICAL = new Map<string, string>();
for (const group of SYNONYM_GROUPS) {
  for (const word of group) CANONICAL.set(word, group[0]);
}

/**
 * Normaliza o texto removendo acentos, pontuação e convertendo para minúsculas
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

/**
 * Remove expressões de preço ("até R$ 800", "por 500", "300 reais") para que o valor
 * não seja confundido com uma característica do produto (como "aro 26" ou "11")
 */
function stripPriceExpressions(text: string): string {
  return text
    .toLowerCase()
    .replace(/\b(?:até|ate|por|r\$|rs)\s*\$?\s*\d[\d.,]*(?:\s*(?:reais|mil))?/g, ' ')
    .replace(/\d[\d.,]*\s*(?:reais|mil\b)/g, ' ');
}

/**
 * Extrai palavras-chave relevantes de uma frase
 */
export function extractKeywords(text: string): string[] {
  const normalized = normalizeText(stripPriceExpressions(text));
  const words = normalized.split(/\s+/).filter(Boolean);

  // Filtra stopwords, mas preserva números e medidas (como "26" em "aro 26", "110v", "128gb")
  return words.filter((w) => {
    if (/^\d/.test(w)) return true;
    return w.length >= 2 && !STOPWORDS.has(w);
  });
}

const isNumeric = (word: string) => /^\d/.test(word);

/**
 * Leva a palavra ao singular (bicicletas -> bicicleta, televisões -> televisão, papéis -> papel)
 */
function stem(word: string): string {
  if (word.length <= 3 || /\d/.test(word)) return word;
  if (word.endsWith('oes') || word.endsWith('aes') || word.endsWith('aos')) return word.slice(0, -3) + 'ao';
  if (word.endsWith('ais')) return word.slice(0, -3) + 'al';
  if (word.endsWith('eis')) return word.slice(0, -3) + 'el';
  if (word.endsWith('ns')) return word.slice(0, -2) + 'm';
  if (/[rzs]es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

function canonical(word: string): string {
  const singular = stem(word);
  return CANONICAL.get(singular) ?? singular;
}

/** Diferença de no máximo uma letra (troca, falta ou sobra): cobre erros de digitação e gênero */
function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  if (a.length > b.length) return a.slice(i + 1) === b.slice(i);
  return b.slice(i + 1) === a.slice(i);
}

/**
 * Duas palavras são o mesmo termo? Ignora plural e sinônimos; tolera 1 letra de diferença
 * apenas em palavras longas (evita "casa" = "casaco" e "mesa" = "mesada"). Números só batem se iguais.
 */
function wordsMatch(a: string, b: string): boolean {
  if (isNumeric(a) || isNumeric(b)) return a === b;
  const ca = canonical(a);
  const cb = canonical(b);
  if (ca === cb) return true;
  return ca.length >= 6 && cb.length >= 6 && withinOneEdit(ca, cb);
}

/** "800" -> 800, "1.500" -> 1500, "1.500,50" -> 1500.5, "1,5" -> 1.5 */
function parseMoney(raw: string): number {
  let s = raw.replace(/[.,]+$/, '');
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    s = s.replace(',', '.');
  }
  return parseFloat(s);
}

/**
 * Lê um valor máximo escrito em texto livre: "até R$ 800", "no máximo 1.500",
 * "menos de 2 mil", "abaixo de 300". Retorna null se não houver.
 */
function parseBudgetFromText(text: string): number | null {
  const match = text
    .toLowerCase()
    .match(/(?:^|[^a-zà-ú])(?:at[eé]|no m[aá]ximo|m[aá]ximo|menos de|abaixo de)(?![a-zà-ú])\s*(?:r\$|rs)?\s*(\d[\d.,]*)(\s*mil(?![a-zà-ú]))?/);
  if (!match) return null;
  const value = parseMoney(match[1]) * (match[2] ? 1000 : 1);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** "furadeira ou parafusadeira" -> duas opções, comparadas separadamente */
function splitAlternatives(title: string): string[] {
  const parts = title.split(/\s+ou\s+|\s*[,;/]\s*/i).filter((p) => p.trim().length > 0);
  return parts.length > 0 ? parts : [title];
}

/**
 * Calcula a pontuação de compatibilidade entre uma PROCURA (WANTED) e uma VENDA (SALE).
 * Retorna 0 a 100. Sem correspondência no nome do produto, não há match (a categoria sozinha não basta).
 */
export function calculateMatchScore(wanted: Listing, sale: Listing): number {
  if (wanted.type !== 'WANTED' || sale.type !== 'SALE') return 0;
  if (wanted.status !== 'ACTIVE' || sale.status !== 'ACTIVE') return 0;

  // O próprio usuário não recebe match de si mesmo (verifica id e e-mail)
  if (wanted.user_id && sale.user_id && wanted.user_id === sale.user_id) return 0;
  if (
    wanted.user?.email &&
    sale.user?.email &&
    wanted.user.email.toLowerCase().trim() === sale.user.email.toLowerCase().trim()
  ) {
    return 0;
  }

  const saleTitle = extractKeywords(sale.title);
  const saleDesc = extractKeywords(sale.description || '');
  const inSaleTitle = (w: string) => saleTitle.some((s) => wordsMatch(w, s));
  const inSaleText = (w: string) => inSaleTitle(w) || saleDesc.some((s) => wordsMatch(w, s));

  // 1. Nome do produto: escolhe a melhor das opções ("A ou B") da procura.
  // A primeira palavra (o produto em si) pesa o dobro; palavra só na descrição vale metade.
  let best: { ratio: number; nums: string[] } | null = null;
  for (const part of splitAlternatives(wanted.title)) {
    const keywords = extractKeywords(part);
    const words = keywords.filter((k) => !isNumeric(k));
    if (words.length === 0) continue;

    let credit = 0;
    let total = 0;
    words.forEach((w, index) => {
      const weight = index === 0 ? 2 : 1;
      total += weight;
      if (inSaleTitle(w)) credit += weight;
      else if (inSaleText(w)) credit += weight / 2;
    });

    const ratio = credit / total;
    if (!best || ratio > best.ratio) {
      best = { ratio, nums: keywords.filter(isNumeric) };
    }
  }

  // Nenhuma palavra do produto bate (ou só uma palavra genérica solta): não é o mesmo produto
  if (!best || best.ratio < 0.5) return 0;

  let score = Math.round(best.ratio * 60);

  // 2. Números e medidas ("aro 26", "iPhone 11", "110v") precisam bater
  if (best.nums.length > 0) {
    const saleNumbers = [...saleTitle, ...saleDesc].filter(isNumeric);
    const matched = best.nums.filter((n) => saleNumbers.includes(n)).length;

    if (matched === best.nums.length) {
      score += 10;
    } else if (matched === 0) {
      // O anúncio cita outro número no título (ex.: pediu aro 26, o anúncio é aro 29): não é o item
      if (saleTitle.some(isNumeric)) return 0;
      score -= 10; // o anúncio não informa a medida: pode servir, mas é incerto
    } else {
      score -= 15;
    }
  }

  // 3. Categoria
  if (wanted.category_id === sale.category_id) {
    score += 15;
  }

  // 4. Detalhes da descrição da procura que aparecem no anúncio (até 10 pontos)
  const descWords = extractKeywords(wanted.description || '').filter((w) => !isNumeric(w));
  if (descWords.length > 0) {
    const found = descWords.filter(inSaleText).length;
    score += Math.round(Math.min(1, found / descWords.length) * 10);
  }

  // 5. Condição do produto
  if (wanted.condition === 'ANY' || wanted.condition === sale.condition) {
    score += 5;
  } else if (wanted.condition === 'NEW' && sale.condition === 'USED') {
    score -= 15; // Quem quer novo penaliza item usado
  }

  // 6. Preço: o valor da procura é o máximo que a pessoa paga.
  // O anúncio só combina se o preço de venda for menor ou igual a esse máximo.
  // Sem orçamento na procura, ou sem preço no anúncio, o preço não filtra nada.
  // Se o campo de orçamento está vazio, vale o limite escrito no texto ("até R$ 800").
  const maxPrice =
    wanted.price != null && wanted.price > 0
      ? wanted.price
      : parseBudgetFromText(wanted.title) ?? parseBudgetFromText(wanted.description || '');

  if (maxPrice != null && sale.price != null && sale.price > 0) {
    if (sale.price > maxPrice) return 0;
    score += 5; // cabe no orçamento
  }

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
 * Encontra matches específicos para as procuras ativas de um usuário (suporta id ou objeto de usuário com e-mail)
 */
export function getMatchesForUser(
  userOrId: { id?: string; email?: string } | string,
  allListings: Listing[],
  minScore = 35
): Match[] {
  const userId = typeof userOrId === 'string' ? userOrId : userOrId?.id || '';
  const userEmail = typeof userOrId === 'object' && userOrId?.email ? userOrId.email.toLowerCase().trim() : '';

  const isUserListing = (l: Listing) => {
    if (userId && l.user_id === userId) return true;
    if (userEmail && l.user?.email && l.user.email.toLowerCase().trim() === userEmail) return true;
    return false;
  };

  const userWanted = allListings.filter(
    (l) => isUserListing(l) && l.type === 'WANTED' && l.status === 'ACTIVE'
  );
  const otherSales = allListings.filter(
    (l) => !isUserListing(l) && l.type === 'SALE' && l.status === 'ACTIVE'
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
  const sellerId = saleListing.user_id;
  const sellerEmail = saleListing.user?.email?.toLowerCase().trim() || '';

  const isSellerListing = (l: Listing) => {
    if (sellerId && l.user_id === sellerId) return true;
    if (sellerEmail && l.user?.email && l.user.email.toLowerCase().trim() === sellerEmail) return true;
    return false;
  };

  const allWanted = allListings.filter(
    (l) => l.type === 'WANTED' && l.status === 'ACTIVE' && !isSellerListing(l)
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
