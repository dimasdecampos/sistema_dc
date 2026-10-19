// Edge Function cleanup-files
//
// Chamada pelo gatilho do banco (listing_images_cleanup) quando um anúncio é excluído:
// apaga do Storage o arquivo da foto. Protegida pelo segredo compartilhado guardado em
// public.private_settings (cabeçalho x-webhook-secret). Deploy com verify_jwt = false.
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Só mexe nos buckets de fotos do app
const ALLOWED_BUCKETS = new Set(['img', 'Img']);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const { data: setting } = await supabase
    .from('private_settings')
    .select('value')
    .eq('key', 'webhook_secret')
    .maybeSingle();

  const secret = req.headers.get('x-webhook-secret');
  if (!setting?.value || secret !== setting.value) return json({ error: 'forbidden' }, 403);

  const { bucket, path } = await req.json();
  if (!ALLOWED_BUCKETS.has(bucket) || typeof path !== 'string' || path.length === 0) {
    return json({ error: 'invalid_target' }, 400);
  }

  // A URL pública pode ter caracteres codificados (%20 etc.)
  let objectPath = path;
  try {
    objectPath = decodeURIComponent(path);
  } catch {
    // mantém o caminho como veio
  }

  const { data, error } = await supabase.storage.from(bucket).remove([objectPath]);
  if (error) {
    console.error('Falha ao apagar arquivo:', bucket, objectPath, error.message);
    return json({ error: error.message }, 500);
  }

  return json({ removed: data?.length ?? 0 });
});
