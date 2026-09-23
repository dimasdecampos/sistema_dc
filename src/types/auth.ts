export interface Usuario {
  id?: string;
  google_id: string;
  email: string;
  nome: string;
  foto?: string;
  cidade?: string;
  locale?: string;
  created_at?: string;
  last_login_at?: string;
}

export interface AuthSession {
  user: Usuario;
  token: string;
  expiresAt: number;
}
