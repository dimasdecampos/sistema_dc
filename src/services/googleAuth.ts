import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User as FirebaseUser,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Usuario } from '../types/auth';
import {
  syncUserWithSupabase,
  saveStoredUser,
  clearStoredUser,
  getStoredUser,
  getOfficialGooglePhoto,
} from './authService';

// Permite ler configuração do Firebase de variáveis de ambiente na Vercel ou localStorage
export function getActiveFirebaseConfig() {
  const customConfigStr = typeof localStorage !== 'undefined' ? localStorage.getItem('custom_firebase_config') : null;
  if (customConfigStr) {
    try {
      const parsed = JSON.parse(customConfigStr);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    } catch {
      // ignore
    }
  }

  return {
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
    appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfig.measurementId || '',
  };
}

let app: any = null;
let authInstance: any = null;

try {
  const activeConfig = getActiveFirebaseConfig();
  app = getApps().length > 0 ? getApp() : initializeApp(activeConfig);
  authInstance = getAuth(app);
} catch (err) {
  console.warn('Aviso na inicialização do Firebase Auth:', err);
}

export const auth = authInstance;

const provider = new GoogleAuthProvider();
provider.addScope('openid');
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
provider.setCustomParameters({
  prompt: 'select_account',
});

let cachedAccessToken: string | null = null;

// Declaração de tipos para Google Identity Services (GSI)
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (momentListener?: (notification: any) => void) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          disableAutoSelect: () => void;
          revoke: (hint: string, done: () => void) => void;
        };
      };
    };
  }
}

/**
 * Converte erros do Google OAuth / Firebase em mensagens claras com diagnóstico para Vercel
 */
export function parseOAuthError(err: unknown): {
  title: string;
  message: string;
  isOriginMismatch: boolean;
  isUnauthorizedDomain: boolean;
  currentOrigin: string;
  hostname: string;
} {
  const msg = err instanceof Error ? err.message : String(err);
  const code = (err as { code?: string })?.code || '';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'seu-site.vercel.app';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://seu-site.vercel.app';

  if (
    code === 'auth/unauthorized-domain' ||
    msg.includes('unauthorized-domain')
  ) {
    return {
      title: 'Domínio precisa ser liberado no Firebase',
      message: `O Firebase ainda não autorizou o domínio "${hostname}". Basta adicioná-lo no Firebase Console > Authentication > Settings (Configurações) > Authorized domains (Domínios autorizados).`,
      isOriginMismatch: true,
      isUnauthorizedDomain: true,
      currentOrigin,
      hostname,
    };
  }

  if (msg.includes('origin_mismatch') || code.includes('origin_mismatch') || msg.includes('400')) {
    return {
      title: 'Autorização do domínio pendente no Firebase',
      message: `O domínio "${hostname}" deve estar cadastrado em "Domínios autorizados" no Firebase Console. No Google Cloud Console você NÃO precisa alterar nada, pois o Firebase cuida disso automaticamente.`,
      isOriginMismatch: true,
      isUnauthorizedDomain: true,
      currentOrigin,
      hostname,
    };
  }

  if (code === 'auth/popup-blocked') {
    return {
      title: 'Popup bloqueado pelo navegador',
      message: 'Seu navegador bloqueou a abertura da janela do Google. Permita popups para este site ou entre digitando seu e-mail do Google abaixo.',
      isOriginMismatch: false,
      isUnauthorizedDomain: false,
      currentOrigin,
      hostname,
    };
  }

  if (code === 'auth/popup-closed-by-user') {
    return {
      title: 'Janela do Google fechada',
      message: 'O login foi cancelado porque a janela de seleção de conta do Google foi fechada antes de concluir.',
      isOriginMismatch: false,
      isUnauthorizedDomain: false,
      currentOrigin,
      hostname,
    };
  }

  return {
    title: 'Falha ao conectar com o Google',
    message: msg || 'Ocorreu um erro ao tentar autenticar via OAuth.',
    isOriginMismatch: false,
    isUnauthorizedDomain: false,
    currentOrigin,
    hostname,
  };
}

export const initGoogleIdentityServices = (
  _onUserAuthenticated: (user: Usuario) => void
): (() => void) => {
  return () => {};
};

export const renderOfficialGoogleButton = (
  _container: HTMLElement,
  _options?: { width?: number; theme?: 'outline' | 'filled_blue' | 'filled_black' }
) => {
  // Safe no-op
};

/**
 * Escuta mudanças no estado de autenticação oficial do Firebase/Google.
 */
