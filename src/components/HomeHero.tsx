import React from 'react';
import { Search, X } from 'lucide-react';

interface HomeHeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenWantedModal?: (initialQuery?: string) => void;
  cityName?: string;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  searchQuery,
  onSearchChange,
  cityName = 'São Luis do Paraitinga - SP',
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="w-full bg-gradient-to-b from-slate-100/70 to-slate-50 py-5 sm:py-6 border-b border-slate-200/80">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Campo de Busca Limpo e Objetivo */}
        <form onSubmit={handleSubmit} className="w-full">
          <div className="p-1.5 sm:p-2 bg-white rounded-2xl sm:rounded-3xl shadow-md shadow-slate-900/5 border border-slate-200/90 flex items-center gap-2 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
            {/* Campo de Busca com Ícone e Botão Limpar */}
            <div className="flex items-center flex-1 px-3 py-1">
              <Search className="w-5 h-5 text-emerald-600 shrink-0 mr-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={`O que você está procurando em ${cityName.split('-')[0].trim()}? (ex: martelo, bicicleta, mesa...)`}
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

            {/* Botão Buscar */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="submit"
                className="px-4 sm:px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold rounded-xl sm:rounded-2xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                title="Buscar no TemAqui"
              >
                <Search className="w-4 h-4" />
                <span>Buscar</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
