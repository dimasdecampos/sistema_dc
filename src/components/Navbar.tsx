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
} from 'lucide-react';
import { UserProfile } from '../types/marketplace';

interface NavbarProps {
  currentTab: 'home' | 'wanted' | 'sales' | 'conversations' | 'dashboard';
  onSelectTab: (tab: 'home' | 'wanted' | 'sales' | 'conversations' | 'dashboard') => void;
  user: UserProfile;
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
  matchesCount,
  unreadCount,
  onOpenWantedModal,
  onOpenSaleModal,
  onOpenSqlModal,
  onOpenSupabaseModal,
}) => {
  return (
    <>
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
                    Tem<span className="text-emerald-600">Aqui</span>
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
                    Cidade
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 flex items-center gap-1 font-medium mt-0.5">
                  <MapPin className="w-3 h-3 text-emerald-600" />
                  <span>{user.cidade || 'Socorro - SP'}</span>
                </p>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => onSelectTab('home')}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-2 ${
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
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-2 ${
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
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-2 ${
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
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-2 relative ${
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
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-2 relative ${
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

              {/* User Avatar & Menu */}
              <div
                onClick={() => onSelectTab('dashboard')}
                className="flex items-center gap-2 pl-1 sm:pl-2 cursor-pointer"
                title="Abrir Meu Painel"
              >
                <div className="relative">
                  <img
                    src={user.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                    alt={user.nome}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover border-2 border-slate-200 shadow-2xs hover:border-emerald-500 transition"
                  />
                  {matchesCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-black text-white">
                      {matchesCount}
                    </div>
                  )}
                </div>
              </div>
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
        </div>
      </div>
    </>
  );
};
