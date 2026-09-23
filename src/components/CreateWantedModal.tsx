import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Tag,
  Sparkles,
  Camera,
  Upload,
  CheckCircle2,
  Loader2,
  DollarSign,
} from 'lucide-react';
import { CreateWantedInput, ListingCondition } from '../types/marketplace';
import { DEFAULT_CATEGORIES } from '../data/defaultCategories';

interface CreateWantedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateWantedInput) => Promise<void>;
  initialQuery?: string;
}

export const CreateWantedModal: React.FC<CreateWantedModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialQuery = '',
}) => {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('cat-ferramentas');
  const [condition, setCondition] = useState<ListingCondition>('USED');
  const [price, setPrice] = useState<string>('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        category_id: categoryId,
        condition,
        price: price ? parseFloat(price.replace(',', '.')) : null,
        description: description.trim(),
        images: photoUrl ? [photoUrl] : [],
      });
      // Reset
      setTitle('');
      setPrice('');
      setDescription('');
      setPhotoUrl('');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-white to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shadow-emerald-600/30">
              <Search className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg sm:text-xl text-slate-900 leading-tight">
                O que você está procurando?
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Publique sua intenção. Encontraremos vendedores compatíveis!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Campo: O que você procura? */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              O que você procura? <span className="text-emerald-600">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Quero comprar um martelo usado, bicicleta aro 26..."
              className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 font-medium transition"
              autoFocus
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Categoria
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-hidden focus:border-emerald-500 text-slate-900 font-medium transition cursor-pointer"
            >
              {DEFAULT_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Preço máximo opcional & Condição */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Preço máximo */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Preço máximo desejado <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Ex: 50.00"
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-hidden focus:border-emerald-500 text-slate-900 font-medium"
                />
              </div>
            </div>

            {/* Condição */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Condição
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setCondition('USED')}
                  className={`py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                    condition === 'USED'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Usado
                </button>
                <button
                  type="button"
                  onClick={() => setCondition('NEW')}
                  className={`py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                    condition === 'NEW'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Novo
                </button>
                <button
                  type="button"
                  onClick={() => setCondition('ANY')}
                  className={`py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                    condition === 'ANY'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tanto faz
                </button>
              </div>
            </div>
          </div>

          {/* Observações opcionais */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Detalhes ou observações <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Preciso para o fim de semana, posso retirar no centro..."
              className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-hidden focus:border-emerald-500 text-slate-900 font-medium resize-none"
            />
          </div>

          {/* Foto opcional de exemplo */}
          <div className="pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Foto de referência <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{photoUrl ? 'Alterar foto' : 'Carregar imagem'}</span>
              </button>
            </div>

            {photoUrl && (
              <div className="mt-2 relative w-20 h-20 rounded-2xl overflow-hidden border border-slate-200">
                <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoUrl('')}
                  className="absolute top-1 right-1 p-0.5 rounded-full bg-slate-900/80 text-white hover:bg-slate-900"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Dica do algoritmo de match */}
          <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Assim que você publicar, nosso sistema verifica se algum vizinho já colocou esse item à venda e mostrará no seu painel!
            </p>
          </div>

          {/* Botão de envio */}
          <button
            type="submit"
            disabled={isLoading || !title.trim()}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-bold rounded-2xl shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publicando procura...</span>
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
