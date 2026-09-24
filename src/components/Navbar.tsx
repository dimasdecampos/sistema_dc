import React from 'react';
import {
  Home,
  Search,
  Tag,
  MessageSquare,
  User,
  PlusCircle,
  Sparkles,
  MapPin,
  ArrowRightLeft,
  Loader2,
  ShieldCheck,
  BellRing,
} from 'lucide-react';
import { UserProfile, SiteConfig } from '../types/marketplace';
import { Usuario } from '../types/auth';
import { UserProfileMenu } from './UserProfileMenu';

interface NavbarProps {
  currentTab: 'home' | 'wanted' | 'sales' | 'conversations' | 'dashboard' | 'admin';
  onSelectTab: (tab: 'home' | 'wanted' | 'sales' | 'conversations' | 'dashboard' | 'admin') => void;
  user: UserProfile;
  googleUser: Usuario | null;
  config?: SiteConfig;
  onOpenGoogleLogin: () => void;
  onLogoutGoogle: () => void;
  onUpdateCity?: (city: string) => Promise<void>;
  onUpdatePhoto?: (photo: string) => Promise<void>;
  isLoggingIn?: boolean;
  matchesCount: number;
  unreadCount: number;
  onOpenWantedModal: () => void;
  onOpenSaleModal: () => void;
  onOpenSqlModal: () => void;
  onOpenSupabaseModal: () => void;
  onSwitchUser?: (userKey: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  user,
  googleUser,
  config,
  onOpenGoogleLogin,
  onLogoutGoogle,
  onUpdateCity,
  onUpdatePhoto,
  isLoggingIn = false,
  matchesCount,
  unreadCount,
  onOpenWantedModal,
  onOpenSaleModal,
  onOpenSqlModal,
  onOpenSupabaseModal,
}) => {
  return (
    <>
      {/* Aviso do Topo (Configurável no Admin) */}
      {config?.noticeBannerEnabled && config.noticeBannerText && (
        <div
          className={`py-1.5 px-4 text-center text-xs font-semibold flex items-center justify-center gap-2 ${
            config.noticeBannerType === 'warning'
              ? 'bg-amber-500 text-slate-950'
              : config.noticeBannerType === 'info'
              ? 'bg-blue-600 text-white'
              : 'bg-emerald-700 text-white'
          }`}
        >
          <BellRing className="w-3.5 h-3.5 shrink-0" />
          <span>{config.noticeBannerText}</span>
        </div>
      )}

      {/* Top Navbar Desktop & Mobile */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18 gap-3 sm:gap-6">
            {/* Logo Brand */}
            <div
              onClick={() => onSelectTab('home')}
              className="flex items-center gap-2.5 cursor-pointer group shrink-0"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
                <ArrowRightLeft className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xl text-slate-900 tracking-tight leading-none">
                    {config?.siteName || 'TemAqui'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
                    Cidade
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 flex items-center gap-1 font-medium mt-0.5">
                  <MapPin className="w-3 h-3 text-emerald-600" />
                  <span>{config?.cityName || user.cidade || 'Socorro - SP'}</span>
                </p>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => onSelectTab('home')}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  currentTab === 'home'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Início</span>
              </button>

              <button
                onClick={() => onSelectTab('wanted')}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  currentTab === 'wanted'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Search className="w-4 h-4 text-emerald-600" />
                <span>Quem Procura</span>
              </button>

              <button
                onClick={() => onSelectTab('sales')}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  currentTab === 'sales'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Tag className="w-4 h-4 text-amber-600" />
                <span>À Venda</span>
              </button>

              <button
                onClick={() => onSelectTab('conversations')}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 relative ${
                  currentTab === 'conversations'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Conversas</span>
                {unreadCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => onSelectTab('dashboard')}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 relative ${
                  currentTab === 'dashboard'
                    ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-emerald-50/60'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Meu Painel</span>
                {matchesCount > 0 && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-extrabold animate-pulse">
                    <Sparkles className="w-3 h-3" />
                    <span>{matchesCount}</span>
                  </span>
                )}
              </button>

              {/* Botão Admin Direct Access */}
              <button
                onClick={() => onSelectTab('admin')}
                className={`px-2.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  currentTab === 'admin'
                    ? 'bg-slate-900 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Acessar painel de administração"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>/admin</span>
              </button>
            </nav>

            {/* Top Action Buttons: Estou Procurando & Quero Vender */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Botão Estou Procurando (Destaque Principal) */}
              <button
                onClick={onOpenWantedModal}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-xs shadow-emerald-600/20 transition cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <Search className="w-4 h-4" />
                <span>Estou procurando</span>
              </button>

              {/* Botão Quero Vender */}
              <button
                onClick={onOpenSaleModal}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-800 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 rounded-xl transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-amber-600" />
                <span className="hidden sm:inline">Quero vender</span>
                <span className="sm:hidden">Vender</span>
              </button>

              {/* Google Login or UserProfileMenu */}
              {googleUser ? (
                <UserProfileMenu
                  user={googleUser}
                  onLogout={onLogoutGoogle}
                  onUpdateCity={onUpdateCity}
                  onUpdatePhoto={onUpdatePhoto}
                  onNavigateDashboard={() => onSelectTab('dashboard')}
                />
              ) : (
                <button
                  type="button"
                  onClick={onOpenGoogleLogin}
                  disabled={isLoggingIn}
                  className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200/90 hover:border-slate-300 rounded-xl shadow-2xs hover:shadow-xs transition cursor-pointer disabled:opacity-60"
                  title="Fazer login com a conta do Google"
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
                  <span className="hidden sm:inline">
                    {isLoggingIn ? 'Entrando...' : 'Entrar com Google'}
                  </span>
                  <span className="sm:hidden">Google</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg px-2 py-1.5">
        <div className="flex items-center justify-around">
          <button
            onClick={() => onSelectTab('home')}
            className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition ${
              currentTab === 'home' ? 'text-emerald-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Início</span>
          </button>

          <button
            onClick={() => onSelectTab('wanted')}
            className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition ${
              currentTab === 'wanted' ? 'text-emerald-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Search className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Procuras</span>
          </button>

          <button
            onClick={onOpenWantedModal}
            className="flex flex-col items-center -mt-4 bg-emerald-600 text-white p-2.5 rounded-2xl shadow-md shadow-emerald-600/30"
          >
            <PlusCircle className="w-6 h-6 stroke-[2.5]" />
          </button>

          <button
            onClick={() => onSelectTab('conversations')}
            className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition relative ${
              currentTab === 'conversations' ? 'text-emerald-600 font-bold' : 'text-slate-500'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Conversas</span>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-emerald-600" />
            )}
          </button>

          <button
            onClick={() => onSelectTab('dashboard')}
            className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition relative ${
              currentTab === 'dashboard' ? 'text-emerald-600 font-bold' : 'text-slate-500'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Painel</span>
            {matchesCount > 0 && (
              <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">
                {matchesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('admin')}
            className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition ${
              currentTab === 'admin' ? 'text-emerald-600 font-bold' : 'text-slate-500'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Admin</span>
          </button>
        </div>
      </div>
    </>
  );
};
