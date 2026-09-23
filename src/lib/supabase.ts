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

-- 2. Habilitar a segurança a nível de linha (RLS) para clientes
alter table public.clientes enable row level security;

-- Políticas RLS para clientes
create policy "Permitir leitura de clientes"
  on public.clientes for select
  using (true);

create policy "Permitir cadastro de novos clientes"
  on public.clientes for insert
  with check (true);

create policy "Permitir atualizacao de clientes"
  on public.clientes for update
  using (true)
  with check (true);

create policy "Permitir exclusao de clientes"
  on public.clientes for delete
  using (true);

-- 3. Criar a tabela 'usuarios' para persistência do login do Google
create table if not exists public.usuarios (
  id uuid default gen_random_uuid() primary key,
  google_id text unique,
  email text not null unique,
  nome text not null,
  foto text,
  cidade text,
  locale text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_login_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS para usuarios
alter table public.usuarios enable row level security;

create policy "Permitir leitura de usuarios"
  on public.usuarios for select
  using (true);

create policy "Permitir insercao de usuarios"
  on public.usuarios for insert
  with check (true);

create policy "Permitir atualizacao de usuarios"
  on public.usuarios for update
  using (true)
  with check (true);

-- 4. Exemplo de inserção de registro
insert into public.clientes (nome, email, telefone, cidade)
values ('Carlos Eduardo Silva', 'carlos.silva@empresa.com.br', '(11) 98765-4321', 'São Paulo')
on conflict do nothing;
`;

export const SUPABASE_INSERT_SAMPLE_SQL = `-- Inserir novo registro na tabela clientes
insert into public.clientes (nome, email, telefone, cidade)
values ('Carlos Eduardo Silva', 'carlos.silva@empresa.com.br', '(11) 98765-4321', 'São Paulo')
returning *;
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
