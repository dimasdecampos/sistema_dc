-- ========================================================
-- Excluir um anúncio apaga tudo que depende dele.
--
-- 1) Conversas do anúncio: a chave estrangeira passa de "SET NULL" para "CASCADE".
--    Antes a conversa sobrevivia sem anúncio. Mensagens e propostas de troca já saem
--    em cascata junto com a conversa; fotos (registros) e matches também já saíam.
-- 2) Arquivos das fotos no Storage: um gatilho chama a Edge Function cleanup-files
--    quando os registros de foto somem POR CAUSA da exclusão do anúncio (inclusive
--    quando o anúncio some em cascata, ex.: admin removendo um usuário).
--    Editar um anúncio apaga e recria os registros de foto; por isso o gatilho só age
--    quando o anúncio dono da foto já não existe, para nunca apagar fotos que ficaram.
--    Fotos externas (ex.: Unsplash dos exemplos) são ignoradas.
-- ========================================================

-- 1) Conversas acompanham o anúncio
alter table public.conversations
  drop constraint if exists conversations_listing_id_fkey;

alter table public.conversations
  add constraint conversations_listing_id_fkey
  foreign key (listing_id) references public.listings(id) on delete cascade;

-- 2) Limpeza dos arquivos no Storage
create or replace function public.cleanup_listing_image_file()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  parts text[];
  secret text;
begin
  -- Edição de anúncio (o anúncio ainda existe): não mexe nos arquivos
  if exists (select 1 from public.listings where id = old.listing_id) then
    return old;
  end if;

  -- Só fotos do nosso Storage: .../storage/v1/object/public/<bucket>/<caminho>
  parts := regexp_match(old.image_url, '/storage/v1/object/public/([^/]+)/(.+)$');
  if parts is null then
    return old;
  end if;

  select value into secret from public.private_settings where key = 'webhook_secret';

  -- Falha de rede ou função fora do ar nunca pode impedir a exclusão do anúncio
  begin
    perform net.http_post(
      url := 'https://dangvvcagfpbtzjepqkr.supabase.co/functions/v1/cleanup-files',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', coalesce(secret, '')),
      body := jsonb_build_object('bucket', parts[1], 'path', parts[2])
    );
  exception when others then
    null;
  end;

  return old;
end;
$$;

revoke all on function public.cleanup_listing_image_file() from public, anon, authenticated;

drop trigger if exists listing_images_cleanup on public.listing_images;
create trigger listing_images_cleanup
  after delete on public.listing_images
  for each row execute function public.cleanup_listing_image_file();
