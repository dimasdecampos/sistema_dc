import React, { useState, useRef } from 'react';
import {
  X,
  Tag,
  Camera,
  Upload,
  Sparkles,
  Loader2,
  DollarSign,
  Plus,
  Cloud,
  CheckCircle2,
} from 'lucide-react';
import { CreateSaleInput } from '../types/marketplace';
import { getStoredCategories } from '../services/categoryService';
import {
  uploadImageToSupabase,
  MAX_PHOTOS_PER_PRODUCT,
} from '../services/storageService';

interface CreateSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateSaleInput) => Promise<void>;
}

export const CreateSaleModal: React.FC<CreateSaleModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('cat-ferramentas');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<'USED' | 'NEW'>('USED');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [photoWarning, setPhotoWarning] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = MAX_PHOTOS_PER_PRODUCT - photos.length;
    if (remainingSlots <= 0) {
      setPhotoWarning(`Limite máximo de ${MAX_PHOTOS_PER_PRODUCT} fotos por produto já foi atingido.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const fileList = Array.from(files);
    let filesToProcess = fileList;

    if (fileList.length > remainingSlots) {
      setPhotoWarning(
        `Você selecionou ${fileList.length} fotos. Como o limite é de ${MAX_PHOTOS_PER_PRODUCT} por produto, apenas as ${remainingSlots} primeira(s) foram adicionadas.`
      );
      filesToProcess = fileList.slice(0, remainingSlots);
    } else {
      setPhotoWarning(null);
    }

    setIsUploadingPhotos(true);
    setUploadProgress({ current: 0, total: filesToProcess.length });

    const newUrls: string[] = [];
    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      try {
        // Redimensiona para max 1200px e comprime para WebP (economia de 90%+ no Supabase)
        const res = await uploadImageToSupabase(file, {
          folder: 'img',
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.82,
        });
        newUrls.push(res.url);
      } catch (err) {
        console.error('Falha no upload da foto:', err);
      }
      setUploadProgress({ current: i + 1, total: filesToProcess.length });
    }

    setPhotos((prev) => [...prev, ...newUrls].slice(0, MAX_PHOTOS_PER_PRODUCT));
    setIsUploadingPhotos(false);
    setUploadProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoWarning(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !price) return;

    setIsLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        category_id: categoryId,
        price: parseFloat(price.replace(',', '.')),
        condition,
        images: photos.length > 0 ? photos.slice(0, MAX_PHOTOS_PER_PRODUCT) : undefined,
      });

      // Reset
      setTitle('');
      setDescription('');
      setPrice('');
      setPhotos([]);
      setPhotoWarning(null);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-white to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-sm shadow-amber-500/30">
              <Tag className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg sm:text-xl text-slate-900 leading-tight">
                Anunciar produto para venda
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Coloque à venda para os moradores da sua cidade
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
          multiple
          className="hidden"
        />

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Título */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Título do anúncio <span className="text-amber-600">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Martelo Tramontina usado, em bom estado"
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 font-medium transition"
              autoFocus
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Descrição do produto <span className="text-amber-600">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva detalhes, estado de conservação, funcionamento e como pode ser retirado..."
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 font-medium resize-none transition"
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
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-hidden focus:border-amber-500 text-slate-900 font-medium transition cursor-pointer"
            >
              {getStoredCategories().map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Preço & Condição */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Preço */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Preço <span className="text-amber-600">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="30.00"
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-hidden focus:border-amber-500 text-slate-900 font-bold"
                />
              </div>
            </div>

            {/* Condição */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Condição
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setCondition('USED')}
                  className={`py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                    condition === 'USED'
                      ? 'bg-white text-slate-900 shadow-xs'
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
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Novo
                </button>
              </div>
            </div>
          </div>

          {/* Fotos */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span>Fotos do produto</span>
                <span className="text-[11px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                  {photos.length}/{MAX_PHOTOS_PER_PRODUCT}
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                  <Cloud className="w-3 h-3" />
                  <span>Bucket: img/</span>
                </span>
              </label>

              {photos.length < MAX_PHOTOS_PER_PRODUCT ? (
                <button
                  type="button"
                  disabled={isUploadingPhotos}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-800 font-semibold cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>+ Adicionar ({MAX_PHOTOS_PER_PRODUCT - photos.length} restante{MAX_PHOTOS_PER_PRODUCT - photos.length > 1 ? 's' : ''})</span>
                </button>
              ) : (
                <span className="text-[11px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-lg">
                  Limite de 5 fotos atingido
                </span>
              )}
            </div>

            {/* Banner de Aviso de Limite */}
            {photoWarning && (
              <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start justify-between gap-2">
                <span>{photoWarning}</span>
                <button
                  type="button"
                  onClick={() => setPhotoWarning(null)}
                  className="text-amber-700 hover:text-amber-900 font-bold text-xs shrink-0 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Upload Progress Banner */}
            {isUploadingPhotos && uploadProgress && (
              <div className="mb-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 animate-in fade-in">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
                <span>
                  Otimizando (WebP/1200px) e enviando para o Supabase (pasta <strong>img/</strong>): foto {uploadProgress.current} de {uploadProgress.total}...
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {photos.map((p, idx) => (
                <div
                  key={idx}
                  className="relative w-20 h-20 rounded-2xl overflow-hidden border border-slate-200 shadow-2xs group"
                >
                  <img src={p} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                  {/* Badge se salvo no Supabase / Otimizado */}
                  <span
                    title="Foto otimizada e salva na pasta img/ do bucket img no Supabase"
                    className="absolute bottom-1 left-1 bg-emerald-600/90 backdrop-blur-xs text-white px-1 py-0.5 rounded-md text-[8px] font-bold shadow-xs flex items-center gap-0.5"
                  >
                    <Cloud className="w-2.5 h-2.5" />
                    <span>WebP</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-slate-900/80 text-white hover:bg-slate-900 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {photos.length < MAX_PHOTOS_PER_PRODUCT && (
                <button
                  type="button"
                  disabled={isUploadingPhotos}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 hover:border-amber-400 bg-slate-50 hover:bg-amber-50/50 flex flex-col items-center justify-center text-slate-400 hover:text-amber-700 transition cursor-pointer disabled:opacity-50"
                >
                  {isUploadingPhotos ? (
                    <Loader2 className="w-5 h-5 animate-spin text-amber-600 mb-1" />
                  ) : (
                    <Camera className="w-5 h-5 mb-1" />
                  )}
                  <span className="text-[10px] font-semibold">
                    {isUploadingPhotos ? 'Enviando...' : `Foto ${photos.length + 1}/5`}
                  </span>
                </button>
              )}
            </div>

            <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>Fotos são redimensionadas automaticamente (máx 1200px / WebP) para não consumir espaço desnecessário no Supabase.</span>
            </p>
          </div>

          {/* Botão de envio */}
          <button
            type="submit"
            disabled={isLoading || !title.trim() || !price}
            className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-sm font-bold rounded-2xl shadow-md shadow-slate-900/20 flex items-center justify-center gap-2 transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publicando anúncio...</span>
              </>
            ) : (
              <>
                <Tag className="w-4 h-4 text-amber-400" />
                <span>Publicar anúncio</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
