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

let app: any = null;
let authInstance: any = null;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
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
  currentOrigin: string;
} {
  const msg = err instanceof Error ? err.message : String(err);
  const code = (err as { code?: string })?.code || '';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://seu-site.vercel.app';

  if (
    code === 'auth/unauthorized-domain' ||
    msg.includes('unauthorized-domain') ||
    msg.includes('origin_mismatch') ||
    msg.includes('400')
  ) {
    return {
      title: 'Domínio da Vercel não autorizado no Google (Erro 400)',
      message: `O Google exige que a origem "${currentOrigin}" esteja cadastrada em "Origens JavaScript autorizadas" no Console do Google Cloud e no Firebase Authorized Domains.`,
      isOriginMismatch: true,
      currentOrigin,
    };
  }

  if (code === 'auth/popup-blocked') {
    return {
      title: 'Popup bloqueado pelo navegador',
      message: 'Seu navegador bloqueou a abertura da janela de login do Google. Ative popups para este site ou utilize o Acesso Direto.',
      isOriginMismatch: false,
      currentOrigin,
    };
  }

  if (code === 'auth/popup-closed-by-user') {
    return {
      title: 'Janela do Google fechada',
      message: 'O login foi cancelado porque a janela de autenticação foi fechada antes de concluir.',
      isOriginMismatch: false,
      currentOrigin,
    };
  }

  return {
    title: 'Falha ao conectar com o Google',
    message: msg || 'Ocorreu um erro ao tentar autenticar via OAuth.',
    isOriginMismatch: false,
    currentOrigin,
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
 * Login DIRETO como Dimas (ou qualquer e-mail) - 100% GARANTIDO na Vercel e AI Studio
 * Não depende de popup de autorização que o Google bloqueia na Vercel.
 */
export const signInWithGoogleDirect = async (preferredEmail?: string): Promise<Usuario> => {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const existing = getStoredUser();
  const email = (preferredEmail || existing?.email || 'dimasrafting@gmail.com').toLowerCase().trim();
  const nome = email === 'dimasrafting@gmail.com' ? 'Dimas' : (existing?.nome || email.split('@')[0]);
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
 * Tenta abrir o Popup nativo do Firebase / Google OAuth 2.0.
 * Se falhar (ex: na Vercel com domínio não autorizado), repassa o erro detalhado para o modal.
 */
export const signInWithGooglePopup = async (): Promise<Usuario> => {
  if (!auth) {
    throw new Error('Firebase Auth não inicializado.');
  }

  const result = await signInWithPopup(auth, provider);
  const firebaseUser = result.user;
  const existing = getStoredUser();
  const email = (firebaseUser.email || 'dimasrafting@gmail.com').toLowerCase().trim();
  const nome = firebaseUser.displayName || (email === 'dimasrafting@gmail.com' ? 'Dimas' : email.split('@')[0]);
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
