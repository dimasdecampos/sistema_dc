import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar } from './Avatar';
import { AlertTriangle, BadgeCheck, Loader2, RefreshCw, Search, Trash2 } from 'lucide-react';
import { AdminUser, deleteUserData, fetchAdminUsers } from '../services/adminService';
import { fetchPremiumUserIds, setUserPremium } from '../services/storeService';

interface AdminUsersProps {
  currentUserId?: string;
  /** Chamado depois de remover um usuário, para recarregar os anúncios na tela */
  onDataChanged?: () => void;
}

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const AdminUsers: React.FC<AdminUsersProps> = ({ currentUserId, onDataChanged }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [premiumIds, setPremiumIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [list, premium] = await Promise.all([fetchAdminUsers(), fetchPremiumUserIds()]);
      setUsers(list);
      setPremiumIds(premium);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.nome.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.cidade || '').toLowerCase().includes(q)
    );
  }, [users, search]);

  const handleTogglePremium = async (user: AdminUser) => {
    const grant = !premiumIds.has(user.id);
    const ok = window.confirm(
      grant
        ? `Conceder PREMIUM a "${user.nome}"? Ele ganha uma loja própria (nome e cor personalizáveis).`
        : `Remover o premium de "${user.nome}"? A loja dele deixa de aparecer.`
    );
    if (!ok) return;

    setBusyId(user.id);
    setError(null);
    try {
      await setUserPremium(user.id, grant);
      setPremiumIds((prev) => {
        const next = new Set(prev);
        if (grant) next.add(user.id);
        else next.delete(user.id);
        return next;
      });
      onDataChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    const ok = window.confirm(
      `Remover "${user.nome}" e todos os dados dele no TemAqui (${user.listings_count} anúncio(s), conversas e avisos)?\n\n` +
        'A conta Google dele não é apagada: se entrar de novo, começa do zero. Esta ação não pode ser desfeita.'
    );
    if (!ok) return;

    setBusyId(user.id);
    setError(null);
    try {
      await deleteUserData(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      onDataChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-extrabold text-slate-900">
          Usuários <span className="text-slate-400">({users.length})</span>
        </h2>
        <div className="flex items-center gap-2">
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 sm:w-72 sm:flex-none">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, e-mail ou cidade"
              className="w-full bg-transparent text-sm focus:outline-hidden"
            />
          </label>
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
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-3 font-bold">Usuário</th>
              <th className="px-4 py-3 font-bold">Cidade</th>
              <th className="px-4 py-3 text-right font-bold">Anúncios</th>
              <th className="px-4 py-3 font-bold">Cadastro</th>
              <th className="px-4 py-3 font-bold">Último acesso</th>
              <th className="px-4 py-3 font-bold">Premium</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((u) => {
              const isDemo = u.id.startsWith('demo-');
              const isSelf = u.id === currentUserId;
              return (
                <tr key={u.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={u.avatar_url} name={u.nome} className="h-9 w-9 text-sm" />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate font-semibold text-slate-900">
                          {u.nome}
                          {isDemo && (
                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                              demo
                            </span>
                          )}
                          {isSelf && (
                            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                              você
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-slate-500">{u.email || 'sem conta de login'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.cidade || '—'}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900">{u.listings_count}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(u.last_sign_in_at)}</td>
                  <td className="px-4 py-3">
                    {/* Concede ou remove o premium (loja personalizada) */}
                    <button
                      type="button"
                      onClick={() => handleTogglePremium(u)}
                      disabled={busyId === u.id}
                      title={premiumIds.has(u.id) ? 'Remover premium' : 'Conceder premium'}
                      className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        premiumIds.has(u.id)
                          ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          : 'border border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <BadgeCheck className="h-3.5 w-3.5" />
                      {premiumIds.has(u.id) ? 'Premium' : 'Conceder'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(u)}
                      disabled={isSelf || busyId === u.id}
                      title={isSelf ? 'Você não pode remover a si mesmo' : 'Remover usuário e seus dados'}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {busyId === u.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Remover
                    </button>
                  </td>
                </tr>
              );
            })}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
