# TemAqui

Marketplace local de **procura e oferta** (React + Vite + TypeScript). Todos os dados ficam no **Supabase**:
login com Google (Supabase Auth), banco PostgreSQL com RLS e fotos no Storage. Não há servidor próprio.

## Como funciona

- Qualquer pessoa entra com a conta Google e pode anunciar (vender) ou registrar o que procura.
- O sistema cruza procuras e ofertas e avisa quando há match.
- Conversas e mensagens entre comprador e vendedor.
- Painel `/#admin` para quem estiver em `adminEmails` (categorias, textos do site, moderação).

## Configuração

1. Copie `.env.example` para `.env.local` e preencha:
   ```env
   VITE_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
   VITE_SUPABASE_ANON_KEY="sb_publishable_..."
   ```
2. No Supabase, abra o **SQL Editor** e rode [supabase/migrations/20261017000000_auth_rls.sql](supabase/migrations/20261017000000_auth_rls.sql)
   (políticas RLS por dono, tabela `site_config`, função `is_admin()` e regras do bucket `img`).
3. Ative o login Google em **Authentication → Providers → Google** (Client ID e Secret do Google Cloud).
   - **Authentication → URL Configuration**: ponha a URL do site em *Site URL* e em *Redirect URLs*
     (ex.: `http://localhost:3000` e a URL do Vercel).
   - No Google Cloud, o *Authorized redirect URI* é `https://SEU-PROJETO.supabase.co/auth/v1/callback`.
4. Confirme que existe o bucket público `img` em **Storage**.
5. Para o admin, ajuste a lista em `site_config` (linha `id = 1`, campo `config.adminEmails`).

## Executar

```bash
npm install
npm run dev     # http://localhost:3000
npm run lint    # checagem de tipos
npm run build
```

No Vercel, defina as mesmas variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

## Segurança

- A chave usada no navegador é a publishable/anon. Nunca use a `service_role` no front-end.
- Quem pode o quê é decidido pelo banco (RLS): só o dono edita/apaga os próprios anúncios, só os participantes
  veem uma conversa, e só admins alteram categorias e configurações.
