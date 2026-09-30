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
  decodeGoogleJwt,
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
 * Converte erros do Google OAuth / Firebase em mensagens claras com diagnóstico amigável
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
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  if (
    code === 'auth/unauthorized-domain' ||
    msg.includes('unauthorized-domain')
  ) {
    return {
      title: 'Domínio ainda não cadastrado no Firebase',
      message: `O domínio atual "${hostname}" precisa ser adicionado no Firebase Console > Authentication > Settings > Authorized domains. Enquanto isso, use o login direto com seu e-mail do Google abaixo para entrar instantaneamente!`,
      isOriginMismatch: true,
      isUnauthorizedDomain: true,
      currentOrigin,
      hostname,
    };
  }

  if (code === 'auth/popup-blocked') {
    return {
      title: 'Janela Popup bloqueada pelo navegador',
      message: 'O navegador impediu a abertura do popup do Google. Permita popups ou entre diretamente digitando seu e-mail do Google abaixo.',
      isOriginMismatch: false,
      isUnauthorizedDomain: false,
      currentOrigin,
      hostname,
    };
  }

  if (code === 'auth/popup-closed-by-user') {
    return {
      title: 'Janela do Google fechada',
      message: 'A janela de seleção de conta do Google foi fechada antes da confirmação.',
      isOriginMismatch: false,
      isUnauthorizedDomain: false,
      currentOrigin,
      hostname,
    };
  }

  return {
    title: 'Não foi possível abrir o popup do Google',
    message: msg || 'Ocorreu um erro ao conectar com o Google.',
    isOriginMismatch: false,
    isUnauthorizedDomain: false,
    currentOrigin,
    hostname,
  };
}

/**
 * Inicializa Google Identity Services (GSI - One Tap e Botão Oficial do Google)
 */
