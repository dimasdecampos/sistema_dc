import React, { useState } from 'react';
import {
  Search,
  PlusCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Tag,
} from 'lucide-react';

interface HomeHeroProps {
  onSearchOrStartWanted: (queryText: string) => void;
  onOpenSaleModal: () => void;
  onScrollToRanking?: () => void;
  cityName?: string;
  heroTitle?: string;
  heroSubtitle?: string;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  onSearchOrStartWanted,
  onOpenSaleModal,
  onScrollToRanking,
  cityName = 'Socorro - SP',
  heroTitle,
  heroSubtitle,
}) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSearchOrStartWanted(query.trim());
  };

  const handleQuickSuggestion = (text: string) => {
    setQuery(text);
    onSearchOrStartWanted(text);
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-emerald-50/60 via-white to-slate-50 pt-5 pb-6 sm:pt-7 sm:pb-8 border-b border-slate-200/80">
      {/* Decorative gradient blur */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-36 bg-gradient-to-r from-emerald-200/30 via-teal-200/20 to-amber-200/30 blur-2xl pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        {/* Badge da Cidade & Conceito */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 rounded-full bg-emerald-100/90 border border-emerald-200 text-emerald-800 text-[10px] sm:text-[11px] font-bold shadow-2xs">
            <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="truncate max-w-[240px] sm:max-w-none">Classificados de Procura & Oferta • {cityName}</span>
          </div>
          {onScrollToRanking && (
            <button
              onClick={onScrollToRanking}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100/90 border border-amber-200 text-amber-800 text-[10px] sm:text-[11px] font-extrabold hover:bg-amber-200 transition cursor-pointer shrink-0"
            >
              <TrendingUp className="w-3 h-3 text-amber-600" />
              <span>Ver Ranking</span>
            </button>
          )}
        </div>

        {/* Heading Otimizado e Compacto */}
        <h1 className="text-xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight px-1">
          {heroTitle || (
            <>
              O que você está <span className="text-emerald-600 underline decoration-emerald-300 decoration-wavy decoration-2">procurando</span> em {cityName.split('-')[0].trim()}?
            </>
          )}
        </h1>

        <p className="mt-1.5 text-xs sm:text-sm text-slate-600 max-w-xl mx-auto font-medium px-2">
          {heroSubtitle || 'Diga o que você precisa. O sistema te avisa quando um morador cadastrar uma oferta compatível.'}
        </p>

        {/* Input Bar Compacto e de Alta Aderência */}
        <form onSubmit={handleSubmit} className="mt-3.5 sm:mt-5 max-w-2xl mx-auto">
          <div className="p-1.5 sm:p-2 bg-white rounded-2xl sm:rounded-3xl shadow-lg shadow-slate-900/5 border border-slate-200/90 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
            <div className="flex items-center flex-1 px-2.5 sm:px-3">
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0 mr-2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex.: quero comprar martelo, bicicleta aro 26, mesa..."
                className="w-full text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-hidden py-1.5"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                type="submit"
                className="flex-1 sm:flex-none py-2 px-3 sm:px-5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs sm:text-sm font-bold rounded-xl sm:rounded-2xl shadow-sm flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 whitespace-nowrap"
              >
                <span>Estou procurando</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onOpenSaleModal}
                className="flex-1 sm:flex-none py-2 px-2.5 sm:px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs sm:text-sm font-extrabold rounded-xl sm:rounded-2xl shadow-sm flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 whitespace-nowrap"
                title="Publicar algo que você tem para vender"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Vender algo</span>
              </button>
            </div>
          </div>
        </form>

        {/* Sugestões rápidas inline */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-xs">
          <span className="text-[11px] text-slate-400 font-medium">Sugestões rápidas:</span>
          {['🔨 Martelo usado', '🚲 Bicicleta aro 26', '🪑 Mesa de madeira', '📱 Celular'].map((sug) => (
            <button
              key={sug}
              onClick={() => handleQuickSuggestion(sug.slice(2).trim())}
              className="px-2 py-0.5 text-[11px] bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-md border border-slate-200 shadow-2xs transition cursor-pointer font-medium"
            >
              {sug}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