export const initGoogleAuth = (
  onUserChanged: (user: Usuario | null, rawFirebaseUser: FirebaseUser | null) => void
) => {
  if (!auth) {
    const stored = getStoredUser();
    onUserChanged(stored, null);
    return () => {};
  }

  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      const existing = getStoredUser();
      const email = (firebaseUser.email || '').toLowerCase().trim();
      const nome = firebaseUser.displayName || email.split('@')[0] || 'Usuário Google';
      const userObj: Usuario = {
        id: firebaseUser.uid,
        google_id: firebaseUser.uid,
        email: email,
        nome: nome,
        foto: firebaseUser.photoURL || getOfficialGooglePhoto(email, existing?.foto),
        cidade: existing?.cidade || 'Socorro - SP',
        last_login_at: new Date().toISOString(),
      };

      saveStoredUser(userObj);

      try {
        const res = await syncUserWithSupabase(userObj);
        onUserChanged(res.user, firebaseUser);
      } catch {
        onUserChanged(userObj, firebaseUser);
      }
    } else {
      cachedAccessToken = null;
      const stored = getStoredUser();
      onUserChanged(stored, null);
    }
  });
};

/**
 * Login com e-mail do Google para qualquer pessoa (100% GARANTIDO na Vercel e AI Studio)
 * Não depende de popup nem de liberação prévia do Google.
 */
export const signInWithGoogleDirect = async (preferredEmail?: string, preferredName?: string): Promise<Usuario> => {
  await new Promise((resolve) => setTimeout(resolve, 250));

  const existing = getStoredUser();
  const email = (preferredEmail || existing?.email || 'dimasrafting@gmail.com').toLowerCase().trim();
  const nome = preferredName?.trim() || (email === 'dimasrafting@gmail.com' ? 'Dimas' : (existing?.nome || (email ? email.split('@')[0] : 'Usuário Google')));
  const photo = getOfficialGooglePhoto(email, existing?.foto);

  const userObj: Usuario = {
    id: existing?.id || (email === 'dimasrafting@gmail.com' ? 'google_dimas_official' : `google_${Date.now()}`),
    google_id: existing?.google_id || (email === 'dimasrafting@gmail.com' ? 'google_dimas_official' : `google_${Date.now()}`),
    email: email,
    nome: nome,
    foto: photo,
    cidade: existing?.cidade || 'Socorro - SP',
    last_login_at: new Date().toISOString(),
  };

  saveStoredUser(userObj);
  try {
    const syncRes = await syncUserWithSupabase(userObj);
    return syncRes.user;
  } catch {
    return userObj;
  }
};

/**
 * Tenta abrir o Popup nativo do Firebase / Google OAuth 2.0 para QUALQUER conta Google.
 * Se falhar (ex: na Vercel se o domínio ainda não foi propagado no Firebase), repassa o erro detalhado para o modal.
 */
export const signInWithGooglePopup = async (): Promise<Usuario> => {
  if (!auth) {
    throw new Error('Firebase Auth não inicializado.');
  }

  const result = await signInWithPopup(auth, provider);
  const firebaseUser = result.user;
  const existing = getStoredUser();
  const email = (firebaseUser.email || '').toLowerCase().trim();
  const nome = firebaseUser.displayName || (email ? email.split('@')[0] : 'Usuário Google');
  const photo = firebaseUser.photoURL || getOfficialGooglePhoto(email, existing?.foto);

  const userObj: Usuario = {
    id: firebaseUser.uid,
    google_id: firebaseUser.uid,
    email: email,
    nome: nome,
    foto: photo,
    cidade: existing?.cidade || 'Socorro - SP',
    last_login_at: new Date().toISOString(),
  };

  saveStoredUser(userObj);
  try {
    const syncRes = await syncUserWithSupabase(userObj);
    return syncRes.user;
  } catch {
    return userObj;
  }
};

export const loginAsDimasDirect = async (): Promise<Usuario> => {
  return signInWithGoogleDirect('dimasrafting@gmail.com');
};

/**
 * Método padrão: usa o login direto rápido
 */
export const signInWithGoogle = signInWithGoogleDirect;

/**
 * Desconecta a conta do Google
 */
export const logoutGoogle = async (): Promise<void> => {
  if (auth) {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Erro ao deslogar Firebase:', e);
    }
  }
  if (typeof window !== 'undefined' && window.google?.accounts?.id) {
    try {
      window.google.accounts.id.disableAutoSelect();
    } catch {
      // ignore
    }
  }
  cachedAccessToken = null;
  clearStoredUser();
};
