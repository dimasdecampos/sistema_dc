import React, { useEffect, useState } from 'react';
import {
  Menu,
  X,
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
} from 'lucide-react';
import { UserProfile, SiteConfig, Category } from '../types/marketplace';
import { Usuario } from '../types/auth';
import { UserProfileMenu } from './UserProfileMenu';
import { CategoryMenu } from './CategoryMenu';
import { isUserAdmin } from '../services/siteConfigService';

interface NavbarProps {
  currentTab: 'home' | 'conversations' | 'dashboard' | 'admin' | 'store';
  onSelectTab: (tab: 'home' | 'conversations' | 'dashboard' | 'admin' | 'store') => void;
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
  onOpenSaleModal: () => void;
  onOpenWantedModal: () => void;
  isAdmin?: boolean;
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  /** Tipo de anúncio do feed da home (barra inferior do celular: Início = venda, Procurar = procuro) */
  feedType: 'WANTED' | 'SALE';
  onSelectFeedType: (type: 'WANTED' | 'SALE') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  user,
  googleUser,
  config,
  isAdmin = false,
  categories,
  selectedCategory,
  onSelectCategory,
  feedType,
  onSelectFeedType,
  onOpenGoogleLogin,
  onLogoutGoogle,
  onUpdateCity,
  onUpdatePhoto,
  isLoggingIn = false,
  matchesCount,
  unreadCount,
  onOpenSaleModal,
  onOpenWantedModal,
}) => {
  const isWantedFeed = currentTab === 'home' && feedType === 'WANTED';
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  const chooseCategory = (id: string) => {
    onSelectCategory(id);
    onSelectTab('home');
    closeMenu();
  };

  // Trava o scroll da página e fecha com Esc enquanto o menu está aberto
  useEffect(() => {
    if (!menuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return (
    <>
      {/* Top Navbar Desktop & Mobile */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-15 sm:h-18 gap-2 sm:gap-3 lg:gap-6">
            {/* Botão hambúrguer (celular) */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
              className="md:hidden -ml-1 p-2 rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition cursor-pointer shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo Brand */}
            <div
              onClick={() => onSelectTab('home')}
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group shrink-0 min-w-0"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-brand-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform shrink-0">
                <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className="font-extrabold text-base sm:text-xl text-slate-900 tracking-tight leading-none truncate">
                    {config?.siteName || 'TemAqui'}
                  </span>
                </div>
                <p className="hidden lg:flex items-center gap-1 mt-0.5 text-[11px] font-medium text-slate-500 truncate">
                  <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-brand-600 shrink-0" />
                  <span className="truncate">{config?.cityName || user.cidade || 'São Luis do Paraitinga - SP'}</span>
                </p>
              </div>
            </div>

            {/* Menu de categorias (desktop); no celular ficam no menu hambúrguer */}
            <div className="hidden md:block">
              <CategoryMenu
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={(id) => {
                  onSelectCategory(id);
                  onSelectTab('home');
                }}
              />
            </div>

            {/* Desktop Navigation Links - Limpo e Organizado */}
            <nav className="hidden md:flex items-center gap-1.5">
              <button
                onClick={() => onSelectTab('home')}
                aria-label="Início"
                title="Início"
                className={`px-3 xl:px-3.5 py-2 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-2 ${
                  currentTab === 'home'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Home className="w-4 h-4" />
                <span className="hidden xl:inline">Início</span>
              </button>

              <button
                onClick={() => onSelectTab('dashboard')}
                aria-label="Meu Painel"
                title="Meu Painel"
                className={`px-3 xl:px-3.5 py-2 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-2 relative ${
                  currentTab === 'dashboard'
                    ? 'bg-brand-600 text-white shadow-xs shadow-brand-600/30'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-brand-50/70'
                }`}
              >
                <User className="w-4 h-4" />
                <span className="hidden xl:inline">Meu Painel</span>
                {matchesCount > 0 && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-extrabold animate-pulse">
                    <Sparkles className="w-3 h-3" />
                    <span>{matchesCount}</span>
                  </span>
                )}
              </button>

              <button
                onClick={() => onSelectTab('conversations')}
                aria-label="Conversas"
                title="Conversas"
                className={`px-3 xl:px-3.5 py-2 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-2 relative ${
                  currentTab === 'conversations'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden xl:inline">Conversas</span>
                {unreadCount > 0 && (
                  <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Botão Admin Direct Access - Visível para administradores autorizados */}
              {(isAdmin || currentTab === 'admin') && (
                <button
                  onClick={() => onSelectTab('admin')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    currentTab === 'admin'
                      ? 'bg-slate-900 text-brand-400 border border-brand-500/30'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title="Acessar painel de administração"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                  <span className="hidden xl:inline">/admin</span>
                </button>
              )}
            </nav>

            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 ml-auto">
              {/* Botão principal: Anunciar (feed de venda) ou Cadastrar busca (feed Procurando) */}
              {isWantedFeed ? (
                <button
                  type="button"
                  onClick={onOpenWantedModal}
                  className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 sm:py-2 bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white font-black text-sm rounded-xl sm:rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer whitespace-nowrap"
                  title="Cadastrar o que você procura"
                  aria-label="Cadastrar busca"
                >
                  <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                  <span>Cadastrar busca</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenSaleModal}
                  className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 sm:py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-sm rounded-xl sm:rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer whitespace-nowrap"
                  title="Publicar anúncio de venda / desapego"
                  aria-label="Anunciar"
                >
                  <Tag className="w-4 h-4 stroke-[2.5]" />
                  <span>Anunciar</span>
                </button>
              )}

              {/* Google Login or UserProfileMenu */}
              {googleUser ? (
                <UserProfileMenu
                  user={googleUser}
                  isAdmin={isUserAdmin(googleUser.email, config)}
                  onLogout={onLogoutGoogle}
                  onUpdateCity={onUpdateCity}
                  onUpdatePhoto={onUpdatePhoto}
                  onNavigateDashboard={() => onSelectTab('dashboard')}
                  onNavigateConversations={() => onSelectTab('conversations')}
                />
              ) : (
                <button
                  type="button"
                  onClick={onOpenGoogleLogin}
                  disabled={isLoggingIn}
                  className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200/90 hover:border-slate-300 rounded-xl shadow-2xs hover:shadow-xs transition cursor-pointer disabled:opacity-60 shrink-0"
                  title="Fazer login com a conta do Google"
                >
                  {isLoggingIn ? (
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-600 animate-spin shrink-0" />
                  ) : (
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24">
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
                  <span className="hidden lg:inline">
                    {isLoggingIn ? 'Entrando...' : 'Entrar com Google'}
                  </span>
                  <span className="lg:hidden">Entrar</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Menu lateral (hambúrguer) - celular */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]"
            onClick={closeMenu}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-label="Menu"
            className="absolute left-0 top-0 bottom-0 w-[82%] max-w-xs bg-white shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-4 h-15 border-b border-slate-200 shrink-0">
              <span className="font-extrabold text-lg text-slate-900 truncate">
                {config?.siteName || 'TemAqui'}
              </span>
              <button
                type="button"
                onClick={closeMenu}
                aria-label="Fechar menu"
                className="p-2 -mr-2 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <p className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Páginas
              </p>
              <div className="flex flex-col gap-0.5">
                {[
                  {
                    label: 'Início',
                    icon: <Home className="w-5 h-5" />,
                    active: currentTab === 'home' && feedType === 'SALE',
                    onClick: () => onSelectFeedType('SALE'),
                  },
                  {
                    label: 'Procurar',
                    icon: <Search className="w-5 h-5" />,
                    active: currentTab === 'home' && feedType === 'WANTED',
                    onClick: () => onSelectFeedType('WANTED'),
                  },
                  {
                    label: 'Meu Painel',
                    icon: <User className="w-5 h-5" />,
                    active: currentTab === 'dashboard',
                    badge: matchesCount,
                    onClick: () => onSelectTab('dashboard'),
                  },
                  {
                    label: 'Conversas',
                    icon: <MessageSquare className="w-5 h-5" />,
                    active: currentTab === 'conversations',
                    badge: unreadCount,
                    onClick: () => onSelectTab('conversations'),
                  },
                  ...(isAdmin || currentTab === 'admin'
                    ? [
                        {
                          label: 'Administração',
                          icon: <ShieldCheck className="w-5 h-5" />,
                          active: currentTab === 'admin',
                          onClick: () => onSelectTab('admin'),
                        },
                      ]
                    : []),
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      item.onClick();
                      closeMenu();
                    }}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition cursor-pointer ${
                      item.active
                        ? 'bg-brand-50 font-semibold text-brand-700'
                        : 'font-medium text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {item.icon}
                    <span className="flex-1">{item.label}</span>
                    {'badge' in item && item.badge ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-black text-white">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>

              <p className="px-2 pt-5 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Categorias
              </p>
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => chooseCategory('all')}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-slate-900 font-semibold text-white'
                      : 'font-medium text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-lg">🛍️</span>
                  Todas as categorias
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => chooseCategory(cat.id)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-brand-50 font-semibold text-brand-700'
                        : 'font-medium text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <span className="truncate">{cat.name}</span>
                  </button>
                ))}
                {categories.length === 0 && (
                  <p className="px-3 py-4 text-center text-xs text-slate-400">
                    Nenhuma categoria cadastrada.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-around">
          <button
            onClick={() => onSelectFeedType('SALE')}
            className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition ${
              currentTab === 'home' && feedType === 'SALE' ? 'text-brand-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Início</span>
          </button>

          <button
            onClick={() => onSelectFeedType('WANTED')}
            className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition ${
              currentTab === 'home' && feedType === 'WANTED' ? 'text-brand-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Search className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Procurar</span>
          </button>

          <button
            onClick={() => onSelectTab('conversations')}
            className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition relative ${
              currentTab === 'conversations' ? 'text-brand-600 font-bold' : 'text-slate-500'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Conversas</span>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('dashboard')}
            className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition relative ${
              currentTab === 'dashboard' ? 'text-brand-600 font-bold' : 'text-slate-500'
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

          {(isAdmin || currentTab === 'admin') && (
            <button
              onClick={() => onSelectTab('admin')}
              className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition ${
                currentTab === 'admin' ? 'text-brand-600 font-bold' : 'text-slate-500'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">Admin</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};
