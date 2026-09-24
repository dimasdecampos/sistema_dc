import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Tag,
  Sparkles,
  ArrowRight,
  PlusCircle,
  Database,
  Code2,
  RefreshCw,
  Heart,
  MessageSquare,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  SlidersHorizontal,
  ArrowUpDown,
  Github,
} from 'lucide-react';
import {
  Category,
  Listing,
  Match,
  Conversation,
  UserProfile,
  CreateWantedInput,
  CreateSaleInput,
  SiteConfig,
} from './types/marketplace';
import { SAMPLE_USERS } from './data/sampleMarketplaceData';
import {
  fetchListings,
  createWantedListing,
  createSaleListing,
  getUserMatches,
  updateListingStatus,
  deleteListing,
  startOrGetConversation,
} from './services/marketplaceService';
import {
  getStoredUser,
  syncUserWithSupabase,
  loginWithGoogleData,
  updateCurrentUserProfile,
  logoutUser,
  getOfficialGooglePhoto,
} from './services/authService';
import {
  signInWithGoogle,
  signInWithGooglePopup,
  signInWithGoogleDirect,
  logoutGoogle,
  initGoogleAuth,
  initGoogleIdentityServices,
} from './services/googleAuth';
import { Usuario } from './types/auth';
import { GoogleLoginModal } from './components/GoogleLoginModal';
import { GithubModal } from './components/GithubModal';
import { Navbar } from './components/Navbar';
import { HomeHero } from './components/HomeHero';
import { ListingsFeed } from './components/ListingsFeed';
import { UserDashboard } from './components/UserDashboard';
import { ConversationsView } from './components/ConversationsView';
import { CreateWantedModal } from './components/CreateWantedModal';
import { CreateSaleModal } from './components/CreateSaleModal';
import { ListingDetailModal } from './components/ListingDetailModal';
import { SqlSchemaModal } from './components/SqlSchemaModal';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { ListingCard } from './components/ListingCard';
import { getBuyersInterestedInSale } from './services/matchingService';
import { getSiteConfig, saveSiteConfig, resetSiteConfig } from './services/siteConfigService';
import {
  getStoredCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  moveListingToCategory,
} from './services/categoryService';
import { computeWantedRanking } from './services/rankingService';
import { MostWantedRanking } from './components/MostWantedRanking';
import { AdminPanel } from './components/AdminPanel';

