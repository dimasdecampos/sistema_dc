export interface Usuario {
  /** Mesmo valor de auth.uid() no Supabase */
  id: string;
  email: string;
  nome: string;
  foto?: string;
  cidade?: string;
  created_at?: string;
}
