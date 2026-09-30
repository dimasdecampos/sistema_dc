import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  User,
  Tag,
  Search,
  ArrowLeft,
  Clock,
  Sparkles,
  CheckCheck,
  Phone,
  ShieldCheck,
  ExternalLink,
  Bot,
  UserCheck,
  Smile,
  RefreshCw,
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
}

export const ConversationsView: React.FC<ConversationsViewProps> = ({
  conversations,
  activeConversationId,
  currentUser,
  onSelectConversation,
  onRefreshConversations,
  onViewListing,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string>('');
  const [showMobileList, setShowMobileList] = useState(!activeConversationId);
  const [isTestAsOtherUser, setIsTestAsOtherUser] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedConv =
    conversations.find((c) => c.id === activeConversationId) ||
    conversations[0];

  // Identifica quem é o outro participante da conversa (verifica id e e-mail)
  const userEmail = (currentUser.email || '').toLowerCase().trim();
  const buyerEmail = (selectedConv?.buyer?.email || '').toLowerCase().trim();
  const isBuyer =
    (Boolean(currentUser.id) && selectedConv?.buyer_id === currentUser.id) ||
    (Boolean(userEmail) && Boolean(buyerEmail) && userEmail === buyerEmail);

  const otherUser = isBuyer ? selectedConv?.seller : selectedConv?.buyer;
  const activeSender = isTestAsOtherUser ? otherUser : currentUser;

  // Carrega mensagens e sincroniza a cada 2.5s para chat em tempo real entre dois usuários
  useEffect(() => {
    if (selectedConv) {
      fetchConversationMessages(selectedConv.id).then((msgs) => {
        setMessages(msgs);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 120);
      });
      // Em mobile, ao selecionar conversa, abre a tela de chat
      setShowMobileList(false);

      const msgInterval = setInterval(() => {
        fetchConversationMessages(selectedConv.id).then((freshMsgs) => {
          setMessages((prev) => {
            if (freshMsgs.length !== prev.length || (freshMsgs.length > 0 && freshMsgs[freshMsgs.length - 1].id !== prev[prev.length - 1]?.id)) {
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

  // Resposta simulada inteligente do vendedor ou comprador
  const triggerAutomatedReply = (userMessage: string, conv: Conversation) => {
    const responder = isBuyer ? conv.seller : conv.buyer;
    if (!responder) return;

    const responderName = responder.nome || 'Vendedor';
    setTypingUser(responderName);
    setIsTyping(true);

    const lower = userMessage.toLowerCase();
    let replyText = '';

    if (lower.includes('disponível') || lower.includes('ainda tem')) {
      replyText = `Olá! Sim, ainda está disponível! Encontra-se em excelente estado. Podemos combinar para você ver ou retirar no centro?`;
    } else if (lower.includes('valor') || lower.includes('menor') || lower.includes('desconto') || lower.includes('preço')) {
      replyText = `Consigo fazer um pequeno desconto se for pagamento via Pix e você retirar hoje. O que acha?`;
    } else if (lower.includes('onde') || lower.includes('retirar') || lower.includes('bairro') || lower.includes('lugar')) {
      replyText = `Podemos nos encontrar na praça central da matriz ou no comércio do centro, fica bem prático e seguro para nós dois!`;
    } else if (lower.includes('hoje') || lower.includes('buscar') || lower.includes('hora') || lower.includes('horário')) {
      replyText = `Perfeito! Posso por volta das 17h30 ou 18h no ponto combinado. Fico no seu aguardo!`;
    } else if (lower.includes('sim') || lower.includes('fechado') || lower.includes('vou querer')) {
      replyText = `Maravilha! Negócio fechado. Vou deixar reservado para você. Até mais!`;
    } else {
      replyText = `Olá! Obrigado pelo contato referente ao anúncio "${conv.listing?.title || 'item'}". Qualquer dúvida ou para combinarmos a entrega, estou à disposição!`;
    }

    setTimeout(async () => {
      try {
        const replyMsg = await sendMessage(conv.id, responder.id, replyText);
        setMessages((prev) => [...prev, replyMsg]);
        setIsTyping(false);
        onRefreshConversations();
        setTimeout(scrollToBottom, 60);
      } catch (err) {
        console.error('Erro na resposta do chat:', err);
        setIsTyping(false);
      }
    }, 1400);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !selectedConv || !activeSender) return;

    setInputText('');
    setIsLoading(true);

    try {
      const newMsg = await sendMessage(selectedConv.id, activeSender.id, text);
      setMessages((prev) => [...prev, newMsg]);
      onRefreshConversations();
      setTimeout(scrollToBottom, 60);

      // Se a mensagem foi enviada pelo usuário real, aciona resposta automática do vendedor após 1.4s
      if (!isTestAsOtherUser && otherUser) {
        triggerAutomatedReply(text, selectedConv);
      }
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleQuickChip = (chipText: string) => {
    handleSendMessage(chipText);
  };

  const handleSimulateSellerReply = () => {
    if (!selectedConv || !otherUser) return;
    triggerAutomatedReply('Olá, gostaria de combinar os detalhes da compra!', selectedConv);
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
          Para iniciar uma conversa, navegue pelos anúncios de venda ou procura na cidade e clique no botão <strong>"Tenho interesse (Iniciar conversa com vendedor)"</strong>.
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
              Chat direto entre comprador e vendedor
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
          {/* Top Bar of Active Conversation */}
          <div className="p-3.5 sm:p-4 border-b border-slate-200/80 flex items-center justify-between bg-white shrink-0 gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Mobile Back Button */}
              <button
                type="button"
                onClick={() => setShowMobileList(true)}
                className="md:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                title="Voltar para lista de conversas"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="relative shrink-0">
                <img
                  src={
                    otherUser?.avatar_url ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
                  }
                  alt={otherUser?.nome || 'Usuário'}
                  className="w-10 h-10 rounded-2xl object-cover border border-slate-200"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm text-slate-900 leading-tight truncate">
                    {otherUser?.nome || 'Morador'}
                  </h3>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md font-semibold">
                    {isBuyer ? 'Vendedor' : 'Comprador'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Online agora • {otherUser?.cidade || 'São Luis do Paraitinga - SP'}</span>
                </p>
              </div>
            </div>

            {/* Ações e Produto negociado */}
            <div className="flex items-center gap-2 shrink-0">
              {selectedConv.listing && (
                <div
                  onClick={() => onViewListing?.(selectedConv.listing!)}
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer transition max-w-[160px] sm:max-w-xs"
                  title="Ver anúncio completo"
                >
                  {selectedConv.listing.images?.[0] && (
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

              {/* Botão de teste: simular resposta rápida do vendedor */}
              <button
                type="button"
                onClick={handleSimulateSellerReply}
                disabled={isTyping}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-xl transition cursor-pointer disabled:opacity-50"
                title="Simula uma resposta rápida automática do vendedor"
              >
                <Bot className="w-3.5 h-3.5 text-emerald-600" />
                <span>Simular resposta</span>
              </button>
            </div>
          </div>

          {/* Banner de negociação segura */}
          <div className="bg-emerald-50/70 border-b border-emerald-100 px-4 py-2 flex items-center justify-between text-[11px] text-emerald-900 shrink-0">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Negociação direta na cidade: combine a entrega ou retirada em locais públicos e movimentados.</span>
            </div>
            {/* Alternar teste de envio como vendedor */}
            <button
              type="button"
              onClick={() => setIsTestAsOtherUser(!isTestAsOtherUser)}
              className="text-[10px] font-bold text-emerald-800 hover:underline cursor-pointer shrink-0 ml-2"
            >
              {isTestAsOtherUser ? '← Digitando como Vendedor' : 'Alternar para responder'}
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3 bg-slate-50/40">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                Nenhuma mensagem enviada ainda. Envie uma mensagem para iniciar a negociação!
              </div>
            ) : (
              messages.map((m) => {
                const isMine =
                  m.sender_id === currentUser.id ||
                  (isBuyer
                    ? m.sender_id === selectedConv?.buyer_id
                    : m.sender_id === selectedConv?.seller_id);

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

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 text-xs text-slate-500 animate-in fade-in">
                <img
                  src={
                    otherUser?.avatar_url ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
                  }
                  alt=""
                  className="w-6 h-6 rounded-full object-cover"
                />
                <div className="bg-white border border-slate-200 rounded-2xl px-3 py-1.5 flex items-center gap-1.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[10px] text-slate-400 ml-1">{typingUser} está digitando...</span>
                </div>
              </div>
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
              placeholder={
                isTestAsOtherUser
                  ? `Responder como ${activeSender?.nome || 'outro usuário'}...`
                  : `Digite sua mensagem para ${otherUser?.nome || 'o morador'}...`
              }
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
