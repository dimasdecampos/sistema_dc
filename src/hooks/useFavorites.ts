import { useCallback, useEffect, useState } from 'react';
import { addFavorite, fetchFavoriteIds, removeFavorite } from '../services/favoriteService';
import type { Listing } from '../types/marketplace';
import type { ToastType } from './useToasts';

interface Options {
  /** Id do usuário logado ('' para visitante) */
  userId: string;
  isLoggedIn: boolean;
  openLogin: () => void;
  showToast: (title: string, message?: string, type?: ToastType) => void;
}

/** Favoritos do usuário: carrega ao logar e alterna de forma otimista (desfaz se o banco recusar). */
export function useFavorites({ userId, isLoggedIn, openLogin, showToast }: Options) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoggedIn || !userId) {
      setFavoriteIds([]);
      return;
    }
    fetchFavoriteIds(userId)
      .then(setFavoriteIds)
      .catch(() => setFavoriteIds([]));
  }, [isLoggedIn, userId]);

  const toggleFavorite = useCallback(
    async (listing: Listing) => {
      if (!isLoggedIn || !userId) {
        openLogin();
        showToast('Login com Google necessário', 'Entre com sua conta para favoritar anúncios.', 'info');
        return;
      }
      const isFav = favoriteIds.includes(listing.id);
      setFavoriteIds((prev) => (isFav ? prev.filter((id) => id !== listing.id) : [listing.id, ...prev]));
      try {
        if (isFav) await removeFavorite(userId, listing.id);
        else await addFavorite(userId, listing.id);
      } catch (e) {
        setFavoriteIds((prev) => (isFav ? [listing.id, ...prev] : prev.filter((id) => id !== listing.id)));
        showToast('Não foi possível atualizar os favoritos', String(e), 'error');
      }
    },
    [favoriteIds, isLoggedIn, userId, openLogin, showToast]
  );

  return { favoriteIds, toggleFavorite };
}
