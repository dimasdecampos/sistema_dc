import React, { useState } from 'react';
import { Bell, BellRing, Flame, PlusCircle, Tag } from 'lucide-react';
import { WantedRankItem } from '../types/marketplace';

interface MostWantedRankingProps {
  ranking: WantedRankItem[];
  currentUserId?: string;
  /** term_key dos itens em que a pessoa já marcou o sininho */
  myInterestKeys: Set<string>;
  onToggleInterest: (item: WantedRankItem) => void;
  /** Abre o formulário "estou procurando algo" */
  onOpenWanted: () => void;
  onOpenSaleWithTerm: (term: string, categoryId: string) => void;
}

const INITIAL_VISIBLE = 5;

export const MostWantedRanking: React.FC<MostWantedRankingProps> = ({
  ranking,
  currentUserId,
  myInterestKeys,
  onToggleInterest,
  onOpenWanted,
  onOpenSaleWithTerm,
}) => {
  const [showAll, setShowAll] = useState(false);
  const items = showAll ? ranking : ranking.slice(0, INITIAL_VISIBLE);

  return (
    <section aria-labelledby="mais-procurados-titulo">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <h2
            id="mais-procurados-titulo"
            className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl"
          >
            <Flame className="h-6 w-6 text-orange-500" />
            Mais procurados na cidade
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Procura isso também? Toque no <BellRing className="inline h-3.5 w-3.5 -translate-y-px text-emerald-600" />{' '}
            e avisamos quando alguém anunciar.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {ranking.length > INITIAL_VISIBLE && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="cursor-pointer text-sm font-semibold text-slate-500 transition hover:text-slate-900"
            >
              {showAll ? 'Mostrar menos' : `Ver todos (${ranking.length})`}
            </button>
          )}
          <button
            type="button"
            onClick={onOpenWanted}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 active:scale-[0.98]"
          >
            <PlusCircle className="h-4 w-4" />
            Estou procurando algo
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
          <p className="text-sm font-semibold text-slate-700">Ninguém registrou uma procura ainda.</p>
          <p className="mt-1 text-sm text-slate-500">
            Clique em "Estou procurando algo" para ser o primeiro.
          </p>
        </div>
      ) : (
        <ol className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          {items.map((item, index) => {
            const isOwn = Boolean(currentUserId) && item.seeker_user_ids.includes(currentUserId!);
            const isFollowing = myInterestKeys.has(item.id);
            const active = isOwn || isFollowing;
            const hasOffers = item.available_offers > 0;

            const bellLabel = isOwn
              ? 'Você já está procurando isso'
              : isFollowing
              ? 'Você será avisado. Toque para desativar'
              : 'Também procuro. Me avise quando anunciarem';

            return (
              <li key={item.id} className="flex items-center gap-3 px-3 py-3.5 sm:gap-4 sm:px-5">
                <span
                  className={`w-6 shrink-0 text-center text-sm font-extrabold ${
                    index === 0 ? 'text-orange-500' : 'text-slate-300'
                  }`}
                >
                  {index + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold text-slate-900 sm:text-base">{item.term}</h3>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                    <span>
                      {item.category_icon} {item.category_name}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className={hasOffers ? 'text-slate-500' : 'font-semibold text-amber-600'}>
                      {hasOffers
                        ? `${item.available_offers} ${item.available_offers === 1 ? 'oferta à venda' : 'ofertas à venda'}`
                        : 'Ninguém vendendo ainda'}
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenSaleWithTerm(item.term, item.category_id)}
                  className="hidden shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:inline-flex"
                  title="Tenho isso para vender"
                >
                  <Tag className="h-3.5 w-3.5" />
                  Tenho para vender
                </button>

                <button
                  type="button"
                  onClick={() => onToggleInterest(item)}
                  disabled={isOwn}
                  aria-pressed={active}
                  aria-label={`${bellLabel}. ${item.total_seekers} ${item.total_seekers === 1 ? 'pessoa procura' : 'pessoas procuram'} ${item.term}`}
                  title={bellLabel}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-bold transition active:scale-95 ${
                    active
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'cursor-pointer border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  } ${isOwn ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  {active ? <BellRing className="h-4 w-4 fill-current" /> : <Bell className="h-4 w-4" />}
                  <span className="tabular-nums">{item.total_seekers}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};
