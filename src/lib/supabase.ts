import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

  const localUrl = (localStorage.getItem(LOCAL_STORAGE_URL_KEY) || '').trim();
  const localAnonKey = (localStorage.getItem(LOCAL_STORAGE_ANON_KEY) || '').trim();

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
  cachedClient = null;
  currentClientKey = '';
}

export function clearCredentials() {
  localStorage.removeItem(LOCAL_STORAGE_URL_KEY);
  localStorage.removeItem(LOCAL_STORAGE_ANON_KEY);
  cachedClient = null;
  currentClientKey = '';
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
