import React from 'react';
import { ArrowRight, ArrowUpDown, PlusCircle, Search, Sparkles, Tag, ThumbsUp, Users, X } from 'lucide-react';
import { Category, Listing, SiteConfig, WantedRankItem } from '../types/marketplace';
import { Avatar } from './Avatar';
import { FeedTypeSwitch, FeedType } from './FeedTypeSwitch';
import { LoadMoreFooter, usePagedList } from './LoadMore';
import { wantedTermKey } from '../services/rankingService';
import { relativeDate } from '../utils/formatters';

export type BoardSort = 'popular' | 'recent' | 'price-asc' | 'price-desc';

interface WantedBoardProps {
  /** Procuras ativas já filtradas por busca e categoria, e ordenadas */
  listings: Listing[];
  categories: Category[];
  selectedCategory: string;
  onClearCategory: () => void;
  config: SiteConfig;
  isLoading: boolean;
  feedType: FeedType;
  onChangeFeedType: (type: FeedType) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sort: BoardSort;
  onSortChange: (sort: BoardSort) => void;
  /** Quantas pessoas procuram cada coisa, indexado por wantedTermKey */
  rankItemsByKey: Map<string, WantedRankItem>;
  /** term_key dos itens em que a pessoa já marcou "também procuro" */
  myInterestKeys: Set<string>;
  onToggleInterest: (item: WantedRankItem) => void;
  currentUserId?: string;
  matchesCount: number;
  onOpenMatches: () => void;
  onCreateSearch: () => void;
  /** Abre o cadastro de produto à venda */
  onOpenSale: () => void;
  onOpenListing: (listing: Listing) => void;
}

