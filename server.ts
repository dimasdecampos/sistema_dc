import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'marketplace.json');

// Garante que o diretório data exista
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface DatabaseState {
  listings: any[];
  conversations: any[];
  messages: any[];
  users: any[];
  siteConfig: any;
}

// Seed inicial limpo (apenas dados publicados por usuários no banco real são mantidos)
const DEFAULT_INITIAL_STATE: DatabaseState = {
  listings: [],
  conversations: [],
  messages: [],
  users: [],
  siteConfig: {
    siteName: 'TemAqui',
    cityName: 'São Luis do Paraitinga - SP',
    siteTagline: 'O classificado colaborativo da nossa cidade',
  },
};

const MOCK_IDS = ['wanted-1', 'wanted-2', 'wanted-3', 'sale-1', 'sale-2', 'sale-3'];

function readDb(): DatabaseState {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      // Remove quaisquer anúncios ou dados de exemplo que tenham sobrado
      const cleanListings = Array.isArray(parsed.listings)
        ? parsed.listings.filter((l: any) => l && l.id && !MOCK_IDS.includes(l.id))
        : [];
      const cleanConversations = Array.isArray(parsed.conversations)
        ? parsed.conversations.filter((c: any) => c && c.id && !c.id.includes('sample'))
        : [];
      const cleanMessages = Array.isArray(parsed.messages)
        ? parsed.messages.filter((m: any) => m && m.conversation_id && !m.conversation_id.includes('sample'))
        : [];

      return {
        listings: cleanListings,
        conversations: cleanConversations,
        messages: cleanMessages,
        users: Array.isArray(parsed.users) ? parsed.users : DEFAULT_INITIAL_STATE.users,
        siteConfig: {
          ...DEFAULT_INITIAL_STATE.siteConfig,
          ...(parsed.siteConfig || {}),
          // Garante que a cidade padrão nunca volte para Socorro
          cityName: (parsed.siteConfig?.cityName && parsed.siteConfig.cityName !== 'Socorro - SP')
            ? parsed.siteConfig.cityName
            : 'São Luis do Paraitinga - SP',
        },
      };
    }
  } catch (err) {
    console.error('Erro ao ler banco local marketplace.json:', err);
  }
  // Cria inicial
  writeDb(DEFAULT_INITIAL_STATE);
  return DEFAULT_INITIAL_STATE;
}

function writeDb(data: DatabaseState) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao gravar banco local marketplace.json:', err);
  }
}

