import React, { useEffect, useState } from 'react';
import { ArrowLeftRight, Loader2 } from 'lucide-react';
import { Listing, UserProfile } from '../types/marketplace';
import {
  DEFAULT_TRADE_MARGIN,
  TRADE_MARGIN_OPTIONS,
  findTradeCandidates,
  isTradable,
} from '../services/tradeService';

interface TradeSectionProps {
  listing: Listing;
  allListings: Listing[];
  currentUser: UserProfile;
  /** offered = produto de quem propõe; target = produto desejado (o dono dele recebe a proposta) */
  onProposeTrade: (offered: Listing, target: Listing) => Promise<void>;
}

const money = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const percent = (margin: number) => `${Math.round(margin * 100)}%`;

/**
 * Bloco de troca do detalhe do produto. Aparece só para donos de anúncio:
 * - no próprio produto (com troca marcada): produtos de outras pessoas que combinam;
 * - no produto de outra pessoa: só se o usuário tem algum produto seu com troca marcada.
 */
export const TradeSection: React.FC<TradeSectionProps> = ({
  listing,
  allListings,
  currentUser,
  onProposeTrade,
}) => {
  const [margin, setMargin] = useState<number>(DEFAULT_TRADE_MARGIN);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cada produto aberto começa de novo na margem padrão
  useEffect(() => {
    setMargin(DEFAULT_TRADE_MARGIN);
    setError(null);
  }, [listing.id]);

  const isLoggedIn = Boolean(currentUser.id);
  const isMine = isLoggedIn && listing.user_id === currentUser.id;
  const ownsTradableListing =
    isLoggedIn && allListings.some((l) => l.user_id === currentUser.id && isTradable(l));

  if (!isTradable(listing) || !isLoggedIn || (!isMine && !ownsTradableListing)) return null;

  const candidates = findTradeCandidates(listing, allListings, currentUser.id, margin);
  const price = listing.price as number;

  const handleTrade = async (candidate: Listing) => {
    setBusyId(candidate.id);
    setError(null);
    try {
      // Dono do produto aberto oferece o dele; visitante oferece um dos seus
      if (isMine) await onProposeTrade(listing, candidate);
      else await onProposeTrade(candidate, listing);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível enviar a proposta.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
          <ArrowLeftRight className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h4 className="text-sm font-extrabold text-slate-900">Aceita troca</h4>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
            {isMine
              ? `Produtos de outras pessoas que aceitam troca, com valor até ${percent(margin)} diferente de ${money(price)}.`
              : `Troque por um produto seu com valor até ${percent(margin)} diferente de ${money(price)}.`}
          </p>
        </div>
      </div>

      {/* Diferença de valor: o número entre parênteses mostra quantos produtos cabem em cada faixa */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Diferença de valor</span>
        <div className="flex items-center gap-1 rounded-xl bg-white p-1 shadow-2xs">
          {TRADE_MARGIN_OPTIONS.map((option) => {
            const count = findTradeCandidates(listing, allListings, currentUser.id, option).length;
            const selected = option === margin;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setMargin(option)}
                aria-pressed={selected}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  selected ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {percent(option)} <span className={selected ? 'text-emerald-100' : 'text-slate-400'}>({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {candidates.length === 0 ? (
        <p className="rounded-xl bg-white/70 px-3 py-3 text-xs leading-relaxed text-slate-500">
          {isMine
            ? `Nenhum produto de outra pessoa com troca ativada até ${percent(margin)} de diferença. Tente uma faixa maior.`
            : `Nenhum produto seu com troca ativada até ${percent(margin)} de diferença deste. Tente uma faixa maior.`}
        </p>
      ) : (
        <ul className="space-y-2">
          {candidates.map((c) => {
            const diff = (c.price as number) - price;
            const diffLabel =
              Math.abs(diff) < 0.005
                ? 'mesmo valor'
                : `${diff > 0 ? '+' : '−'}${money(Math.abs(diff))} (${Math.abs(Math.round((diff / price) * 1000) / 10)}%)`;
            return (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5"
              >
                {c.images && c.images[0] ? (
                  <img src={c.images[0]} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xl">
                    {c.category?.icon || '📦'}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{c.title}</p>
                  <p className="text-xs text-slate-500">
                    <span className="font-bold text-slate-800">{money(c.price as number)}</span> · {diffLabel}
                    {isMine && c.user?.nome ? ` · ${c.user.nome}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => handleTrade(c)}
                  className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {busyId === c.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                  )}
                  Quero trocar
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
};
