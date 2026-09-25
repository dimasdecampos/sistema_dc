import React from 'react';
import {
  Search,
  Tag,
  Sparkles,
  PlusCircle,
  MessageSquare,
  Eye,
  CheckCircle,
  ArrowRight,
  ExternalLink,
  MapPin,
  Clock,
  Trash2,
  Edit2,
} from 'lucide-react';
import { Listing, Match, UserProfile } from '../types/marketplace';
import { Usuario } from '../types/auth';

interface UserDashboardProps {
  user: UserProfile;
  googleUser: Usuario | null;
  onOpenGoogleLogin: () => void;
  onLogoutGoogle: () => void;
  userWanted: Listing[];
  userSales: Listing[];
  matches: Match[];
  onOpenWantedModal: () => void;
  onOpenSaleModal: () => void;
  onViewListing: (listing: Listing) => void;
  onStartChatWithSeller: (listing: Listing) => void;
  onMarkAsCompleted: (listingId: string) => void;
  onDeleteListing: (listingId: string) => void;
  onEditListing?: (listing: Listing) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  googleUser,
  onOpenGoogleLogin,
  onLogoutGoogle,
  userWanted,
  userSales,
  matches,
  onOpenWantedModal,
  onOpenSaleModal,
  onViewListing,
  onStartChatWithSeller,
  onMarkAsCompleted,
  onDeleteListing,
  onEditListing,
}) => {
  return (
    <div className="space-y-8 sm:space-y-10">
      {/* User Header Profile Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={user.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
              alt={user.nome}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white/20 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black">{user.nome}</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Morador Verificado
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>{user.cidade}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {user.email || 'dimasrafting@gmail.com'}
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 sm:gap-4 bg-white/10 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-white/10">
            <div className="text-center px-3 border-r border-white/10">
              <span className="block text-xl sm:text-2xl font-black text-emerald-400">
                {userWanted.length}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">
                Procuras
              </span>
            </div>
            <div className="text-center px-3 border-r border-white/10">
              <span className="block text-xl sm:text-2xl font-black text-amber-400">
                {userSales.length}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">
                Anúncios
              </span>
            </div>
            <div className="text-center px-3">
              <span className="block text-xl sm:text-2xl font-black text-white">
                {matches.length}
              </span>
              <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">
                Matches
              </span>
            </div>
          </div>
        </div>

        {/* Google Status & Actions Ribbon */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          {googleUser ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.28-2.09 3.66-5.17 3.66-9.12z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.36 7.33 24 12 24z" />
                  <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.24C.45 8.14 0 9.99 0 12s.45 3.86 1.24 5.43l4.04-3.14z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.57l4.04 3.14c.95-2.83 3.6-4.96 6.72-4.96z" />
                </svg>
              </div>
              <span className="text-slate-300">
                Conectado com o Google: <strong className="text-white">{googleUser.email}</strong> (Foto oficial ativa)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-amber-300">⚡ Dica:</span> Conecte sua conta Google para sincronizar seu perfil e foto oficial automaticamente.
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenGoogleLogin}
              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 text-white font-semibold flex items-center gap-1.5 transition cursor-pointer border border-white/20"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.28-2.09 3.66-5.17 3.66-9.12z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.36 7.33 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.24C.45 8.14 0 9.99 0 12s.45 3.86 1.24 5.43l4.04-3.14z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.57l4.04 3.14c.95-2.83 3.6-4.96 6.72-4.96z" />
              </svg>
              <span>{googleUser ? 'Gerenciar Conta Google' : 'Entrar com o Google'}</span>
            </button>
            {googleUser && (
              <button
                onClick={onLogoutGoogle}
                className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold transition cursor-pointer border border-rose-400/30"
              >
                Sair
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ÁREA 3 (Destaque Principal): Encontramos para você */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Sparkles className="w-4 h-4 fill-amber-500 text-amber-600" />
            </div>
            <div>
              <h2 className="font-extrabold text-xl text-slate-900 leading-tight">
                Encontramos para você
              </h2>
              <p className="text-xs text-slate-500">
                Ofertas na cidade compatíveis com o que você disse que está procurando
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            {matches.length} recomendação{matches.length !== 1 ? 'ões' : ''}
          </span>
        </div>

        {matches.length === 0 ? (
          <div className="p-8 bg-white rounded-3xl border border-dashed border-slate-300 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-700">Nenhum match automático ainda</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Assim que outro usuário cadastrar um produto compatível com suas procuras, ele aparecerá aqui com um alerta especial.
            </p>
            <button
              onClick={onOpenWantedModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Cadastrar nova procura</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matches.map((m) => {
              const sale = m.sale_listing;
              const wanted = m.wanted_listing;
              if (!sale) return null;

              return (
                <div
                  key={m.id}
                  className="bg-white rounded-3xl p-5 border-2 border-emerald-500/30 hover:border-emerald-500 shadow-md shadow-emerald-500/5 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Alerta de correspondência */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200/80">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{m.score}% de Compatibilidade</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(m.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    </div>

                    {/* Produto em Oferta */}
                    <div className="flex items-start gap-3.5">
                      <img
                        src={
                          sale.images?.[0] ||
                          'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=200'
                        }
                        alt={sale.title}
                        className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-base text-slate-900 leading-snug line-clamp-1">
                          {sale.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-base font-black text-slate-900">
                            R${' '}
                            {sale.price?.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600">
                            {sale.condition === 'NEW' ? 'Novo' : 'Usado'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                          <span>Publicado por</span>
                          <strong className="text-slate-700">{sale.user?.nome || 'Morador'}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Referência da Procura que gerou o match */}
                    {wanted && (
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                          Possível correspondência com sua procura:
                        </span>
                        <p className="font-semibold text-slate-800 line-clamp-1">
                          "{wanted.title}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => onViewListing(sale)}
                      className="px-3 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    >
                      Ver anúncio
                    </button>
                    <button
                      onClick={() => onStartChatWithSeller(sale)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition cursor-pointer hover:scale-[1.02]"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Iniciar conversa</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ÁREA 1 & 2: Estou Procurando & Meus Anúncios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ÁREA 1: Estou procurando */}
        <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Search className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Estou procurando</h3>
                <p className="text-xs text-slate-500">Suas intenções de compra ativas</p>
              </div>
            </div>

            <button
              onClick={onOpenWantedModal}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 px-3 py-1.5 rounded-xl border border-emerald-200 transition cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Quero procurar algo</span>
            </button>
          </div>

          {userWanted.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Você ainda não registrou nada que está procurando.
            </div>
          ) : (
            <div className="space-y-3">
              {userWanted.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl border border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/20 transition flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🔎</span>
                      <h4 className="font-bold text-sm text-slate-900 truncate">
                        {item.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span>{item.category?.name || 'Geral'}</span>
                      {item.price && (
                        <span>
                          Até R${' '}
                          {item.price.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-slate-100 font-semibold">
                        {item.condition === 'NEW' ? 'Novo' : item.condition === 'USED' ? 'Usado' : 'Tanto faz'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onViewListing(item)}
                      title="Ver detalhes"
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {onEditListing && (
                      <button
                        onClick={() => onEditListing(item)}
                        title="Editar procura"
                        className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteListing(item.id)}
                      title="Excluir procura"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ÁREA 2: Meus anúncios à venda */}
        <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Tag className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Meus anúncios</h3>
                <p className="text-xs text-slate-500">Produtos que você está vendendo</p>
              </div>
            </div>

            <button
              onClick={onOpenSaleModal}
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200 transition cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Quero vender algo</span>
            </button>
          </div>

          {userSales.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Você ainda não tem nenhum produto cadastrado à venda.
            </div>
          ) : (
            <div className="space-y-3">
              {userSales.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl border border-slate-200/80 hover:border-amber-300 hover:bg-amber-50/20 transition flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={
                        item.images?.[0] ||
                        'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=100'
                      }
                      alt={item.title}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 truncate">
                        {item.title}
                      </h4>
                      <p className="text-xs font-extrabold text-slate-900 mt-0.5">
                        R${' '}
                        {item.price?.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onViewListing(item)}
                      title="Ver anúncio"
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {onEditListing && (
                      <button
                        onClick={() => onEditListing(item)}
                        title="Editar anúncio"
                        className="p-1.5 text-slate-400 hover:text-amber-800 rounded-lg hover:bg-amber-50 cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteListing(item.id)}
                      title="Excluir anúncio"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
