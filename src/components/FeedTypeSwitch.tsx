import React from 'react';

export type FeedType = 'SALE' | 'WANTED';

const OPTIONS: { id: FeedType; label: string }[] = [
  { id: 'SALE', label: 'À venda' },
  { id: 'WANTED', label: 'Procurando' },
];

interface FeedTypeSwitchProps {
  value: FeedType;
  onChange: (type: FeedType) => void;
}

/** Alterna a home entre os anúncios à venda e o quadro de quem está procurando. */
export const FeedTypeSwitch: React.FC<FeedTypeSwitchProps> = ({ value, onChange }) => (
  <div role="tablist" aria-label="Tipo de anúncio" className="flex w-fit items-center gap-1 rounded-xl bg-slate-100 p-1">
    {OPTIONS.map((opt) => (
      <button
        key={opt.id}
        type="button"
        role="tab"
        aria-selected={value === opt.id}
        onClick={() => onChange(opt.id)}
        className={`cursor-pointer whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
          value === opt.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);
