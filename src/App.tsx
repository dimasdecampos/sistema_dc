import { useState, useEffect, useCallback } from 'react';
import { Cliente, ClienteInput, ConnectionStatus } from './types/cliente';
import {
  listarClientes,
  cadastrarCliente,
  atualizarCliente,
  excluirCliente,
  testConnection,
  subscribeToClientes,
} from './services/clientesService';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { ClientesTable } from './components/ClientesTable';
import { ClienteModal } from './components/ClienteModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { SqlScriptModal } from './components/SqlScriptModal';
import { GithubModal } from './components/GithubModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { Database, Code2, AlertTriangle } from 'lucide-react';

export default function App() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInitialCheckDone, setIsInitialCheckDone] = useState<boolean>(false);
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    message: 'Verificando conexão com o Supabase...',
    tableExists: false,
  });

  // Modals state
  const [isClienteModalOpen, setIsClienteModalOpen] = useState(false);
  const [clienteToEdit, setClienteToEdit] = useState<Cliente | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (title: string, message?: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 7);
      setToasts((prev) => [...prev, { id, title, message, type }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [connectionResult, dataResult] = await Promise.all([
        testConnection(),
        listarClientes(),
      ]);

      setStatus(connectionResult);
      setClientes(dataResult.clientes);

      if (dataResult.error) {
        console.warn(dataResult.error);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao sincronizar com o Supabase';
      showToast('Erro de sincronização', msg, 'error');
    } finally {
      setIsLoading(false);
      setIsInitialCheckDone(true);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();

    // Inscrição em tempo real para atualizações automáticas via Supabase
    const unsubscribe = subscribeToClientes(() => {
      listarClientes().then((res) => {
        if (!res.error) {
          setClientes(res.clientes);
        }
      });
    });

    return () => {
      unsubscribe();
    };
  }, [loadData]);

  // Actions
  const handleOpenNewCliente = () => {
    if (!status.isConnected) {
      setIsConfigModalOpen(true);
      showToast('Configure o Supabase', 'Informe a URL e Chave Anon antes de cadastrar.', 'info');
      return;
    }
    setClienteToEdit(null);
    setIsClienteModalOpen(true);
  };

  const handleOpenEditCliente = (cliente: Cliente) => {
    setClienteToEdit(cliente);
    setIsClienteModalOpen(true);
  };

  const handleOpenDeleteCliente = (cliente: Cliente) => {
    setClienteToDelete(cliente);
    setIsDeleteModalOpen(true);
  };

  const handleSaveCliente = async (input: ClienteInput, id?: string) => {
    try {
      if (id) {
        const clienteAtualizado = await atualizarCliente(id, input);
        setClientes((prev) => prev.map((c) => (c.id === id ? clienteAtualizado : c)));
        showToast(
          'Cliente atualizado!',
          `${clienteAtualizado.nome} foi atualizado com sucesso no Supabase.`,
          'success'
        );
      } else {
        const novoCliente = await cadastrarCliente(input);
        setClientes((prev) => [novoCliente, ...prev]);
        showToast(
          'Cliente cadastrado!',
          `${novoCliente.nome} foi salvo na tabela do Supabase.`,
          'success'
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar cliente';
      showToast('Falha na operação', msg, 'error');
      throw err;
    }
  };

  const handleDeleteConfirm = async (id: string) => {
    try {
      await excluirCliente(id);
      setClientes((prev) => prev.filter((c) => c.id !== id));
      showToast(
        'Cliente excluído',
        'O registro foi removido com sucesso do Supabase.',
        'success'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir cliente';
      showToast('Falha na exclusão', msg, 'error');
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation */}
      <Header
        status={status}
        isChecking={!isInitialCheckDone}
        onOpenNewCliente={handleOpenNewCliente}
        onOpenConfig={() => setIsConfigModalOpen(true)}
        onOpenSql={() => setIsSqlModalOpen(true)}
        onOpenGithub={() => setIsGithubModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Banner if Supabase is disconnected or table is missing (displayed ONLY after initial check is complete) */}
        {isInitialCheckDone && (!status.isConnected || !status.tableExists) && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/5 to-teal-500/10 border border-amber-300/60 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span>
                    {!status.isConnected
                      ? 'Conexão com o Supabase pendente'
                      : 'Tabela "clientes" pendente no Supabase'}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                    Ação necessária
                  </span>
                </h2>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  {!status.isConnected
                    ? 'Conecte sua URL e Chave Anon do Supabase para listar, cadastrar e gerenciar seus clientes diretamente na nuvem.'
                    : 'Execute o script SQL fornecido no SQL Editor do Supabase para criar a tabela clientes com as políticas RLS.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
              <button
                onClick={() => setIsSqlModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-2xs transition"
              >
                <Code2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Script SQL & RLS</span>
              </button>
              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-2xs shadow-emerald-600/20 transition"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Conectar Supabase</span>
              </button>
            </div>
          </div>
        )}

        {/* Analytics & Metrics */}
        <StatsCards clientes={clientes} isLoading={!isInitialCheckDone && isLoading} />

        {/* Clientes Table & Controls */}
        <ClientesTable
          clientes={clientes}
          isLoading={isLoading}
          onEdit={handleOpenEditCliente}
          onDelete={handleOpenDeleteCliente}
          onAddNew={handleOpenNewCliente}
          onRefresh={loadData}
          onShowToast={showToast}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">
              Sistema de Cadastro de Clientes
            </span>
            <span>•</span>
            <span>PostgreSQL & Supabase BaaS</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSqlModalOpen(true)}
              className="hover:text-emerald-600 transition"
            >
              Regras RLS
            </button>
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="hover:text-emerald-600 transition"
            >
              Configurar Conexão
            </button>
            <button
              onClick={() => setIsGithubModalOpen(true)}
              className="hover:text-slate-900 transition font-medium"
            >
              Salvar no GitHub
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ClienteModal
        isOpen={isClienteModalOpen}
        onClose={() => setIsClienteModalOpen(false)}
        onSave={handleSaveCliente}
        clienteToEdit={clienteToEdit}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        cliente={clienteToDelete}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
      />

      <SupabaseConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        status={status}
        onStatusChange={setStatus}
        onReloadData={loadData}
        onShowToast={showToast}
      />

      <SqlScriptModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
        onShowToast={showToast}
      />

      <GithubModal
        isOpen={isGithubModalOpen}
        onClose={() => setIsGithubModalOpen(false)}
        onShowToast={showToast}
      />

      {/* Notification Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
