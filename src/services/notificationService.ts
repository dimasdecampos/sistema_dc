import { getSupabase } from '../lib/supabase';

/**
 * Avisos de mensagem nova.
 * - Com o site aberto: aviso do navegador (e no celular, via service worker).
 * - Com o site fechado: notificação push (precisa da função notify-message publicada no Supabase,
 *   que também guarda as chaves). No iPhone/iPad só funciona com o site instalado na Tela de Início.
 */

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
let cachedVapidKey: string | null = null;

export type NotificationState = 'unsupported' | 'default' | 'granted' | 'denied';

export function getNotificationState(): NotificationState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as NotificationState;
}

/** Este navegador sabe receber push (com o site fechado)? */
export function isPushConfigured(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Chave pública de push (VAPID), pedida à função notify-message no servidor.
 * Falha se a função ainda não foi publicada: nesse caso só valem os avisos com o site aberto.
 */
async function getVapidPublicKey(): Promise<string> {
  if (cachedVapidKey) return cachedVapidKey;
  const response = await fetch(`${SUPABASE_URL}/functions/v1/notify-message`, {
    headers: { apikey: SUPABASE_ANON_KEY },
  });
  if (!response.ok) throw new Error(`Função de push indisponível (${response.status}).`);
  const { publicKey } = (await response.json()) as { publicKey?: string };
  if (!publicKey) throw new Error('A função de push não devolveu a chave pública.');
  cachedVapidKey = publicKey;
  return publicKey;
}

/** iPhone/iPad: os avisos só funcionam depois de adicionar o site à Tela de Início */
export function needsIosInstall(): boolean {
  if (typeof navigator === 'undefined') return false;
  const isIos =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  return isIos && !standalone;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch (e) {
    console.warn('Não foi possível registrar o service worker:', e);
    return null;
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Cria (ou reaproveita) a inscrição de push deste aparelho e grava na conta atual */
async function subscribeToPush(): Promise<void> {
  if (!isPushConfigured()) return;
  const supabase = getSupabase();
  if (!supabase) return;

  await registerServiceWorker();
  const registration = await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(await getVapidPublicKey()),
    });
  }

  const json = subscription.toJSON();
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: subscription.endpoint,
    p_p256dh: json.keys?.p256dh,
    p_auth: json.keys?.auth,
    p_user_agent: navigator.userAgent.slice(0, 200),
  });
  if (error) throw new Error(error.message);
}

/** Pede permissão (precisa de um toque do usuário) e, se concedida, ativa o push neste aparelho */
export async function enableNotifications(): Promise<NotificationState> {
  if (!('Notification' in window)) return 'unsupported';
  const result = await Notification.requestPermission();
  if (result === 'granted') {
    try {
      await subscribeToPush();
    } catch (e) {
      console.warn('Avisos locais ativados, mas o push não pôde ser registrado:', e);
    }
  }
  return result as NotificationState;
}

/** Ao entrar: se a permissão já foi dada, garante que este aparelho está ligado à conta atual */
export async function syncPushSubscription(): Promise<void> {
  if (getNotificationState() !== 'granted') return;
  try {
    await subscribeToPush();
  } catch (e) {
    console.warn('Não foi possível sincronizar o push:', e);
  }
}

/** Ao sair da conta: desliga o push deste aparelho para a conta anterior não receber avisos aqui */
export async function disablePush(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    const supabase = getSupabase();
    await supabase?.rpc('remove_push_subscription', { p_endpoint: subscription.endpoint });
    await subscription.unsubscribe();
  } catch (e) {
    console.warn('Não foi possível desligar o push:', e);
  }
}

/**
 * Mostra um aviso do sistema. No celular precisa passar pelo service worker
 * (o construtor Notification é bloqueado no Android).
 */
export async function showLocalNotification(opts: {
  title: string;
  body: string;
  conversationId?: string;
}): Promise<boolean> {
  if (getNotificationState() !== 'granted') return false;
  const options: NotificationOptions = {
    body: opts.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: opts.conversationId ? `conv-${opts.conversationId}` : 'chat',
    data: { conversationId: opts.conversationId },
  };
  try {
    const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (registration) {
      await registration.showNotification(opts.title, options);
      return true;
    }
    new Notification(opts.title, options);
    return true;
  } catch (e) {
    console.warn('Não foi possível mostrar o aviso:', e);
    return false;
  }
}
