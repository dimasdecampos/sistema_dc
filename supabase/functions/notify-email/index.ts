// Edge Function notify-email
//
// Chamada pelos gatilhos do banco (cabeçalho x-webhook-secret) quando chega uma mensagem nova
// ou um match novo. Envia um e-mail ao destinatário, exceto se ele estiver online agora
// (user_presence.last_seen_at recente) ou se já recebeu e-mail desta conversa há pouco.
//
// Segredos (supabase secrets set ...):
//   RESEND_API_KEY  chave da API do Resend (https://resend.com)
//   EMAIL_FROM      remetente, ex.: "TemAqui <avisos@seudominio.com.br>" (domínio verificado no Resend)
//   SITE_URL        opcional; padrão https://sistema-dc-ten.vercel.app
//
// Deploy sem verificação de JWT (verify_jwt = false): o POST é protegido pelo segredo.
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

const SITE_URL = (Deno.env.get('SITE_URL') || 'https://sistema-dc-ten.vercel.app').replace(/\/+$/, '');
const ONLINE_WINDOW_MS = 2.5 * 60 * 1000; // o site manda um sinal a cada minuto com a aba aberta
const MESSAGE_THROTTLE_MS = 10 * 60 * 1000; // no máximo um e-mail por conversa a cada 10 min

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function layout(title: string, bodyHtml: string, linkUrl: string, linkLabel: string): string {
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0">
      <tr><td style="padding:24px">
        <p style="margin:0 0 4px;font-size:13px;font-weight:bold;color:#0891b2">TemAqui</p>
        <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3">${escapeHtml(title)}</h1>
        ${bodyHtml}
        <p style="margin:24px 0 0"><a href="${linkUrl}" style="display:inline-block;background:#0891b2;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 20px;border-radius:12px">${escapeHtml(linkLabel)}</a></p>
        <p style="margin:16px 0 0;font-size:12px;color:#64748b;word-break:break-all">Se o botão não abrir, copie este link: ${linkUrl}</p>
      </td></tr>
    </table>
    <p style="margin:12px 0 0;font-size:11px;color:#94a3b8">Você recebeu este e-mail porque tem uma conta no TemAqui e não estava online.</p>
  </td></tr></table>
</body></html>`;
}

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('EMAIL_FROM');
  if (!apiKey || !from) {
    console.error('notify-email: defina os segredos RESEND_API_KEY e EMAIL_FROM.');
    return false;
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });
  if (!response.ok) {
    console.error('notify-email: falha no Resend', response.status, await response.text());
    return false;
  }
  return true;
}

async function isOnline(userId: string): Promise<boolean> {
  const { data } = await supabase.from('user_presence').select('last_seen_at').eq('user_id', userId).maybeSingle();
  if (!data?.last_seen_at) return false;
  return Date.now() - new Date(data.last_seen_at).getTime() < ONLINE_WINDOW_MS;
}

async function recentlyEmailed(userId: string, kind: string, refId: string, withinMs: number): Promise<boolean> {
  const since = new Date(Date.now() - withinMs).toISOString();
  const { data } = await supabase
    .from('email_log')
    .select('id')
    .eq('user_id', userId)
    .eq('kind', kind)
    .eq('ref_id', refId)
    .gte('sent_at', since)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const { data: secretRow } = await supabase.from('private_settings').select('value').eq('key', 'webhook_secret').maybeSingle();
  const secret = req.headers.get('x-webhook-secret');
  if (!secretRow?.value || secret !== secretRow.value) return json({ error: 'forbidden' }, 403);

  const payload = await req.json();
  const kind: string = payload.kind;
  const recipientId: string | undefined = payload.recipient_id;
  if ((kind !== 'message' && kind !== 'match') || !recipientId) return json({ error: 'bad_request' }, 400);

  if (await isOnline(recipientId)) return json({ sent: false, reason: 'online' });

  const refId: string = kind === 'message' ? String(payload.conversation_id) : String(payload.match_id);
  const throttleMs = kind === 'message' ? MESSAGE_THROTTLE_MS : 365 * 24 * 60 * 60 * 1000;
  if (await recentlyEmailed(recipientId, kind, refId, throttleMs)) return json({ sent: false, reason: 'throttled' });

  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(recipientId);
  const to = userData?.user?.email;
  if (userError || !to) return json({ sent: false, reason: 'no_email' });

  const { data: recipient } = await supabase.from('profiles').select('nome').eq('id', recipientId).maybeSingle();
  const firstName = (recipient?.nome || '').split(' ')[0];
  const greeting = firstName ? `<p style="margin:0 0 12px;font-size:15px">Olá, ${escapeHtml(firstName)}!</p>` : '';

  let subject: string;
  let html: string;
  let text: string;

  if (kind === 'message') {
    const { data: sender } = await supabase.from('profiles').select('nome').eq('id', payload.sender_id).maybeSingle();
    const senderName = sender?.nome || 'Alguém';
    const message = String(payload.text || '').trim() || 'Você recebeu uma mensagem nova.';
    const link = `${SITE_URL}/?chat=${encodeURIComponent(String(payload.conversation_id))}`;

    subject = `${senderName} te enviou uma mensagem no TemAqui`;
    html = layout(
      `${senderName} te enviou uma mensagem`,
      `${greeting}<blockquote style="margin:0;padding:12px 16px;background:#f1f5f9;border-left:4px solid #0891b2;border-radius:8px;font-size:15px;line-height:1.5;white-space:pre-wrap">${escapeHtml(message)}</blockquote>`,
      link,
      'Abrir a conversa'
    );
    text = `${senderName} te enviou uma mensagem no TemAqui:\n\n${message}\n\nAbrir a conversa: ${link}`;
  } else {
    const { data: listings } = await supabase
      .from('listings')
      .select('id, title, price')
      .in('id', [payload.wanted_listing_id, payload.sale_listing_id]);
    const wanted = listings?.find((l) => l.id === payload.wanted_listing_id);
    const sale = listings?.find((l) => l.id === payload.sale_listing_id);
    if (!wanted || !sale) return json({ sent: false, reason: 'listing_gone' });

    const price = sale.price != null && Number(sale.price) > 0
      ? ` por ${Number(sale.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
      : '';
    const link = `${SITE_URL}/`;

    subject = `Apareceu uma oferta para "${wanted.title}"`;
    html = layout(
      'Apareceu uma oferta para o que você procura',
      `${greeting}<p style="margin:0 0 8px;font-size:15px;line-height:1.5">Você procura <strong>${escapeHtml(wanted.title)}</strong> e alguém anunciou <strong>${escapeHtml(sale.title)}</strong>${escapeHtml(price)}.</p>`,
      link,
      'Ver a oferta'
    );
    text = `Você procura "${wanted.title}" e alguém anunciou "${sale.title}"${price}.\n\nVer a oferta: ${link}`;
  }

  const ok = await sendEmail(to, subject, html, text);
  if (!ok) return json({ sent: false, reason: 'send_failed' }, 502);

  await supabase.from('email_log').insert({ user_id: recipientId, kind, ref_id: refId });
  return json({ sent: true });
});