const formatMoney = (value: number) =>
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Quadro "Procurando": o que a cidade quer comprar, em lista, com o pedido em destaque. */
export const WantedBoard: React.FC<WantedBoardProps> = ({
  listings,
  categories,
  selectedCategory,
  onClearCategory,
  config,
  isLoading,
  feedType,
  onChangeFeedType,
  searchQuery,
  onSearchChange,
  sort,
  onSortChange,
  rankItemsByKey,
  myInterestKeys,
  onToggleInterest,
  currentUserId,
  matchesCount,
  onOpenMatches,
  onCreateSearch,
  onOpenSale,
  onOpenListing,
}) => {
  const paged = usePagedList(listings, config, `${selectedCategory}|${searchQuery}|${sort}`);
  const category = categories.find((c) => c.id === selectedCategory);
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const simpleCity = (config.cityName || 'sua cidade').split('-')[0].trim();
  const countLabel = `${listings.length} ${listings.length === 1 ? 'procura' : 'procuras'}`;

  return (
    <div>
      {/* Topo: busca das procuras (tom âmbar para diferenciar da busca de anúncios à venda) */}
      <section className="relative overflow-hidden border-b border-teal-200/60 bg-gradient-to-b from-teal-100/70 to-teal-50/30">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-[60rem] -translate-x-1/2 rounded-full bg-teal-300/30 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
            <h1 className="text-[clamp(1.25rem,1rem+1.6vw,1.875rem)] font-extrabold leading-tight tracking-tight text-slate-900">
              Quem procura em{' '}
              <span className="bg-gradient-to-r from-teal-600 to-cyan-500 bg-clip-text text-transparent">
                {simpleCity}
              </span>
            </h1>
            <p className="text-sm text-slate-600">Veja o que os moradores querem comprar e ofereça o que você tem.</p>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-teal-200 bg-white px-3.5 shadow-md shadow-teal-900/5 transition focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-400/20">
              <Search className="h-5 w-5 shrink-0 text-teal-500" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar entre as procuras: celular, bicicleta, sofá..."
                aria-label="Buscar entre as procuras"
                className="min-w-0 flex-1 bg-transparent py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden sm:text-base [&::-webkit-search-cancel-button]:hidden"
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
            </label>
            <button
              type="button"
              onClick={onCreateSearch}
              className="inline-flex min-h-12 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-cyan-600 px-5 text-sm font-extrabold text-white shadow-sm shadow-cyan-600/25 transition hover:bg-cyan-700 active:scale-[0.98]"
            >
              <PlusCircle className="h-5 w-5" />
              Cadastrar uma busca
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-5 px-4 pb-16 pt-5 sm:px-6 sm:pt-6">
        {matchesCount > 0 && (
          <button
            type="button"
            onClick={onOpenMatches}
            className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-left transition hover:bg-brand-100/70"
          >
            <span className="flex items-center gap-3 text-sm font-semibold text-brand-900">
              <Sparkles className="h-5 w-5 shrink-0 text-brand-600" />
              {matchesCount} oferta(s) compatível(is) com o que você procura
            </span>
            <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-brand-700">
              Ver <ArrowRight className="h-4 w-4" />
            </span>
          </button>
        )}

        {/* Barra de controle: mesma da tela de vendas (troca de aba, categoria, contador e ordenação) */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <FeedTypeSwitch value={feedType} onChange={onChangeFeedType} />

          <div className="flex flex-wrap items-center gap-3">
            {category && (
              <button
                type="button"
                onClick={onClearCategory}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-brand-50 py-1.5 pl-3 pr-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
                title="Remover filtro de categoria"
              >
                {category.icon} {category.name}
                <X className="h-4 w-4" />
              </button>
            )}
            <span className="text-sm text-slate-400">{countLabel}</span>
            <label className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={sort}
                onChange={(e) => onSortChange(e.target.value as BoardSort)}
                aria-label="Ordenar procuras"
                className="cursor-pointer bg-transparent font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="popular">Mais procuradas</option>
                <option value="recent">Mais recentes</option>
                <option value="price-desc">Maior orçamento</option>
                <option value="price-asc">Menor orçamento</option>
              </select>
            </label>
          </div>
        </div>

        <section aria-labelledby="procuras-titulo" className="space-y-3">
          <h2 id="procuras-titulo" className="text-xl font-extrabold tracking-tight text-slate-900">
            Procuras recentes
          </h2>

          {isLoading && listings.length === 0 ? (
            <ul className="space-y-2" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="h-28 animate-pulse rounded-2xl border border-slate-200/80 bg-white" />
              ))}
            </ul>
          ) : listings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-4 py-14 text-center">
              <Search className="mx-auto h-9 w-9 text-slate-300" />
              <h3 className="mt-3 text-base font-bold text-slate-800">Nenhuma procura por aqui</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                Ninguém cadastrou uma busca com esses filtros ainda. Seja o primeiro!
              </p>
              <button
                type="button"
                onClick={onCreateSearch}
                className="mt-5 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-cyan-600 px-5 text-sm font-extrabold text-white transition hover:bg-cyan-700"
              >
                <PlusCircle className="h-4 w-4" />
                Cadastrar uma busca
              </button>
            </div>
          ) : (
            <>
              <ul className="space-y-2">
                {paged.visible.map((item) => {
                  const cat = categoryById.get(item.category_id) ?? item.category;
                  const photo = item.images?.[0];
                  const hasBudget = item.price != null && item.price > 0;
                  const isMine = Boolean(currentUserId) && item.user_id === currentUserId;
                  const name = item.user?.nome || 'Morador';

                  // Quantas outras pessoas procuram a mesma coisa (sem contar quem publicou este pedido)
                  const rank = rankItemsByKey.get(wantedTermKey(item.title, item.category_id));
                  const isFollowing = rank ? myInterestKeys.has(rank.id) : false;
                  // Não conta quem publicou este pedido, nem a própria pessoa se ela já marcou "também procuro"
                  const others = Math.max(0, (rank?.total_seekers ?? 1) - 1 - (isFollowing && !isMine ? 1 : 0));
                  const iAlsoSearch = isFollowing || (rank ? Boolean(currentUserId) && rank.seeker_user_ids.includes(currentUserId!) : false);

                  return (
                    <li key={item.id} className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs transition hover:border-brand-300">
                      <button
                        type="button"
                        onClick={() => onOpenListing(item)}
                        className="flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-t-2xl p-3 text-left active:bg-slate-50 sm:gap-4 sm:p-4"
                      >
                        {/* Foto pequena (ou o ícone da categoria) */}
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50 text-2xl sm:h-16 sm:w-16">
                          {photo ? (
                            <img src={photo} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                          ) : (
                            <span aria-hidden="true">{cat?.icon || '🔎'}</span>
                          )}
                        </span>

                        {/* O que a pessoa procura: protagonista */}
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="line-clamp-2 text-base font-extrabold leading-snug text-slate-900 sm:text-lg">
                              {item.title}
                            </span>
                            {isMine && (
                              <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">
                                Sua busca
                              </span>
                            )}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                            <span
                              className={`rounded-full px-2 py-0.5 font-bold ${
                                hasBudget ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {hasBudget ? `Até ${formatMoney(item.price as number)}` : 'Orçamento a combinar'}
                            </span>
                            {cat && (
                              <span>
                                {cat.icon} {cat.name}
                              </span>
                            )}
                          </span>
                          <span className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                            <Avatar src={item.user?.avatar_url} name={name} className="h-4 w-4 text-[9px]" />
                            <span className="truncate">{name}</span>
                            <span aria-hidden="true">·</span>
                            <span className="shrink-0">{relativeDate(item.created_at)}</span>
                          </span>
                        </span>
                      </button>

                      {/* Rodapé do card: quantos mais procuram + curtir + oferecer */}
                      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-3 py-2.5 sm:px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                            others > 0 ? 'text-slate-700' : 'text-slate-400'
                          }`}
                        >
                          <Users className="h-4 w-4" />
                          {others === 0
                            ? 'Ninguém mais procura isso ainda'
                            : others === 1
                            ? '1 outra pessoa também procura'
                            : `${others} outras pessoas também procuram`}
                        </span>

                        <div className="ml-auto flex items-center gap-2">
                          {rank && !isMine && (
                            <button
                              type="button"
                              onClick={() => onToggleInterest(rank)}
                              aria-pressed={iAlsoSearch}
                              title={iAlsoSearch ? 'Toque para deixar de acompanhar' : 'Também procuro isso. Me avise quando anunciarem'}
                              className={`inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition active:scale-95 ${
                                iAlsoSearch
                                  ? 'border-brand-600 bg-brand-600 text-white'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <ThumbsUp className={`h-4 w-4 ${iAlsoSearch ? 'fill-current' : ''}`} />
                              {iAlsoSearch ? 'Você também procura' : 'Também procuro'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={onOpenSale}
                            className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-500 px-3.5 text-xs font-extrabold text-slate-950 transition hover:bg-amber-400 active:scale-95"
                          >
                            <Tag className="h-4 w-4" />
                            Tenho isso pra vender
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <LoadMoreFooter
                hasMore={paged.hasMore}
                mode={paged.mode}
                remaining={paged.remaining}
                onLoadMore={paged.loadMore}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
};
