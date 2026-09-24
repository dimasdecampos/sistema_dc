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
import { syncUserWithSupabase, saveStoredUser, clearStoredUser, getStoredUser } from './authService';

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
 * Abre o popup oficial de autenticação da conta Google.
 * Captura automaticamente nome, e-mail e foto oficial vinculada à conta.
 */
export const signInWithGoogle = async (): Promise<Usuario> => {
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
  } catch (error: unknown) {
    console.error('Erro na autenticação oficial do Google:', error);
    throw error;
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
  cachedAccessToken = null;
  clearStoredUser();
};
