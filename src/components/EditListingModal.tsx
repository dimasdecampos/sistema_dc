import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Tag,
  Search,
  Upload,
  Loader2,
  Trash2,
  AlertCircle,
  Plus,
  Check,
  Cloud,
  DollarSign,
} from 'lucide-react';
import { Listing, Category, ListingCondition, ListingStatus } from '../types/marketplace';
import { uploadImageToSupabase, deleteImageFromSupabase } from '../services/storageService';

interface EditListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing | null;
  categories: Category[];
  onSave: (listingId: string, updates: Partial<Listing>) => Promise<void>;
  onShowToast?: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
}

export const EditListingModal: React.FC<EditListingModalProps> = ({
  isOpen,
  onClose,
  listing,
  categories,
  onSave,
  onShowToast,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState<string>('');
  const [condition, setCondition] = useState<ListingCondition>('USED');
  const [status, setStatus] = useState<ListingStatus>('ACTIVE');
  const [images, setImages] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (listing && isOpen) {
      setTitle(listing.title || '');
      setDescription(listing.description || '');
      setCategoryId(listing.category_id || categories[0]?.id || '');
      setPrice(listing.price != null ? String(listing.price) : '');
      setCondition(listing.condition || 'USED');
      setStatus(listing.status || 'ACTIVE');
      setImages(listing.images || []);
      setErrorMsg('');
    }
  }, [listing, isOpen, categories]);

  if (!isOpen || !listing) return null;

  const isWanted = listing.type === 'WANTED';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 5) {
      setErrorMsg('O limite é de até 5 fotos por anúncio.');
      return;
    }

    setIsUploadingPhoto(true);
    setErrorMsg('');

    try {
      const fileList = Array.from(files);
      for (const file of fileList) {
        const res = await uploadImageToSupabase(file, { bucket: 'Img' });
        setImages((prev) => [...prev, res.url]);
      }
      onShowToast?.('Fotos enviadas!', 'As imagens foram salvas no Supabase.', 'success');
    } catch (err: unknown) {
      console.error('Erro no upload da foto:', err);
      setErrorMsg('Falha ao enviar foto para o Supabase Storage.');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = async (indexToRemove: number) => {
    const photoToRemove = images[indexToRemove];
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));

    // Exclui a foto do Supabase Storage
    if (photoToRemove) {
      try {
        await deleteImageFromSupabase(photoToRemove);
      } catch (err) {
        console.warn('Erro ao remover foto do Supabase:', err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Por favor, informe o título do anúncio.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      const numPrice = price.trim() === '' ? null : Number(price.replace(',', '.'));

      await onSave(listing.id, {
        title: title.trim(),
        description: description.trim(),
        category_id: categoryId,
        price: isNaN(numPrice as number) ? null : numPrice,
        condition,
        status,
        images,
      });

      onShowToast?.('Anúncio atualizado!', 'As alterações foram salvas com sucesso.', 'success');
      onClose();
    } catch (err: unknown) {
      console.error('Erro ao salvar anúncio:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao atualizar o anúncio.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs ${
                isWanted ? 'bg-emerald-600' : 'bg-amber-600'
              }`}
            >
              {isWanted ? <Search className="w-5 h-5" /> : <Tag className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 leading-tight">
                Editar Anúncio {isWanted ? '(Quero Comprar)' : '(À Venda)'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Altere informações, fotos, preço ou status do item
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Título */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Título do Anúncio *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Caiaque inflável para corredeiras..."
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-500 text-slate-900 font-medium"
            />
          </div>

          {/* Categoria e Condição */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Categoria
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-500 text-slate-900 font-medium"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Condição
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as ListingCondition)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-500 text-slate-900 font-medium"
              >
                <option value="USED">Usado</option>
                <option value="NEW">Novo / Na Caixa</option>
                <option value="ANY">Qualquer / Tanto faz</option>
              </select>
            </div>
          </div>

          {/* Preço e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {isWanted ? 'Orçamento Máximo (R$)' : 'Preço de Venda (R$)'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0,00 (deixe em branco se a combinar)"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-500 text-slate-900 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Status do Anúncio
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ListingStatus)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-500 text-slate-900 font-medium"
              >
                <option value="ACTIVE">Ativo (Visível na busca)</option>
                <option value="COMPLETED">Concluído / Negociado</option>
                <option value="CANCELLED">Cancelado / Oculto</option>
              </select>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Descrição
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva detalhes, estado de conservação, acessórios inclusos..."
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-500 text-slate-900 font-medium"
            />
          </div>

          {/* Fotos com Supabase Storage Bucket Img */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Fotos ({images.length}/5)
              </label>
              <span className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold">
                <Cloud className="w-3 h-3 text-emerald-600" />
                <span>Salvas no Supabase Storage</span>
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
              {images.map((img, index) => (
                <div
                  key={index}
                  className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group"
                >
                  <img src={img} alt="Foto" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(index)}
                    className="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg opacity-90 group-hover:opacity-100 transition shadow-xs cursor-pointer"
                    title="Remover foto do Supabase"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {images.length < 5 && (
                <button
                  type="button"
                  disabled={isUploadingPhoto}
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/40 text-slate-500 hover:text-emerald-700 flex flex-col items-center justify-center gap-1 transition cursor-pointer disabled:opacity-50"
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span className="text-[10px] font-bold">+ Adicionar</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              multiple
              className="hidden"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploadingPhoto}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