// Inicia Express
async function startServer() {
  const app = express();
  // Prioriza o argumento --port ou 3000 no AI Studio dev
  const portArgIndex = process.argv.indexOf('--port');
  const cliPort = portArgIndex !== -1 && process.argv[portArgIndex + 1] ? parseInt(process.argv[portArgIndex + 1], 10) : null;
  const PORT = cliPort || 3000;

  // Permite uploads de imagem em base64 até 50MB
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // ==========================================
  // ROTAS DA API REST: /api/listings
  // ==========================================

  // 1. Listar anúncios
  app.get('/api/listings', (req: Request, res: Response) => {
    const db = readDb();
    let result = db.listings || [];

    const { type, category_id, search, user_id } = req.query;

    if (type && typeof type === 'string' && type !== 'ALL') {
      result = result.filter((l) => l.type === type);
    }
    if (category_id && typeof category_id === 'string' && category_id !== 'all') {
      result = result.filter((l) => l.category_id === category_id);
    }
    if (user_id && typeof user_id === 'string') {
      result = result.filter((l) => l.user_id === user_id);
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.title?.toLowerCase().includes(q) ||
          l.description?.toLowerCase().includes(q)
      );
    }

    // Ordena do mais recente para o mais antigo
    result.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json({ listings: result });
  });

  // 2. Criar anúncio (WANTED ou SALE)
  app.post('/api/listings', (req: Request, res: Response) => {
    const db = readDb();
    const newListing = req.body;

    if (!newListing.title || !newListing.type) {
      return res.status(400).json({ error: 'Título e tipo são obrigatórios' });
    }

    const now = new Date().toISOString();
    const listingId = newListing.id || `${newListing.type.toLowerCase()}-${Date.now()}`;
    const authorUser = newListing.user || {
      id: newListing.user_id || `user_${Date.now()}`,
      nome: 'Morador',
      cidade: 'São Luis do Paraitinga - SP',
    };

    const resolvedCity = (authorUser.cidade && authorUser.cidade !== 'Socorro - SP')
      ? authorUser.cidade
      : 'São Luis do Paraitinga - SP';

    const authorId = authorUser.id || newListing.user_id || (authorUser.email ? `user_${authorUser.email.replace(/[^a-z0-9]/g, '_')}` : `user_${Date.now()}`);

    const completeListing = {
      ...newListing,
      id: listingId,
      user_id: authorId,
      status: newListing.status || 'ACTIVE',
      created_at: newListing.created_at || now,
      updated_at: now,
      images: Array.isArray(newListing.images) ? newListing.images : [],
      user: {
        ...authorUser,
        id: authorId,
        cidade: resolvedCity,
      },
    };

    // Insere no topo
    db.listings = [completeListing, ...(db.listings || []).filter((l) => l.id !== completeListing.id)];

    // Registra o autor na lista de usuários se tiver e-mail
    const authorEmail = (authorUser.email || '').toLowerCase().trim();
    if (authorEmail) {
      const existingUserIdx = (db.users || []).findIndex(
        (u) => (u.email && u.email.toLowerCase().trim() === authorEmail) || u.id === authorId
      );
      const userRecord = {
        id: authorId,
        google_id: authorId,
        email: authorEmail,
        nome: authorUser.nome || authorEmail.split('@')[0],
        foto: authorUser.avatar_url || authorUser.foto || '',
        cidade: resolvedCity,
        last_login_at: now,
      };
      if (existingUserIdx === -1) {
        db.users = [...(db.users || []), userRecord];
      } else {
        db.users[existingUserIdx] = { ...db.users[existingUserIdx], ...userRecord };
      }
    }

    // Calcula matches simples com o tipo oposto (apenas entre usuários diferentes por ID e e-mail)
    const oppositeType = completeListing.type === 'WANTED' ? 'SALE' : 'WANTED';
    const candidates = db.listings.filter(
      (l) =>
        l.type === oppositeType &&
        l.status === 'ACTIVE' &&
        l.user_id !== completeListing.user_id &&
        (!authorEmail || !l.user?.email || l.user.email.toLowerCase().trim() !== authorEmail)
    );
    const newMatches: any[] = [];

    const listingTitleWords = completeListing.title
      .toLowerCase()
      .split(/\s+/)
      .filter((w: string) => w.length > 2);

    for (const cand of candidates) {
      let score = 0;
      if (cand.category_id === completeListing.category_id) {
        score += 40;
      }
      const candTitleWords = cand.title
        .toLowerCase()
        .split(/\s+/)
        .filter((w: string) => w.length > 2);
      const commonWords = listingTitleWords.filter((w: string) =>
        candTitleWords.includes(w)
      );
      if (commonWords.length > 0) {
        score += Math.min(50, commonWords.length * 25);
      }

      if (score >= 35) {
        newMatches.push({
          id: `match-${completeListing.id}-${cand.id}`,
          wanted_listing_id:
            completeListing.type === 'WANTED' ? completeListing.id : cand.id,
          sale_listing_id:
            completeListing.type === 'SALE' ? completeListing.id : cand.id,
          score,
          created_at: now,
          wanted_listing:
            completeListing.type === 'WANTED' ? completeListing : cand,
          sale_listing: completeListing.type === 'SALE' ? completeListing : cand,
        });
      }
    }

    writeDb(db);
    res.status(201).json({ listing: completeListing, newMatches });
  });

  // 3. Atualizar anúncio (ex: marcar como concluído, editar preço, etc.)
  app.put('/api/listings/:id', (req: Request, res: Response) => {
    const db = readDb();
    const { id } = req.params;
    const updates = req.body;

    const index = (db.listings || []).findIndex((l) => l.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Anúncio não encontrado' });
    }

    const updatedListing = {
      ...db.listings[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    db.listings[index] = updatedListing;
    writeDb(db);

    res.json({ listing: updatedListing });
  });

  // 4. Deletar anúncio
  app.delete('/api/listings/:id', (req: Request, res: Response) => {
    const db = readDb();
    const { id } = req.params;

    db.listings = (db.listings || []).filter((l) => l.id !== id);
    writeDb(db);

    res.json({ success: true });
  });

  // ==========================================
  // ROTAS DE CHAT E CONVERSAS: /api/conversations
  // ==========================================

  // 1. Obter conversas
  app.get('/api/conversations', (req: Request, res: Response) => {
    const db = readDb();
    const { userId, email } = req.query;

    let convs = db.conversations || [];
    if (userId && typeof userId === 'string') {
      const userEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';
      convs = convs.filter(
        (c) =>
          c.buyer_id === userId ||
          c.seller_id === userId ||
          (userEmail && (
            (c.buyer?.email && c.buyer.email.toLowerCase().trim() === userEmail) ||
            (c.seller?.email && c.seller.email.toLowerCase().trim() === userEmail)
          ))
      );
    }

    // Enriquecer cada conversa com suas mensagens
    const enriched = convs.map((c) => ({
      ...c,
      messages: (db.messages || []).filter((m) => m.conversation_id === c.id),
    }));

    enriched.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    res.json({ conversations: enriched });
  });

  // 2. Criar ou obter conversa
  app.post('/api/conversations', (req: Request, res: Response) => {
    const db = readDb();
    const { listing, buyer, initialText } = req.body;

    if (!listing || !buyer) {
      return res.status(400).json({ error: 'Dados insuficientes' });
    }

    // Busca anúncio real no banco para obter dados precisos do vendedor
    const realListing = (db.listings || []).find((l) => l.id === listing.id) || listing;

    const sellerId = realListing.user_id || listing.user_id;
    const buyerId = buyer.id;
    const buyerEmail = (buyer.email || '').toLowerCase().trim();
    const sellerEmail = (realListing.user?.email || listing.user?.email || '').toLowerCase().trim();

    // Procura existente por ID ou E-mail
    let conv = (db.conversations || []).find(
      (c) =>
        c.listing_id === realListing.id &&
        (c.buyer_id === buyerId || (buyerEmail && c.buyer?.email && c.buyer.email.toLowerCase().trim() === buyerEmail)) &&
        (c.seller_id === sellerId || (sellerEmail && c.seller?.email && c.seller.email.toLowerCase().trim() === sellerEmail))
    );

    const now = new Date().toISOString();

    if (!conv) {
      conv = {
        id: `conv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        listing_id: realListing.id,
        buyer_id: buyerId,
        seller_id: sellerId,
        created_at: now,
        updated_at: now,
        last_message: initialText || 'Conversa iniciada',
        listing: {
          id: realListing.id,
          title: realListing.title,
          price: realListing.price,
          type: realListing.type,
          images: realListing.images || [],
        },
        buyer: buyer,
        seller: realListing.user || listing.user || {
          id: sellerId,
          nome: 'Vendedor',
          cidade: 'São Luis do Paraitinga - SP',
        },
      };

      db.conversations = [conv, ...(db.conversations || [])];

      if (initialText) {
        db.messages = [
          ...(db.messages || []),
          {
            id: `msg-${Date.now()}-1`,
            conversation_id: conv.id,
            sender_id: buyerId,
            text: initialText,
            created_at: now,
            read: true,
          },
        ];
      }

      writeDb(db);
      return res.status(201).json({ conversation: conv, isNew: true });
    }

    res.json({ conversation: conv, isNew: false });
  });

  // 3. Enviar mensagem
  app.post('/api/conversations/:id/messages', (req: Request, res: Response) => {
    const db = readDb();
    const { id } = req.params;
    const { senderId, text } = req.body;

    if (!text || !senderId) {
      return res.status(400).json({ error: 'Texto e senderId são obrigatórios' });
    }

    const now = new Date().toISOString();
    const newMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      conversation_id: id,
      sender_id: senderId,
      text: text.trim(),
      created_at: now,
      read: true,
    };

    db.messages = [...(db.messages || []), newMessage];

    // Atualiza conversa
    const convIndex = (db.conversations || []).findIndex((c) => c.id === id);
    if (convIndex !== -1) {
      db.conversations[convIndex].last_message = text.trim();
      db.conversations[convIndex].updated_at = now;
    }

    writeDb(db);
    res.status(201).json({ message: newMessage });
  });

  // ==========================================
  // ROTAS DE USUÁRIOS E SINCRONIZAÇÃO
  // ==========================================

  app.get('/api/users', (_req: Request, res: Response) => {
    const db = readDb();
    res.json({ users: db.users || [] });
  });

  app.post('/api/users/sync', (req: Request, res: Response) => {
    const db = readDb();
    const { user } = req.body;

    if (!user || !user.email) {
      return res.status(400).json({ error: 'Usuário inválido' });
    }

    const email = user.email.toLowerCase().trim();
    const existingIndex = (db.users || []).findIndex(
      (u) => (u.email && u.email.toLowerCase() === email) || u.id === user.id
    );

    const now = new Date().toISOString();
    const resolvedCity = user.cidade && user.cidade !== 'Socorro - SP'
      ? user.cidade
      : (existingIndex !== -1 && db.users[existingIndex].cidade && db.users[existingIndex].cidade !== 'Socorro - SP'
          ? db.users[existingIndex].cidade
          : 'São Luis do Paraitinga - SP');

    const updatedUser = {
      id: user.id || `user_${Date.now()}`,
      google_id: user.google_id || user.id,
      email: email,
      nome: user.nome || email.split('@')[0],
      foto: user.foto || user.avatar_url || '',
      cidade: resolvedCity,
      admin_config: user.admin_config || user.adminConfig,
      last_login_at: now,
    };

    if (existingIndex !== -1) {
      db.users[existingIndex] = {
        ...db.users[existingIndex],
        ...updatedUser,
      };
    } else {
      db.users = [...(db.users || []), updatedUser];
    }

    // Se o usuário for Dimas ou administrador e alterou a cidade, reflete na configuração geral da cidade
    if (email === 'dimasrafting@gmail.com' && resolvedCity) {
      db.siteConfig = {
        ...(db.siteConfig || {}),
        cityName: resolvedCity,
      };
    }

    writeDb(db);
    res.json({ success: true, user: updatedUser });
  });

  // ==========================================
  // CONFIGURAÇÃO DO SITE / ADMIN
  // ==========================================

  app.get('/api/site-config', (req: Request, res: Response) => {
    const db = readDb();
    res.json(db.siteConfig || DEFAULT_INITIAL_STATE.siteConfig);
  });

  app.post('/api/site-config', (req: Request, res: Response) => {
    const db = readDb();
    db.siteConfig = {
      ...(db.siteConfig || {}),
      ...req.body,
    };
    writeDb(db);
    res.json(db.siteConfig);
  });

  // ==========================================
  // VITE DEV SERVER OU STATIC PROD SERVING
  // ==========================================

  const distPath = path.resolve(__dirname, 'dist');
  if (process.env.NODE_ENV === 'production' && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor TemAqui rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Erro ao iniciar servidor:', err);
});
