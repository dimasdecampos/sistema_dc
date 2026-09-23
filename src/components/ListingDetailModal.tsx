import React, { useState } from 'react';
import {
  X,
  Tag,
  Search,
  MessageSquare,
  Sparkles,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { Listing, Match, UserProfile } from '../types/marketplace';

interface ListingDetailModalProps {
  listing: Listing | null;
  isOpen: boolean;
  onClose: () => void;
  onStartChat: (listing: Listing) => void;
  currentUser: UserProfile;
  relatedMatches?: Match[];
}

export const ListingDetailModal: React.FC<ListingDetailModalProps> = ({
  listing,
  isOpen,
  onClose,
  onStartChat,
  currentUser,
  relatedMatches = [],
}) => {
  if (!isOpen || !listing) return null;

  const isWanted = listing.type === 'WANTED';
  const isOwner = currentUser.id === listing.user_id;

  const formattedPrice =
    listing.price != null && listing.price > 0
      ? `R$ ${listing.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : isWanted
      ? 'A combinar / Proposta'
      : 'Grátis / Doação';

  const defaultImage = isWanted
    ? 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=800&auto=format&fit=crop&q=80'
    : 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=800&auto=format&fit=crop&q=80';

  const images =
    listing.images && listing.images.length > 0 ? listing.images : [defaultImage];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-2">
            {isWanted ? (
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-emerald-600" />
                <span>Quero Comprar / Procura</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-900 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-700" />
                <span>Produto à Venda / Oferta</span>
              </span>
            )}
            <span className="text-xs text-slate-400 font-medium">
              • {listing.category?.name || 'Geral'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
          {/* Main Photo Gallery */}
          <div className="rounded-2xl overflow-hidden aspect-16/9 bg-slate-100 border border-slate-200 shadow-2xs">
            <img
              src={images[0]}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Title & Price Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
                {listing.title}
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Publicado em{' '}
                    {new Date(listing.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                    })}
                  </span>
                </span>
                <span>•</span>
                <span className="font-semibold text-slate-700">
                  Condição:{' '}
                  {listing.condition === 'NEW'
                    ? 'Novo'
                    : listing.condition === 'USED'
                    ? 'Usado'
                    : 'Tanto faz'}
                </span>
              </div>
            </div>

            <div className="sm:text-right shrink-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {isWanted ? 'Orçamento máx.' : 'Valor pedido'}
              </span>
              <span
                className={`text-2xl sm:text-3xl font-black ${
                  isWanted ? 'text-emerald-700' : 'text-slate-900'
                }`}
              >
                {formattedPrice}
              </span>
            </div>
          </div>

          {/* Description */}
          {listing.description && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Descrição e detalhes
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {listing.description}
              </p>
            </div>
          )}

          {/* Autor / Morador Info (Sem endereço residencial, por privacidade) */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={
                  listing.user?.avatar_url ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
                }
                alt={listing.user?.nome || 'Morador'}
                className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
              />
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  {listing.user?.nome || 'Morador local'}
                </h4>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{listing.user?.cidade || 'Socorro - SP'}</span>
                </p>
              </div>
            </div>

            <div className="text-right text-[11px] text-slate-400">
              <span className="flex items-center gap-1 justify-end text-emerald-700 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Privacidade protegida</span>
              </span>
              <p className="mt-0.5">Endereço não exibido</p>
            </div>
          </div>

          {/* Ação Principal: Botão para Iniciar Conversa */}
          {!isOwner ? (
            <button
              onClick={() => {
                onStartChat(listing);
                onClose();
              }}
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2.5 transition hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <MessageSquare className="w-5 h-5" />
              <span>
                {isWanted
                  ? 'Tenho o que você procura (Iniciar conversa)'
                  : 'Tenho interesse (Iniciar conversa com vendedor)'}
              </span>
            </button>
          ) : (
            <div className="p-3 bg-slate-100 rounded-2xl text-center text-xs text-slate-500 font-semibold">
              Este é o seu próprio anúncio. Você pode gerenciá-lo em seu Painel.
            </div>
          )}

          {/* Seção de Matches Reversos */}
          {relatedMatches.length > 0 && (
            <div className="pt-4 border-t border-slate-200/80 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {isWanted
                    ? 'Ofertas compatíveis na cidade'
                    : 'Pessoas na cidade procurando por este item'}
                </span>
              </h4>

              <div className="space-y-2">
                {relatedMatches.slice(0, 3).map((m) => {
                  const target = isWanted ? m.sale_listing : m.wanted_listing;
                  if (!target) return null;
                  return (
                    <div
                      key={m.id}
                      className="p-3 bg-slate-50 hover:bg-emerald-50/50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">
                          {target.title}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {target.user?.nome} • {m.score}% de compatibilidade
                        </p>
                      </div>
                      <span className="font-extrabold text-emerald-700 shrink-0">
                        {target.price ? `R$ ${target.price}` : 'A combinar'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
