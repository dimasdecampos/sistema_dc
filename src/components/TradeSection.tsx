import React, { useState } from 'react';
import { ArrowLeftRight, Loader2 } from 'lucide-react';
import { Listing, UserProfile } from '../types/marketplace';
import { TRADE_PRICE_MARGIN, findTradeCandidates, isTradable } from '../services/tradeService';

interface TradeSectionProps {
  listing: Listing;
  allListings: Listing[];
  currentUser: UserProfile;
  /** offered = produto de quem propõe; target = produto desejado (o dono dele recebe a mensagem) */
  onProposeTrade: (offered: Listing, target: Listing) => Promise<void>;
  onOpenLogin?: () => void;
}

const money = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

/** Bloco de troca do detalhe do produto: só aparece em venda ativa com "aceito troca" */
export const TradeSection: React.FC<TradeSectionProps> = ({
  listing,
  allListings,
  currentUser,
  onProposeTrade,
  onOpenLogin,
}) => {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isTradable(listing)) return null;

  const isLoggedIn = Boolean(currentUser.id);
  const isMine = isLoggedIn && listing.user_id === currentUser.id;
  const candidates = findTradeCandidates(listing, allListings, currentUser.id);
  const marginLabel = `${Math.round(TRADE_PRICE_MARGIN * 100)}%`;
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
          <ArrowLeftRight className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <h4 className="text-sm font-extrabold text-slate-900">Aceita troca</h4>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
            {isMine
              ? `Produtos de outras pessoas que aceitam troca, com valor até ${marginLabel} diferente de ${money(price)}.`
              : `Troque por um produto seu com valor até ${marginLabel} diferente de ${money(price)}.`}
          </p>
        </div>
      </div>

      {!isLoggedIn ? (
        <button
          type="button"
          onClick={onOpenLogin}
          className="w-full cursor-pointer rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          Entrar com o Google para propor troca
        </button>
      ) : candidates.length === 0 ? (
        <p className="rounded-xl bg-white/70 px-3 py-3 text-xs leading-relaxed text-slate-500">
          {isMine
            ? 'Ainda não há produtos de outras pessoas com troca ativada nessa faixa de valor.'
            : `Você não tem nenhum produto com "Aceito troca" ativado dentro dessa faixa de valor. Anuncie ou edite um produto seu e marque "Aceito troca".`}
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
