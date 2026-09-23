import React from 'react';
import {
  Users,
  Database,
  Code2,
  Github,
  Plus,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { ConnectionStatus } from '../types/cliente';

interface HeaderProps {
  status: ConnectionStatus;
  onOpenNewCliente: () => void;
  onOpenConfig: () => void;
  onOpenSql: () => void;
  onOpenGithub: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  onOpenNewCliente,
  onOpenConfig,
  onOpenSql,
  onOpenGithub,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg sm:text-xl text-slate-900 tracking-tight leading-none">
                  Clientes
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                  Supabase
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block mt-1">
                Cadastro e gestão de contatos com PostgreSQL & RLS
              </p>
            </div>
          </div>

          {/* Center Connection Indicator Pill */}
          <button
            onClick={onOpenConfig}
            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:scale-102 ${
              status.isConnected && !status.isDemo
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
            title="Clique para gerenciar a conexão com o Supabase"
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  status.isConnected && !status.isDemo
                    ? 'bg-emerald-400'
                    : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  status.isConnected && !status.isDemo
                    ? 'bg-emerald-500'
                    : 'bg-amber-500'
                }`}
              />
            </span>
            <span className="truncate max-w-[200px]">
              {status.isConnected && !status.isDemo
                ? 'Supabase Conectado'
                : 'Modo Demonstração (Local)'}
            </span>
            <Radio className="w-3 h-3 text-slate-400" />
          </button>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSql}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition border border-slate-200"
              title="Ver tabela e políticas RLS em SQL"
            >
              <Code2 className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Script SQL & RLS</span>
              <span className="sm:hidden">SQL</span>
            </button>

            <button
              onClick={onOpenConfig}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition border border-slate-200"
              title="Configurar credenciais do Supabase"
            >
              <Database className="w-4 h-4 text-slate-600" />
              <span className="hidden lg:inline">Conexão</span>
            </button>

            <button
              onClick={onOpenGithub}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition border border-slate-200"
              title="Salvar código no GitHub"
            >
              <Github className="w-4 h-4 text-slate-800" />
              <span className="hidden lg:inline">GitHub</span>
            </button>

            <button
              onClick={onOpenNewCliente}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm shadow-emerald-600/30 transition-all hover:shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden xs:inline">Novo Cliente</span>
              <span className="xs:hidden">Novo</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
