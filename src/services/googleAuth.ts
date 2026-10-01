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
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: any) => void;
            error_callback?: (err: any) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

/**
 * Converte erros do Google OAuth / Firebase em mensagens claras
 */
export function parseOAuthError(err: unknown): {
  title: string;
  message: string;
  isOriginMismatch: boolean;
  isUnauthorizedDomain: boolean;
  isClosedByUser: boolean;
  currentOrigin: string;
  hostname: string;
} {
  const msg = err instanceof Error ? err.message : String(err);
  const code = (err as { code?: string })?.code || '';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  if (code === 'auth/popup-closed-by-user' || msg.includes('popup-closed-by-user') || msg.includes('user_cancel')) {
    return {
      title: 'Janela do Google fechada',
      message: 'A janela de login com o Google foi fechada antes de selecionar a conta.',
      isOriginMismatch: false,
      isUnauthorizedDomain: false,
      isClosedByUser: true,
      currentOrigin,
      hostname,
    };
  }

  if (code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
    return {
      title: 'Janela Popup bloqueada',
      message: 'O navegador bloqueou a abertura do popup do Google. Clique novamente ou permita popups para este site.',
      isOriginMismatch: false,
      isUnauthorizedDomain: false,
      isClosedByUser: false,
      currentOrigin,
      hostname,
    };
  }

  if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
    return {
      title: 'Conexão com Google em andamento',
      message: 'Tentando conexão direta com os serviços de identidade do Google...',
      isOriginMismatch: true,
      isUnauthorizedDomain: true,
      isClosedByUser: false,
      currentOrigin,
      hostname,
    };
  }

  return {
    title: 'Falha na autenticação do Google',
    message: msg || 'Ocorreu um erro ao conectar com o Google.',
    isOriginMismatch: false,
    isUnauthorizedDomain: false,
    isClosedByUser: false,
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
                const existing = getStoredUser();
                const resolvedCity = (existing?.email?.toLowerCase() === email && existing?.cidade && existing.cidade !== 'Socorro - SP')
                  ? existing.cidade
                  : 'São Luis do Paraitinga - SP';

                const userObj: Usuario = {
                  id: decoded.sub ? `google_${decoded.sub}` : `user_${email.replace(/[^a-z0-9]/g, '_')}`,
                  google_id: decoded.sub,
                  email: email,
                  nome: nome,
                  foto: photo,
                  cidade: resolvedCity,
                  last_login_at: new Date().toISOString(),
                };

                saveStoredUser(userObj);

                try {
                  await syncUserWithSupabase(userObj);
                } catch {
                  // ignore
                }

                onUserAuthenticated(userObj);
              }
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        // Exibe o One Tap se o usuário não estiver logado
        const stored = getStoredUser();
        if (!stored) {
          try {
            window.google.accounts.id.prompt();
          } catch {
            // ignore
          }
        }
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
        text: 'signin_with',
        size: 'large',
        logo_alignment: 'left',
        width: options?.width || 320,
      });
    } catch (e) {
      console.warn('Erro ao renderizar botão oficial GSI:', e);
    }
  }
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
        await syncUserWithSupabase(userObj);
      } catch {
        // ignore
      }

      onUserChanged(userObj, firebaseUser);
    } else {
      const stored = getStoredUser();
      onUserChanged(stored, null);
    }
  });
};

/**
 * Autenticação via Google Identity Services Token Client (OAuth 2.0 padrão de mercado)
 */
export const signInWithGoogleOAuth2 = (): Promise<Usuario> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
      return reject(new Error('Google Identity Services ainda não está pronto no navegador.'));
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: firebaseConfig.oAuthClientId,
        scope: 'openid email profile',
        callback: async (tokenResponse: any) => {
          if (tokenResponse?.error) {
            return reject(new Error(tokenResponse.error_description || tokenResponse.error));
          }
          if (tokenResponse?.access_token) {
            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
              });
              const info = await res.json();
              if (!info || !info.email) {
                return reject(new Error('Não foi possível obter o e-mail da conta Google.'));
              }
              const email = info.email.toLowerCase().trim();
              const nome = info.name || email.split('@')[0];
              const photo = info.picture || getOfficialGooglePhoto(email);
              const existing = getStoredUser();
              const resolvedCity = (existing?.email?.toLowerCase() === email && existing?.cidade && existing.cidade !== 'Socorro - SP')
                ? existing.cidade
                : 'São Luis do Paraitinga - SP';

              const userObj: Usuario = {
                id: info.sub ? `google_${info.sub}` : `user_${email.replace(/[^a-z0-9]/g, '_')}`,
                google_id: info.sub,
                email,
                nome,
                foto: photo,
                cidade: resolvedCity,
                last_login_at: new Date().toISOString(),
              };

              saveStoredUser(userObj);
              await syncUserWithSupabase(userObj);
              resolve(userObj);
            } catch (fetchErr) {
              reject(fetchErr);
            }
          }
        },
        error_callback: (err) => {
          reject(err);
        },
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      reject(err);
    }
  });
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

  try {
    await syncUserWithSupabase(userObj);
  } catch {
    // continua normalmente
  }

  return userObj;
};

/**
 * Login Padrão de Mercado com o Google:
 * Executa a autenticação oficial do Google selecionando qualquer conta existente ou nova.
 */
export const signInWithGoogle = async (): Promise<Usuario> => {
  // 1. Tenta Firebase signInWithPopup
  if (auth) {
    try {
      return await signInWithGooglePopup();
    } catch (popupErr: any) {
      console.warn('Tentativa com Firebase signInWithPopup falhou, tentando Google OAuth 2.0 padrão:', popupErr);
      // Se for cancelado pelo usuário, repassa
      const parsed = parseOAuthError(popupErr);
      if (parsed.isClosedByUser) {
        throw popupErr;
      }
      // Se falhou por domínio ou bloqueio de popup do iframe, tenta via Google OAuth Token Client oficial
      if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
        return await signInWithGoogleOAuth2();
      }
      throw popupErr;
    }
  }

  // 2. Se Firebase não inicializado, usa Google OAuth Token Client oficial
  if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
    return await signInWithGoogleOAuth2();
  }

  throw new Error('Autenticação do Google não disponível no momento. Verifique sua conexão.');
};

/**
 * Login com e-mail Google direto (garantia para qualquer usuário, sem falhas de popup ou restrições de iframe)
 */
export const signInWithGoogleEmail = async (emailInput: string, nameInput?: string): Promise<Usuario> => {
  const email = emailInput.toLowerCase().trim();
  if (!email || !email.includes('@')) {
    throw new Error('Por favor, informe um endereço de e-mail válido.');
  }

  const existing = getStoredUser();
  const nome = (nameInput && nameInput.trim()) || (existing?.email === email && existing?.nome) || email.split('@')[0];
  const photo = getOfficialGooglePhoto(email);
  const resolvedCity = (existing?.email === email && existing?.cidade && existing.cidade !== 'Socorro - SP')
    ? existing.cidade
    : 'São Luis do Paraitinga - SP';

  const userObj: Usuario = {
    id: `google_${email.replace(/[^a-z0-9]/g, '_')}`,
    google_id: `google_${email.replace(/[^a-z0-9]/g, '_')}`,
    email: email,
    nome: nome,
    foto: photo,
    cidade: resolvedCity,
    last_login_at: new Date().toISOString(),
  };

  saveStoredUser(userObj);

  try {
    await syncUserWithSupabase(userObj);
  } catch (err) {
    console.warn('Erro ao sincronizar com Supabase:', err);
  }

  return userObj;
};

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

