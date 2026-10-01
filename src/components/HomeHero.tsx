import React from 'react';
import { Search, X, Tag, PlusCircle, Sparkles } from 'lucide-react';
import { Category } from '../types/marketplace';

interface HomeHeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenWantedModal?: (initialQuery?: string) => void;
  onOpenSaleModal?: () => void;
  cityName?: string;
  categories?: Category[];
  selectedCategory?: string;
  onSelectCategory?: (categoryId: string) => void;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  searchQuery,
  onSearchChange,
  onOpenWantedModal,
  onOpenSaleModal,
  cityName = 'São Luis do Paraitinga - SP',
  categories = [],
  selectedCategory = 'all',
  onSelectCategory,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const simpleCity = cityName.split('-')[0].trim();

  return (
    <div className="w-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white py-8 sm:py-10 border-b border-slate-800 relative overflow-hidden">
      {/* Decorative gradient glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10 space-y-5">
        {/* Title & Tagline estilo OLX */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-300 text-xs font-bold border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Classificados Oficiais de {simpleCity}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Compre, venda e encontre o que precisa
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Negocie direto com os moradores da cidade. Anuncie desapegos ou publique o que está procurando sem intermediários.
          </p>
        </div>

        {/* Campo de Busca Principal da Cidade */}
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="p-1.5 sm:p-2 bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-black/20 flex items-center gap-2 focus-within:ring-4 focus-within:ring-emerald-400/20 transition-all">
            <div className="flex items-center flex-1 px-3 py-1">
              <Search className="w-5 h-5 text-emerald-600 shrink-0 mr-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={`O que você está procurando em ${simpleCity}? (ex: celular, bicicleta, sofá...)`}
                className="w-full text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-hidden py-1.5 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer shrink-0"
                  title="Limpar busca"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="submit"
              className="px-5 sm:px-7 py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold rounded-xl sm:rounded-2xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Search className="w-4 h-4" />
              <span>Buscar</span>
            </button>
          </div>
        </form>

        {/* Botões de Ação Rápida no Hero (Vender / Procurar) */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          {onOpenSaleModal && (
            <button
              type="button"
              onClick={onOpenSaleModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Tag className="w-4 h-4" />
              <span>+ Anunciar Desapego (Vender)</span>
            </button>
          )}

          {onOpenWantedModal && (
            <button
              type="button"
              onClick={() => onOpenWantedModal(searchQuery)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/15 hover:bg-white/25 active:bg-white/10 text-white font-bold text-xs sm:text-sm rounded-2xl backdrop-blur-md border border-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>+ Estou Procurando Algo (Comprar)</span>
            </button>
          )}
        </div>

        {/* Categorias Rápidas em Destaque */}
        {categories.length > 0 && onSelectCategory && (
          <div className="pt-2 flex items-center justify-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              type="button"
              onClick={() => onSelectCategory('all')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              Todas
            </button>
            {categories.slice(0, 7).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
