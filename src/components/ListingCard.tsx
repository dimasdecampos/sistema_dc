import React from 'react';
import {
  Tag,
  Search,
  MessageSquare,
  Sparkles,
  MapPin,
  Clock,
  CheckCircle,
  Camera,
} from 'lucide-react';
import { Listing } from '../types/marketplace';

interface ListingCardProps {
  listing: Listing;
  onClick: (listing: Listing) => void;
  onStartChat?: (listing: Listing) => void;
  currentUserId?: string;
  matchScore?: number;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  onClick,
  onStartChat,
  currentUserId,
  matchScore,
}) => {
  const isWanted = listing.type === 'WANTED';
  const isOwner = currentUserId === listing.user_id;

  const formattedPrice = listing.price != null && listing.price > 0
    ? `R$ ${listing.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    : isWanted
    ? 'A combinar'
    : 'Grátis / Doação';

  const defaultImage = isWanted
    ? 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=500&auto=format&fit=crop&q=80'
    : 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=500&auto=format&fit=crop&q=80';

  const imageSrc =
    listing.images && listing.images.length > 0 ? listing.images[0] : defaultImage;

  return (
    <div
      onClick={() => onClick(listing)}
      className={`group bg-white rounded-3xl border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden flex flex-col cursor-pointer ${
        isWanted
          ? 'border-emerald-200/80 hover:border-emerald-400 bg-gradient-to-b from-emerald-50/20 to-white'
          : 'border-slate-200 hover:border-amber-300'
      }`}
    >
      {/* Top Banner / Type Badge */}
      <div className="relative aspect-16/10 bg-slate-100 overflow-hidden">
        <img
          src={imageSrc}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Badge de Tipo: QUERO COMPRAR ou À VENDA */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          {isWanted ? (
            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-600/90 backdrop-blur-xs text-white shadow-xs flex items-center gap-1">
              <Search className="w-3 h-3" />
              <span>Quero Comprar</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/90 backdrop-blur-xs text-slate-950 shadow-xs flex items-center gap-1">
              <Tag className="w-3 h-3" />
              <span>À Venda</span>
            </span>
          )}

          {listing.status === 'COMPLETED' && (
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-900/90 text-white">
              Resolvido
            </span>
          )}
        </div>

        {/* Condição */}
        <div className="absolute top-2.5 right-2.5">
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white/90 backdrop-blur-xs text-slate-700 shadow-2xs">
            {listing.condition === 'NEW'
              ? 'Novo'
              : listing.condition === 'USED'
              ? 'Usado'
              : 'Qualquer'}
          </span>
        </div>

        {/* Match Score Badge se fornecido */}
        {matchScore != null ? (
          <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-lg text-xs font-black bg-emerald-600 text-white shadow-xs flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>{matchScore}% Match</span>
          </div>
        ) : listing.images && listing.images.length > 1 ? (
          <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-900/75 backdrop-blur-xs text-white shadow-xs flex items-center gap-1">
            <Camera className="w-3 h-3 text-amber-400" />
            <span>{listing.images.length} fotos</span>
          </div>
        ) : null}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Categoria */}
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-semibold text-slate-600 flex items-center gap-1">
              <span>{listing.category?.icon || '📦'}</span>
              <span>{listing.category?.name || 'Geral'}</span>
            </span>
            <span className="text-[11px] text-slate-400">
              {new Date(listing.created_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
              })}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-bold text-base text-slate-900 group-hover:text-emerald-700 transition line-clamp-2 leading-snug">
            {listing.title}
          </h3>

          {/* Description */}
          {listing.description && (
            <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
              {listing.description}
            </p>
          )}
        </div>

        {/* Footer: Preço + Autor + Ação */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] text-slate-400 font-semibold block uppercase">
              {isWanted ? 'Orçamento máx.' : 'Valor'}
            </span>
            <span
              className={`text-sm sm:text-base font-extrabold ${
                isWanted ? 'text-emerald-700' : 'text-slate-900'
              }`}
            >
              {formattedPrice}
            </span>
          </div>

          {/* User Avatar & Name */}
          <div className="flex items-center gap-1.5 min-w-0">
            <img
              src={
                listing.user?.avatar_url ||
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
              }
              alt={listing.user?.nome || 'Usuário'}
              className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
            />
            <span className="text-xs font-semibold text-slate-700 truncate max-w-[80px]">
              {listing.user?.nome || 'Morador'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
