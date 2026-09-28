import React, { useState } from 'react';
import { X, Copy, Check, Database, Terminal, Shield, Cloud } from 'lucide-react';
import { SUPABASE_SQL_SCHEMA, SUPABASE_STORAGE_FIX_SQL } from '../lib/supabase';

interface SqlSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SqlSchemaModal: React.FC<SqlSchemaModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'storage' | 'schema'>('storage');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentCode = activeTab === 'storage' ? SUPABASE_STORAGE_FIX_SQL : SUPABASE_SQL_SCHEMA;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-900">
                Script SQL para o Supabase
              </h2>
              <p className="text-xs text-slate-500">
                Tabelas, RLS e Storage Bucket <strong>'img'</strong> com acesso público para fotos
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-100 bg-slate-50/50">
          <button
            onClick={() => {
              setActiveTab('storage');
              setCopied(false);
            }}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'storage'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            <span>1. Corrigir Bucket de Fotos (img)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('schema');
              setCopied(false);
            }}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'schema'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>2. Schema Completo (Tabelas e RLS)</span>
          </button>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-emerald-50/70 border-b border-emerald-100 text-xs text-emerald-950 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>
              {activeTab === 'storage'
                ? 'Como liberar o Bucket de Fotos no Supabase:'
                : 'Como rodar o Schema Completo no seu Supabase:'}
            </span>
          </p>
          <p className="text-[11px] text-emerald-800">
            {activeTab === 'storage'
              ? 'Acesse seu painel do Supabase > SQL Editor > New Query, cole o script abaixo e clique em Run para liberar o bucket de imagens.'
              : 'Acesse seu painel do Supabase > SQL Editor > New Query, cole o código abaixo e clique em Run.'}
          </p>
        </div>

        {/* Code View */}
        <div className="p-4 flex-1 overflow-y-auto bg-slate-950 text-slate-100 text-xs font-mono leading-relaxed relative">
          <pre>{currentCode}</pre>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-500">
            {activeTab === 'storage'
              ? 'Garante os buckets \'img\' e \'Img\' públicos e permissões RLS.'
              : 'Inclui tabelas, políticas RLS e categorias padrão.'}
          </span>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Copiado com sucesso!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>
                  {activeTab === 'storage' ? 'Copiar SQL do Bucket' : 'Copiar Script SQL'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
