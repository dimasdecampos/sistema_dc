import React, { useState } from 'react';
import {
  Search,
  PlusCircle,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  BellRing,
  HelpCircle,
} from 'lucide-react';

interface HomeHeroProps {
  onSearchOrStartWanted: (queryText: string) => void;
  onOpenSaleModal: () => void;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  onSearchOrStartWanted,
  onOpenSaleModal,
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
    <div className="relative overflow-hidden bg-gradient-to-b from-emerald-50/70 via-white to-slate-50 pt-8 pb-12 sm:pt-12 sm:pb-16 border-b border-slate-200/70">
      {/* Decorative gradient blur */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-56 bg-gradient-to-r from-emerald-200/40 via-teal-200/30 to-amber-200/40 blur-3xl pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        {/* Badge da Cidade */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs font-bold mb-4 sm:mb-6 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Marketplace Local Inteligente</span>
        </div>

        {/* Big Heading - Fuja do padrão tradicional */}
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          O que você está <span className="text-emerald-600 underline decoration-emerald-300 decoration-wavy decoration-2">procurando</span>?
        </h1>

        <p className="mt-3 text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto font-medium">
          Diga o que você precisa. Quando alguém na cidade anunciar para venda, você recebe uma recomendação compatível diretamente no seu painel.
        </p>

        {/* Big Input Area as specified */}
        <form onSubmit={handleSubmit} className="mt-6 sm:mt-8 max-w-2xl mx-auto">
          <div className="p-2 sm:p-2.5 bg-white rounded-3xl shadow-xl shadow-slate-900/8 border border-slate-200/90 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
            <div className="flex items-center flex-1 px-3">
              <Search className="w-5 h-5 text-emerald-600 shrink-0 mr-2.5" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex.: quero comprar um martelo usado, bicicleta aro 26..."
                className="w-full text-sm sm:text-base text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-hidden py-2"
              />
            </div>

            <button
              type="submit"
              className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-bold rounded-2xl shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition hover:scale-[1.01] active:scale-[0.99] cursor-pointer shrink-0"
            >
              <span>Estou procurando</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Opção secundária: Tenho algo para vender */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <span className="text-xs text-slate-500">ou se você tem algo parado:</span>
          <button
            onClick={onOpenSaleModal}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100/90 px-3 py-1.5 rounded-xl border border-amber-200/80 transition cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Tenho algo para vender</span>
          </button>
        </div>

        {/* Sugestões rápidas do dia a dia */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          <span className="text-xs text-slate-400 font-medium">Exemplos populares:</span>
          <button
            onClick={() => handleQuickSuggestion('Quero comprar um martelo usado')}
            className="px-2.5 py-1 text-xs bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-lg border border-slate-200 shadow-2xs transition cursor-pointer font-medium"
          >
            🔨 Martelo usado
          </button>
          <button
            onClick={() => handleQuickSuggestion('Estou procurando uma bicicleta aro 26')}
            className="px-2.5 py-1 text-xs bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-lg border border-slate-200 shadow-2xs transition cursor-pointer font-medium"
          >
            🚲 Bicicleta aro 26
          </button>
          <button
            onClick={() => handleQuickSuggestion('Preciso de uma mesa pequena de madeira')}
            className="px-2.5 py-1 text-xs bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-lg border border-slate-200 shadow-2xs transition cursor-pointer font-medium"
          >
            🪑 Mesa de madeira
          </button>
        </div>

        {/* Como funciona o fluxo (Simples e Didático) */}
        <div className="mt-10 sm:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl mx-auto text-left">
          <div className="p-4 bg-white/90 rounded-2xl border border-slate-200/80 shadow-2xs flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-sm">
              1
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Você diz o que procura</h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Escreva livremente o item que precisa e quanto pretende pagar.
              </p>
            </div>
          </div>

          <div className="p-4 bg-white/90 rounded-2xl border border-slate-200/80 shadow-2xs flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0 text-sm">
              2
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Vizinho anuncia o item</h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Outro morador cadastra uma oferta compatível para venda.
              </p>
            </div>
          </div>

          <div className="p-4 bg-white/90 rounded-2xl border border-slate-200/80 shadow-2xs flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 font-bold flex items-center justify-center shrink-0 text-sm">
              3
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Match no seu painel</h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                O sistema cruza as informações e mostra o anúncio pronto para conversar!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
