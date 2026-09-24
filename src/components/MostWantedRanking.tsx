import React, { useState } from 'react';
import {
  TrendingUp,
  Flame,
  Search,
  Tag,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  PlusCircle,
  Filter,
} from 'lucide-react';
import { Category, WantedRankItem } from '../types/marketplace';

interface MostWantedRankingProps {
  ranking: WantedRankItem[];
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  onOpenWantedWithTerm: (term: string, categoryId: string) => void;
  onOpenSaleWithTerm: (term: string, categoryId: string) => void;
}

export const MostWantedRanking: React.FC<MostWantedRankingProps> = ({
  ranking,
  categories,
  selectedCategory,
  onSelectCategory,
  onOpenWantedWithTerm,
  onOpenSaleWithTerm,
}) => {
  const [viewMode, setViewMode] = useState<'compact' | 'full'>('compact');

  const displayedItems = viewMode === 'compact' ? ranking.slice(0, 5) : ranking;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-7 space-y-6">
      {/* Header do Ranking */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
            <Flame className="w-5 h-5 fill-white text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                Mais Procurados na Cidade
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-100 text-orange-800 border border-orange-200">
                Top Demandas
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              O que os moradores estão buscando ativamente agora. Ótima oportunidade para desapegar!
            </p>
          </div>
        </div>

        {ranking.length > 5 && (
          <button
            onClick={() => setViewMode(viewMode === 'compact' ? 'full' : 'compact')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition cursor-pointer self-start sm:self-auto"
          >
            {viewMode === 'compact' ? `Ver todos (${ranking.length})` : 'Mostrar menos'}
          </button>
        )}
      </div>

      {/* Categorias Filtro Horizontal */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none text-xs">
        <button
          onClick={() => onSelectCategory('all')}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
            selectedCategory === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
        >
          <span>🔥 Todos</span>
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === cat.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Lista do Ranking */}
      {displayedItems.length === 0 ? (
        <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p className="text-xs font-medium text-slate-500">
            Nenhuma procura registrada nesta categoria ainda.
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Seja o primeiro a publicar o que você está precisando comprar!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {displayedItems.map((item, index) => {
            const hasOffers = item.available_offers > 0;
            return (
              <div
                key={item.id}
                className="group p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 hover:border-emerald-300 hover:shadow-md bg-gradient-to-br from-white to-slate-50/60 transition-all flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                          index === 0
                            ? 'bg-amber-400 text-amber-950 shadow-xs'
                            : index === 1
                            ? 'bg-slate-300 text-slate-800'
                            : index === 2
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        #{index + 1}
                      </span>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-emerald-700 transition">
                        {item.term}
                      </h3>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shrink-0">
                      <span>{item.category_icon}</span>
                      <span>{item.category_name}</span>
                    </span>
                  </div>

                  {/* Informações de demanda e preço */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                      <Search className="w-3 h-3 text-emerald-600" />
                      <span>{item.total_seekers} {item.total_seekers === 1 ? 'procura ativa' : 'procuras ativas'}</span>
                    </span>

                    {item.avg_budget && (
                      <span className="text-[11px] font-semibold text-slate-700">
                        Preço médio: <strong className="text-slate-900">R$ {item.avg_budget}</strong>
                      </span>
                    )}

                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        hasOffers
                          ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                          : 'bg-amber-50 text-amber-800 border border-amber-200/60'
                      }`}
                    >
                      {hasOffers
                        ? `${item.available_offers} ${item.available_offers === 1 ? 'oferta à venda' : 'ofertas à venda'}`
                        : 'Sem ofertas (Alta chance de vender!)'}
                    </span>
                  </div>
                </div>

                {/* Botões de Ação Rápida */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => onOpenWantedWithTerm(item.term, item.category_id)}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer flex items-center gap-1"
                    title="Publicar que você também procura este item"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Também procuro</span>
                  </button>

                  <button
                    onClick={() => onOpenSaleWithTerm(item.term, item.category_id)}
                    className="px-3 py-1 text-xs font-bold bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                    title="Publicar que você tem este item para vender"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>Eu tenho pra vender!</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
