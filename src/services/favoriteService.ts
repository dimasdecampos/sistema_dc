import { getSupabase } from '../lib/supabase';

function requireSupabase() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase não configurado.');
  }
  return supabase;
}

/** IDs dos anúncios que o usuário favoritou */
export async function fetchFavoriteIds(userId?: string): Promise<string[]> {
  if (!userId) return [];
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('favorites')
    .select('listing_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data || []).map((r: { listing_id: string }) => r.listing_id);
}

export async function addFavorite(userId: string, listingId: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('favorites')
    .upsert({ user_id: userId, listing_id: listingId }, { onConflict: 'user_id,listing_id' });
  if (error) {
    throw new Error(error.message);
  }
}

export async function removeFavorite(userId: string, listingId: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('listing_id', listingId);
  if (error) {
    throw new Error(error.message);
  }
}
