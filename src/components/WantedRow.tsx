import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Category, Listing } from '../types/marketplace';
import { Avatar } from './Avatar';

interface WantedRowProps {
  listing: Listing;
  category?: Category;
  onClick: (listing: Listing) => void;
}

const formatMoney = (value: number) =>
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Linha compacta (sem foto) de um pedido "procuro": título, categoria e preço máximo */
export const WantedRow: React.FC<WantedRowProps> = ({ listing, category, onClick }) => {
  const hasPrice = listing.price != null && listing.price > 0;
  const name = listing.user?.nome || 'Morador';

  return (
    <button
      type="button"
      onClick={() => onClick(listing)}
      className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-slate-200/90 bg-white px-3 py-2.5 text-left shadow-2xs transition hover:border-emerald-300 hover:bg-emerald-50/40"
    >
      <Avatar src={listing.user?.avatar_url} name={name} className="h-9 w-9 shrink-0 text-sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-900">{listing.title}</p>
        <p className="truncate text-xs text-slate-500">
          {category ? `${category.icon} ${category.name}` : 'Sem categoria'} · {name}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Até</p>
        <p className="text-sm font-extrabold text-emerald-700">{hasPrice ? formatMoney(listing.price as number) : 'a combinar'}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
    </button>
  );
};
