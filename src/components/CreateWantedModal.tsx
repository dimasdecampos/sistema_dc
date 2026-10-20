import React, { useState, useEffect } from 'react';
import { X, Search, Loader2 } from 'lucide-react';
import { CreateWantedInput, UserProfile } from '../types/marketplace';
import { getStoredCategories } from '../services/categoryService';
import { useModalBehavior } from '../hooks/useModalBehavior';

interface CreateWantedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateWantedInput) => Promise<void>;
  initialQuery?: string;
  currentUser?: UserProfile;
}

export const CreateWantedModal: React.FC<CreateWantedModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialQuery = '',
}) => {
  useModalBehavior(isOpen, onClose);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('cat-veiculos');
  const [price, setPrice] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      setTitle(initialQuery);
      // Auto detect category by keywords
      const q = initialQuery.toLowerCase();
      if (q.includes('bicicleta') || q.includes('carro') || q.includes('moto') || q.includes('aro')) {
        setCategoryId('cat-veiculos');
      } else if (q.includes('mesa') || q.includes('cadeira') || q.includes('sofa') || q.includes('cama')) {
        setCategoryId('cat-moveis');
      } else if (q.includes('celular') || q.includes('computador') || q.includes('tv') || q.includes('notebook')) {
        setCategoryId('cat-eletronicos');
      } else if (q.includes('martelo') || q.includes('furadeira') || q.includes('chave') || q.includes('ferramenta')) {
        setCategoryId('cat-ferramentas');
      }
    }
  }, [initialQuery, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        category_id: categoryId,
        condition: 'ANY',
        price: price ? parseFloat(price.replace(',', '.')) : null,
        description: '',
        images: [],
      });
      setTitle('');
      setPrice('');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-brand-500/10 via-white to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-sm shadow-brand-600/30">
              <Search className="w-5 h-5 stroke-[2.5]" />
            </div>
            <h2 className="font-extrabold text-lg text-slate-900 leading-tight">O que você está procurando?</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Título <span className="text-brand-600">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Bicicleta aro 26"
              className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-900 font-medium transition"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Categoria</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-hidden focus:border-brand-500 text-slate-900 font-medium transition cursor-pointer"
            >
              {getStoredCategories().map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Preço máximo <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Ex: 50.00"
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-hidden focus:border-brand-500 text-slate-900 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !title.trim()}
            className="w-full py-3.5 px-4 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-sm font-bold rounded-2xl shadow-md shadow-brand-600/25 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publicando...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Publicar procura</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
