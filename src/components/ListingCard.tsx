import React from 'react';
import { ArrowLeftRight, Search, Sparkles, Camera } from 'lucide-react';
import { Listing } from '../types/marketplace';

interface ListingCardProps {
  listing: Listing;
  onClick: (listing: Listing) => void;
  onStartChat?: (listing: Listing) => void;
  currentUserId?: string;
  currentUserEmail?: string;
  matchScore?: number;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  onClick,
  matchScore,
}) => {
  const isWanted = listing.type === 'WANTED';

  const formattedPrice =
    listing.price != null && listing.price > 0
      ? `R$ ${listing.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : isWanted
      ? 'A combinar'
      : 'Grátis / Doação';

  const imageSrc = listing.images && listing.images.length > 0 ? listing.images[0] : null;
  const conditionLabel =
    listing.condition === 'NEW' ? 'Novo' : listing.condition === 'USED' ? 'Usado' : null;

  return (
    <article
      onClick={() => onClick(listing)}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-900/5"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={listing.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-5xl">
            {listing.category?.icon || '📦'}
          </div>
        )}

        {isWanted && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
            <Search className="h-3 w-3" />
            Procura-se
          </span>
        )}

        {!isWanted && listing.accepts_trade && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-emerald-700 shadow-sm">
            <ArrowLeftRight className="h-3 w-3" />
            Aceita troca
          </span>
        )}

        {listing.status === 'COMPLETED' && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-slate-900/85 px-2.5 py-1 text-[11px] font-bold text-white">
            Resolvido
          </span>
        )}

        {matchScore != null ? (
          <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
            <Sparkles className="h-3 w-3 text-amber-300" />
            {matchScore}% match
          </span>
        ) : listing.images && listing.images.length > 1 ? (
          <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-slate-900/70 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-xs">
            <Camera className="h-3 w-3" />
            {listing.images.length}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xl font-extrabold tracking-tight text-slate-900">{formattedPrice}</p>
        <h3 className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-slate-700 transition group-hover:text-emerald-700">
          {listing.title}
        </h3>

        <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs text-slate-400">
          <span className="truncate">
            {listing.category?.icon} {listing.category?.name || 'Geral'}
            {conditionLabel ? ` · ${conditionLabel}` : ''}
          </span>
          <span className="shrink-0">
            {new Date(listing.created_at).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
            })}
          </span>
        </div>
      </div>
    </article>
  );
};
