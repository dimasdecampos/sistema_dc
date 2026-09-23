import React from 'react';
import { Users, Plus, Loader2 } from 'lucide-react';
import { Usuario } from '../types/auth';
import { UserProfileMenu } from './UserProfileMenu';

interface HeaderProps {
  user: Usuario | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onUpdateCity?: (city: string) => Promise<void>;
  onUpdatePhoto?: (photo: string) => Promise<void>;
  onOpenNewCliente: () => void;
  isLoggingIn?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onOpenLogin,
  onLogout,
  onUpdateCity,
  onUpdatePhoto,
  onOpenNewCliente,
  isLoggingIn = false,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          {/* Logo, Title & Subtitle */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-lg sm:text-xl text-slate-900 tracking-tight leading-none truncate">
                Clientes
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block mt-1 truncate">
                Cadastro e gestão de clientes com PostgreSQL
              </p>
            </div>
          </div>

          {/* Right Area: Modern Official Google Login Button & Novo Cliente Button */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {user ? (
              <UserProfileMenu
                user={user}
                onLogout={onLogout}
                onUpdateCity={onUpdateCity}
                onUpdatePhoto={onUpdatePhoto}
              />
            ) : (
              /* Botão Oficial de Login do Google */
              <button
                onClick={onOpenLogin}
                disabled={isLoggingIn}
                className="inline-flex items-center gap-2.5 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200/90 hover:border-slate-300 rounded-xl shadow-2xs hover:shadow-xs transition cursor-pointer disabled:opacity-60"
                title="Fazer login automático com sua conta do Google"
              >
                {isLoggingIn ? (
                  <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.28-2.09 3.66-5.17 3.66-9.12z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.24C.45 8.14 0 9.99 0 12s.45 3.86 1.24 5.43l4.04-3.14z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.57l4.04 3.14c.95-2.83 3.6-4.96 6.72-4.96z"
                    />
                  </svg>
                )}
                <span className="hidden xs:inline">
                  {isLoggingIn ? 'Entrando...' : 'Entrar com o Google'}
                </span>
                <span className="xs:hidden">Google</span>
              </button>
            )}

            {/* Botão Adicionar Cliente */}
            <button
              onClick={onOpenNewCliente}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs shadow-emerald-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden xs:inline">Novo Cliente</span>
              <span className="xs:hidden">Adicionar</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
