import React, { useState, useRef, useEffect } from 'react';
import {
  LogOut,
  MapPin,
  Mail,
  ChevronDown,
  Database,
  Camera,
  Upload,
  Link,
  Check,
  Sparkles,
  LayoutDashboard,
  Loader2,
  Cloud,
} from 'lucide-react';
import { Usuario } from '../types/auth';
import { uploadImageToSupabase } from '../services/storageService';

interface UserProfileMenuProps {
  user: Usuario;
  onLogout: () => void;
  onUpdateCity?: (newCity: string) => Promise<void>;
  onUpdatePhoto?: (newPhoto: string) => Promise<void>;
  onNavigateDashboard?: () => void;
  isSupabaseSynced?: boolean;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  user,
  onLogout,
  onUpdateCity,
  onUpdatePhoto,
  onNavigateDashboard,
  isSupabaseSynced = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingCity, setIsEditingCity] = useState(false);
  const [cityInput, setCityInput] = useState(user.cidade || '');
  const [isChangingPhoto, setIsChangingPhoto] = useState(false);
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [imgError, setImgError] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsEditingCity(false);
        setIsChangingPhoto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateCity) {
      await onUpdateCity(cityInput);
    }
    setIsEditingCity(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setImgError(false);
    try {
      // Upload para bucket 'img' na pasta 'img'
      const res = await uploadImageToSupabase(file, { folder: 'img' });
      if (onUpdatePhoto) {
        await onUpdatePhoto(res.url);
      }
      setIsChangingPhoto(false);
    } catch (err) {
      console.error('Erro no upload da foto de perfil:', err);
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSavePhotoUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUrlInput.trim()) return;
    setImgError(false);
    if (onUpdatePhoto) {
      await onUpdatePhoto(photoUrlInput.trim());
    }
    setPhotoUrlInput('');
    setIsChangingPhoto(false);
  };

  const photoUrl = user.foto && !imgError ? user.foto : null;

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button: Modern User Pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 sm:gap-2.5 p-0.5 sm:p-1 sm:pr-3 rounded-full bg-white border border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs transition cursor-pointer group shrink-0"
      >
        <div className="relative shrink-0">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={user.nome}
              onError={() => setImgError(true)}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {user.nome.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center shadow-2xs border border-slate-100">
            <svg className="w-2 h-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.28-2.09 3.66-5.17 3.66-9.12z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.36 7.33 24 12 24z" />
              <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.24C.45 8.14 0 9.99 0 12s.45 3.86 1.24 5.43l4.04-3.14z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.57l4.04 3.14c.95-2.83 3.6-4.96 6.72-4.96z" />
            </svg>
          </div>
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-xs font-semibold text-slate-800 leading-tight group-hover:text-emerald-700 transition">
            {user.nome}
          </p>
          <p className="text-[10px] text-slate-400 leading-none truncate max-w-[110px]">
            {user.email}
          </p>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform hidden xs:block ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-24px)] max-w-xs sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* User Header */}
          <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-start gap-3">
            <div className="relative shrink-0 group/photo">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={user.nome}
                  onError={() => setImgError(true)}
                  className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-xs"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">
                  {user.nome.charAt(0).toUpperCase()}
                </div>
              )}
              {/* Camera overlay button to change photo */}
              <button
                type="button"
                onClick={() => setIsChangingPhoto(!isChangingPhoto)}
                className="absolute inset-0 bg-slate-900/60 rounded-2xl opacity-0 group-hover/photo:opacity-100 flex items-center justify-center text-white transition cursor-pointer"
                title="Alterar foto oficial"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-slate-900 truncate">
                {user.nome}
              </h4>
              <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{user.email}</span>
              </p>
              <button
                type="button"
                onClick={() => setIsChangingPhoto(!isChangingPhoto)}
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 transition cursor-pointer"
              >
                <Camera className="w-3 h-3" />
                <span>Atualizar Foto Oficial</span>
              </button>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />

          {/* Change Photo Accordion Section */}
          {isChangingPhoto && (
            <div className="p-3.5 bg-emerald-50/50 border-b border-emerald-100/70 space-y-2.5 animate-in fade-in duration-150">
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Foto Oficial do Google</span>
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isUploadingPhoto}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer disabled:opacity-50"
                >
                  {isUploadingPhoto ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                      <span>Enviando para Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Carregar foto (Bucket: img/)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Paste URL */}
              <form onSubmit={handleSavePhotoUrl} className="flex gap-1.5">
                <div className="relative flex-1">
                  <Link className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={photoUrlInput}
                    onChange={(e) => setPhotoUrlInput(e.target.value)}
                    placeholder="Ou cole o link da foto do Google..."
                    className="w-full pl-7 pr-2 py-1 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!photoUrlInput.trim()}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition cursor-pointer"
                >
                  Salvar
                </button>
              </form>
            </div>
          )}

          {/* Details */}
          <div className="p-4 space-y-3 text-xs">
            {/* Cidade info / editable */}
            <div>
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Cidade</span>
                </span>
                {!isEditingCity && (
                  <button
                    onClick={() => setIsEditingCity(true)}
                    className="text-[11px] text-emerald-700 hover:underline font-semibold cursor-pointer"
                  >
                    Alterar
                  </button>
                )}
              </div>

              {isEditingCity ? (
                <form onSubmit={handleSaveCity} className="flex items-center gap-1 mt-1">
                  <input
                    type="text"
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
                    placeholder="Cidade..."
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 bg-emerald-600 text-white text-[11px] font-semibold rounded-lg hover:bg-emerald-700 cursor-pointer"
                  >
                    Salvar
                  </button>
                </form>
              ) : (
                <p className="text-slate-800 font-medium pl-5">
                  {user.cidade || 'Não informada'}
                </p>
              )}
            </div>

            {/* Supabase sync badge */}
            <div className="p-2.5 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center gap-2 text-[11px] text-emerald-900">
              <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Foto e dados salvos na tabela usuarios</span>
            </div>
          </div>

          {/* Actions */}
          <div className="p-2 border-t border-slate-100 bg-slate-50/30 space-y-1">
            {onNavigateDashboard && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onNavigateDashboard();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                <span>Abrir Meu Painel (Anúncios & Matches)</span>
              </button>
            )}
            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>Sair da conta Google</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
