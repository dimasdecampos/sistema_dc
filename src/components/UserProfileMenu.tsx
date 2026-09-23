import React, { useState, useRef, useEffect } from 'react';
import {
  LogOut,
  MapPin,
  Mail,
  ShieldCheck,
  ChevronDown,
  User,
  Database,
  Camera,
} from 'lucide-react';
import { Usuario } from '../types/auth';

interface UserProfileMenuProps {
  user: Usuario;
  onLogout: () => void;
  onUpdateCity?: (newCity: string) => Promise<void>;
  isSupabaseSynced?: boolean;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  user,
  onLogout,
  onUpdateCity,
  isSupabaseSynced = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingCity, setIsEditingCity] = useState(false);
  const [cityInput, setCityInput] = useState(user.cidade || '');
  const [imgError, setImgError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsEditingCity(false);
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

  const photoUrl = user.foto && !imgError ? user.foto : null;

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button: Modern User Pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1 sm:pr-3 rounded-full bg-white border border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs transition cursor-pointer group"
      >
        <div className="relative">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={user.nome}
              onError={() => setImgError(true)}
              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
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
          className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* User Header */}
          <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-center gap-3">
            <div className="relative shrink-0">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={user.nome}
                  onError={() => setImgError(true)}
                  className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-2xs"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                  {user.nome.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-xs border border-slate-100">
                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.28-2.09 3.66-5.17 3.66-9.12z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.36 7.33 24 12 24z" />
                  <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.24C.45 8.14 0 9.99 0 12s.45 3.86 1.24 5.43l4.04-3.14z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.57l4.04 3.14c.95-2.83 3.6-4.96 6.72-4.96z" />
                </svg>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-slate-900 truncate">
                {user.nome}
              </h4>
              <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{user.email}</span>
              </p>
              <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                <span>Foto Oficial do Google</span>
              </p>
            </div>
          </div>

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
                    className="px-2 py-1 bg-emerald-600 text-white text-[11px] font-semibold rounded-lg hover:bg-emerald-700"
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
              <span>Sessão & foto salvas no Supabase</span>
            </div>
          </div>

          {/* Actions */}
          <div className="p-2 border-t border-slate-100 bg-slate-50/30">
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
