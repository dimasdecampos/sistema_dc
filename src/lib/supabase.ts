import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_SQL_SCHEMA = `-- ========================================================
-- SCHEMA TEM-AQUI: MARKETPLACE DE PROCURA E OFERTA
-- ========================================================

-- 1. Categorias do Marketplace estilo OLX
create table if not exists public.categories (
  id text primary key,
  name text not null,
  slug text not null unique,
  icon text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Inserir categorias do marketplace
insert into public.categories (id, name, slug, icon)
values
  ('cat-veiculos', 'Veículos & Peças', 'veiculos', '🚗'),
  ('cat-imoveis', 'Imóveis', 'imoveis', '🏠'),
  ('cat-eletronicos', 'Eletrônicos & Celulares', 'eletronicos', '📱'),
  ('cat-moveis', 'Casa, Móveis & Eletro', 'moveis', '🛋️'),
  ('cat-ferramentas', 'Ferramentas & Construção', 'ferramentas', '🔨'),
  ('cat-agro', 'Agro & Campo', 'agro', '🌾'),
  ('cat-animais', 'Animais & Pet', 'animais', '🐕'),
  ('cat-roupas', 'Moda & Acessórios', 'roupas', '👕'),
  ('cat-esportes', 'Esportes & Lazer', 'esportes', '⚽'),
  ('cat-servicos', 'Serviços & Empregos', 'servicos', '💼'),
  ('cat-outros', 'Outros', 'outros', '📦')
on conflict (id) do update set name = excluded.name, slug = excluded.slug, icon = excluded.icon;

-- 2. Perfis de Usuários
create table if not exists public.profiles (
  id text primary key,
  nome text not null,
  email text,
  avatar_url text,
  cidade text default 'São Luis do Paraitinga - SP',
  admin_config jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Usuários Google (com configurações admin salvas no perfil)
create table if not exists public.usuarios (
  id text default gen_random_uuid()::text primary key,
  google_id text,
  email text unique not null,
  nome text not null,
  foto text,
  cidade text default 'São Luis do Paraitinga - SP',
  locale text default 'pt-BR',
  admin_config jsonb,
  last_login_at timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Anúncios (Listings): Quero Comprar (WANTED) ou Quero Vender (SALE)
create table if not exists public.listings (
  id text primary key,
  user_id text not null,
  type text not null check (type in ('WANTED', 'SALE')),
  title text not null,
  description text,
  category_id text references public.categories(id) on delete set null,
  price numeric,
  condition text not null default 'USED' check (condition in ('NEW', 'USED', 'ANY')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'COMPLETED', 'CANCELLED')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Fotos dos Anúncios
create table if not exists public.listing_images (
  id text default gen_random_uuid()::text primary key,
  listing_id text not null references public.listings(id) on delete cascade,
  image_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Matches (Correspondências calculadas entre Procura e Venda)
create table if not exists public.matches (
  id text default gen_random_uuid()::text primary key,
  wanted_listing_id text not null references public.listings(id) on delete cascade,
  sale_listing_id text not null references public.listings(id) on delete cascade,
  score numeric not null check (score >= 0 and score <= 100),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  viewed_at timestamp with time zone,
  unique (wanted_listing_id, sale_listing_id)
);

-- 6. Conversas e Mensagens (Chat Interno entre Comprador e Vendedor)
create table if not exists public.conversations (
  id text default gen_random_uuid()::text primary key,
  listing_id text references public.listings(id) on delete set null,
  buyer_id text not null,
  seller_id text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.messages (
  id text default gen_random_uuid()::text primary key,
  conversation_id text not null references public.conversations(id) on delete cascade,
  sender_id text not null,
  text text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  read boolean default false
);

-- ========================================================
-- POLÍTICAS RLS (Segurança a nível de linha para MVP)
-- ========================================================
alter table public.categories enable row level security;
create policy "Leitura pública de categorias" on public.categories for select using (true);

alter table public.profiles enable row level security;
create policy "Leitura pública de perfis" on public.profiles for select using (true);
create policy "Inserção de perfil" on public.profiles for insert with check (true);
create policy "Atualização de perfil" on public.profiles for update using (true);

alter table public.usuarios enable row level security;
create policy "Leitura pública de usuarios" on public.usuarios for select using (true);
create policy "Inserção de usuarios" on public.usuarios for insert with check (true);
create policy "Atualização de usuarios" on public.usuarios for update using (true);

alter table public.listings enable row level security;
create policy "Leitura pública de anúncios" on public.listings for select using (true);
create policy "Inserção de anúncios" on public.listings for insert with check (true);
create policy "Atualização de anúncios" on public.listings for update using (true);
create policy "Exclusão de anúncios" on public.listings for delete using (true);

alter table public.listing_images enable row level security;
create policy "Leitura pública de imagens" on public.listing_images for select using (true);
create policy "Inserção de imagens" on public.listing_images for insert with check (true);
create policy "Exclusão de imagens" on public.listing_images for delete using (true);

alter table public.matches enable row level security;
create policy "Leitura de matches" on public.matches for select using (true);
create policy "Inserção de matches" on public.matches for insert with check (true);
create policy "Atualização de matches" on public.matches for update using (true);

alter table public.conversations enable row level security;
create policy "Acesso a conversas" on public.conversations for all using (true);

alter table public.messages enable row level security;
create policy "Acesso a mensagens" on public.messages for all using (true);

-- ========================================================
-- 7. STORAGE BUCKET: img (Armazenamento de Fotos na pasta img/)
-- ========================================================
-- Cria os buckets 'img' e 'Img' caso não existam e define como públicos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('img', 'img', true, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']),
  ('Img', 'Img', true, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])
on conflict (id) do update set public = true, file_size_limit = 52428800;

-- Remove políticas anteriores para evitar erro 42710 (policy already exists)
drop policy if exists "Visualização pública de fotos no bucket img" on storage.objects;
drop policy if exists "Upload de fotos no bucket img" on storage.objects;
drop policy if exists "Atualização de fotos no bucket img" on storage.objects;
drop policy if exists "Exclusão de fotos no bucket img" on storage.objects;
drop policy if exists "Public Access img" on storage.objects;
drop policy if exists "Public Insert img" on storage.objects;
drop policy if exists "Public Update img" on storage.objects;
drop policy if exists "Public Delete img" on storage.objects;
drop policy if exists "Permitir leitura publica de fotos" on storage.objects;
drop policy if exists "Permitir upload publico de fotos" on storage.objects;
drop policy if exists "Permitir update publico de fotos" on storage.objects;
drop policy if exists "Permitir delete publico de fotos" on storage.objects;

-- Políticas de acesso público para 'img' e 'Img'
create policy "Permitir leitura publica de fotos"
  on storage.objects for select
  using (bucket_id in ('img', 'Img') or lower(bucket_id) = 'img');

create policy "Permitir upload publico de fotos"
  on storage.objects for insert
  with check (bucket_id in ('img', 'Img') or lower(bucket_id) = 'img');

create policy "Permitir update publico de fotos"
  on storage.objects for update
  using (bucket_id in ('img', 'Img') or lower(bucket_id) = 'img');

create policy "Permitir delete publico de fotos"
  on storage.objects for delete
  using (bucket_id in ('img', 'Img') or lower(bucket_id) = 'img');
`;