export default function App() {
  // Google Auth User
  const [googleUser, setGoogleUser] = useState<Usuario | null>(() => getStoredUser());
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Current active user (defaults to stored Google user, or Dimas from prompt specification)
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const stored = getStoredUser();
    if (stored) {
      return {
        id: stored.id || stored.google_id || 'user-dimas',
        nome: stored.nome,
        email: stored.email,
        avatar_url: stored.foto || getOfficialGooglePhoto(stored.email),
        cidade: stored.cidade || 'Socorro - SP',
        created_at: stored.created_at || new Date().toISOString(),
      };
    }
    return SAMPLE_USERS.dimas;
  });

  // Site Configuration & Categories
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(() => getSiteConfig());
  const [categories, setCategories] = useState<Category[]>(() => getStoredCategories());

  // Home Page Product Category & Sort State
  const [homeCategory, setHomeCategory] = useState<string>('all');
  const [homeSort, setHomeSort] = useState<'recent' | 'price-asc' | 'price-desc'>('recent');

  // Ranking Category Filter
  const [rankingCategory, setRankingCategory] = useState<string>('all');

  // Navigation tab
  const [currentTab, setCurrentTab] = useState<
    'home' | 'wanted' | 'sales' | 'conversations' | 'dashboard' | 'admin'
  >(() => (typeof window !== 'undefined' && window.location.hash === '#admin' ? 'admin' : 'home'));

  // Listen for hash changes for /#admin
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#admin') {
        setCurrentTab('admin');
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleSelectTab = (
    tab: 'home' | 'wanted' | 'sales' | 'conversations' | 'dashboard' | 'admin'
  ) => {
    setCurrentTab(tab);
    if (tab === 'admin') {
      window.location.hash = 'admin';
    } else if (window.location.hash === '#admin') {
      history.pushState(null, '', window.location.pathname);
    }
  };

  // Listings & Matches State
  const [listings, setListings] = useState<Listing[]>([]);
  const [userMatches, setUserMatches] = useState<Match[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  // Filters for feed
  const [feedTypeFilter, setFeedTypeFilter] = useState<'ALL' | 'WANTED' | 'SALE'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isWantedModalOpen, setIsWantedModalOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Selected item for detail view
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [initialWantedQuery, setInitialWantedQuery] = useState('');

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (title: string, message?: string, type: 'success' | 'error' | 'info' = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      setToasts((prev) => [...prev, { id, title, message, type }]);
    },
    []
  );

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Helper para sincronizar usuário Google com o perfil do marketplace
  const handleUserAuthenticated = useCallback((u: Usuario) => {
    setGoogleUser(u);
    const photo = u.foto || getOfficialGooglePhoto(u.email);
    const mapped: UserProfile = {
      id: u.id || u.google_id || 'user-google',
      nome: u.nome,
      email: u.email,
      avatar_url: photo,
      cidade: u.cidade || 'Socorro - SP',
      created_at: u.created_at || new Date().toISOString(),
    };
    setCurrentUser(mapped);
  }, []);

  // Login Direto com Google (100% compatível com Vercel)
  const handleOfficialGoogleSignIn = async (email?: string) => {
    setIsLoggingIn(true);
    try {
      const u = await signInWithGoogleDirect(email);
      handleUserAuthenticated(u);
      showToast(
        `Olá, ${u.nome}!`,
        'Login com Google realizado com sucesso. Conta e perfil sincronizados!',
        'success'
      );
    } catch (err: unknown) {
      console.warn('Erro ao conectar com Google:', err);
      throw err;
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Tentativa de Login com Popup Nativo Google OAuth
  const handlePopupGoogleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const u = await signInWithGooglePopup();
      handleUserAuthenticated(u);
      showToast(
        `Olá, ${u.nome}!`,
        'Login com Popup oficial do Google realizado com sucesso!',
        'success'
      );
    } catch (err: unknown) {
      console.warn('Erro no popup do Google:', err);
      throw err;
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Login Manual / Direto com perfil Google
  const handleLoginManual = async (data: {
    nome: string;
    email: string;
    foto?: string;
    cidade?: string;
  }) => {
    setIsLoggingIn(true);
    try {
      const res = await loginWithGoogleData(data);
      handleUserAuthenticated(res.user);
      showToast(
        `Olá, ${res.user.nome}!`,
        'Conta Google conectada com sucesso. Foto oficial vinculada.',
        'success'
      );
    } catch (err: unknown) {
      showToast('Erro ao conectar conta', String(err), 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout Google
  const handleLogoutGoogle = async () => {
    await logoutGoogle();
    await logoutUser();
    setGoogleUser(null);
    setCurrentUser(SAMPLE_USERS.dimas);
    showToast('Sessão encerrada', 'Você saiu da sua conta do Google.', 'info');
  };

  // Atualização de cidade
  const handleUpdateCity = async (newCity: string) => {
    if (!newCity.trim()) return;
    try {
      const updated = await updateCurrentUserProfile({ cidade: newCity.trim() });
      setGoogleUser(updated);
      setCurrentUser((prev) => ({ ...prev, cidade: newCity.trim() }));
      showToast('Cidade atualizada', `Sua cidade foi alterada para ${newCity.trim()}`, 'success');
    } catch (e) {
      showToast('Erro ao atualizar cidade', String(e), 'error');
    }
  };

  // Atualização de foto oficial
  const handleUpdatePhoto = async (newPhoto: string) => {
    if (!newPhoto.trim()) return;
    try {
      const updated = await updateCurrentUserProfile({ foto: newPhoto.trim() });
      setGoogleUser(updated);
      setCurrentUser((prev) => ({ ...prev, avatar_url: newPhoto.trim() }));
      showToast('Foto atualizada', 'Sua foto de perfil foi atualizada com sucesso.', 'success');
    } catch (e) {
      showToast('Erro ao atualizar foto', String(e), 'error');
    }
  };

  // Carrega anúncios e matches
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchListings();
      setListings(res.listings);

      const matches = await getUserMatches(currentUser.id);
      setUserMatches(matches);
    } catch (e) {
      console.warn('Erro ao carregar anúncios:', e);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    loadData();

    // Inicializa Google Identity Services (GSI - One Tap e Auto-Select no Chrome Mobile)
    const cleanupGsi = initGoogleIdentityServices((gsiUser) => {
      handleUserAuthenticated(gsiUser);
      showToast(
        `Olá, ${gsiUser.nome}!`,
        'Login automático com sua conta Google realizado no Chrome.',
        'success'
      );
    });

    // Listener de login Google oficial
    const unsubGoogle = initGoogleAuth((gUser) => {
      if (gUser) {
        handleUserAuthenticated(gUser);
      }
    });

    return () => {
      cleanupGsi();
      unsubGoogle();
    };
  }, [loadData, handleUserAuthenticated, showToast]);

  // Abertura com pesquisa vinda do Hero da Home
  const handleSearchOrStartWanted = (queryText: string) => {
    setInitialWantedQuery(queryText);
    setIsWantedModalOpen(true);
  };

  // Envio do formulário de Procura (WANTED)
  const handleCreateWanted = async (input: CreateWantedInput) => {
    try {
      const result = await createWantedListing(input, currentUser);
      showToast(
        'Procura publicada com sucesso!',
        'Sua intenção de compra está registrada para toda a cidade.',
        'success'
      );

      await loadData();

      // Se encontrou matches imediatos, alerta o usuário!
      if (result.newMatches.length > 0) {
        setTimeout(() => {
          showToast(
            `🎉 Encontramos ${result.newMatches.length} oferta(s) compatível(is)!`,
            'Acesse o seu painel na aba "Encontramos para você" para ver e conversar.',
            'info'
          );
        }, 800);
      }
    } catch (e) {
      showToast('Erro ao publicar procura', String(e), 'error');
    }
  };

  // Envio do formulário de Venda (SALE)
  const handleCreateSale = async (input: CreateSaleInput) => {
    try {
      const result = await createSaleListing(input, currentUser);
      showToast(
        'Anúncio publicado com sucesso!',
        'Seu item já está visível para os moradores da cidade.',
        'success'
      );

      await loadData();

      // Se há pessoas procurando por isso
      if (result.newMatches.length > 0) {
        setTimeout(() => {
          showToast(
            `🔔 Notícia excelente!`,
            `Existem ${result.newMatches.length} morador(es) procurando exatamente por este produto na cidade!`,
            'info'
          );
        }, 800);
      }
    } catch (e) {
      showToast('Erro ao publicar anúncio', String(e), 'error');
    }
  };

  // Iniciar conversa direta sobre um anúncio
  const handleStartChat = async (listing: Listing) => {
    try {
      const initialText =
        listing.type === 'WANTED'
          ? `Olá ${listing.user?.nome || 'vizinho'}! Vi que você está procurando "${listing.title}". Eu tenho algo que pode te interessar!`
          : `Olá ${listing.user?.nome || 'vizinho'}! Tenho interesse no seu anúncio "${listing.title}". Ainda está disponível?`;

      const { conversation } = await startOrGetConversation(
        listing,
        currentUser,
        initialText
      );

      setConversations((prev) => {
        const exists = prev.some((c) => c.id === conversation.id);
        return exists ? prev : [conversation, ...prev];
      });

      setActiveConvId(conversation.id);
      setCurrentTab('conversations');

      showToast(
        'Conversa iniciada!',
        `Você já pode combinar os detalhes com ${listing.user?.nome || 'o morador'}.`,
        'success'
      );
    } catch (e) {
      showToast('Erro ao abrir conversa', String(e), 'error');
    }
  };

  // Ver detalhes
  const handleViewListing = (listing: Listing) => {
    setSelectedListing(listing);
    setIsDetailModalOpen(true);
  };

  // Admin Operations
  const handleSaveConfig = (newCfg: SiteConfig) => {
    saveSiteConfig(newCfg);
    setSiteConfig(newCfg);
    showToast('Configurações salvas!', 'Os ajustes do site foram atualizados com sucesso.', 'success');
  };

  const handleResetConfig = () => {
    const def = resetSiteConfig();
    setSiteConfig(def);
    showToast('Configurações restauradas', 'Os parâmetros padrão do site foram redefinidos.', 'info');
  };

  const handleCreateCategory = (input: { name: string; slug?: string; icon: string }) => {
    const created = createCategory(input);
    const updated = getStoredCategories();
    setCategories(updated);
    showToast('Categoria criada!', `A categoria "${created.name}" foi adicionada com sucesso.`, 'success');
  };

  const handleUpdateCategory = (id: string, updates: Partial<Category>) => {
    const updatedCat = updateCategory(id, updates);
    const updated = getStoredCategories();
    setCategories(updated);
    loadData();
    showToast('Categoria atualizada!', `A categoria "${updatedCat.name}" foi atualizada.`, 'success');
  };

  const handleDeleteCategory = (id: string) => {
    try {
      const res = deleteCategory(id);
      const updated = getStoredCategories();
      setCategories(updated);
      loadData();
      showToast(
        'Categoria excluída!',
        `Categoria removida. ${res.movedCount} produto(s) foram movidos para a categoria alternativa.`,
        'success'
      );
    } catch (e) {
      showToast('Erro ao excluir', String(e), 'error');
    }
  };

  const handleMoveListingCategory = (listingId: string, targetCategoryId: string) => {
    try {
      const moved = moveListingToCategory(listingId, targetCategoryId);
      loadData();
      const targetCat = categories.find((c) => c.id === targetCategoryId);
      showToast(
        'Produto movido com sucesso!',
        `"${moved.title}" agora está em ${targetCat?.icon || ''} ${targetCat?.name || targetCategoryId}.`,
        'success'
      );
    } catch (e) {
      showToast('Erro ao mover produto', String(e), 'error');
    }
  };

  const handleAdminUpdateListingStatus = async (
    listingId: string,
    status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  ) => {
    await updateListingStatus(listingId, status);
    loadData();
    showToast('Status atualizado', `Publicação alterada para ${status}.`, 'info');
  };

  const handleAdminDeleteListing = async (listingId: string) => {
    await deleteListing(listingId);
    loadData();
    showToast('Publicação removida', 'O item foi excluído do catálogo.', 'info');
  };

  // Ranking Ações Rápidas
  const handleOpenWantedWithTerm = (term: string, categoryId: string) => {
    setInitialWantedQuery(term);
    setIsWantedModalOpen(true);
  };

  const handleOpenSaleWithTerm = (term: string, categoryId: string) => {
    setIsSaleModalOpen(true);
  };

  // Marcar como concluído
  const handleMarkAsCompleted = async (listingId: string) => {
    await updateListingStatus(listingId, 'COMPLETED');
    showToast('Status atualizado', 'Item marcado como resolvido.', 'info');
    loadData();
  };

  // Excluir
  const handleDeleteListing = async (listingId: string) => {
    await deleteListing(listingId);
    showToast('Removido', 'Publicação excluída com sucesso.', 'info');
    loadData();
  };

  // Filtrar procuras e vendas do usuário logado
  const userWantedListings = listings.filter(
    (l) => l.user_id === currentUser.id && l.type === 'WANTED'
  );
  const userSaleListings = listings.filter(
    (l) => l.user_id === currentUser.id && l.type === 'SALE'
  );

  // Anúncios recentes de procura para a Home
  const recentWanted = listings.filter((l) => l.type === 'WANTED').slice(0, 3);

  // Ranking calculado para a categoria selecionada
  const rankingItems = computeWantedRanking(listings, rankingCategory);

  // Produtos à venda na Home com muito mais espaço, filtro de categoria e ordenação
  const homeSalesListings = listings
    .filter((l) => l.type === 'SALE' && l.status === 'ACTIVE')
    .filter((l) => (homeCategory === 'all' ? true : l.category_id === homeCategory))
    .sort((a, b) => {
      if (homeSort === 'price-asc') {
        return (a.price || 0) - (b.price || 0);
      }
      if (homeSort === 'price-desc') {
        return (b.price || 0) - (a.price || 0);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // Matches para o anúncio selecionado se for aberto em modal
  const relatedMatchesForSelected = selectedListing
    ? selectedListing.type === 'SALE'
      ? getBuyersInterestedInSale(selectedListing, listings)
      : userMatches.filter((m) => m.wanted_listing_id === selectedListing.id)
    : [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-emerald-500 selection:text-white pb-16 md:pb-0">
      {/* Navbar Global */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        user={currentUser}
        googleUser={googleUser}
        config={siteConfig}
        onOpenGoogleLogin={() => setIsGoogleModalOpen(true)}
        onLogoutGoogle={handleLogoutGoogle}
        onUpdateCity={handleUpdateCity}
        onUpdatePhoto={handleUpdatePhoto}
        isLoggingIn={isLoggingIn}
        matchesCount={userMatches.length}
        unreadCount={conversations.length}
        onOpenWantedModal={() => {
          setInitialWantedQuery('');
          setIsWantedModalOpen(true);
        }}
        onOpenSaleModal={() => setIsSaleModalOpen(true)}
        onOpenSqlModal={() => setIsSqlModalOpen(true)}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1">
        {/* TAB 1: INÍCIO */}
        {currentTab === 'home' && (
          <div className="space-y-8 sm:space-y-12">
            {/* Hero Section Inteligente & Compacto */}
            <HomeHero
              onSearchOrStartWanted={handleSearchOrStartWanted}
              onOpenSaleModal={() => setIsSaleModalOpen(true)}
              onScrollToRanking={() => {
                const el = document.getElementById('ranking-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              cityName={siteConfig.cityName}
              heroTitle={siteConfig.heroTitle}
              heroSubtitle={siteConfig.heroSubtitle}
            />

            {/* Banner de Matches Ativos se houver correspondências */}
            {userMatches.length > 0 && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div
                  onClick={() => handleSelectTab('dashboard')}
                  className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-3xl p-5 sm:p-6 text-white shadow-lg shadow-emerald-600/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:scale-[1.005] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
                      <Sparkles className="w-6 h-6 fill-amber-300 text-amber-300" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-lg sm:text-xl">
                        Encontramos {userMatches.length} oferta(s) compatível(is) com suas procuras!
                      </h3>
                      <p className="text-xs sm:text-sm text-emerald-100 mt-0.5">
                        Alguém anunciou exatamente o que você estava procurando na cidade.
                      </p>
                    </div>
                  </div>

                  <button className="px-5 py-2.5 bg-white text-emerald-800 font-extrabold text-xs sm:text-sm rounded-2xl shadow-sm hover:bg-emerald-50 transition shrink-0 flex items-center justify-center gap-1.5">
                    <span>Ver no Meu Painel</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Conteúdo Principal da Home Reorganizada */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
              {/* SEÇÃO 1: PRODUTOS À VENDA NA CIDADE (MAIS ESPAÇO PARA OS PRODUTOS!) */}
              <section className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                        <Tag className="w-4 h-4 text-amber-700" />
                      </div>
                      <h2 className="font-black text-xl sm:text-2xl text-slate-900 tracking-tight">
                        Produtos à Venda na Cidade
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-50 text-amber-900 border border-amber-200">
                        {homeSalesListings.length} {homeSalesListings.length === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Explore itens anunciados por vizinhos e moradores de {siteConfig.cityName.split('-')[0].trim()}.
                    </p>
                  </div>

                  {/* Ordenação de Produtos */}
                  <div className="flex items-center gap-3 self-start sm:self-auto">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      <select
                        value={homeSort}
                        onChange={(e) => setHomeSort(e.target.value as any)}
                        className="bg-transparent font-bold text-slate-700 focus:outline-hidden cursor-pointer"
                      >
                        <option value="recent">Mais recentes</option>
                        <option value="price-asc">Menor preço</option>
                        <option value="price-desc">Maior preço</option>
                      </select>
                    </div>

                    <button
                      onClick={() => {
                        setFeedTypeFilter('SALE');
                        handleSelectTab('sales');
                      }}
                      className="text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-3.5 py-1.5 rounded-xl border border-amber-200 transition cursor-pointer flex items-center gap-1"
                    >
                      <span>Ver catálogo completo</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Filtro de Categorias Horizontal com Contadores */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
                  <button
                    onClick={() => setHomeCategory('all')}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                      homeCategory === 'all'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>Todos ({listings.filter((l) => l.type === 'SALE' && l.status === 'ACTIVE').length})</span>
                  </button>

                  {categories.map((cat) => {
                    const count = listings.filter(
                      (l) => l.type === 'SALE' && l.status === 'ACTIVE' && l.category_id === cat.id
                    ).length;

                    return (
                      <button
                        key={cat.id}
                        onClick={() => setHomeCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                          homeCategory === cat.id
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                        <span className="text-[10px] opacity-75 font-normal">({count})</span>
                      </button>
                    );
                  })}
                </div>

                {/* Grade de Produtos (Espaço Amplo para Produtos!) */}
                {homeSalesListings.length === 0 ? (
                  <div className="text-center py-12 px-4 bg-white rounded-3xl border border-slate-200">
                    <Tag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">
                      Nenhum produto anunciado nesta categoria no momento.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Tem algo para desapegar? Anuncie agora para os moradores da cidade!
                    </p>
                    <button
                      onClick={() => setIsSaleModalOpen(true)}
                      className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Anunciar meu desapego</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                    {homeSalesListings.slice(0, 8).map((item) => (
                      <ListingCard
                        key={item.id}
                        listing={item}
                        onClick={handleViewListing}
                        currentUserId={currentUser.id}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* SEÇÃO 2: RANKING DAS COISAS MAIS PROCURADAS POR CATEGORIA */}
              <section id="ranking-section" className="scroll-mt-20">
                <MostWantedRanking
                  ranking={rankingItems}
                  categories={categories}
                  selectedCategory={rankingCategory}
                  onSelectCategory={setRankingCategory}
                  onOpenWantedWithTerm={handleOpenWantedWithTerm}
                  onOpenSaleWithTerm={handleOpenSaleWithTerm}
                />
              </section>

              {/* SEÇÃO 3: MORADORES PROCURANDO NA CIDADE */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                      <Search className="w-4 h-4 text-emerald-700" />
                    </div>
                    <h2 className="font-extrabold text-xl text-slate-900 tracking-tight">
                      Moradores procurando na cidade
                    </h2>
                  </div>

                  <button
                    onClick={() => {
                      setFeedTypeFilter('WANTED');
                      handleSelectTab('wanted');
                    }}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Ver todas ({listings.filter((l) => l.type === 'WANTED').length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {recentWanted.map((item) => (
                    <ListingCard
                      key={item.id}
                      listing={item}
                      onClick={handleViewListing}
                      currentUserId={currentUser.id}
                    />
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* TAB 2: QUEM PROCURA (WANTED) */}
        {currentTab === 'wanted' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
                  <Search className="w-7 h-7 text-emerald-600" />
                  <span>O que as pessoas estão procurando</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Tem algum desses itens parado em casa? Inicie uma conversa com o comprador!
                </p>
              </div>

              <button
                onClick={() => {
                  setInitialWantedQuery('');
                  setIsWantedModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md hover:bg-emerald-700 transition cursor-pointer self-start sm:self-auto"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Quero procurar algo</span>
              </button>
            </div>

            <ListingsFeed
              listings={listings}
              activeType="WANTED"
              categories={categories}
              selectedCategory={selectedCategory}
              searchQuery={searchQuery}
              onSelectType={(t) => setFeedTypeFilter(t)}
              onSelectCategory={setSelectedCategory}
              onSearchChange={setSearchQuery}
              onListingClick={handleViewListing}
              onOpenWantedModal={() => setIsWantedModalOpen(true)}
              onOpenSaleModal={() => setIsSaleModalOpen(true)}
              currentUserId={currentUser.id}
            />
          </div>
        )}

        {/* TAB 3: À VENDA (SALE) */}
        {currentTab === 'sales' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
                  <Tag className="w-7 h-7 text-amber-600" />
                  <span>Produtos à venda na cidade</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Ofertas anunciadas diretamente pelos moradores locais.
                </p>
              </div>

              <button
                onClick={() => setIsSaleModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-slate-950 rounded-2xl text-xs sm:text-sm font-extrabold shadow-md hover:bg-amber-600 transition cursor-pointer self-start sm:self-auto"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Quero vender algo</span>
              </button>
            </div>

            <ListingsFeed
              listings={listings}
              activeType="SALE"
              categories={categories}
              selectedCategory={selectedCategory}
              searchQuery={searchQuery}
              onSelectType={(t) => setFeedTypeFilter(t)}
              onSelectCategory={setSelectedCategory}
              onSearchChange={setSearchQuery}
              onListingClick={handleViewListing}
              onOpenWantedModal={() => setIsWantedModalOpen(true)}
              onOpenSaleModal={() => setIsSaleModalOpen(true)}
              currentUserId={currentUser.id}
            />
          </div>
        )}

        {/* TAB 4: CONVERSAS */}
        {currentTab === 'conversations' && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <ConversationsView
              conversations={conversations}
              activeConversationId={activeConvId}
              currentUser={currentUser}
              onSelectConversation={setActiveConvId}
              onRefreshConversations={loadData}
            />
          </div>
        )}

        {/* TAB 5: MEU PAINEL (DASHBOARD) */}
        {currentTab === 'dashboard' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <UserDashboard
              user={currentUser}
              googleUser={googleUser}
              onOpenGoogleLogin={() => setIsGoogleModalOpen(true)}
              onLogoutGoogle={handleLogoutGoogle}
              userWanted={userWantedListings}
              userSales={userSaleListings}
              matches={userMatches}
              onOpenWantedModal={() => {
                setInitialWantedQuery('');
                setIsWantedModalOpen(true);
              }}
              onOpenSaleModal={() => setIsSaleModalOpen(true)}
              onViewListing={handleViewListing}
              onStartChatWithSeller={handleStartChat}
              onMarkAsCompleted={handleMarkAsCompleted}
              onDeleteListing={handleDeleteListing}
            />
          </div>
        )}

        {/* TAB 6: PAINEL DE ADMINISTRAÇÃO /admin */}
        {currentTab === 'admin' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <AdminPanel
              config={siteConfig}
              categories={categories}
              listings={listings}
              onSaveConfig={handleSaveConfig}
              onResetConfig={handleResetConfig}
              onCreateCategory={handleCreateCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              onMoveListingCategory={handleMoveListingCategory}
              onDeleteListing={handleAdminDeleteListing}
              onUpdateListingStatus={handleAdminUpdateListingStatus}
              onCloseAdmin={() => handleSelectTab('home')}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/90 bg-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-800">{siteConfig.siteName}</span>
            <span>•</span>
            <span>{siteConfig.tagline}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => handleSelectTab('admin')}
              className="text-slate-700 hover:text-emerald-700 font-bold transition cursor-pointer flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Painel Admin (/admin)</span>
            </button>
            <span>•</span>
            <button
              onClick={() => setIsSqlModalOpen(true)}
              className="text-slate-600 hover:text-emerald-600 font-semibold transition cursor-pointer flex items-center gap-1.5"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Script SQL Supabase</span>
            </button>
            <span>•</span>
            <button
              onClick={() => setIsSupabaseModalOpen(true)}
              className="text-slate-600 hover:text-emerald-600 font-semibold transition cursor-pointer flex items-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Conexão Supabase</span>
            </button>
            <span>•</span>
            <button
              onClick={() => setIsGithubModalOpen(true)}
              className="text-slate-600 hover:text-purple-700 font-semibold transition cursor-pointer flex items-center gap-1.5"
              title="Instruções para salvar no GitHub e atualizar na Vercel"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub / Vercel</span>
            </button>
            <span>•</span>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="text-slate-400 hover:text-slate-700 transition cursor-pointer flex items-center gap-1"
              title="Restaura os dados padrão de exemplo"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Resetar dados</span>
            </button>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      <GoogleLoginModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        onOfficialGoogleSignIn={handleOfficialGoogleSignIn}
        onTryPopupGoogleSignIn={handlePopupGoogleSignIn}
        onLoginManual={handleLoginManual}
        defaultEmail={currentUser.email || 'dimasrafting@gmail.com'}
        defaultCity={currentUser.cidade || 'Socorro - SP'}
        onOpenGithubModal={() => setIsGithubModalOpen(true)}
      />

      <CreateWantedModal
        isOpen={isWantedModalOpen}
        onClose={() => setIsWantedModalOpen(false)}
        onSubmit={handleCreateWanted}
        initialQuery={initialWantedQuery}
      />

      <CreateSaleModal
        isOpen={isSaleModalOpen}
        onClose={() => setIsSaleModalOpen(false)}
        onSubmit={handleCreateSale}
      />

      <ListingDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        listing={selectedListing}
        onStartChat={handleStartChat}
        currentUser={currentUser}
        relatedMatches={relatedMatchesForSelected}
      />

      <SqlSchemaModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
      />

      <SupabaseConfigModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onSaved={loadData}
      />

      <GithubModal
        isOpen={isGithubModalOpen}
        onClose={() => setIsGithubModalOpen(false)}
        onShowToast={showToast}
      />

      {/* Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
