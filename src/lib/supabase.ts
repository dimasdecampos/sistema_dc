import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Políticas do bucket 'img' (leitura pública, upload só logado).
 * Mesmo conteúdo da seção Storage de supabase/migrations/20261017000000_auth_rls.sql
 */
export const SUPABASE_STORAGE_FIX_SQL = `-- Bucket 'img' público + políticas por usuário
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('img', 'img', true, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = true, file_size_limit = 52428800;

drop policy if exists "img_select" on storage.objects;
drop policy if exists "img_insert" on storage.objects;
drop policy if exists "img_update" on storage.objects;
drop policy if exists "img_delete" on storage.objects;

create policy "img_select" on storage.objects for select
  using (bucket_id = 'img');
create policy "img_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'img');
create policy "img_update" on storage.objects for update to authenticated
  using (bucket_id = 'img' and (owner_id = (select auth.uid())::text or public.is_admin()));
create policy "img_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'img' and (owner_id = (select auth.uid())::text or public.is_admin()));
`;

let client: SupabaseClient | null | undefined;

/**
 * Cliente único do Supabase, configurado só por variáveis de ambiente
 * (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY). A sessão de login fica a cargo do próprio supabase-js.
 */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;

  const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (!url || !anonKey) {
    console.error('Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
    client = null;
    return client;
  }

  // Nunca reaproveita resposta guardada pelo navegador: um erro passageiro da API
  // (ex.: anúncios fora do ar por alguns minutos) não pode ficar preso no celular de ninguém.
  client = createClient(url, anonKey, {
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  });
  return client;
}
