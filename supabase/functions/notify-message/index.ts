// Edge Function notify-message
//
// - POST (chamada pelo gatilho do banco, com o cabeçalho x-webhook-secret): envia a notificação
//   push de uma mensagem nova para os aparelhos do destinatário.
// - GET: devolve a chave pública VAPID (o app precisa dela para pedir a inscrição de push).
//
// As chaves VAPID são criadas na primeira chamada e guardadas em public.private_settings,
// tabela sem acesso pela API pública. Deploy sem verificação de JWT (verify_jwt = false),
// porque o POST é protegido pelo segredo e o GET só devolve uma chave pública.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function readSettings(): Promise<Record<string, string>> {
  const { data } = await supabase
    .from('private_settings')
    .select('key, value')
    .in('key', ['vapid_public', 'vapid_private', 'webhook_secret']);
  return Object.fromEntries((data ?? []).map((row) => [row.key, row.value]));
}

/** Lê as chaves VAPID; na primeira vez, cria e guarda (resolvendo corrida entre duas chamadas) */
async function getSettings(): Promise<Record<string, string>> {
  let settings = await readSettings();
  if (settings.vapid_public && settings.vapid_private) return settings;

  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const publicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);

  await supabase.from('private_settings').upsert(
    [
      { key: 'vapid_public', value: toBase64Url(publicRaw) },
      { key: 'vapid_private', value: privateJwk.d! },
    ],
    { onConflict: 'key', ignoreDuplicates: true }
  );

  settings = await readSettings();
  return settings;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const settings = await getSettings();

  if (req.method === 'GET') {
    return json({ publicKey: settings.vapid_public });
  }

  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const secret = req.headers.get('x-webhook-secret');
  if (!settings.webhook_secret || secret !== settings.webhook_secret) {
    return json({ error: 'forbidden' }, 403);
  }

  const { recipient_id, sender_id, conversation_id, text } = await req.json();
  if (!recipient_id) return json({ error: 'missing_recipient' }, 400);

  const [{ data: subscriptions }, { data: sender }] = await Promise.all([
    supabase.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', recipient_id),
    supabase.from('profiles').select('nome').eq('id', sender_id).maybeSingle(),
  ]);

  if (!subscriptions || subscriptions.length === 0) return json({ sent: 0 });

  webpush.setVapidDetails('https://sistema-dc-ten.vercel.app', settings.vapid_public, settings.vapid_private);

  const payload = JSON.stringify({
    title: sender?.nome ? `Mensagem de ${sender.nome}` : 'Nova mensagem',
    body: text || 'Você recebeu uma mensagem nova.',
    conversationId: conversation_id,
  });

  let sent = 0;
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (error) {
        // 404/410: o aparelho cancelou a permissão ou desinstalou; limpa a inscrição
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          console.error('Falha ao enviar push:', status, (error as Error).message);
        }
      }
    })
  );

  return json({ sent });
});
