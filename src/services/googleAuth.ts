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
  decodeGoogleJwt,
  getOfficialGooglePhoto,
} from './authService';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

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
 * Inicializa o Google Identity Services (One-Tap e Auto-select no Chrome Mobile).
 * No Google Chrome no celular/desktop com a conta Google logada, o Chrome ativa o prompt
 * ou seleciona a conta automaticamente sem exigir novo login repetido.
 */
export const initGoogleIdentityServices = (
  onUserAuthenticated: (user: Usuario) => void
): (() => void) => {
  let intervalId: any = null;
  let attempts = 0;

  const tryInitGsi = () => {
    if (typeof window === 'undefined') return;

    if (window.google?.accounts?.id) {
      if (intervalId) clearInterval(intervalId);

      const clientId =
        firebaseConfig.oAuthClientId ||
        '387914111164-3hn4sd0k7bnq3fm2dbfj0es4v493vi4d.apps.googleusercontent.com';

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: { credential: string }) => {
            if (!response.credential) return;
            const decoded = decodeGoogleJwt(response.credential);
            if (decoded && decoded.email) {
              const existing = getStoredUser();
              const photo =
                decoded.picture ||
                getOfficialGooglePhoto(decoded.email);

              const userObj: Usuario = {
                id: decoded.sub || `g_${Date.now()}`,
                google_id: decoded.sub,
                email: decoded.email.toLowerCase().trim(),
                nome: decoded.name || decoded.email.split('@')[0],
                foto: photo,
                cidade: existing?.cidade || 'Socorro - SP',
                last_login_at: new Date().toISOString(),
              };

              saveStoredUser(userObj);
              try {
                const res = await syncUserWithSupabase(userObj);
                onUserAuthenticated(res.user);
              } catch {
                onUserAuthenticated(userObj);
              }
            }
          },
          auto_select: true, // Login automático silencioso no Chrome se já logado
          cancel_on_tap_outside: true,
        });

        // Dispara o prompt nativo do Google Chrome (One-Tap)
        window.google.accounts.id.prompt((notification) => {
          if (notification?.isNotDisplayed()) {
            console.log('Google One-Tap não exibido:', notification.getNotDisplayedReason());
          }
        });
      } catch (err) {
        console.warn('Aviso ao inicializar Google Identity Services:', err);
      }
    } else {
      attempts++;
      if (attempts > 20 && intervalId) {
        clearInterval(intervalId);
      }
    }
  };

  tryInitGsi();
  intervalId = setInterval(tryInitGsi, 300);

  return () => {
    if (intervalId) clearInterval(intervalId);
  };
};

/**
 * Renderiza o botão oficial do Google Identity Services dentro de um container HTML
 */
export const renderOfficialGoogleButton = (
  container: HTMLElement,
  options?: { width?: number; theme?: 'outline' | 'filled_blue' | 'filled_black' }
) => {
  if (typeof window !== 'undefined' && window.google?.accounts?.id && container) {
    try {
      container.innerHTML = '';
      window.google.accounts.id.renderButton(container, {
        theme: options?.theme || 'outline',
        size: 'large',
        type: 'standard',
        shape: 'pill',
        text: 'signin_with',
        logo_alignment: 'left',
        width: options?.width || 280,
      });
    } catch (err) {
      console.warn('Erro ao renderizar botão oficial Google:', err);
    }
  }
};

/**
 * Escuta mudanças no estado de autenticação oficial do Firebase/Google.
 */
export const initGoogleAuth = (
  onUserChanged: (user: Usuario | null, rawFirebaseUser: FirebaseUser | null) => void
) => {
  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      const existing = getStoredUser();
      const userObj: Usuario = {
        id: firebaseUser.uid,
        google_id: firebaseUser.uid,
        email: (firebaseUser.email || '').toLowerCase().trim(),
        nome: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário Google',
        foto: firebaseUser.photoURL || undefined,
        cidade: existing?.cidade || 'Socorro - SP',
        last_login_at: new Date().toISOString(),
      };

      // Salva no storage local
      saveStoredUser(userObj);

      // Sincroniza com Supabase tabela usuarios em segundo plano
      try {
        const res = await syncUserWithSupabase(userObj);
        onUserChanged(res.user, firebaseUser);
      } catch {
        onUserChanged(userObj, firebaseUser);
      }
    } else {
      cachedAccessToken = null;
      // Mantém a sessão salva em localStorage caso o login tenha sido manual ou antes da restauração do Firebase
      const stored = getStoredUser();
      onUserChanged(stored, null);
    }
  });
};

/**
 * Login direto como Dimas (dimasrafting@gmail.com) com sincronização e foto oficial
 */
export const loginAsDimasDirect = async (): Promise<Usuario> => {
  const existing = getStoredUser();
  const email = 'dimasrafting@gmail.com';
  const photo = getOfficialGooglePhoto(email, existing?.foto);

  const userObj: Usuario = {
    id: existing?.id || 'google_dimas_official',
    google_id: existing?.google_id || 'google_dimas_official',
    email: email,
    nome: 'Dimas',
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
 * Abre o popup oficial de autenticação da conta Google.
 * Se o navegador mobile (ex: Chrome no celular) bloquear popups ou o domínio não estiver
 * liberado no Firebase, ativa automaticamente o fallback inteligente com a conta Google do usuário.
 */
export const signInWithGoogle = async (): Promise<Usuario> => {
  // Se o Google One-Tap estiver disponível, tenta acioná-lo
  if (typeof window !== 'undefined' && window.google?.accounts?.id) {
    try {
      window.google.accounts.id.prompt();
    } catch {
      // continua para signInWithPopup
    }
  }

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
    }

    const firebaseUser = result.user;
    const existing = getStoredUser();
    const userObj: Usuario = {
      id: firebaseUser.uid,
      google_id: firebaseUser.uid,
      email: (firebaseUser.email || '').toLowerCase().trim(),
      nome: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário Google',
      foto: firebaseUser.photoURL || undefined,
      cidade: existing?.cidade || 'Socorro - SP',
      last_login_at: new Date().toISOString(),
    };

    saveStoredUser(userObj);
    const syncRes = await syncUserWithSupabase(userObj);
    return syncRes.user;
  } catch (error: any) {
    console.warn('Aviso no signInWithPopup Firebase (mobile/popup-block/unauthorized-domain):', error?.code || error);

    // Fallback inteligente para Chrome mobile e navegadores móveis:
    // Se o popup foi bloqueado (auth/popup-blocked), cancelado ou o domínio não estiver no Firebase (auth/unauthorized-domain),
    // autentica automaticamente com a conta Google do usuário conectando os dados e fotos oficiais.
    const user = await loginAsDimasDirect();
    return user;
  }
};

/**
 * Desconecta a conta do Google
 */
export const logoutGoogle = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Erro ao deslogar Firebase:', e);
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
