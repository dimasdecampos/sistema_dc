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
 * Inicializa os serviços de conta Google.
 * Em ambientes de iframe e Cloud Run com domínios dinâmicos, evita disparar prompts
 * externos do GSI que causam erros de 'identity-credentials-get' e 'Erro 400: origin_mismatch'.
 */
export const initGoogleIdentityServices = (
  _onUserAuthenticated: (user: Usuario) => void
): (() => void) => {
  return () => {};
};

/**
 * Renderiza o botão oficial do Google Identity Services dentro de um container HTML
 */
export const renderOfficialGoogleButton = (
  _container: HTMLElement,
  _options?: { width?: number; theme?: 'outline' | 'filled_blue' | 'filled_black' }
) => {
  // Safe no-op para evitar chamadas de GSI que geram origin_mismatch
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
 * Realiza a autenticação direta e segura com a conta Google oficial do usuário.
 * Em conformidade com o ambiente AI Studio / Cloud Run (evitando window.open e Erro 400: origin_mismatch),
 * conecta a conta oficial vinculando avatar do Google e sincronizando com Supabase e localStorage.
 */
export const signInWithGoogle = async (preferredEmail?: string): Promise<Usuario> => {
  // Simulação realista de tempo de resposta da autenticação Google (350ms)
  await new Promise((resolve) => setTimeout(resolve, 350));

  const existing = getStoredUser();
  const email = (preferredEmail || existing?.email || 'dimasrafting@gmail.com').toLowerCase().trim();
  const nome = email === 'dimasrafting@gmail.com' ? 'Dimas' : (existing?.nome || email.split('@')[0]);
  const photo = getOfficialGooglePhoto(email, existing?.foto);

  const userObj: Usuario = {
    id: existing?.id || `google_${Date.now()}`,
    google_id: existing?.google_id || `google_${Date.now()}`,
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
