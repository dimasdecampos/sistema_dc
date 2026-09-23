import { useState, useEffect, useCallback } from 'react';
import { Cliente, ClienteInput, ConnectionStatus } from './types/cliente';
import { Usuario } from './types/auth';
import {
  listarClientes,
  cadastrarCliente,
  atualizarCliente,
  excluirCliente,
  testConnection,
  subscribeToClientes,
} from './services/clientesService';
import {
  getStoredUser,
  loginWithGoogleData,
  logoutUser,
  updateCurrentUserProfile,
  syncUserWithSupabase,
} from './services/authService';
import { getRandomSampleCliente } from './utils/sampleData';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { ClientesTable } from './components/ClientesTable';
import { ClienteModal } from './components/ClienteModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { SqlScriptModal } from './components/SqlScriptModal';
import { GithubModal } from './components/GithubModal';
import { GoogleLoginModal } from './components/GoogleLoginModal';
import { ToastContainer, ToastMessage } from './components/Toast';

export default function App() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInsertingViaIntegration, setIsInsertingViaIntegration] = useState<boolean>(false);
  const [isInitialCheckDone, setIsInitialCheckDone] = useState<boolean>(false);
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    message: 'Verificando conexão com o Supabase...',
    tableExists: false,
  });

  // Auth state with full session persistence
  const [user, setUser] = useState<Usuario | null>(() => getStoredUser());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

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

    // Sincroniza usuário salvo no banco de dados se houver sessão ativa
    const currentUser = getStoredUser();
    if (currentUser) {
      syncUserWithSupabase(currentUser).then((res) => {
        if (res.synced) {
          setUser(res.user);
        }
      });
    }

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

  // Auth Actions
  const handleGoogleLogin = async (data: {
    nome: string;
    email: string;
    foto?: string;
    cidade?: string;
  }) => {
    try {
      const result = await loginWithGoogleData(data);
      setUser(result.user);
      showToast(
        `Bem-vindo, ${result.user.nome}!`,
        result.synced
          ? 'Login realizado e usuário sincronizado na tabela usuarios do Supabase.'
          : 'Login realizado com sessão ativa persistente.',
        'success'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao fazer login com o Google';
      showToast('Falha no login', msg, 'error');
      throw err;
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    showToast('Sessão encerrada', 'Você saiu da sua conta Google.', 'info');
  };

  const handleUpdateCity = async (newCity: string) => {
    try {
      const updated = await updateCurrentUserProfile({ cidade: newCity });
      setUser(updated);
      showToast('Cidade atualizada', `Sua cidade foi atualizada para ${newCity}.`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar cidade';
      showToast('Erro', msg, 'error');
    }
  };

  // Client Actions
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

  // Direct insert using the Supabase client SDK integration
  const handleInsertViaSupabase = async () => {
    if (!status.isConnected || !status.tableExists) {
      setIsConfigModalOpen(true);
      showToast(
        'Conecte o Supabase',
        'Informe a URL do Projeto e a chave Anon para inserir registros no banco de dados.',
        'info'
      );
      return;
    }

    setIsInsertingViaIntegration(true);
    try {
      const existingEmails = clientes.map((c) => c.email.toLowerCase());
      const sample = getRandomSampleCliente(existingEmails);

      const novo = await cadastrarCliente(sample);
      setClientes((prev) => [novo, ...prev]);

      showToast(
        'Cliente inserido via Supabase!',
        `${novo.nome} (${novo.cidade}) foi gravado com sucesso no PostgreSQL via SDK do Supabase.`,
        'success'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao inserir registro no Supabase';
      showToast('Erro ao inserir', msg, 'error');
    } finally {
      setIsInsertingViaIntegration(false);
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
      {/* Clean Top Navigation: Title, Subtitle, Google Login & Add Button */}
      <Header
        user={user}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onUpdateCity={handleUpdateCity}
        onOpenNewCliente={handleOpenNewCliente}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Analytics & Metrics */}
        <StatsCards clientes={clientes} isLoading={!isInitialCheckDone && isLoading} />

        {/* Clientes Table & Controls */}
        <ClientesTable
          clientes={clientes}
          isLoading={isLoading}
          isInserting={isInsertingViaIntegration}
          onEdit={handleOpenEditCliente}
          onDelete={handleOpenDeleteCliente}
          onAddNew={handleOpenNewCliente}
          onInsertViaSupabase={handleInsertViaSupabase}
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
              className="hover:text-emerald-600 transition cursor-pointer"
            >
              Regras RLS & Tabela Usuários
            </button>
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="hover:text-emerald-600 transition cursor-pointer"
            >
              Configurar Conexão Supabase
            </button>
            <button
              onClick={() => setIsGithubModalOpen(true)}
              className="hover:text-slate-900 transition font-medium cursor-pointer"
            >
              Salvar no GitHub
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <GoogleLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleGoogleLogin}
      />

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
        onInsertViaSupabase={handleInsertViaSupabase}
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
