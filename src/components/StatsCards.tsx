import React from 'react';
import { Users, MapPin, Calendar, Database, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Cliente, ConnectionStatus } from '../types/cliente';

interface StatsCardsProps {
  clientes: Cliente[];
  status: ConnectionStatus;
  onOpenConfig: () => void;
  onOpenSql: () => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  clientes,
  status,
  onOpenConfig,
  onOpenSql,
}) => {
  const totalClientes = clientes.length;

  const cidadesUnicas = React.useMemo(() => {
    const set = new Set(
      clientes
        .map((c) => c.cidade?.trim())
        .filter((c): c is string => Boolean(c))
    );
    return set.size;
  }, [clientes]);

  const novosRecentes = React.useMemo(() => {
    const seteDiasAtras = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return clientes.filter((c) => {
      if (!c.created_at) return false;
      const t = new Date(c.created_at).getTime();
      return !isNaN(t) && t >= seteDiasAtras;
    }).length;
  }, [clientes]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
      {/* Total Clientes */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-medium text-slate-500">
            Total de Clientes
          </span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {totalClientes}
          </span>
          <span className="text-xs text-slate-400">cadastrados</span>
        </div>
      </div>

      {/* Cidades Atendidas */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-medium text-slate-500">
            Cidades
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <MapPin className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {cidadesUnicas}
          </span>
          <span className="text-xs text-slate-400">localidades</span>
        </div>
      </div>

      {/* Novos nos Últimos 7 dias */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-medium text-slate-500">
            Últimos 7 dias
          </span>
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {novosRecentes}
          </span>
          <span className="text-xs text-emerald-600 font-medium">novos</span>
        </div>
      </div>

      {/* Status da Base */}
      <div
        onClick={onOpenConfig}
        className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition cursor-pointer group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-medium text-slate-500">
            Banco de Dados
          </span>
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              status.isConnected && !status.isDemo
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-amber-50 text-amber-600'
            }`}
          >
            {status.isConnected && !status.isDemo ? (
              <ShieldCheck className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-sm sm:text-base font-bold truncate ${
                status.isConnected && !status.isDemo
                  ? 'text-emerald-700'
                  : 'text-amber-700'
              }`}
            >
              {status.isConnected && !status.isDemo
                ? 'Supabase Ativo'
                : 'Demonstração'}
            </span>
          </div>
          <span className="text-xs text-slate-400 group-hover:text-emerald-600 transition flex items-center gap-1 mt-0.5">
            {status.isConnected && !status.isDemo
              ? 'RLS Habilitado'
              : 'Clique para conectar'}
          </span>
        </div>
      </div>
    </div>
  );
};
