import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SiteConfig } from '../types/marketplace';

export const DEFAULT_CARDS_PER_PAGE = 16;

/**
 * Mostra os itens aos poucos. `resetKey` volta a contagem ao tamanho inicial
 * (use quando busca/filtros mudarem).
 */
export function usePagedList<T>(items: T[], config: SiteConfig, resetKey: string) {
  const pageSize = Math.max(1, config.cardsPerPage || DEFAULT_CARDS_PER_PAGE);
  const mode = config.loadMoreMode || 'button';
  const [count, setCount] = useState(pageSize);

  useEffect(() => {
    setCount(pageSize);
  }, [resetKey, pageSize]);

  const visible = items.slice(0, count);
  const hasMore = items.length > count;
  const loadMore = () => setCount((c) => c + pageSize);

  return { visible, hasMore, loadMore, mode, remaining: items.length - count };
}

interface LoadMoreFooterProps {
  hasMore: boolean;
  mode: 'button' | 'infinite';
  remaining: number;
  onLoadMore: () => void;
}

export const LoadMoreFooter: React.FC<LoadMoreFooterProps> = ({ hasMore, mode, remaining, onLoadMore }) => {
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode !== 'infinite' || !hasMore || !sentinel.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMore();
      },
      { rootMargin: '400px' }
    );
    obs.observe(sentinel.current);
    return () => obs.disconnect();
  }, [mode, hasMore, onLoadMore]);

  if (!hasMore) return null;

  if (mode === 'infinite') return <div ref={sentinel} className="h-10" aria-hidden />;

  return (
    <div className="flex justify-center pt-2">
      <button
        type="button"
        onClick={onLoadMore}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 hover:border-slate-400 text-slate-800 rounded-2xl text-sm font-bold shadow-2xs transition cursor-pointer"
      >
        <ChevronDown className="w-4 h-4" />
        Ver mais ({remaining})
      </button>
    </div>
  );
};
