import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_SQL_SCHEMA = `-- ========================================================
-- SCHEMA TEM-AQUI: MARKETPLACE DE PROCURA E OFERTA
-- ========================================================

-- 1. Categorias
create table if not exists public.categories (
  id text primary key,
  name text not null,
  slug text not null unique,
  icon text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Inserir categorias padrão
insert into public.categories (id, name, slug, icon)
values
  ('cat-ferramentas', 'Ferramentas', 'ferramentas', '🔨'),
  ('cat-veiculos', 'Veículos & Peças', 'veiculos', '🚲'),
  ('cat-moveis', 'Casa & Móveis', 'moveis', '🪑'),
  ('cat-eletronicos', 'Eletrônicos', 'eletronicos', '📱'),
  ('cat-agro', 'Agro & Campo', 'agro', '🌾'),
  ('cat-animais', 'Animais & Pet', 'animais', '🐕'),
  ('cat-roupas', 'Roupas & Calçados', 'roupas', '👕'),
  ('cat-esportes', 'Esportes & Lazer', 'esportes', '⚽'),
  ('cat-outros', 'Outros', 'outros', '📦')
on conflict (id) do nothing;

-- 2. Perfis de Usuários
create table if not exists public.profiles (
  id text primary key,
  nome text not null,
  email text,
  avatar_url text,
  cidade text default 'Socorro - SP',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Anúncios (Listings): Quero Comprar (WANTED) ou Quero Vender (SALE)
create table if not exists public.listings (
  id uuid default gen_random_uuid() primary key,
  user_id text not null references public.profiles(id) on delete cascade,
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
  id uuid default gen_random_uuid() primary key,
  listing_id uuid not null references public.listings(id) on delete cascade,
  image_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Matches (Correspondências calculadas entre Procura e Venda)
create table if not exists public.matches (
  id uuid default gen_random_uuid() primary key,
  wanted_listing_id uuid not null references public.listings(id) on delete cascade,
  sale_listing_id uuid not null references public.listings(id) on delete cascade,
  score numeric not null check (score >= 0 and score <= 100),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  viewed_at timestamp with time zone,
  unique (wanted_listing_id, sale_listing_id)
);

-- 6. Conversas e Mensagens (Chat Interno entre Comprador e Vendedor)
create table if not exists public.conversations (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid references public.listings(id) on delete set null,
  buyer_id text not null references public.profiles(id) on delete cascade,
  seller_id text not null references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id text not null references public.profiles(id) on delete cascade,
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
-- Cria o bucket 'img' caso não exista e define como público
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'img',
  'img',
  true,
  5242880, -- limite de 5MB por foto
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update set public = true;

-- Políticas de acesso público para o bucket 'img'
create policy "Visualização pública de fotos no bucket img"
  on storage.objects for select
  using (bucket_id = 'img');

create policy "Upload de fotos no bucket img"
  on storage.objects for insert
  with check (bucket_id = 'img');

create policy "Atualização de fotos no bucket img"
  on storage.objects for update
  using (bucket_id = 'img');

create policy "Exclusão de fotos no bucket img"
  on storage.objects for delete
  using (bucket_id = 'img');
`;

export const SUPABASE_INSERT_SAMPLE_SQL = `-- Inserir exemplo de anúncio de procura (WANTED)
insert into public.listings (type, title, description, category_id, price, condition, status, user_id)
values (
  'WANTED',
  'Quero comprar um martelo usado',
  'Preciso de um martelo em bom estado para consertos rápidos',
  'cat-ferramentas',
  40.00,
  'USED',
  'ACTIVE',
  'user-dimas'
);
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
