import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Cliente } from '../types/cliente';

// Initial demo data so the app is instantly usable
export const INITIAL_DEMO_CLIENTES: Cliente[] = [
  {
    id: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
    nome: 'Mariana Silveira Ramos',
    email: 'mariana.silveira@exemplo.com.br',
    telefone: '(11) 98765-4321',
    cidade: 'São Paulo',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    nome: 'Carlos Eduardo Mendes',
    email: 'carlos.mendes@empresa.com.br',
    telefone: '(21) 99123-8877',
    cidade: 'Rio de Janeiro',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: 'c9a64693-4c61-420e-bc51-9e4e3f1a2340',
    nome: 'Beatriz Vasconcelos',
    email: 'beatriz.vasconcelos@tech.io',
    telefone: '(31) 97334-1122',
    cidade: 'Belo Horizonte',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: '7b3c2e1a-8f90-4d56-b123-456789abcdef',
    nome: 'Rodrigo Alencar Fontes',
    email: 'rodrigo.alencar@consultoria.com',
    telefone: '(41) 98456-9900',
    cidade: 'Curitiba',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    id: '9e8d7c6b-5a4f-3e21-0987-fedcba987654',
    nome: 'Juliana Paes Ferreira',
    email: 'juliana.ferreira@inova.com.br',
    telefone: '(71) 99234-5566',
    cidade: 'Salvador',
    created_at: new Date().toISOString(),
  },
];

export const SUPABASE_SQL_SCHEMA = `-- 1. Criar a tabela 'clientes' no schema public
create table if not exists public.clientes (
  id uuid default gen_random_uuid() primary key,
  nome text not null,
  email text not null,
  telefone text,
  cidade text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Habilitar a segurança a nível de linha (RLS)
alter table public.clientes enable row level security;

-- 3. Políticas RLS para operações CRUD

-- Permitir leitura de todos os registros
create policy "Permitir leitura de clientes"
  on public.clientes for select
  using (true);

-- Permitir inserção de novos clientes
create policy "Permitir cadastro de novos clientes"
  on public.clientes for insert
  with check (true);

-- Permitir atualização de clientes existentes
create policy "Permitir atualizacao de clientes"
  on public.clientes for update
  using (true)
  with check (true);

-- Permitir exclusão de clientes
create policy "Permitir exclusao de clientes"
  on public.clientes for delete
  using (true);
`;

const LOCAL_STORAGE_URL_KEY = 'sb_client_url';
const LOCAL_STORAGE_ANON_KEY = 'sb_client_anon_key';

export function getStoredCredentials(): { url: string; anonKey: string } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  // If valid env vars are present (and not placeholder)
  const isEnvValid =
    envUrl.startsWith('https://') &&
    !envUrl.includes('seu-projeto') &&
    envAnonKey.length > 20 &&
    !envAnonKey.includes('sua-chave');

  const localUrl = localStorage.getItem(LOCAL_STORAGE_URL_KEY) || '';
  const localAnonKey = localStorage.getItem(LOCAL_STORAGE_ANON_KEY) || '';

  if (localUrl && localAnonKey) {
    return { url: localUrl, anonKey: localAnonKey };
  }

  if (isEnvValid) {
    return { url: envUrl, anonKey: envAnonKey };
  }

  return { url: '', anonKey: '' };
}

export function saveCredentials(url: string, anonKey: string) {
  localStorage.setItem(LOCAL_STORAGE_URL_KEY, url.trim());
  localStorage.setItem(LOCAL_STORAGE_ANON_KEY, anonKey.trim());
}

export function clearCredentials() {
  localStorage.removeItem(LOCAL_STORAGE_URL_KEY);
  localStorage.removeItem(LOCAL_STORAGE_ANON_KEY);
}

let cachedClient: SupabaseClient | null = null;
let currentClientKey = '';

export function getSupabase(): SupabaseClient | null {
  const { url, anonKey } = getStoredCredentials();

  if (!url || !anonKey) {
    return null;
  }

  const keyCombination = `${url}:${anonKey}`;
  if (cachedClient && currentClientKey === keyCombination) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey);
    currentClientKey = keyCombination;
    return cachedClient;
  } catch (error) {
    console.error('Erro ao inicializar cliente Supabase:', error);
    return null;
  }
}
