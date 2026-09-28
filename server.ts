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

// Seed inicial caso o arquivo não exista
const DEFAULT_INITIAL_STATE: DatabaseState = {
  listings: [
    {
      id: 'wanted-1',
      user_id: 'user-dimas',
      type: 'WANTED',
      title: 'Quero comprar um martelo usado',
      description: 'Preciso de um martelo em bom estado para pequenos consertos no sítio. Não precisa ser novo.',
      category_id: 'cat-ferramentas',
      price: 40,
      condition: 'USED',
      status: 'ACTIVE',
      created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      images: [
        'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=500&auto=format&fit=crop&q=80',
      ],
      user: {
        id: 'user-dimas',
        nome: 'Dimas',
        email: 'dimasrafting@gmail.com',
        avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        cidade: 'Socorro - SP',
      },
    },
    {
      id: 'wanted-2',
      user_id: 'user-maria',
      type: 'WANTED',
      title: 'Procuro bicicleta infantil aro 16',
      description: 'Bicicleta aro 16 para menina de 5 anos. Pode ter marcas de uso se estiver com freios e pneus bons.',
      category_id: 'cat-esportes',
      price: 180,
      condition: 'USED',
      status: 'ACTIVE',
      created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      images: [
        'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=500&auto=format&fit=crop&q=80',
      ],
      user: {
        id: 'user-maria',
        nome: 'Maria da Silva',
        email: 'maria.silva@gmail.com',
        avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        cidade: 'Socorro - SP',
      },
    },
    {
      id: 'sale-1',
      user_id: 'user-joao',
      type: 'SALE',
      title: 'Jogo de ferramentas manuais com martelo e chaves',
      description: 'Vendo kit com martelo de aço forjado, chaves de fenda e alicate universal. Pouco uso, excelente estado.',
      category_id: 'cat-ferramentas',
      price: 55,
      condition: 'USED',
      status: 'ACTIVE',
      created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      images: [
        'https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=500&auto=format&fit=crop&q=80',
      ],
      user: {
        id: 'user-joao',
        nome: 'João Ferramentas',
        email: 'joao.ferramentas@gmail.com',
        avatar_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
        cidade: 'Socorro - SP',
      },
    },
    {
      id: 'sale-2',
      user_id: 'user-carlos',
      type: 'SALE',
      title: 'Mesa de madeira maciça rústica com 4 cadeiras',
      description: 'Mesa redonda de madeira de demolição com 4 cadeiras. Muito firme e bonita para varanda ou cozinha.',
      category_id: 'cat-moveis',
      price: 450,
      condition: 'USED',
      status: 'ACTIVE',
      created_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
      images: [
        'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?w=500&auto=format&fit=crop&q=80',
      ],
      user: {
        id: 'user-carlos',
        nome: 'Carlos Pedreiro',
        email: 'carlos.pedreiro@gmail.com',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        cidade: 'Socorro - SP',
      },
    },
    {
      id: 'sale-3',
      user_id: 'user-ana',
      type: 'SALE',
      title: 'Bicicleta infantil Caloi aro 16 rosa com cestinha',
      description: 'Bicicleta em ótimo estado, revisada recentemente. Minha filha cresceu e trocou por aro 20.',
      category_id: 'cat-esportes',
      price: 190,
      condition: 'USED',
      status: 'ACTIVE',
      created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      images: [
        'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?w=500&auto=format&fit=crop&q=80',
      ],
      user: {
        id: 'user-ana',
        nome: 'Ana Marcenaria',
        email: 'ana.marcenaria@gmail.com',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        cidade: 'Socorro - SP',
      },
    },
  ],
  conversations: [
    {
      id: 'conv-sample-1',
      listing_id: 'sale-1',
      buyer_id: 'user-dimas',
      seller_id: 'user-joao',
      created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      listing: {
        id: 'sale-1',
        title: 'Jogo de ferramentas manuais com martelo e chaves',
        price: 55,
        type: 'SALE',
        images: [
          'https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=500&auto=format&fit=crop&q=80',
        ],
      },
      buyer: {
        id: 'user-dimas',
        nome: 'Dimas',
        email: 'dimasrafting@gmail.com',
        cidade: 'Socorro - SP',
      },
      seller: {
        id: 'user-joao',
        nome: 'João Ferramentas',
        email: 'joao.ferramentas@gmail.com',
        cidade: 'Socorro - SP',
      },
      last_message: 'Sim! Pode retirar hoje mesmo na oficina perto da praça.',
    },
  ],
  messages: [
    {
      id: 'msg-1',
      conversation_id: 'conv-sample-1',
      sender_id: 'user-dimas',
      text: 'Olá João! Vi seu anúncio das ferramentas. Ainda está disponível?',
      created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      read: true,
    },
    {
      id: 'msg-2',
      conversation_id: 'conv-sample-1',
      sender_id: 'user-joao',
      text: 'Sim! Pode retirar hoje mesmo na oficina perto da praça.',
      created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      read: true,
    },
  ],
  users: [
    {
      id: 'google_dimas_official',
      google_id: 'google_dimas_official',
      email: 'dimasrafting@gmail.com',
      nome: 'Dimas',
      foto: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      cidade: 'Socorro - SP',
    },
  ],
  siteConfig: {
    siteName: 'TemAqui',
    cityName: 'Socorro - SP',
    siteTagline: 'O classificado colaborativo da nossa cidade',
  },
};

