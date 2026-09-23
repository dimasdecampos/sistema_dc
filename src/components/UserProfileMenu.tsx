import React, { useState, useRef, useEffect } from 'react';
import {
  LogOut,
  MapPin,
  Mail,
  ShieldCheck,
  ChevronDown,
  User,
  Database,
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

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button: Modern User Pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1 sm:pr-3 rounded-full bg-white border border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs transition cursor-pointer group"
      >
        {user.foto ? (
          <img
            src={user.foto}
            alt={user.nome}
            className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
            {user.nome.charAt(0).toUpperCase()}
          </div>
        )}
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
            {user.foto ? (
              <img
                src={user.foto}
                alt={user.nome}
                className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0 shadow-2xs"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                {user.nome.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-slate-900 truncate">
                {user.nome}
              </h4>
              <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{user.email}</span>
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
              <span>Sessão sincronizada no banco Supabase</span>
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
