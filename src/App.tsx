import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Tag,
  Sparkles,
  ArrowRight,
  PlusCircle,
  ShieldCheck,
  ArrowUpDown,
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
  fetchConversations,
  createWantedListing,
  createSaleListing,
  getUserMatches,
  updateListingStatus,
  updateListing,
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
  getSavedUserAdminConfig,
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
import { EditListingModal } from './components/EditListingModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { ListingCard } from './components/ListingCard';
import { getBuyersInterestedInSale } from './services/matchingService';
import { getSiteConfig, saveSiteConfig, resetSiteConfig, isUserAdmin } from './services/siteConfigService';
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
        adminConfig: stored.adminConfig || getSavedUserAdminConfig(stored.email) || undefined,
      };
    }
    const dimasSavedConfig = getSavedUserAdminConfig('dimasrafting@gmail.com');
    return {
      ...SAMPLE_USERS.dimas,
      adminConfig: dimasSavedConfig || undefined,
    };
  });

  // Site Configuration & Categories (carrega a configuração gravada no perfil do usuário ativo)
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(() => {
    const stored = getStoredUser();
    return getSiteConfig(stored?.email || 'dimasrafting@gmail.com');
  });
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

  // Selected item for detail view
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [initialWantedQuery, setInitialWantedQuery] = useState('');

  // Edit Listing State & Handlers
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedListingForEdit, setSelectedListingForEdit] = useState<Listing | null>(null);

  // Verificação de privilégio Admin (dimasrafting@gmail.com ou administradores configurados)
  const isAdmin = isUserAdmin(googleUser?.email || currentUser.email, siteConfig);

  const handleOpenEditListing = (listing: Listing) => {
    setSelectedListingForEdit(listing);
    setIsEditModalOpen(true);
  };

  const handleSaveEditListing = async (listingId: string, updates: Partial<Listing>) => {
    const updated = await updateListing(listingId, updates);
    setListings((prev) => prev.map((l) => (l.id === listingId ? updated : l)));
    if (selectedListing?.id === listingId) {
      setSelectedListing(updated);
    }
  };

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

  const pendingActionRef = useRef<{ type: 'wanted'; query?: string } | { type: 'sale' } | null>(null);

  const handleRequestOpenWanted = useCallback((queryText?: string) => {
    if (!googleUser) {
      pendingActionRef.current = { type: 'wanted', query: queryText || searchQuery };
      setIsGoogleModalOpen(true);
      showToast(
        'Login com Google necessário',
        'Faça login com sua conta do Google para registrar o que você procura.',
        'info'
      );
      return;
    }
    setInitialWantedQuery(queryText || searchQuery);
    setIsWantedModalOpen(true);
  }, [googleUser, searchQuery, showToast]);

  const handleRequestOpenSale = useCallback(() => {
    if (!googleUser) {
      pendingActionRef.current = { type: 'sale' };
      setIsGoogleModalOpen(true);
      showToast(
        'Login com Google necessário',
        'Faça login com sua conta do Google para anunciar seu desapego.',
        'info'
      );
      return;
    }
    setIsSaleModalOpen(true);
  }, [googleUser, showToast]);

  // Helper para sincronizar usuário Google com o perfil do marketplace
  const handleUserAuthenticated = useCallback((u: Usuario) => {
    setGoogleUser(u);
    const photo = u.foto || getOfficialGooglePhoto(u.email);
    const userAdminCfg = u.adminConfig || getSavedUserAdminConfig(u.email);
    const mapped: UserProfile = {
      id: u.id || u.google_id || 'user-google',
      nome: u.nome,
      email: u.email,
      avatar_url: photo,
      cidade: u.cidade || 'Socorro - SP',
      created_at: u.created_at || new Date().toISOString(),
      adminConfig: userAdminCfg || undefined,
    };
    setCurrentUser(mapped);

    if (userAdminCfg) {
      setSiteConfig(userAdminCfg);
    } else {
      const activeCfg = getSiteConfig(u.email);
      setSiteConfig(activeCfg);
    }

    // Se o usuário clicou em comprar ou vender antes de se autenticar, abre o modal desejado
    if (pendingActionRef.current) {
      const pending = pendingActionRef.current;
      pendingActionRef.current = null;
      setTimeout(() => {
        if (pending.type === 'wanted') {
          setInitialWantedQuery(pending.query || '');
          setIsWantedModalOpen(true);
        } else if (pending.type === 'sale') {
          setIsSaleModalOpen(true);
        }
      }, 350);
    }
  }, []);

  // Login Direto com Google (100% compatível com Vercel)
  const handleOfficialGoogleSignIn = async (email?: string, name?: string) => {
    setIsLoggingIn(true);
    try {
      const u = await signInWithGoogleDirect(email, name);
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
    const dimasConfig = getSiteConfig('dimasrafting@gmail.com');
    setCurrentUser({
      ...SAMPLE_USERS.dimas,
      adminConfig: dimasConfig,
    });
    setSiteConfig(dimasConfig);
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

  // Carrega anúncios, matches e conversas ativas
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchListings();
      setListings(res.listings);

      const matches = await getUserMatches(currentUser.id);
      setUserMatches(matches);

      const convs = await fetchConversations(currentUser.id);
      setConversations(convs);
    } catch (e) {
      console.warn('Erro ao carregar anúncios e conversas:', e);
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

    // Sincronização periódica a cada 5 segundos para que novos anúncios publicados no celular apareçam no PC automaticamente
    const pollInterval = setInterval(() => {
      fetchListings().then((res) => {
        if (res.listings && res.listings.length > 0) {
          setListings(res.listings);
        }
      }).catch(() => {});
    }, 5000);

    const handleWindowFocus = () => {
      loadData();
    };
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleWindowFocus);
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

      const allConvs = await fetchConversations(currentUser.id);
      setConversations(allConvs);
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

  // Admin Operations - Cada alteração é gravada diretamente no perfil do usuário
  const handleConfigChange = useCallback((newCfg: SiteConfig) => {
    const activeEmail = googleUser?.email || currentUser.email || 'dimasrafting@gmail.com';
    const saved = saveSiteConfig(newCfg, activeEmail);
    setSiteConfig(saved);
    setCurrentUser((prev) => ({ ...prev, adminConfig: saved }));
    setGoogleUser((prev) => (prev ? { ...prev, adminConfig: saved } : prev));
  }, [googleUser?.email, currentUser.email]);

  const handleSaveConfig = useCallback((newCfg: SiteConfig) => {
    const activeEmail = googleUser?.email || currentUser.email || 'dimasrafting@gmail.com';
    const saved = saveSiteConfig(newCfg, activeEmail);
    setSiteConfig(saved);
    setCurrentUser((prev) => ({ ...prev, adminConfig: saved }));
    setGoogleUser((prev) => (prev ? { ...prev, adminConfig: saved } : prev));
    showToast(
      'Configurações salvas no perfil!',
      `Os ajustes foram salvos no perfil de ${currentUser.nome || activeEmail}.`,
      'success'
    );
  }, [googleUser?.email, currentUser.email, currentUser.nome, showToast]);

  const handleResetConfig = useCallback(() => {
    const activeEmail = googleUser?.email || currentUser.email || 'dimasrafting@gmail.com';
    const def = resetSiteConfig(activeEmail);
    setSiteConfig(def);
    setCurrentUser((prev) => ({ ...prev, adminConfig: def }));
    setGoogleUser((prev) => (prev ? { ...prev, adminConfig: def } : prev));
    showToast('Configurações restauradas', 'Os parâmetros padrão foram redefinidos e salvos no seu perfil.', 'info');
  }, [googleUser?.email, currentUser.email, showToast]);

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

  // Anúncios filtrados para a Home com base na busca em tempo real, abas e categorias
  const homeFilteredListings = listings
    .filter((l) => l.status === 'ACTIVE')
    .filter((l) => {
      if (feedTypeFilter === 'ALL') return true;
      return l.type === feedTypeFilter;
    })
    .filter((l) => (homeCategory === 'all' ? true : l.category_id === homeCategory))
    .filter((l) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        l.title.toLowerCase().includes(q) ||
        (l.description && l.description.toLowerCase().includes(q))
      );
    })
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
        isAdmin={isAdmin}
        onOpenGoogleLogin={() => setIsGoogleModalOpen(true)}
        onLogoutGoogle={handleLogoutGoogle}
        onUpdateCity={handleUpdateCity}
        onUpdatePhoto={handleUpdatePhoto}
        isLoggingIn={isLoggingIn}
        matchesCount={userMatches.length}
        unreadCount={conversations.length}
        onOpenWantedModal={() => handleRequestOpenWanted('')}
        onOpenSaleModal={handleRequestOpenSale}
      />

      {/* Main Container */}
      <main className="flex-1">
        {/* TAB 1: INÍCIO */}
        {currentTab === 'home' && (
          <div className="space-y-6 sm:space-y-8">
            {/* Acima dos anúncios: apenas o campo de busca com botões Eu Quero Comprar e Eu Quero Vender */}
            <HomeHero
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenWantedModal={(queryText) => handleRequestOpenWanted(queryText || searchQuery || '')}
              onOpenSaleModal={handleRequestOpenSale}
              cityName={siteConfig.cityName}
            />

            {/* Conteúdo Principal dos Anúncios */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
              {/* Banner de Matches se houver ofertas compatíveis para o usuário */}
              {userMatches.length > 0 && (
                <div
                  onClick={() => handleSelectTab('dashboard')}
                  className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-2xl p-4 text-white shadow-md shadow-emerald-600/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:scale-[1.005] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                      <Sparkles className="w-5 h-5 fill-amber-300 text-amber-300" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base">
                        Encontramos {userMatches.length} oferta(s) compatível(is) com suas procuras!
                      </h3>
                      <p className="text-xs text-emerald-100">
                        Clique para ver e conversar diretamente com o anunciante.
                      </p>
                    </div>
                  </div>

                  <button className="px-4 py-2 bg-white text-emerald-800 font-extrabold text-xs rounded-xl shadow-xs hover:bg-emerald-50 transition shrink-0 flex items-center justify-center gap-1">
                    <span>Ver no Painel</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Controles de Filtro Simples e Intuitivos */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs">
                {/* Seletor de Tipo: Todos, À Venda, Quem Procura */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl sm:rounded-2xl border border-slate-200/70 overflow-x-auto scrollbar-none">
                  <button
                    onClick={() => setFeedTypeFilter('ALL')}
                    className={`px-3 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                      feedTypeFilter === 'ALL'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todos ({listings.filter((l) => l.status === 'ACTIVE').length})
                  </button>

                  <button
                    onClick={() => setFeedTypeFilter('SALE')}
                    className={`px-3 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      feedTypeFilter === 'SALE'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-amber-800 hover:bg-amber-50'
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>À Venda ({listings.filter((l) => l.status === 'ACTIVE' && l.type === 'SALE').length})</span>
                  </button>

                  <button
                    onClick={() => setFeedTypeFilter('WANTED')}
                    className={`px-3 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      feedTypeFilter === 'WANTED'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Quem Procura ({listings.filter((l) => l.status === 'ACTIVE' && l.type === 'WANTED').length})</span>
                  </button>
                </div>

                {/* Ordenação e Contagem */}
                <div className="flex items-center justify-between md:justify-end gap-3">
                  <span className="text-xs text-slate-500 font-medium">
                    {homeFilteredListings.length}{' '}
                    {homeFilteredListings.length === 1 ? 'anúncio' : 'anúncios'}
                  </span>

                  <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
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
                </div>
              </div>

              {/* Categorias em Pílulas */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
                <button
                  onClick={() => setHomeCategory('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                    homeCategory === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  Todas as categorias
                </button>

                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setHomeCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                      homeCategory === cat.id
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>

              {/* Grade dos Anúncios */}
              {homeFilteredListings.length === 0 ? (
                <div className="text-center py-14 px-4 bg-white rounded-3xl border border-slate-200 space-y-3">
                  <Search className="w-10 h-10 text-slate-300 mx-auto" />
                  <h3 className="text-base font-bold text-slate-800">
                    Nenhum anúncio encontrado para esta busca ou categoria
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Não encontrou o que procura? Você pode cadastrar uma procura para que moradores te avisem, ou desapegar de algo!
                  </p>
                  <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={() => handleRequestOpenWanted(searchQuery)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Eu quero comprar
                    </button>
                    <button
                      onClick={handleRequestOpenSale}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold rounded-xl transition cursor-pointer"
                    >
                      Eu quero vender
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                  {homeFilteredListings.map((item) => (
                    <ListingCard
                      key={item.id}
                      listing={item}
                      onClick={handleViewListing}
                      currentUserId={currentUser.id}
                    />
                  ))}
                </div>
              )}

              {/* Ranking das Coisas Mais Procuradas */}
              <div className="pt-6">
                <MostWantedRanking
                  ranking={rankingItems}
                  categories={categories}
                  selectedCategory={rankingCategory}
                  onSelectCategory={setRankingCategory}
                  onOpenWantedWithTerm={handleOpenWantedWithTerm}
                  onOpenSaleWithTerm={handleOpenSaleWithTerm}
                />
              </div>
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
              onViewListing={handleViewListing}
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
              onEditListing={handleOpenEditListing}
            />
          </div>
        )}

        {/* TAB 6: PAINEL DE ADMINISTRAÇÃO /admin */}
        {currentTab === 'admin' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {isAdmin ? (
              <AdminPanel
                config={siteConfig}
                categories={categories}
                listings={listings}
                currentUser={currentUser}
                googleUser={googleUser}
                onSaveConfig={handleSaveConfig}
                onConfigChange={handleConfigChange}
                onResetConfig={handleResetConfig}
                onCreateCategory={handleCreateCategory}
                onUpdateCategory={handleUpdateCategory}
                onDeleteCategory={handleDeleteCategory}
                onMoveListingCategory={handleMoveListingCategory}
                onDeleteListing={handleAdminDeleteListing}
                onUpdateListingStatus={handleAdminUpdateListingStatus}
                onEditListing={handleOpenEditListing}
                onCloseAdmin={() => handleSelectTab('home')}
              />
            ) : (
              <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-xs">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h3 className="font-extrabold text-xl text-slate-900">Acesso Restrito ao Admin</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Esta área é exclusiva para a administração do TemAqui (dimasrafting@gmail.com ou administradores cadastrados).
                </p>
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={() => setIsGoogleModalOpen(true)}
                    className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Fazer Login com Google
                  </button>
                  <button
                    onClick={() => handleSelectTab('home')}
                    className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Voltar ao Início
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Limpo e Objetivo */}
      <footer className="border-t border-slate-200/90 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-slate-900">{siteConfig.siteName}</span>
            <span>•</span>
            <span className="text-slate-600 font-medium">{siteConfig.cityName}</span>
            <span>•</span>
            <span className="text-slate-500">{siteConfig.tagline || 'Conectando compradores e vendedores da cidade'}</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>© {new Date().getFullYear()} {siteConfig.siteName}. Todos os direitos reservados.</span>
            {isAdmin && (
              <button
                onClick={() => handleSelectTab('admin')}
                className="text-slate-600 hover:text-emerald-700 font-semibold transition cursor-pointer flex items-center gap-1"
                title="Acessar painel administrativo"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Admin</span>
              </button>
            )}
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
        currentUser={currentUser}
      />

      <CreateSaleModal
        isOpen={isSaleModalOpen}
        onClose={() => setIsSaleModalOpen(false)}
        onSubmit={handleCreateSale}
        currentUser={currentUser}
      />

      <ListingDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        listing={selectedListing}
        onStartChat={handleStartChat}
        currentUser={currentUser}
        relatedMatches={relatedMatchesForSelected}
        onEditListing={handleOpenEditListing}
        isAdmin={isAdmin}
      />

      <EditListingModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        listing={selectedListingForEdit}
        categories={categories}
        onSave={handleSaveEditListing}
        onShowToast={showToast}
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