function readDb(): DatabaseState {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        listings: parsed.listings || DEFAULT_INITIAL_STATE.listings,
        conversations: parsed.conversations || DEFAULT_INITIAL_STATE.conversations,
        messages: parsed.messages || DEFAULT_INITIAL_STATE.messages,
        users: parsed.users || DEFAULT_INITIAL_STATE.users,
        siteConfig: parsed.siteConfig || DEFAULT_INITIAL_STATE.siteConfig,
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

    const completeListing = {
      ...newListing,
      id: listingId,
      status: newListing.status || 'ACTIVE',
      created_at: newListing.created_at || now,
      updated_at: now,
      images: Array.isArray(newListing.images) ? newListing.images : [],
    };

    // Insere no topo
    db.listings = [completeListing, ...(db.listings || [])];

    // Calcula matches simples com o tipo oposto
    const oppositeType = completeListing.type === 'WANTED' ? 'SALE' : 'WANTED';
    const candidates = db.listings.filter(
      (l) => l.type === oppositeType && l.status === 'ACTIVE'
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
    const { userId } = req.query;

    let convs = db.conversations || [];
    if (userId && typeof userId === 'string') {
      convs = convs.filter(
        (c) => c.buyer_id === userId || c.seller_id === userId
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

    const sellerId = listing.user_id;
    const buyerId = buyer.id;

    // Procura existente
    let conv = (db.conversations || []).find(
      (c) =>
        c.listing_id === listing.id &&
        c.buyer_id === buyerId &&
        c.seller_id === sellerId
    );

    const now = new Date().toISOString();

    if (!conv) {
      conv = {
        id: `conv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        listing_id: listing.id,
        buyer_id: buyerId,
        seller_id: sellerId,
        created_at: now,
        updated_at: now,
        last_message: initialText || 'Conversa iniciada',
        listing: {
          id: listing.id,
          title: listing.title,
          price: listing.price,
          type: listing.type,
          images: listing.images || [],
        },
        buyer: buyer,
        seller: listing.user || {
          id: sellerId,
          nome: 'Vendedor',
          cidade: 'Socorro - SP',
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
    const updatedUser = {
      id: user.id || `user_${Date.now()}`,
      google_id: user.google_id || user.id,
      email: email,
      nome: user.nome || email.split('@')[0],
      foto: user.foto || user.avatar_url || '',
      cidade: user.cidade || 'Socorro - SP',
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

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
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
