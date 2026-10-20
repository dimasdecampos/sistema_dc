import React from 'react';
import { ArrowLeftRight } from 'lucide-react';

interface TradeToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Chave "Aceito troca" dos formulários de anúncio de venda */
export const TradeToggle: React.FC<TradeToggleProps> = ({ checked, onChange }) => {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition ${
        checked ? 'border-brand-300 bg-brand-50/60' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/60'
      }`}
    >
      <ArrowLeftRight className={`mt-0.5 h-5 w-5 shrink-0 ${checked ? 'text-brand-600' : 'text-slate-400'}`} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-slate-900">Aceito troca</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
          Quem tiver um produto de valor parecido (você escolhe a faixa de 5%, 10% ou 15%) poderá propor a troca
          direto pelo chat.
        </span>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-brand-600"
      />
    </label>
  );
};
