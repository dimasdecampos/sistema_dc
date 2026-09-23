import { Cliente, ClienteInput, ConnectionStatus } from '../types/cliente';
import {
  getSupabase,
  getStoredCredentials,
  INITIAL_DEMO_CLIENTES,
} from '../lib/supabase';

const LOCAL_DEMO_STORAGE_KEY = 'sb_demo_clientes_data';

function getLocalDemoData(): Cliente[] {
  try {
    const raw = localStorage.getItem(LOCAL_DEMO_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(
        LOCAL_DEMO_STORAGE_KEY,
        JSON.stringify(INITIAL_DEMO_CLIENTES)
      );
      return INITIAL_DEMO_CLIENTES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_CLIENTES;
  }
}

function saveLocalDemoData(clientes: Cliente[]) {
  try {
    localStorage.setItem(LOCAL_DEMO_STORAGE_KEY, JSON.stringify(clientes));
  } catch (err) {
    console.error('Falha ao salvar dados locais:', err);
  }
}

export async function testConnection(): Promise<ConnectionStatus> {
  const { url, anonKey } = getStoredCredentials();

  if (!url || !anonKey) {
    return {
      isConnected: false,
      isDemo: true,
      message: 'Modo Demonstração ativo. Supabase não configurado.',
      details: 'Adicione a URL do Projeto e a Chave Anon para sincronizar em tempo real com o banco de dados.',
      tableExists: false,
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return {
      isConnected: false,
      isDemo: false,
      message: 'Falha ao inicializar o cliente Supabase.',
      details: 'Verifique se a URL do projeto está no formato correto (ex: https://xyz.supabase.co).',
      tableExists: false,
    };
  }

  try {
    const { error } = await supabase
      .from('clientes')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === '42P01' || error.message.toLowerCase().includes('does not exist') || error.message.includes('relation "public.clientes" does not exist')) {
        return {
          isConnected: true,
          isDemo: false,
          tableExists: false,
          message: 'Conectado ao Supabase, mas a tabela "clientes" ainda não foi criada!',
          details: 'Acesse o SQL Editor do Supabase e execute o script SQL fornecido na aba "Script SQL & RLS".',
        };
      }

      if (error.code === '42501' || error.message.toLowerCase().includes('row-level security') || error.message.toLowerCase().includes('permission denied')) {
        return {
          isConnected: true,
          isDemo: false,
          tableExists: true,
          message: 'Tabela encontrada, porém bloqueada por RLS!',
          details: 'Certifique-se de executar as políticas RLS para permitir operações SELECT, INSERT, UPDATE e DELETE.',
        };
      }

      return {
        isConnected: false,
        isDemo: false,
        tableExists: false,
        message: `Erro do Supabase: ${error.message}`,
        details: error.details || error.hint || 'Verifique as credenciais e políticas.',
      };
    }

    return {
      isConnected: true,
      isDemo: false,
      tableExists: true,
      message: 'Conexão estabelecida com sucesso com o Supabase!',
      details: 'Tabela "clientes" verificada e pronta para operações.',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      isConnected: false,
      isDemo: false,
      tableExists: false,
      message: 'Erro de rede ou URL inválida',
      details: msg,
    };
  }
}

export async function listarClientes(): Promise<{ clientes: Cliente[]; source: 'supabase' | 'demo'; error?: string }> {
  const supabase = getSupabase();

  if (!supabase) {
    return { clientes: getLocalDemoData(), source: 'demo' };
  }

  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Erro ao consultar Supabase, utilizando dados locais:', error.message);
      return {
        clientes: getLocalDemoData(),
        source: 'demo',
        error: `Supabase: ${error.message}. Exibindo dados locais.`,
      };
    }

    return { clientes: (data as Cliente[]) || [], source: 'supabase' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha na conexão';
    return {
      clientes: getLocalDemoData(),
      source: 'demo',
      error: msg,
    };
  }
}

export async function cadastrarCliente(input: ClienteInput): Promise<{ cliente: Cliente; source: 'supabase' | 'demo' }> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const payload = {
        nome: input.nome.trim(),
        email: input.email.trim().toLowerCase(),
        telefone: input.telefone.trim(),
        cidade: input.cidade.trim(),
      };

      const { data, error } = await supabase
        .from('clientes')
        .insert([payload])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return { cliente: data as Cliente, source: 'supabase' };
    } catch (err) {
      console.error('Erro ao cadastrar no Supabase, caindo para modo local:', err);
      // Fall through to local fallback if Supabase table is not ready
    }
  }

  // Local fallback
  const novoCliente: Cliente = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now(),
    nome: input.nome.trim(),
    email: input.email.trim().toLowerCase(),
    telefone: input.telefone.trim(),
    cidade: input.cidade.trim(),
    created_at: new Date().toISOString(),
  };

  const lista = getLocalDemoData();
  saveLocalDemoData([novoCliente, ...lista]);
  return { cliente: novoCliente, source: 'demo' };
}

export async function atualizarCliente(id: string, input: ClienteInput): Promise<{ cliente: Cliente; source: 'supabase' | 'demo' }> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const payload = {
        nome: input.nome.trim(),
        email: input.email.trim().toLowerCase(),
        telefone: input.telefone.trim(),
        cidade: input.cidade.trim(),
      };

      const { data, error } = await supabase
        .from('clientes')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return { cliente: data as Cliente, source: 'supabase' };
    } catch (err) {
      console.error('Erro ao atualizar no Supabase, caindo para modo local:', err);
    }
  }

  // Local fallback
  const lista = getLocalDemoData();
  const index = lista.findIndex((c) => c.id === id);
  const clienteAtualizado: Cliente = {
    id,
    nome: input.nome.trim(),
    email: input.email.trim().toLowerCase(),
    telefone: input.telefone.trim(),
    cidade: input.cidade.trim(),
    created_at: index >= 0 ? lista[index].created_at : new Date().toISOString(),
  };

  if (index >= 0) {
    lista[index] = clienteAtualizado;
  } else {
    lista.unshift(clienteAtualizado);
  }
  saveLocalDemoData(lista);

  return { cliente: clienteAtualizado, source: 'demo' };
}

export async function excluirCliente(id: string): Promise<{ success: boolean; source: 'supabase' | 'demo' }> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      return { success: true, source: 'supabase' };
    } catch (err) {
      console.error('Erro ao excluir no Supabase, caindo para modo local:', err);
    }
  }

  // Local fallback
  const lista = getLocalDemoData().filter((c) => c.id !== id);
  saveLocalDemoData(lista);
  return { success: true, source: 'demo' };
}

export async function popularDadosIniciaisSupabase(): Promise<{ count: number; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { count: 0, error: 'Supabase não conectado' };
  }

  try {
    const payload = INITIAL_DEMO_CLIENTES.map(({ id: _id, ...resto }) => resto);
    const { data, error } = await supabase
      .from('clientes')
      .insert(payload)
      .select();

    if (error) throw error;
    return { count: data?.length || 0 };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { count: 0, error: msg };
  }
}
