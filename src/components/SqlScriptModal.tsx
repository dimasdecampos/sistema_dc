import React, { useState } from 'react';
import { X, Code2, Copy, Check, ExternalLink, ShieldCheck, Terminal, PlusCircle } from 'lucide-react';
import { SUPABASE_SQL_SCHEMA, SUPABASE_INSERT_SAMPLE_SQL } from '../lib/supabase';

interface SqlScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
}

export const SqlScriptModal: React.FC<SqlScriptModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'schema' | 'insert'>('schema');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentCode = activeTab === 'schema' ? SUPABASE_SQL_SCHEMA : SUPABASE_INSERT_SAMPLE_SQL;
  const currentFileName = activeTab === 'schema' ? 'schema_clientes_rls.sql' : 'insert_cliente.sql';

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    onShowToast(
      'Script copiado!',
      activeTab === 'schema'
        ? 'Cole no SQL Editor do Supabase e execute para criar a tabela e RLS.'
        : 'Cole no SQL Editor do Supabase para inserir o novo cliente na tabela.',
      'success'
    );
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">
                Scripts SQL para o Supabase
              </h3>
              <p className="text-xs text-slate-500">
                Execute diretamente no SQL Editor do Supabase Dashboard
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-100 bg-slate-50/25">
          <button
            onClick={() => {
              setActiveTab('schema');
              setCopied(false);
            }}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'schema'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>1. Criar Tabela & RLS</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('insert');
              setCopied(false);
            }}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'insert'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>2. Inserir Registro (INSERT SQL)</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Instructions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                <span>Copiar SQL</span>
              </div>
              <p className="text-slate-500 text-[11px]">
                {activeTab === 'schema'
                  ? 'Copie a estrutura com tabela e regras RLS permissivas.'
                  : 'Copie o comando INSERT com os dados do cliente.'}
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                <span>Abrir SQL Editor</span>
              </div>
              <p className="text-slate-500 text-[11px]">
                No Supabase Dashboard, acesse o <strong>SQL Editor</strong> e crie uma nova query.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">3</span>
                <span>Executar (Run)</span>
              </div>
              <p className="text-slate-500 text-[11px]">
                Cole o código e clique em <strong>Run</strong> (Ctrl+Enter) para aplicar no banco.
              </p>
            </div>
          </div>

          {/* Code Block Container */}
          <div className="relative rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-inner">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono text-slate-300">{currentFileName}</span>
              </div>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar SQL</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-emerald-300/90 leading-relaxed overflow-x-auto selection:bg-emerald-500/30 selection:text-white">
              {currentCode}
            </pre>
          </div>

          {/* Info Card */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-emerald-950">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Dica de Cadastro:</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Você também pode cadastrar clientes diretamente pela interface clicando no botão verde <strong>"Novo Cliente"</strong> no topo da página. Ao salvar, os dados são enviados instantaneamente para o Supabase!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <a
            href="https://supabase.com/dashboard/project/_/sql/new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800"
          >
            <span>Ir para o SQL Editor do Supabase</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
