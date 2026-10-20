import { useEffect } from 'react';
import { getSupabase } from '../lib/supabase';
import { registerServiceWorker, syncPushSubscription } from '../services/notificationService';

const BASE_TITLE = 'TemAqui - Marketplace de Procura e Oferta';

interface Options {
  userId: string;
  totalUnread: number;
  /** Recarrega os dados em segundo plano (chega mensagem nova) */
  reload: () => void;
  /** Abre a conversa (ou a lista, sem id) */
  openChat: (conversationId?: string | null) => void;
}

/**
 * Tudo que mantém o chat "vivo" fora da tela de conversas: contador no título da aba,
 * mensagens novas em tempo real, service worker/push e abertura por notificação (/?chat=ID).
 */
export function useChatNotifications({ userId, totalUnread, reload, openChat }: Options) {
  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) ${BASE_TITLE}` : BASE_TITLE;
  }, [totalUnread]);

  // Depende do Realtime ligado para a tabela messages; sem ele, a atualização periódica cobre.
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !userId) return;

    // Várias mensagens em sequência viram uma única recarga
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel(`messages-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(reload, 400);
      })
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [userId, reload]);

  useEffect(() => {
    void registerServiceWorker();
  }, []);

  useEffect(() => {
    if (userId) void syncPushSubscription();
  }, [userId]);

  // Site já aberto: o service worker avisa; site fechado: link /?chat=ID
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'open-chat') openChat(event.data.conversationId);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [openChat]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('chat')) return;
    openChat(params.get('chat'));
    window.history.replaceState(null, '', window.location.pathname + window.location.hash);
  }, [openChat]);
}