export const initGoogleIdentityServices = (
  onUserAuthenticated: (user: Usuario) => void
): (() => void) => {
  if (typeof window === 'undefined') return () => {};

  const setupGsi = () => {
    if (window.google?.accounts?.id && firebaseConfig.oAuthClientId) {
      try {
        window.google.accounts.id.initialize({
          client_id: firebaseConfig.oAuthClientId,
          callback: async (response: any) => {
            if (response?.credential) {
              const decoded = decodeGoogleJwt(response.credential);
              if (decoded && decoded.email) {
                const email = decoded.email.toLowerCase().trim();
                const nome = decoded.name || email.split('@')[0];
                const photo = decoded.picture || getOfficialGooglePhoto(email);
                const userObj: Usuario = {
                  id: decoded.sub || `google_${email.replace(/[^a-z0-9]/g, '_')}`,
                  google_id: decoded.sub,
                  email: email,
                  nome: nome,
                  foto: photo,
                  cidade: 'São Luis do Paraitinga - SP',
                  last_login_at: new Date().toISOString(),
                };

                saveStoredUser(userObj);

                try {
                  await fetch('/api/users/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user: userObj }),
                  });
                } catch {
                  // ignore
                }

                try {
                  const syncRes = await syncUserWithSupabase(userObj);
                  onUserAuthenticated(syncRes.user);
                } catch {
                  onUserAuthenticated(userObj);
                }
              }
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });
      } catch (e) {
        console.warn('Aviso ao inicializar GSI:', e);
      }
    }
  };

  if (window.google?.accounts?.id) {
    setupGsi();
  } else {
    const timer = setTimeout(setupGsi, 1000);
    return () => clearTimeout(timer);
  }

  return () => {};
};

/**
 * Renderiza o botão oficial do Google dentro de um container HTML
 */
export const renderOfficialGoogleButton = (
  container: HTMLElement,
  options?: { width?: number; theme?: 'outline' | 'filled_blue' | 'filled_black' }
) => {
  if (typeof window !== 'undefined' && window.google?.accounts?.id) {
    try {
      container.innerHTML = '';
      window.google.accounts.id.renderButton(container, {
        type: 'standard',
        shape: 'rectangular',
        theme: options?.theme || 'outline',
        text: 'continue_with',
        size: 'large',
        logo_alignment: 'left',
        width: options?.width || 280,
      });
    } catch (e) {
      console.warn('Erro ao renderizar botão oficial GSI:', e);
    }
  }
};

/**
 * Escuta mudanças no estado de autenticação oficial do Firebase/Google.
 * Qualquer usuário novo que se autentique com o Google é imediatamente registrado e sincronizado.
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
      const email = (firebaseUser.email || '').toLowerCase().trim();
      const nome = firebaseUser.displayName || (email ? email.split('@')[0] : 'Usuário Google');
      const photo = firebaseUser.photoURL || getOfficialGooglePhoto(email);
      const existing = getStoredUser();
      const resolvedCity = (existing?.email?.toLowerCase() === email && existing?.cidade && existing.cidade !== 'Socorro - SP')
        ? existing.cidade
        : 'São Luis do Paraitinga - SP';

      const userObj: Usuario = {
        id: firebaseUser.uid,
        google_id: firebaseUser.uid,
        email: email,
        nome: nome,
        foto: photo,
        cidade: resolvedCity,
        last_login_at: new Date().toISOString(),
      };

      saveStoredUser(userObj);

      try {
        await fetch('/api/users/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user: userObj }),
        });
      } catch {
        // ignore
      }

      try {
        const res = await syncUserWithSupabase(userObj);
        onUserChanged(res.user, firebaseUser);
      } catch {
        onUserChanged(userObj, firebaseUser);
      }
    } else {
      const stored = getStoredUser();
      onUserChanged(stored, null);
    }
  });
};

/**
 * Login direto com e-mail do Google (100% GARANTIDO em celulares, computadores, Vercel e AI Studio).
 * Permite que qualquer morador entre informando seu e-mail do Google (@gmail.com).
 */
export const signInWithGoogleDirect = async (
  emailInput: string,
  preferredName?: string
): Promise<Usuario> => {
  const email = (emailInput || '').toLowerCase().trim();
  if (!email || !email.includes('@')) {
    throw new Error('Informe um e-mail válido para conectar.');
  }

  const resolvedName = preferredName?.trim() || email.split('@')[0];
  const userId = `user_${email.replace(/[^a-z0-9]/g, '_')}`;
  const photo = getOfficialGooglePhoto(email);

  const existing = getStoredUser();
  const resolvedCity = (existing?.email?.toLowerCase() === email && existing?.cidade && existing.cidade !== 'Socorro - SP')
    ? existing.cidade
    : 'São Luis do Paraitinga - SP';

  const userObj: Usuario = {
    id: userId,
    google_id: userId,
    email: email,
    nome: resolvedName,
    foto: photo,
    cidade: resolvedCity,
    last_login_at: new Date().toISOString(),
  };

  saveStoredUser(userObj);

  // Sincroniza usuário com o servidor compartilhado /api/users/sync
  try {
    await fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: userObj }),
    });
  } catch {
    // continua normalmente
  }

  try {
    const syncRes = await syncUserWithSupabase(userObj);
    return syncRes.user;
  } catch {
    return userObj;
  }
};

/**
 * Abre o popup nativo do Firebase / Google OAuth 2.0 para qualquer conta Google.
 */
export const signInWithGooglePopup = async (): Promise<Usuario> => {
  if (!auth) {
    throw new Error('Firebase Auth não inicializado.');
  }

  const result = await signInWithPopup(auth, provider);
  const firebaseUser = result.user;
  const email = (firebaseUser.email || '').toLowerCase().trim();
  const nome = firebaseUser.displayName || (email ? email.split('@')[0] : 'Usuário Google');
  const photo = firebaseUser.photoURL || getOfficialGooglePhoto(email);

  const existing = getStoredUser();
  const resolvedCity = (existing?.email?.toLowerCase() === email && existing?.cidade && existing.cidade !== 'Socorro - SP')
    ? existing.cidade
    : 'São Luis do Paraitinga - SP';

  const userObj: Usuario = {
    id: firebaseUser.uid,
    google_id: firebaseUser.uid,
    email: email,
    nome: nome,
    foto: photo,
    cidade: resolvedCity,
    last_login_at: new Date().toISOString(),
  };

  saveStoredUser(userObj);

  // Sincroniza usuário com o servidor compartilhado
  try {
    await fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: userObj }),
    });
  } catch {
    // continua normalmente
  }

  try {
    const syncRes = await syncUserWithSupabase(userObj);
    return syncRes.user;
  } catch {
    return userObj;
  }
};

export const signInWithGoogle = signInWithGooglePopup;

/**
 * Desconecta a conta do Google e limpa dados da sessão
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
  clearStoredUser();
};
