import { getSupabase } from '../lib/supabase';
import { Listing, Match, WantedInterest, WantedRankItem } from '../types/marketplace';
import { calculateMatchScore } from './matchingService';

function requireSupabase() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase não configurado.');
  }
  return supabase;
}

/**
 * Quantas pessoas marcaram o sininho em cada item (função pública que não revela quem marcou)
 */
export async function fetchInterestCounts(): Promise<Record<string, number>> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('wanted_interest_counts');
  if (error) {
    throw new Error(error.message);
  }
  const counts: Record<string, number> = {};
  for (const row of (data || []) as { term_key: string; total: number | string }[]) {
    counts[row.term_key] = Number(row.total);
  }
  return counts;
}

/**
 * Sininhos do usuário logado
 */
export async function fetchMyInterests(userId?: string): Promise<WantedInterest[]> {
  if (!userId) return [];
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('wanted_interests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data || []) as WantedInterest[];
}

export async function addInterest(
  userId: string,
  item: Pick<WantedRankItem, 'id' | 'term' | 'category_id'>
): Promise<WantedInterest> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('wanted_interests')
    .upsert(
      { user_id: userId, term_key: item.id, term: item.term, category_id: item.category_id },
      { onConflict: 'user_id,term_key' }
    )
    .select()
    .single();
  if (error || !data) {
    throw new Error(error?.message || 'Não foi possível ativar o aviso.');
  }
  return data as WantedInterest;
}

export async function removeInterest(interestId: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('wanted_interests').delete().eq('id', interestId);
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Anúncios de venda publicados DEPOIS do sininho que combinam com o item seguido.
 * Eles entram na lista de matches do usuário (faixa da home, selo do painel e aviso).
 */
export function getInterestMatches(
  interests: WantedInterest[],
  allListings: Listing[],
  minScore = 35
): Match[] {
  const sales = allListings.filter((l) => l.type === 'SALE' && l.status === 'ACTIVE');
  const matches: Match[] = [];

  for (const interest of interests) {
    const wanted: Listing = {
      id: interest.id,
      user_id: interest.user_id,
      type: 'WANTED',
      title: interest.term,
      description: '',
      category_id: interest.category_id || '',
      price: null,
      condition: 'ANY',
      status: 'ACTIVE',
      created_at: interest.created_at,
      updated_at: interest.created_at,
    };

    for (const sale of sales) {
      if (sale.user_id === interest.user_id) continue;
      if (new Date(sale.created_at).getTime() <= new Date(interest.created_at).getTime()) continue;

      const score = calculateMatchScore(wanted, sale);
      if (score >= minScore) {
        matches.push({
          id: `interest-${interest.id}-${sale.id}`,
          wanted_listing_id: interest.id,
          sale_listing_id: sale.id,
          score,
          created_at: sale.created_at,
          viewed_at: null,
          wanted_listing: wanted,
          sale_listing: sale,
        });
      }
    }
  }

  return matches;
}