export const SUPABASE_STORAGE_FIX_SQL = `-- ========================================================
-- SCRIPT DE CORREÇÃO DO BUCKET DE IMAGENS (Supabase Storage)
-- Execute no SQL Editor do Supabase (supabase.com > SQL Editor > New Query)
-- ========================================================

-- 1. Cria ou atualiza os buckets 'img' e 'Img' como públicos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('img', 'img', true, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']),
  ('Img', 'Img', true, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])
on conflict (id) do update set
  public = true,
  file_size_limit = 52428800;

-- 2. Limpa políticas anteriores para evitar erro 42710 (policy already exists)
drop policy if exists "Visualização pública de fotos no bucket img" on storage.objects;
drop policy if exists "Upload de fotos no bucket img" on storage.objects;
drop policy if exists "Atualização de fotos no bucket img" on storage.objects;
drop policy if exists "Exclusão de fotos no bucket img" on storage.objects;
drop policy if exists "Public Access img" on storage.objects;
drop policy if exists "Public Insert img" on storage.objects;
drop policy if exists "Public Update img" on storage.objects;
drop policy if exists "Public Delete img" on storage.objects;
drop policy if exists "Permitir leitura publica de fotos" on storage.objects;
drop policy if exists "Permitir upload publico de fotos" on storage.objects;
drop policy if exists "Permitir update publico de fotos" on storage.objects;
drop policy if exists "Permitir delete publico de fotos" on storage.objects;

-- 3. Cria políticas RLS liberando leitura, upload, atualização e exclusão públicas
create policy "Permitir leitura publica de fotos"
  on storage.objects for select
  using (bucket_id in ('img', 'Img') or lower(bucket_id) = 'img');

create policy "Permitir upload publico de fotos"
  on storage.objects for insert
  with check (bucket_id in ('img', 'Img') or lower(bucket_id) = 'img');

create policy "Permitir update publico de fotos"
  on storage.objects for update
  using (bucket_id in ('img', 'Img') or lower(bucket_id) = 'img');

create policy "Permitir delete publico de fotos"
  on storage.objects for delete
  using (bucket_id in ('img', 'Img') or lower(bucket_id) = 'img');
`;

