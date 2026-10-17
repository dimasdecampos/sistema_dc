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
  updateCurrentUserProfile,
  getOfficialGooglePhoto,
  DEFAULT_CITY,
} from './services/authService';
import { initSupabaseAuth, logoutSupabase } from './services/supabaseAuth';
import { Usuario } from './types/auth';
import { GoogleLoginModal } from './components/GoogleLoginModal';
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
import {
  DEFAULT_SITE_CONFIG,
  fetchSiteConfig,
  saveSiteConfig,
  resetSiteConfig,
  isUserAdmin,
} from './services/siteConfigService';
import {
  loadCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  moveListingToCategory,
} from './services/categoryService';
import { computeWantedRanking } from './services/rankingService';
import { MostWantedRanking } from './components/MostWantedRanking';
import { AdminPanel } from './components/AdminPanel';

const createGuestUser = (): UserProfile => ({
  id: '',
  nome: 'Visitante',
  email: '',
  avatar_url: '',
  cidade: DEFAULT_CITY,
  created_at: new Date().toISOString(),
});

export default function App() {
  // Usuário do Google (sessão do Supabase Auth)
  const [googleUser, setGoogleUser] = useState<Usuario | null>(null);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isLoggingIn] = useState(false);

  // Usuário ativo no marketplace (visitante até o Supabase confirmar a sessão)
  const [currentUser, setCurrentUser] = useState<UserProfile>(createGuestUser);

  // Site Configuration & Categories (carregados do Supabase)
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const [categories, setCategories] = useState<Category[]>([]);

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

  const currentUserRef = useRef<UserProfile>(currentUser);
  currentUserRef.current = currentUser;

  // Aplica o usuário vindo da sessão do Supabase Auth (já com o perfil do banco)
  const handleUserAuthenticated = useCallback((u: Usuario) => {
    setGoogleUser((prev) =>
      prev &&
      prev.id === u.id &&
      prev.nome === u.nome &&
      prev.foto === u.foto &&
      prev.cidade === u.cidade
        ? prev
        : u
    );

    const mapped: UserProfile = {
      id: u.id,
      nome: u.nome,
      email: u.email,
      avatar_url: u.foto || getOfficialGooglePhoto(u.email),
      cidade: u.cidade || DEFAULT_CITY,
      created_at: u.created_at || new Date().toISOString(),
    };

    setCurrentUser((prev) =>
      prev.id === mapped.id &&
      prev.nome === mapped.nome &&
      prev.avatar_url === mapped.avatar_url &&
      prev.cidade === mapped.cidade
        ? prev
        : { ...mapped, adminConfig: prev.adminConfig }
    );

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

  // Sem sessão no Supabase Auth: volta para visitante
  const resetToGuest = useCallback(() => {
    setGoogleUser(null);
    setCurrentUser((prev) => (prev.id ? createGuestUser() : prev));
    setUserMatches([]);
    setConversations([]);
  }, []);

  // Só admins (lista em site_config) recebem a configuração do site no perfil
  useEffect(() => {
    const cfg = isAdmin ? siteConfig : undefined;
    setCurrentUser((prev) => (prev.adminConfig === cfg ? prev : { ...prev, adminConfig: cfg }));
  }, [isAdmin, siteConfig]);

  // Abertura do modal de login padrão
  const handleOpenGoogleLogin = () => {
    setIsGoogleModalOpen(true);
  };

  // Logout Supabase
  const handleLogoutGoogle = async () => {
    await logoutSupabase();
    resetToGuest();
    showToast('Sessão encerrada', 'Você saiu da sua conta.', 'info');
  };

  // Atualização de cidade
  const handleUpdateCity = async (newCity: string) => {
    if (!newCity.trim() || !googleUser) return;
    try {
      const updated = await updateCurrentUserProfile(googleUser, { cidade: newCity.trim() });
      setGoogleUser(updated);
      setCurrentUser((prev) => ({ ...prev, cidade: newCity.trim() }));
      showToast('Cidade atualizada', `Sua cidade foi alterada para ${newCity.trim()}`, 'success');
    } catch (e) {
      showToast('Erro ao atualizar cidade', String(e), 'error');
    }
  };

  // Atualização de foto
  const handleUpdatePhoto = async (newPhoto: string) => {
    if (!newPhoto.trim() || !googleUser) return;
    try {
      const updated = await updateCurrentUserProfile(googleUser, { foto: newPhoto.trim() });
      setGoogleUser(updated);
      setCurrentUser((prev) => ({ ...prev, avatar_url: newPhoto.trim() }));
      showToast('Foto atualizada', 'Sua foto de perfil foi atualizada com sucesso.', 'success');
    } catch (e) {
      showToast('Erro ao atualizar foto', String(e), 'error');
    }
  };

  // Carrega anúncios, matches e conversas do Supabase
  const loadData = useCallback(async (userToQuery?: UserProfile, silent = false) => {
    const targetUser = userToQuery || currentUserRef.current;
    if (!silent) setIsLoading(true);
    try {
      const res = await fetchListings();
      setListings(res.listings);
      setUserMatches(await getUserMatches(targetUser, res.listings));
      setConversations(await fetchConversations(targetUser.id));
    } catch (e) {
      console.warn('Erro ao carregar dados do Supabase:', e);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  // Recarrega quando o usuário logar ou deslogar
  useEffect(() => {
    loadData(currentUser);
  }, [currentUser.id, loadData]);

  // Inicialização (apenas uma vez no carregamento)
  useEffect(() => {
    fetchSiteConfig().then(setSiteConfig).catch(() => {});
    loadCategories().then(setCategories).catch((e) => console.warn('Erro ao carregar categorias:', e));

    // Sessão do Supabase Auth (inclui o retorno do login com Google)
    const unsubAuth = initSupabaseAuth((sbUser) => {
      if (sbUser) {
        handleUserAuthenticated(sbUser);
      } else {
        resetToGuest();
      }
    });

    // Atualização periódica para anúncios, matches e conversas de outros usuários
    const pollInterval = setInterval(() => {
      loadData(undefined, true);
    }, 15000);

    const handleWindowFocus = () => {
      loadData(undefined, true);
    };
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleWindowFocus);
      unsubAuth();
    };
  }, [loadData, handleUserAuthenticated, resetToGuest]);

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
    if (!googleUser || !currentUser.email) {
      setIsGoogleModalOpen(true);
      showToast(
        'Login com Google necessário',
        'Faça login com sua conta do Google para conversar com o anunciante.',
        'info'
      );
      return;
    }

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

  // Admin: configuração do site (tabela site_config; só admins passam pela RLS)
  const configSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Edição campo a campo: atualiza a tela na hora e grava no banco após uma breve pausa
  const handleConfigChange = useCallback((newCfg: SiteConfig) => {
    setSiteConfig(newCfg);
    if (configSaveTimerRef.current) clearTimeout(configSaveTimerRef.current);
    configSaveTimerRef.current = setTimeout(() => {
      saveSiteConfig(newCfg).catch((e) => showToast('Erro ao salvar configurações', String(e), 'error'));
    }, 800);
  }, [showToast]);

  const handleSaveConfig = useCallback(async (newCfg: SiteConfig) => {
    if (configSaveTimerRef.current) clearTimeout(configSaveTimerRef.current);
    try {
      const saved = await saveSiteConfig(newCfg);
      setSiteConfig(saved);
      showToast('Configurações salvas!', 'Os ajustes foram gravados no banco de dados.', 'success');
    } catch (e) {
      showToast('Erro ao salvar configurações', String(e), 'error');
    }
  }, [showToast]);

  const handleResetConfig = useCallback(async () => {
    if (configSaveTimerRef.current) clearTimeout(configSaveTimerRef.current);
    try {
      const def = await resetSiteConfig(siteConfig);
      setSiteConfig(def);
      showToast('Configurações restauradas', 'Os parâmetros padrão foram redefinidos.', 'info');
    } catch (e) {
      showToast('Erro ao restaurar configurações', String(e), 'error');
    }
  }, [siteConfig, showToast]);

  const handleCreateCategory = async (input: { name: string; slug?: string; icon: string }) => {
    try {
      const created = await createCategory(input);
      setCategories(await loadCategories());
      showToast('Categoria criada!', `A categoria "${created.name}" foi adicionada com sucesso.`, 'success');
    } catch (e) {
      showToast('Erro ao criar categoria', String(e), 'error');
    }
  };

  const handleUpdateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      const updatedCat = await updateCategory(id, updates);
      setCategories(await loadCategories());
      loadData();
      showToast('Categoria atualizada!', `A categoria "${updatedCat.name}" foi atualizada.`, 'success');
    } catch (e) {
      showToast('Erro ao atualizar categoria', String(e), 'error');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const res = await deleteCategory(id);
      setCategories(await loadCategories());
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

  const handleMoveListingCategory = async (listingId: string, targetCategoryId: string) => {
    try {
      const moved = await moveListingToCategory(listingId, targetCategoryId);
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
    try {
      await updateListingStatus(listingId, status);
      loadData();
      showToast('Status atualizado', `Publicação alterada para ${status}.`, 'info');
    } catch (e) {
      showToast('Erro ao atualizar status', String(e), 'error');
    }
  };

  const handleAdminDeleteListing = async (listingId: string) => {
    try {
      await deleteListing(listingId);
      loadData();
      showToast('Publicação removida', 'O item foi excluído do catálogo.', 'info');
    } catch (e) {
      showToast('Erro ao excluir publicação', String(e), 'error');
    }
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
    try {
      await updateListingStatus(listingId, 'COMPLETED');
      showToast('Status atualizado', 'Item marcado como resolvido.', 'info');
      loadData();
    } catch (e) {
      showToast('Erro ao atualizar status', String(e), 'error');
    }
  };

  // Excluir
  const handleDeleteListing = async (listingId: string) => {
    try {
      await deleteListing(listingId);
      showToast('Removido', 'Publicação excluída com sucesso.', 'info');
      loadData();
    } catch (e) {
      showToast('Erro ao excluir', String(e), 'error');
    }
  };

  // Procuras e vendas do usuário logado (dono = auth.uid())
  const isUserOwner = (l: Listing) => Boolean(currentUser.id) && l.user_id === currentUser.id;

  const userWantedListings = listings.filter(
    (l) => isUserOwner(l) && l.type === 'WANTED'
  );
  const userSaleListings = listings.filter(
    (l) => isUserOwner(l) && l.type === 'SALE'
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
        onOpenGoogleLogin={handleOpenGoogleLogin}
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
            {/* Campo de Busca Principal da Cidade */}
            <HomeHero
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              cityName={siteConfig.cityName}
              onOpenSaleModal={handleRequestOpenSale}
              onOpenWantedModal={handleRequestOpenWanted}
              categories={categories}
              selectedCategory={homeCategory}
              onSelectCategory={setHomeCategory}
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
                      currentUserEmail={currentUser.email}
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
                onClick={() => handleRequestOpenWanted('')}
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
              onOpenWantedModal={() => handleRequestOpenWanted('')}
              onOpenSaleModal={handleRequestOpenSale}
              currentUserId={currentUser.id}
              currentUserEmail={currentUser.email}
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
                onClick={handleRequestOpenSale}
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
              onOpenWantedModal={() => handleRequestOpenWanted('')}
              onOpenSaleModal={handleRequestOpenSale}
              currentUserId={currentUser.id}
              currentUserEmail={currentUser.email}
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
              onOpenGoogleLogin={() => setIsGoogleModalOpen(true)}
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
              onOpenWantedModal={() => handleRequestOpenWanted('')}
              onOpenSaleModal={handleRequestOpenSale}
              onViewListing={handleViewListing}
              onStartChatWithSeller={handleStartChat}
              onMarkAsCompleted={handleMarkAsCompleted}
              onDeleteListing={handleDeleteListing}
              onEditListing={handleOpenEditListing}
              onUpdateCity={handleUpdateCity}
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

      {/* Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
