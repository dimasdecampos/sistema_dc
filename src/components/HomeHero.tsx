import React from 'react';
import { Search, X, Tag } from 'lucide-react';

interface HomeHeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenSaleModal?: () => void;
  cityName?: string;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  searchQuery,
  onSearchChange,
  onOpenSaleModal,
  cityName = 'São Luis do Paraitinga - SP',
}) => {
  const simpleCity = cityName.split('-')[0].trim();

  return (
    <section className="relative overflow-hidden border-b border-slate-200/70 bg-gradient-to-b from-brand-50 to-white">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-[60rem] -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-2.5 py-5 sm:px-6 sm:py-7 lg:px-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
          <h1 className="text-[clamp(1.25rem,1rem+1.6vw,1.875rem)] font-extrabold leading-tight tracking-tight text-slate-900">
            O que você quer vender em{' '}
            <span className="bg-gradient-to-r from-brand-600 to-teal-500 bg-clip-text text-transparent">
              {simpleCity}
            </span>
            ?
          </h1>
          <p className="text-sm text-slate-500">
            Compre, venda e encontre direto com os moradores da cidade.
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-md shadow-slate-900/5 transition focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-500/10"
          >
            <Search className="ml-3 h-5 w-5 shrink-0 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Celular, bicicleta, sofá..."
              aria-label="Buscar anúncios"
              className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden sm:text-base"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="shrink-0 cursor-pointer rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="submit"
              className="hidden shrink-0 cursor-pointer rounded-xl bg-brand-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-700 active:scale-[0.98] sm:block sm:px-7"
            >
              Buscar
            </button>
          </form>

          <div className="flex items-center gap-2.5">
            {onOpenSaleModal && (
              <button
                type="button"
                onClick={onOpenSaleModal}
                className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-amber-500 px-3.5 py-3 text-sm font-extrabold text-slate-950 shadow-sm transition hover:bg-amber-400 active:scale-[0.98] sm:px-4"
              >
                <Tag className="h-4 w-4" />
                Anunciar
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
