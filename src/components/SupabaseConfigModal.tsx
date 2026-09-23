import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Key,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import {
  getStoredCredentials,
  saveCredentials,
  clearCredentials,
} from '../lib/supabase';
import { testConnection } from '../services/clientesService';
import { ConnectionStatus } from '../types/cliente';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: ConnectionStatus;
  onStatusChange: (status: ConnectionStatus) => void;
  onReloadData: () => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  status,
  onStatusChange,
  onReloadData,
  onShowToast,
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const creds = getStoredCredentials();
      setUrl(creds.url);
      setAnonKey(creds.anonKey);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);

    try {
      saveCredentials(url.trim(), anonKey.trim());
      const testResult = await testConnection();
      onStatusChange(testResult);
      onReloadData();

      if (testResult.isConnected && testResult.tableExists) {
        onShowToast('Conexão bem-sucedida!', 'Conectado ao Supabase com tabela clientes verificada.', 'success');
      } else if (testResult.isConnected && !testResult.tableExists) {
        onShowToast('Tabela pendente', 'Conexão válida, mas a tabela "clientes" ainda não foi criada. Veja o Script SQL!', 'info');
      } else {
        onShowToast('Atenção na Conexão', testResult.message, 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onShowToast('Erro ao testar conexão', msg, 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleClear = async () => {
    clearCredentials();
    setUrl('');
    setAnonKey('');
    const testResult = await testConnection();
    onStatusChange(testResult);
    onReloadData();
    onShowToast('Credenciais removidas', 'Insira novas credenciais para conectar ao seu banco de dados.', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">
                Conectar ao Supabase
              </h3>
              <p className="text-xs text-slate-500">
                Insira a URL e a Anon Key do seu projeto Supabase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Status Alert Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              status.isConnected && status.tableExists
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : 'bg-rose-50/80 border-rose-200 text-rose-950'
            }`}
          >
            {status.isConnected && status.tableExists ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs leading-relaxed">
              <p className="font-semibold text-sm">{status.message}</p>
              {status.details && <p className="mt-1 opacity-90">{status.details}</p>}
            </div>
          </div>

          <form onSubmit={handleSaveAndTest} className="space-y-4">
            {/* Supabase URL */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Project URL (VITE_SUPABASE_URL)
              </label>
              <div className="relative">
                <Database className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  placeholder="https://exemplo-id.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 transition shadow-2xs font-mono"
                  required
                />
              </div>
            </div>

            {/* Supabase Anon Key */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Anon Public Key (VITE_SUPABASE_ANON_KEY)
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 transition shadow-2xs font-mono"
                  required
                />
              </div>
            </div>

            {/* Quick guide box */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600 space-y-1.5">
              <div className="font-semibold text-slate-800 flex items-center justify-between">
                <span>Onde encontrar essas chaves no Supabase:</span>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 text-[11px]"
                >
                  Abrir Supabase <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-slate-500">
                <li>Acesse o painel do seu projeto no Supabase</li>
                <li>Clique no ícone de engrenagem <strong>Project Settings</strong></li>
                <li>Vá até a aba <strong>API</strong> (Data API)</li>
                <li>Copie a <strong>Project URL</strong> e a chave <strong>anon public</strong></li>
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar Credenciais
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isTesting || !url || !anonKey}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Conectando...</span>
                    </>
                  ) : (
                    <span>Salvar & Conectar</span>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
