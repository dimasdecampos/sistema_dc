import React, { useState } from 'react';
import {
  X,
  Database,
  Check,
  AlertCircle,
  Sparkles,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import {
  getStoredCredentials,
  saveCredentials,
  clearCredentials,
  testSupabaseConnection,
  SUPABASE_STORAGE_FIX_SQL,
} from '../lib/supabase';
import { testSupabaseStorageBucket, SUPABASE_STORAGE_BUCKET } from '../services/storageService';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const current = getStoredCredentials();
  const [url, setUrl] = useState(current.url);
  const [anonKey, setAnonKey] = useState(current.anonKey);
  const [msg, setMsg] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<{
    dbSuccess?: boolean;
    dbMessage?: string;
    storageSuccess?: boolean;
    storageMessage?: string;
    bucketName?: string;
    isRlsError?: boolean;
  } | null>(null);
  const [isCopiedSql, setIsCopiedSql] = useState(false);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_STORAGE_FIX_SQL);
    setIsCopiedSql(true);
    setTimeout(() => setIsCopiedSql(false), 3000);
  };

  const handleTestConnectionAndBucket = async () => {
    if (!url.trim() || !anonKey.trim()) {
      setMsg('Por favor, preencha a URL e a Chave Anon antes de testar.');
      return;
    }

    setIsTesting(true);
    setTestResults(null);
    setMsg('');

    // Salva temporariamente para os clientes terem acesso
    saveCredentials(url.trim(), anonKey.trim());

    try {
      // 1. Testa banco de dados
      const dbRes = await testSupabaseConnection(url.trim(), anonKey.trim());

      // 2. Testa bucket de fotos
      const storageRes = await testSupabaseStorageBucket('img');

      setTestResults({
        dbSuccess: dbRes.connected,
        dbMessage: dbRes.message,
        storageSuccess: storageRes.success,
        storageMessage: storageRes.message,
        bucketName: storageRes.bucketName,
        isRlsError: storageRes.isRlsError,
      });

      if (dbRes.connected && storageRes.success) {
        setMsg('Tudo 100% funcionando! Conexão e Bucket de Fotos ativos.');
      }
    } catch (err: unknown) {
      setTestResults({
        dbSuccess: false,
        dbMessage: `Erro ao testar: ${err instanceof Error ? err.message : String(err)}`,
        storageSuccess: false,
        storageMessage: 'Não foi possível testar o bucket devido ao erro de conexão.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      setMsg('Por favor, preencha a URL e a Chave Anon.');
      return;
    }

    saveCredentials(url.trim(), anonKey.trim());
    setMsg('Conexão configurada com sucesso!');
    setTimeout(() => {
      onSaved();
      onClose();
    }, 800);
  };

  const handleReset = () => {
    clearCredentials();
    setUrl('');
    setAnonKey('');
    setTestResults(null);
    setMsg('Credenciais removidas. Usando armazenamento local instantâneo.');
    setTimeout(() => {
      onSaved();
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-900">
                Conectar ao Supabase
              </h2>
              <p className="text-xs text-slate-500">
                Banco PostgreSQL e Bucket de Fotos (<code>img</code>)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Project URL
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-500 text-slate-900 font-medium"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-slate-700 uppercase tracking-wider">
                Anon / Public API Key
              </label>
              <a
                href={
                  url.includes('supabase.co')
                    ? `${url.replace('.supabase.co', '')}/settings/api`
                    : 'https://supabase.com/dashboard/project/dangvvcagfpbtzjepqkr/settings/api'
                }
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold underline flex items-center gap-1"
              >
                <span>Pegar chave no Supabase</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <textarea
              rows={3}
              required
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="Cole sua chave anon pública (ex: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...)"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-500 text-slate-900 font-mono text-[11px] resize-none"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              A chave anon é necessária para autenticar uploads de fotos diretamente para o bucket <strong>img</strong>.
            </p>
          </div>

          {/* Test Action & Results */}
          <div className="pt-2">
            <button
              type="button"
              disabled={isTesting || !url.trim() || !anonKey.trim()}
              onClick={handleTestConnectionAndBucket}
              className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200/90 active:bg-slate-200 text-slate-800 font-bold rounded-xl border border-slate-200/80 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Testando Conexão e Bucket de Fotos...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4 text-emerald-600" />
                  <span>Testar Conexão e Bucket 'img'</span>
                </>
              )}
            </button>
          </div>

          {/* Diagnostic Results Box */}
          {testResults && (
            <div className="p-3.5 rounded-2xl border space-y-2.5 bg-slate-50 border-slate-200 text-xs">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>Resultado do Diagnóstico:</span>
              </div>

              {/* Status do Banco */}
              <div className="flex items-start gap-2">
                {testResults.dbSuccess ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-semibold text-slate-800">Banco de Dados: </span>
                  <span className={testResults.dbSuccess ? 'text-emerald-700' : 'text-rose-700'}>
                    {testResults.dbMessage}
                  </span>
                </div>
              </div>

              {/* Status do Storage Bucket */}
              <div className="flex items-start gap-2">
                {testResults.storageSuccess ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <span className="font-semibold text-slate-800">
                    Bucket de Fotos ({testResults.bucketName || 'img'}):{' '}
                  </span>
                  <span className={testResults.storageSuccess ? 'text-emerald-700' : 'text-amber-800'}>
                    {testResults.storageMessage}
                  </span>
                </div>
              </div>

              {/* Se o Storage falhou, oferece o script SQL de correção */}
              {!testResults.storageSuccess && (
                <div className="mt-2 pt-2 border-t border-slate-200/80 space-y-2">
                  <p className="text-[11px] text-slate-600 leading-tight">
                    Para habilitar o salvamento de fotos no bucket <strong>img</strong>, execute as políticas de permissão pública no SQL Editor do Supabase:
                  </p>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    {isCopiedSql ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>SQL de Correção Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar SQL de Correção do Bucket</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {msg && !testResults && (
            <div className="p-3 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{msg}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="text-slate-500 hover:text-rose-600 font-semibold cursor-pointer"
            >
              Usar dados locais
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer transition"
            >
              Salvar Conexão
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

