export interface Cliente {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  created_at: string;
}

export type ClienteInput = Omit<Cliente, 'id' | 'created_at'>;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface ConnectionStatus {
  isConnected: boolean;
  message: string;
  details?: string;
  tableExists?: boolean;
}
