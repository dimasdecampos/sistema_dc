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
} from 'lucide-react';
import { Conversation, Message, UserProfile } from '../types/marketplace';
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
}

export const ConversationsView: React.FC<ConversationsViewProps> = ({
  conversations,
  activeConversationId,
  currentUser,
  onSelectConversation,
  onRefreshConversations,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedConv =
    conversations.find((c) => c.id === activeConversationId) ||
    conversations[0];

  useEffect(() => {
    if (selectedConv) {
      fetchConversationMessages(selectedConv.id).then((msgs) => {
        setMessages(msgs);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      });
    }
  }, [selectedConv?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedConv) return;

    const text = inputText.trim();
    setInputText('');
    setIsLoading(true);

    try {
      const newMsg = await sendMessage(selectedConv.id, currentUser.id, text);
      setMessages((prev) => [...prev, newMsg]);
      onRefreshConversations();
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } finally {
      setIsLoading(false);
    }
  };

  if (conversations.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-2xs space-y-4 max-w-xl mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
          <MessageSquare className="w-7 h-7" />
        </div>
        <h3 className="font-extrabold text-lg text-slate-900">
          Nenhuma conversa aberta ainda
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Quando você encontrar um produto compatível nas recomendações ou alguém se interessar pelo seu anúncio, as mensagens entre vocês aparecerão aqui.
        </p>
      </div>
    );
  }

  const otherUser =
    selectedConv?.buyer_id === currentUser.id
      ? selectedConv?.seller
      : selectedConv?.buyer;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col md:flex-row h-[72vh] min-h-[500px]">
      {/* Sidebar: Lista de Conversas */}
      <div className="w-full md:w-80 border-r border-slate-200/80 flex flex-col bg-slate-50/50 shrink-0">
        <div className="p-4 border-b border-slate-200/80 bg-white">
          <h2 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>Suas Conversas</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Negociação direta entre moradores
          </p>
        </div>

        <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
          {conversations.map((conv) => {
            const partner =
              conv.buyer_id === currentUser.id ? conv.seller : conv.buyer;
            const isSelected = selectedConv?.id === conv.id;

            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full p-3.5 text-left flex items-start gap-3 transition cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50/80 border-l-4 border-emerald-600'
                    : 'hover:bg-slate-100/70'
                }`}
              >
                <img
                  src={
                    partner?.avatar_url ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
                  }
                  alt={partner?.nome || 'Usuário'}
                  className="w-10 h-10 rounded-2xl object-cover border border-slate-200 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-slate-900 truncate">
                      {partner?.nome || 'Morador'}
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      {new Date(conv.updated_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-[11px] font-semibold text-emerald-800 truncate mt-0.5">
                    {conv.listing?.title || 'Anúncio'}
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
      {selectedConv && (
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {/* Top Bar of Active Conversation */}
          <div className="p-3.5 sm:p-4 border-b border-slate-200/80 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={
                  otherUser?.avatar_url ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
                }
                alt={otherUser?.nome || 'Usuário'}
                className="w-10 h-10 rounded-2xl object-cover border border-slate-200 shrink-0"
              />
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-slate-900 leading-tight truncate">
                  {otherUser?.nome || 'Morador'}
                </h3>
                <p className="text-[11px] text-slate-500 truncate">
                  Referente a: <strong>{selectedConv.listing?.title}</strong>
                </p>
              </div>
            </div>

            {selectedConv.listing?.price != null && (
              <span className="text-sm font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-xl shrink-0">
                R${' '}
                {selectedConv.listing.price.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}
              </span>
            )}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3 bg-slate-50/50">
            {/* Info notice */}
            <div className="text-center my-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-emerald-100/70 text-emerald-800">
                Conversa segura • Combine a entrega ou retirada em local público
              </span>
            </div>

            {messages.map((m) => {
              const isMine = m.sender_id === currentUser.id;

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] sm:max-w-[70%] rounded-2xl p-3 text-xs sm:text-sm font-medium shadow-2xs leading-relaxed ${
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
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 sm:p-4 border-t border-slate-200/80 bg-white flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Digite sua mensagem para o morador..."
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-100 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 focus:outline-hidden text-slate-900 transition"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="p-2.5 sm:px-4 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-bold">Enviar</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
