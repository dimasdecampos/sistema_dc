import { Cliente, ClienteInput, ConnectionStatus } from '../types/cliente';
import { getSupabase, getStoredCredentials } from '../lib/supabase';

export async function testConnection(): Promise<ConnectionStatus> {
  const { url, anonKey } = getStoredCredentials();

  if (!url || !anonKey) {
    return {
      isConnected: false,
      message: 'Supabase não configurado',
      details: 'Informe a URL do Projeto e a chave Anon para carregar e gerenciar os clientes.',
      tableExists: false,
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return {
      isConnected: false,
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
      if (
        error.code === '42P01' ||
        error.message.toLowerCase().includes('does not exist') ||
        error.message.includes('relation "public.clientes" does not exist')
      ) {
        return {
          isConnected: true,
          tableExists: false,
          message: 'Conectado ao Supabase, mas a tabela "clientes" ainda não foi criada!',
          details: 'Acesse o SQL Editor do Supabase e execute o script SQL da aba "Script SQL & RLS".',
        };
      }

      if (
        error.code === '42501' ||
        error.message.toLowerCase().includes('row-level security') ||
        error.message.toLowerCase().includes('permission denied')
      ) {
        return {
          isConnected: true,
          tableExists: true,
          message: 'Tabela encontrada, porém bloqueada por RLS!',
          details: 'Execute as políticas RLS no Supabase para permitir operações SELECT, INSERT, UPDATE e DELETE.',
        };
      }

      return {
        isConnected: false,
        tableExists: false,
        message: `Erro do Supabase: ${error.message}`,
        details: error.details || error.hint || 'Verifique as credenciais e permissões no Supabase.',
      };
    }

    return {
      isConnected: true,
      tableExists: true,
      message: 'Conectado com sucesso ao Supabase!',
      details: 'Tabela "clientes" verificada com políticas RLS ativas.',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      isConnected: false,
      tableExists: false,
      message: 'Erro de rede ou URL inválida',
      details: msg,
    };
  }
}

export async function listarClientes(): Promise<{ clientes: Cliente[]; error?: string }> {
  const supabase = getSupabase();

  if (!supabase) {
    return {
      clientes: [],
      error: 'Supabase não conectado. Configure suas credenciais para visualizar os clientes.',
    };
  }

  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao listar clientes no Supabase:', error);
      return {
        clientes: [],
        error: `Supabase: ${error.message}`,
      };
    }

    return { clientes: (data as Cliente[]) || [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha na conexão com Supabase';
    return {
      clientes: [],
      error: msg,
    };
  }
}

export async function cadastrarCliente(input: ClienteInput): Promise<Cliente> {
  const supabase = getSupabase();

  if (!supabase) {
    throw new Error('Supabase não configurado. Por favor, conecte o Supabase antes de cadastrar clientes.');
  }

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
    throw new Error(`Erro no Supabase: ${error.message}`);
  }

  return data as Cliente;
}

export async function atualizarCliente(id: string, input: ClienteInput): Promise<Cliente> {
  const supabase = getSupabase();

  if (!supabase) {
    throw new Error('Supabase não configurado. Por favor, conecte o Supabase para atualizar.');
  }

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
    throw new Error(`Erro ao atualizar no Supabase: ${error.message}`);
  }

  return data as Cliente;
}

export async function excluirCliente(id: string): Promise<boolean> {
  const supabase = getSupabase();

  if (!supabase) {
    throw new Error('Supabase não configurado.');
  }

  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Erro ao excluir no Supabase: ${error.message}`);
  }

  return true;
}

/**
 * Escuta alterações em tempo real no Supabase (Realtime Subscriptions)
 */
export function subscribeToClientes(onUpdate: () => void): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  try {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clientes',
        },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime subscription error:', err);
    return () => {};
  }
}
