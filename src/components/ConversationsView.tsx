import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  User,
  Tag,
  ArrowLeft,
  CheckCheck,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { Conversation, Message, UserProfile, Listing } from '../types/marketplace';
import {
  fetchConversationMessages,
  sendMessage,
} from '../services/marketplaceService';

interface ConversationsViewProps {
  conversations: Conversation[];
  activeConversationId?: string;
  currentUser: UserProfile;
  onSelectConversation: (id: string) => void;
  onRefreshConversations: () => void;
  onViewListing?: (listing: Listing) => void;
  onOpenGoogleLogin?: () => void;
}

export const ConversationsView: React.FC<ConversationsViewProps> = ({
  conversations,
  activeConversationId,
  currentUser,
  onSelectConversation,
  onRefreshConversations,
  onViewListing,
  onOpenGoogleLogin,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showMobileList, setShowMobileList] = useState(!activeConversationId);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Usuário não autenticado
  if (!currentUser.id || !currentUser.email) {
    return (
      <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-slate-200/90 shadow-2xs space-y-4 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h3 className="font-extrabold text-xl text-slate-900">
          Suas Conversas
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
          Faça login com sua conta do Google para conversar com compradores e vendedores da cidade em tempo real.
        </p>
        {onOpenGoogleLogin && (
          <button
            onClick={onOpenGoogleLogin}
            className="inline-flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            <span>Entrar com o Google</span>
          </button>
        )}
      </div>
    );
  }

  const selectedConv =
    conversations.find((c) => c.id === activeConversationId) ||
    conversations[0];

  // Identifica quem é o outro participante da conversa
  const userEmail = (currentUser.email || '').toLowerCase().trim();
  const buyerEmail = (selectedConv?.buyer?.email || '').toLowerCase().trim();
  const isBuyer =
    (Boolean(currentUser.id) && selectedConv?.buyer_id === currentUser.id) ||
    (Boolean(userEmail) && Boolean(buyerEmail) && userEmail === buyerEmail);

  const otherUser = isBuyer ? selectedConv?.seller : selectedConv?.buyer;

  // Carrega mensagens reais do banco e sincroniza a cada 2.5s para chat em tempo real
  useEffect(() => {
    if (selectedConv) {
      fetchConversationMessages(selectedConv.id).then((msgs) => {
        setMessages(msgs);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 120);
      });
      setShowMobileList(false);

      const msgInterval = setInterval(() => {
        fetchConversationMessages(selectedConv.id).then((freshMsgs) => {
          setMessages((prev) => {
            if (
              freshMsgs.length !== prev.length ||
              (freshMsgs.length > 0 && freshMsgs[freshMsgs.length - 1].id !== prev[prev.length - 1]?.id)
            ) {
              setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
              return freshMsgs;
            }
            return prev;
          });
        });
      }, 2500);

      return () => clearInterval(msgInterval);
    }
  }, [selectedConv?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !selectedConv || !currentUser.id) return;

    setInputText('');
    setIsLoading(true);

    try {
      const newMsg = await sendMessage(selectedConv.id, currentUser.id, text);
      setMessages((prev) => [...prev, newMsg]);
      onRefreshConversations();
      setTimeout(scrollToBottom, 60);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleQuickChip = (chipText: string) => {
    handleSendMessage(chipText);
  };

  if (conversations.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-slate-200/90 shadow-2xs space-y-4 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h3 className="font-extrabold text-xl text-slate-900">
          Nenhuma conversa aberta ainda
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
          Para iniciar uma conversa, navegue pelos anúncios de venda ou procura na cidade e clique no botão <strong>"Tenho interesse (Falar com anunciante)"</strong>.
        </p>
      </div>
    );
  }

  const quickReplies = isBuyer
    ? [
        'Olá, ainda está disponível?',
        'Aceita negociar o valor?',
        'Onde podemos combinar para retirar?',
        'Consigo buscar hoje!',
      ]
    : [
        'Olá! Está disponível sim!',
        'Podemos combinar no centro da cidade.',
        'Fechado! Que horas você consegue passar?',
      ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col md:flex-row h-[75vh] min-h-[520px]">
      {/* Sidebar: Lista de Conversas (Esconde no mobile quando o chat estiver ativo) */}
      <div
        className={`w-full md:w-80 border-r border-slate-200/80 flex flex-col bg-slate-50/60 shrink-0 ${
          !showMobileList ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-4 border-b border-slate-200/80 bg-white flex items-center justify-between">
          <div>
            <h2 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>Suas Conversas</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Chat direto entre moradores
            </p>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            {conversations.length}
          </span>
        </div>

        <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
          {conversations.map((conv) => {
            const partner =
              conv.buyer_id === currentUser.id ? conv.seller : conv.buyer;
            const isSelected = selectedConv?.id === conv.id;

            return (
              <button
                key={conv.id}
                onClick={() => {
                  onSelectConversation(conv.id);
                  setShowMobileList(false);
                }}
                className={`w-full p-3.5 text-left flex items-start gap-3 transition cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50/90 border-l-4 border-emerald-600'
                    : 'hover:bg-slate-100/70 bg-white'
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={
                      partner?.avatar_url ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
                    }
                    alt={partner?.nome || 'Usuário'}
                    className="w-11 h-11 rounded-2xl object-cover border border-slate-200"
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-bold text-xs text-slate-900 truncate">
                      {partner?.nome || 'Morador'}
                    </h4>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(conv.updated_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-[11px] font-semibold text-emerald-800 truncate mt-0.5 flex items-center gap-1">
                    <Tag className="w-3 h-3 shrink-0 text-emerald-600" />
                    <span>{conv.listing?.title || 'Anúncio'}</span>
                  </p>

                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {conv.last_message || 'Iniciou a conversa'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      {selectedConv ? (
        <div
          className={`flex-1 flex flex-col bg-white overflow-hidden ${
            showMobileList ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Chat Header */}
          <div className="p-3 sm:p-4 border-b border-slate-200/80 bg-white flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => setShowMobileList(true)}
                className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <img
                src={
                  otherUser?.avatar_url ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
                }
                alt=""
                className="w-10 h-10 rounded-2xl object-cover border border-slate-200 shrink-0"
              />

              <div className="min-w-0">
                <h3 className="font-bold text-sm text-slate-900 truncate">
                  {otherUser?.nome || 'Morador'}
                </h3>
                <p className="text-[11px] text-slate-500 truncate">
                  {otherUser?.cidade || 'São Luis do Paraitinga - SP'}
                </p>
              </div>
            </div>

            {/* Product Card Pill */}
            {selectedConv.listing && (
              <div
                onClick={() => onViewListing && onViewListing(selectedConv.listing as Listing)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition cursor-pointer max-w-[220px] shrink-0"
                title="Ver detalhes do anúncio"
              >
                {selectedConv.listing.images && selectedConv.listing.images.length > 0 && (
                  <img
                    src={selectedConv.listing.images[0]}
                    alt=""
                    className="w-7 h-7 rounded-lg object-cover shrink-0"
                  />
                )}
                <div className="min-w-0 hidden sm:block">
                  <p className="text-[11px] font-bold text-slate-800 truncate">
                    {selectedConv.listing.title}
                  </p>
                  <p className="text-[10px] font-extrabold text-emerald-700">
                    {selectedConv.listing.price
                      ? `R$ ${selectedConv.listing.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : 'A combinar'}
                  </p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </div>
            )}
          </div>

          {/* Banner de negociação segura */}
          <div className="bg-emerald-50/70 border-b border-emerald-100 px-4 py-2 flex items-center gap-1.5 text-[11px] text-emerald-900 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Negociação direta na cidade: combine a entrega ou retirada em locais públicos e movimentados.</span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3 bg-slate-50/40">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                Nenhuma mensagem enviada ainda. Envie uma mensagem para iniciar a conversa!
              </div>
            ) : (
              messages.map((m) => {
                const isMine =
                  m.sender_id === currentUser.id ||
                  (userEmail && m.sender_id === userEmail);

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 text-xs sm:text-sm font-medium shadow-2xs leading-relaxed ${
                        isMine
                          ? 'bg-emerald-600 text-white rounded-br-xs'
                          : 'bg-white border border-slate-200/90 text-slate-800 rounded-bl-xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.text}</p>
                      <div
                        className={`text-[9px] mt-1 text-right flex items-center justify-end gap-1 ${
                          isMine ? 'text-emerald-100' : 'text-slate-400'
                        }`}
                      >
                        <span>
                          {new Date(m.created_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isMine && <CheckCheck className="w-3 h-3" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies Chips */}
          <div className="px-3 pt-2 pb-1 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            <span className="text-[10px] text-slate-400 shrink-0 font-medium">Sugestões:</span>
            {quickReplies.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickChip(chip)}
                className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-xl whitespace-nowrap transition cursor-pointer border border-slate-200/80 shadow-2xs"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 sm:p-4 bg-white flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Digite sua mensagem para ${otherUser?.nome || 'o morador'}...`}
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-100 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 focus:outline-hidden text-slate-900 transition font-medium"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0 font-bold text-xs sm:text-sm"
            >
              <Send className="w-4 h-4" />
              <span>Enviar</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400 text-xs">
          Selecione uma conversa para visualizar as mensagens.
        </div>
      )}
    </div>
  );
};
