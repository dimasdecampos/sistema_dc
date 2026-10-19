import React, { useState } from 'react';
import { ArrowLeftRight, CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import { TradeProposal, TradeProposalListing } from '../types/marketplace';

interface TradeProposalCardProps {
  proposal: TradeProposal;
  currentUserId: string;
  /** Aceita a troca; lança erro com mensagem clara em caso de falha */
  onAccept: (proposal: TradeProposal) => Promise<void>;
}

const money = (value: number | null) =>
  value != null && value > 0
    ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    : 'Sem preço';

const ProductTile: React.FC<{ label: string; item?: TradeProposalListing }> = ({ label, item }) => (
  <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-2.5">
    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
    <div className="flex items-center gap-2.5">
      {item?.images[0] ? (
        <img src={item.images[0]} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
      ) : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg">📦</span>
      )}
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-slate-900">{item?.title || 'Anúncio removido'}</p>
        <p className="text-xs font-extrabold text-emerald-700">{money(item?.price ?? null)}</p>
      </div>
    </div>
  </div>
);

/** Cartão da proposta de troca dentro do chat, com o botão "Aceitar troca" para quem recebeu */
export const TradeProposalCard: React.FC<TradeProposalCardProps> = ({ proposal, currentUserId, onAccept }) => {
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRecipient = Boolean(currentUserId) && proposal.target?.user_id === currentUserId;
  const proposerName = proposal.offered?.owner_name || 'a outra pessoa';
  const recipientName = proposal.target?.owner_name || 'o dono';
  const bothActive = proposal.offered?.status === 'ACTIVE' && proposal.target?.status === 'ACTIVE';

  const handleAccept = async () => {
    const ok = window.confirm(
      'Aceitar a troca?\n\nOs dois anúncios serão marcados como concluídos e ninguém mais poderá interagir com eles. ' +
        'A conversa continua aberta para combinarem a entrega.'
    );
    if (!ok) return;

    setIsAccepting(true);
    setError(null);
    try {
      await onAccept(proposal);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível aceitar a troca.');
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5">
      <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-800">
        <ArrowLeftRight className="h-4 w-4" />
        Proposta de troca
      </div>

      <div className="flex items-center gap-2">
        <ProductTile label={`Oferecido por ${proposerName}`} item={proposal.offered} />
        <ArrowLeftRight className="h-4 w-4 shrink-0 text-emerald-600" />
        <ProductTile label="Desejado" item={proposal.target} />
      </div>

      {proposal.status === 'ACCEPTED' ? (
        <p className="flex items-start gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          Troca aceita. Os dois anúncios foram concluídos.
        </p>
      ) : proposal.status === 'CANCELLED' || !bothActive ? (
        <p className="flex items-start gap-2 rounded-xl bg-slate-200/70 px-3 py-2.5 text-xs font-semibold text-slate-600">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          Proposta encerrada: um dos anúncios não está mais disponível.
        </p>
      ) : isRecipient ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleAccept}
            disabled={isAccepting}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-60"
          >
            {isAccepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Aceitar troca
          </button>
          <p className="text-center text-[11px] text-slate-500">
            Ao aceitar, os dois anúncios ficam concluídos e ninguém mais poderá interagir com eles.
          </p>
        </div>
      ) : (
        <p className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-semibold text-slate-600">
          <Clock className="h-4 w-4 shrink-0 text-amber-500" />
          Aguardando {recipientName} responder.
        </p>
      )}

      {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
};