const LOCAL_STORAGE_URL_KEY = 'sb_client_url';
const LOCAL_STORAGE_ANON_KEY = 'sb_client_anon_key';
export const DEFAULT_SUPABASE_PROJECT_URL = 'https://dangvvcagfpbtzjepqkr.supabase.co';

export function getStoredCredentials(): { url: string; anonKey: string } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  const isEnvValid =
    envUrl.startsWith('https://') &&
    !envUrl.includes('seu-projeto') &&
    envAnonKey.length > 20 &&
    !envAnonKey.includes('sua-chave');

  const localUrl = (localStorage.getItem(LOCAL_STORAGE_URL_KEY) || '').trim();
  const localAnonKey = (localStorage.getItem(LOCAL_STORAGE_ANON_KEY) || '').trim();

  const finalUrl = localUrl || (isEnvValid ? envUrl : DEFAULT_SUPABASE_PROJECT_URL);
  const finalAnonKey = localAnonKey || (isEnvValid ? envAnonKey : '');

  return { url: finalUrl, anonKey: finalAnonKey };
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

/**
 * Testa a conexão com o Supabase fornecendo URL e AnonKey (ou usando as armazenadas)
 */
export async function testSupabaseConnection(
  customUrl?: string,
  customKey?: string
): Promise<{ connected: boolean; message: string; hasTables?: boolean }> {
  const url = (customUrl || getStoredCredentials().url || '').trim();
  const anonKey = (customKey || getStoredCredentials().anonKey || '').trim();

  if (!url || !anonKey) {
    return {
      connected: false,
      message: 'URL ou Chave Anon não configuradas.',
    };
  }

  try {
    const client = createClient(url, anonKey);
    // Testa leitura simples na tabela de categorias
    const { data, error } = await client.from('categories').select('id').limit(1);
    if (error) {
      if (
        error.code === '42P01' ||
        error.message?.includes('does not exist') ||
        error.message?.includes('relation "public.categories"')
      ) {
        return {
          connected: true,
          hasTables: false,
          message: 'Conectado ao Supabase! Porém as tabelas ainda não foram criadas. Execute o script SQL no SQL Editor.',
        };
      }
      return {
        connected: false,
        message: `Falha na autenticação com o Supabase: ${error.message}`,
      };
    }
    return {
      connected: true,
      hasTables: true,
      message: 'Conexão e tabelas validadas com sucesso no Supabase!',
    };
  } catch (err: unknown) {
    return {
      connected: false,
      message: `Erro ao testar cliente: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

