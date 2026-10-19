import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Category, Listing } from '../types/marketplace';
import { AdminStats, fetchAdminStats } from '../services/adminService';

interface AdminOverviewProps {
  listings: Listing[];
  categories: Category[];
}

const StatCard: React.FC<{ label: string; value: number | string; hint?: string; accent?: string }> = ({
  label,
  value,
  hint,
  accent = 'text-slate-900',
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
    <p className={`mt-2 text-3xl font-black tabular-nums ${accent}`}>{value}</p>
    {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
  </div>
);

export const AdminOverview: React.FC<AdminOverviewProps> = ({ listings, categories }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setStats(await fetchAdminStats());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Anúncios por categoria (a partir dos anúncios já carregados na tela)
  const byCategory = categories
    .map((cat) => ({ cat, count: listings.filter((l) => l.category_id === cat.id).length }))
    .sort((a, b) => b.count - a.count);
  const maxCount = Math.max(1, ...byCategory.map((c) => c.count));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-slate-900">Visão geral</h2>
        <button
          type="button"
          onClick={load}
          disabled={isLoading}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Atualizar
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>{error}</span>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Usuários"
            value={stats.users_total}
            hint={`${stats.users_last_7d} novos nos últimos 7 dias`}
            accent="text-emerald-600"
          />
          <StatCard
            label="Anúncios"
            value={stats.listings_total}
            hint={`${stats.listings_active} ativos · ${stats.listings_last_7d} novos em 7 dias`}
          />
          <StatCard label="À venda" value={stats.listings_sale} accent="text-amber-600" />
          <StatCard label="Procurando" value={stats.listings_wanted} accent="text-emerald-600" />
          <StatCard label="Resolvidos" value={stats.listings_completed} hint="Marcados como concluídos" />
          <StatCard label="Cancelados" value={stats.listings_cancelled} />
          <StatCard
            label="Conversas"
            value={stats.conversations}
            hint={`${stats.messages} mensagens trocadas`}
          />
          <StatCard
            label="Sininhos"
            value={stats.interests}
            hint={`${stats.matches} matches gerados`}
          />
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-sm font-bold text-slate-900">Anúncios por categoria</h3>
        <ul className="mt-4 space-y-3">
          {byCategory.map(({ cat, count }) => (
            <li key={cat.id} className="flex items-center gap-3 text-sm">
              <span className="w-40 shrink-0 truncate text-slate-700 sm:w-56">
                {cat.icon} {cat.name}
              </span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right font-bold tabular-nums text-slate-900">{count}</span>
            </li>
          ))}
          {byCategory.length === 0 && <li className="text-sm text-slate-400">Nenhuma categoria cadastrada.</li>}
        </ul>
      </div>
    </div>
  );
};
