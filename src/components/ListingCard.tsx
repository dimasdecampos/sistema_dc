import React, { useRef, useState } from 'react';
import { ArrowLeftRight, Search, Sparkles, Camera, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Listing } from '../types/marketplace';
import { storeDisplayName } from '../services/storeService';
import { PremiumBadge } from './PremiumBadge';
import { Avatar } from './Avatar';
import { resolveStoreColor } from '../utils/storeTheme';

interface ListingCardProps {
  listing: Listing;
  onClick: (listing: Listing) => void;
  onStartChat?: (listing: Listing) => void;
  currentUserId?: string;
  currentUserEmail?: string;
  matchScore?: number;
  /** Abre a loja do vendedor (só vendedores premium têm loja) */
  onOpenStore?: (sellerId: string) => void;
}

const formatMoney = (value: number) =>
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** "agora", "há 3 h", "ontem", "há 4 dias" e, depois de uma semana, "19 de out." */
function relativeDate(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ontem';
  if (days < 7) return `há ${days} dias`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing, onClick, matchScore, onOpenStore }) => {
  const isWanted = listing.type === 'WANTED';
  const hasPrice = listing.price != null && listing.price > 0;
  const images = listing.images ?? [];
  const photoCount = images.length;

  // Carrossel de fotos: setas discretas nas laterais e deslizar o dedo no celular
  const [photoIndex, setPhotoIndex] = useState(0);
  const safeIndex = photoCount > 0 ? Math.min(photoIndex, photoCount - 1) : 0;
  const imageSrc = photoCount > 0 ? images[safeIndex] : null;
  const touchStartX = useRef<number | null>(null);
  const justSwiped = useRef(false);

  const goTo = (delta: number) => setPhotoIndex((safeIndex + delta + photoCount) % photoCount);

  const isPremiumSeller = !isWanted && listing.user?.is_premium === true;
  const storeColor = isPremiumSeller ? resolveStoreColor(listing.user?.store_color) : null;
  const sellerName = isPremiumSeller && listing.user ? storeDisplayName(listing.user) : listing.user?.nome || 'Morador';

  const conditionLabel = listing.condition === 'NEW' ? 'Novo' : listing.condition === 'USED' ? 'Usado' : null;

  // Depois de deslizar a foto, o toque que "sobra" não deve abrir o anúncio
  const open = () => {
    if (justSwiped.current) {
      justSwiped.current = false;
      return;
    }
    onClick(listing);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = photoCount > 1 ? e.touches[0].clientX : null;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > 40) {
      justSwiped.current = true;
      goTo(dx < 0 ? 1 : -1);
      setTimeout(() => (justSwiped.current = false), 350);
    }
  };

  const arrowClass =
    'absolute top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/35 text-white opacity-0 backdrop-blur-sm transition hover:bg-black/60 focus-visible:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100';

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
      aria-label={`${listing.title}${hasPrice ? `, ${formatMoney(listing.price as number)}` : ''}`}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] outline-none transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-900/[0.07] focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
    >
      {/* Foto */}
      <div
        className="relative aspect-[4/3] touch-pan-y overflow-hidden bg-slate-100"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {imageSrc ? (
          <img
            key={imageSrc}
            src={imageSrc}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-5xl">
            {listing.category?.icon || '📦'}
          </div>
        )}

        {/* Setas para trocar de foto: discretas, aparecem ao passar o mouse (sempre visíveis no toque) */}
        {photoCount > 1 && (
          <>
            <button
              type="button"
              aria-label="Foto anterior"
              onClick={(e) => {
                e.stopPropagation();
                goTo(-1);
              }}
              className={`${arrowClass} left-2`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Próxima foto"
              onClick={(e) => {
                e.stopPropagation();
                goTo(1);
              }}
              className={`${arrowClass} right-2`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Degradê para os selos de baixo ficarem legíveis sobre qualquer foto */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />

        {/* Selos de cima: tipo / troca / situação */}
        <div className="absolute left-2.5 right-2.5 top-2.5 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {isWanted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                <Search className="h-3 w-3" />
                Procura-se
              </span>
            )}
            {!isWanted && listing.accepts_trade && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-emerald-700 shadow-sm backdrop-blur-sm">
                <ArrowLeftRight className="h-3 w-3" />
                Aceita troca
              </span>
            )}
          </div>

          {listing.status === 'COMPLETED' ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
              <CheckCircle2 className="h-3 w-3" />
              Concluído
            </span>
          ) : photoCount > 1 ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
              <Camera className="h-3 w-3" />
              {safeIndex + 1}/{photoCount}
            </span>
          ) : null}
        </div>

        {/* Selos de baixo: categoria e compatibilidade */}
        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-end justify-between gap-2">
          <span className="min-w-0 truncate text-[11px] font-semibold text-white drop-shadow-sm">
            {listing.category?.icon} {listing.category?.name || 'Geral'}
          </span>
          {matchScore != null && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
              <Sparkles className="h-3 w-3 text-amber-300" />
              {matchScore}%
            </span>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 text-lg font-extrabold leading-tight tracking-tight text-slate-900 sm:text-xl">
            {hasPrice ? (
              <>
                {isWanted && <span className="mr-1 text-xs font-semibold text-slate-500">até</span>}
                {formatMoney(listing.price as number)}
              </>
            ) : isWanted ? (
              <span className="text-base text-slate-500">A combinar</span>
            ) : (
              <span className="text-base text-emerald-700">Doação</span>
            )}
          </p>
          {conditionLabel && (
            <span
              className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                listing.condition === 'NEW' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {conditionLabel}
            </span>
          )}
        </div>

        {/* Altura fixa de 2 linhas: todos os cards ficam alinhados, com ou sem título longo */}
        <h3 className="mb-3 mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-slate-600 transition group-hover:text-slate-900">
          {listing.title}
        </h3>

        {/* Rodapé igual em todos os cards: vendedor (selo dourado se premium) e há quanto tempo */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
          {/* Vendedor: sempre com a foto (ou a inicial do nome se a foto falhar); premium ganha o selo dourado e abre a loja */}
          {isPremiumSeller && onOpenStore ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenStore(listing.user_id);
              }}
              className="flex min-w-0 cursor-pointer items-center gap-1.5 font-bold transition hover:opacity-75"
              style={{ color: storeColor ?? undefined }}
              title="Ver a loja"
            >
              <Avatar src={listing.user?.avatar_url} name={sellerName} />
              <span className="truncate">{sellerName}</span>
              <PremiumBadge className="h-4 w-4" />
            </button>
          ) : (
            <span className="flex min-w-0 items-center gap-1.5 text-slate-500">
              <Avatar src={listing.user?.avatar_url} name={sellerName} />
              <span
                className={`truncate ${isPremiumSeller ? 'font-bold' : 'font-medium'}`}
                style={isPremiumSeller && storeColor ? { color: storeColor } : undefined}
              >
                {sellerName}
              </span>
              {isPremiumSeller && <PremiumBadge className="h-4 w-4" />}
            </span>
          )}
          <time dateTime={listing.created_at} className="shrink-0 text-slate-400">
            {relativeDate(listing.created_at)}
          </time>
        </div>
      </div>
    </article>
  );
};
