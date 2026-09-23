import React, { useState, useEffect, useCallback } from 'react';
import { Cliente, ClienteInput, ConnectionStatus } from './types/cliente';
import {
  listarClientes,
  cadastrarCliente,
  atualizarCliente,
  excluirCliente,
  testConnection,
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
import { Sparkles, Database, Code2, AlertTriangle } from 'lucide-react';

export default function App() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isDemo: true,
    message: 'Verificando conexão...',
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
      const msg = err instanceof Error ? err.message : 'Falha ao carregar dados';
      showToast('Erro ao sincronizar', msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Actions
  const handleOpenNewCliente = () => {
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
        const res = await atualizarCliente(id, input);
        setClientes((prev) => prev.map((c) => (c.id === id ? res.cliente : c)));
        showToast(
          'Cliente atualizado!',
          `${res.cliente.nome} foi atualizado ${res.source === 'supabase' ? 'no Supabase' : 'localmente'}.`,
          'success'
        );
      } else {
        const res = await cadastrarCliente(input);
        setClientes((prev) => [res.cliente, ...prev]);
        showToast(
          'Cliente cadastrado!',
          `${res.cliente.nome} foi registrado com sucesso ${res.source === 'supabase' ? 'no Supabase' : 'no sistema'}.`,
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
      const res = await excluirCliente(id);
      if (res.success) {
        setClientes((prev) => prev.filter((c) => c.id !== id));
        showToast(
          'Cliente excluído',
          'O registro foi removido com sucesso.',
          'success'
        );
      }
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
        onOpenNewCliente={handleOpenNewCliente}
        onOpenConfig={() => setIsConfigModalOpen(true)}
        onOpenSql={() => setIsSqlModalOpen(true)}
        onOpenGithub={() => setIsGithubModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Banner if in Demo Mode or Table Missing */}
        {(!status.isConnected || status.isDemo || !status.tableExists) && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/5 to-teal-500/10 border border-amber-300/60 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span>
                    {!status.isConnected || status.isDemo
                      ? 'Operando em Modo de Demonstração Interativo'
                      : 'Tabela "clientes" pendente no Supabase'}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                    Ação recomendada
                  </span>
                </h2>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  {!status.isConnected || status.isDemo
                    ? 'Você pode testar todos os cadastros, filtros e edições agora. Para persistir no seu banco de dados na nuvem, conecte suas credenciais do Supabase.'
                    : 'Execute o script SQL fornecido para criar a tabela clientes e habilitar as regras de segurança RLS no seu projeto.'}
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
        <StatsCards
          clientes={clientes}
          status={status}
          onOpenConfig={() => setIsConfigModalOpen(true)}
          onOpenSql={() => setIsSqlModalOpen(true)}
        />

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
