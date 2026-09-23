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
} from 'lucide-react';
import {
  Listing,
  Match,
  Conversation,
  UserProfile,
  CreateWantedInput,
  CreateSaleInput,
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
import { getStoredUser, syncUserWithSupabase } from './services/authService';
import { initGoogleAuth } from './services/googleAuth';
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

export default function App() {
  // Current active user (defaults to Dimas from prompt specification)
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const stored = getStoredUser();
    if (stored) {
      return {
        id: stored.id || 'user-dimas',
        nome: stored.nome,
        email: stored.email,
        avatar_url: stored.foto,
        cidade: stored.cidade || 'Socorro - SP',
        created_at: stored.created_at || new Date().toISOString(),
      };
    }
    return SAMPLE_USERS.dimas;
  });

  // Navigation tab
  const [currentTab, setCurrentTab] = useState<
    'home' | 'wanted' | 'sales' | 'conversations' | 'dashboard'
  >('home');

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

    // Listener de login Google oficial
    const unsubGoogle = initGoogleAuth((gUser) => {
      if (gUser) {
        const mappedUser: UserProfile = {
          id: gUser.id || 'user-google',
          nome: gUser.nome,
          email: gUser.email,
          avatar_url: gUser.foto,
          cidade: gUser.cidade || 'Socorro - SP',
          created_at: gUser.created_at || new Date().toISOString(),
        };
        setCurrentUser(mappedUser);
        showToast(
          `Olá, ${gUser.nome}!`,
          'Sua conta Google e foto oficial foram sincronizadas.',
          'success'
        );
      }
    });

    return () => unsubGoogle();
  }, [loadData, showToast]);

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

  // Anúncios recentes para a Home
  const recentWanted = listings.filter((l) => l.type === 'WANTED').slice(0, 3);
  const recentSales = listings.filter((l) => l.type === 'SALE').slice(0, 3);

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
        onSelectTab={setCurrentTab}
        user={currentUser}
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
            {/* Hero Section Inteligente */}
            <HomeHero
              onSearchOrStartWanted={handleSearchOrStartWanted}
              onOpenSaleModal={() => setIsSaleModalOpen(true)}
            />

            {/* Banner de Matches Ativos se houver correspondências */}
            {userMatches.length > 0 && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div
                  onClick={() => setCurrentTab('dashboard')}
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

            {/* Seções da Home: Quem Procura & Ofertas Recentes */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
              {/* Seção 1: Quem está procurando na cidade */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                      <Search className="w-4 h-4 text-emerald-700" />
                    </div>
                    <h2 className="font-extrabold text-xl text-slate-900 tracking-tight">
                      Moradores procurando na cidade
                    </h2>
                  </div>

                  <button
                    onClick={() => {
                      setFeedTypeFilter('WANTED');
                      setCurrentTab('wanted');
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

              {/* Seção 2: Produtos à venda */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                      <Tag className="w-4 h-4 text-amber-700" />
                    </div>
                    <h2 className="font-extrabold text-xl text-slate-900 tracking-tight">
                      Últimos produtos colocados à venda
                    </h2>
                  </div>

                  <button
                    onClick={() => {
                      setFeedTypeFilter('SALE');
                      setCurrentTab('sales');
                    }}
                    className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Ver todas ({listings.filter((l) => l.type === 'SALE').length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {recentSales.map((item) => (
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
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/90 bg-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-800">TemAqui</span>
            <span>•</span>
            <span>Marketplace local baseado em Procura e Oferta</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
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
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="text-slate-400 hover:text-slate-700 transition cursor-pointer flex items-center gap-1"
              title="Restaura os dados padrão de exemplo"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Resetar dados de exemplo</span>
            </button>
          </div>
        </div>
      </footer>

      {/* MODALS */}
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

      {/* Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
