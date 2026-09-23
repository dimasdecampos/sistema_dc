import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Edit2,
  Trash2,
  Copy,
  Check,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  FileCode,
  Users,
} from 'lucide-react';
import { Cliente } from '../types/cliente';
import {
  formatDate,
  getAvatarColor,
  getInitials,
  exportToCsv,
  exportToJson,
} from '../utils/formatters';

interface ClientesTableProps {
  clientes: Cliente[];
  isLoading: boolean;
  onEdit: (cliente: Cliente) => void;
  onDelete: (cliente: Cliente) => void;
  onAddNew: () => void;
  onRefresh: () => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
}

type SortOption = 'recentes' | 'antigos' | 'nome-asc' | 'nome-desc' | 'cidade';

export const ClientesTable: React.FC<ClientesTableProps> = ({
  clientes,
  isLoading,
  onEdit,
  onDelete,
  onAddNew,
  onRefresh,
  onShowToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recentes');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // List of unique cities for filter dropdown
  const cities = useMemo(() => {
    const set = new Set(
      clientes
        .map((c) => c.cidade?.trim())
        .filter((c): c is string => Boolean(c))
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [clientes]);

  // Filtering & Sorting
  const filteredAndSortedClientes = useMemo(() => {
    return clientes
      .filter((cliente) => {
        const term = searchTerm.toLowerCase().trim();
        const matchesSearch =
          !term ||
          cliente.nome.toLowerCase().includes(term) ||
          cliente.email.toLowerCase().includes(term) ||
          (cliente.cidade && cliente.cidade.toLowerCase().includes(term)) ||
          (cliente.telefone && cliente.telefone.includes(term));

        const matchesCity =
          selectedCity === 'all' ||
          (cliente.cidade &&
            cliente.cidade.trim().toLowerCase() === selectedCity.toLowerCase());

        return matchesSearch && matchesCity;
      })
      .sort((a, b) => {
        if (sortBy === 'nome-asc') {
          return a.nome.localeCompare(b.nome);
        }
        if (sortBy === 'nome-desc') {
          return b.nome.localeCompare(a.nome);
        }
        if (sortBy === 'cidade') {
          return (a.cidade || '').localeCompare(b.cidade || '');
        }
        if (sortBy === 'antigos') {
          const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tA - tB;
        }
        // Default: 'recentes'
        const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tB - tA;
      });
  }, [clientes, searchTerm, selectedCity, sortBy]);

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    onShowToast('ID copiado!', 'O identificador UUID foi copiado para a área de transferência.', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Search & Filter Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row gap-3 md:items-center md:justify-between bg-slate-50/50">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail, telefone ou cidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition shadow-2xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-medium"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Filter, Sort & Export Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* City filter */}
          <div className="relative flex items-center">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="pl-8 pr-7 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition shadow-2xs appearance-none cursor-pointer"
            >
              <option value="all">Todas as Cidades ({cities.length})</option>
              {cities.map((cidade) => (
                <option key={cidade} value={cidade}>
                  {cidade}
                </option>
              ))}
            </select>
          </div>

          {/* Sort selector */}
          <div className="relative flex items-center">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="pl-8 pr-7 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition shadow-2xs appearance-none cursor-pointer"
            >
              <option value="recentes">Mais Recentes</option>
              <option value="antigos">Mais Antigos</option>
              <option value="nome-asc">Nome (A-Z)</option>
              <option value="nome-desc">Nome (Z-A)</option>
              <option value="cidade">Cidade</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition shadow-2xs disabled:opacity-50"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          {/* Export CSV / JSON */}
          <div className="flex items-center border border-slate-200 rounded-xl bg-white shadow-2xs overflow-hidden">
            <button
              onClick={() => {
                if (filteredAndSortedClientes.length === 0) {
                  onShowToast('Nenhum dado', 'Não há clientes para exportar.', 'info');
                  return;
                }
                exportToCsv(filteredAndSortedClientes);
                onShowToast('Exportado com sucesso!', 'Arquivo CSV gerado.', 'success');
              }}
              className="px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition flex items-center gap-1 border-r border-slate-200"
              title="Exportar para Excel / CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => {
                if (filteredAndSortedClientes.length === 0) {
                  onShowToast('Nenhum dado', 'Não há clientes para exportar.', 'info');
                  return;
                }
                exportToJson(filteredAndSortedClientes);
                onShowToast('Exportado com sucesso!', 'Arquivo JSON gerado.', 'success');
              }}
              className="px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition flex items-center gap-1"
              title="Exportar como JSON"
            >
              <FileCode className="w-3.5 h-3.5 text-blue-600" />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Loading Skeleton View */}
      {isLoading ? (
        <div className="p-4 sm:p-6 space-y-4">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200" />
                  <div className="space-y-2">
                    <div className="h-4 w-36 sm:w-48 bg-slate-200 rounded-md" />
                    <div className="h-3 w-24 bg-slate-100 rounded-md" />
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-6">
                  <div className="h-3.5 w-32 bg-slate-200 rounded-md" />
                  <div className="h-3.5 w-24 bg-slate-100 rounded-md" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-200" />
                  <div className="w-8 h-8 rounded-lg bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : filteredAndSortedClientes.length === 0 ? (
        /* Empty State */
        <div className="p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">
            Nenhum cliente cadastrado
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
            {searchTerm || selectedCity !== 'all'
              ? 'Nenhum resultado corresponde aos filtros aplicados.'
              : 'Sua base do Supabase está pronta. Cadastre o primeiro cliente para começar!'}
          </p>
          {searchTerm || selectedCity !== 'all' ? (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCity('all');
              }}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Limpar Filtros
            </button>
          ) : (
            <button
              onClick={onAddNew}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Primeiro Cliente
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-5">Cliente</th>
                  <th className="py-3 px-5">Contato</th>
                  <th className="py-3 px-5">Cidade</th>
                  <th className="py-3 px-5">Data de Cadastro</th>
                  <th className="py-3 px-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredAndSortedClientes.map((cliente) => {
                  const avatarColor = getAvatarColor(cliente.nome);
                  const initials = getInitials(cliente.nome);

                  return (
                    <tr
                      key={cliente.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Cliente Column */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 ${avatarColor}`}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                              {cliente.nome}
                            </p>
                            <button
                              onClick={(e) => handleCopyId(cliente.id, e)}
                              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition font-mono mt-0.5"
                              title="Clique para copiar UUID"
                            >
                              <span>id: {cliente.id.slice(0, 8)}...</span>
                              {copiedId === cliente.id ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Contato Column */}
                      <td className="py-4 px-5">
                        <div className="space-y-1">
                          <a
                            href={`mailto:${cliente.email}`}
                            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-emerald-600 transition"
                          >
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[200px]">
                              {cliente.email}
                            </span>
                          </a>
                          {cliente.telefone && (
                            <a
                              href={`tel:${cliente.telefone.replace(/\D/g, '')}`}
                              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 transition"
                            >
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{cliente.telefone}</span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Cidade Column */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{cliente.cidade || 'Não informada'}</span>
                        </div>
                      </td>

                      {/* Data Cadastro Column */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatDate(cliente.created_at)}</span>
                        </div>
                      </td>

                      {/* Ações Column */}
                      <td className="py-4 px-5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => onEdit(cliente)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Editar cliente"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDelete(cliente)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Excluir cliente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredAndSortedClientes.map((cliente) => {
              const avatarColor = getAvatarColor(cliente.nome);
              const initials = getInitials(cliente.nome);

              return (
                <div key={cliente.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 ${avatarColor}`}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-slate-900 text-sm truncate">
                          {cliente.nome}
                        </h4>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                          <span>{cliente.cidade || 'Sem cidade'}</span>
                          <span>•</span>
                          <span>{formatDate(cliente.created_at).split(' ')[0]}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onEdit(cliente)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 bg-slate-50 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(cliente)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 bg-slate-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 text-xs pt-1">
                    <a
                      href={`mailto:${cliente.email}`}
                      className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 bg-slate-50 p-2 rounded-lg truncate"
                    >
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{cliente.email}</span>
                    </a>
                    {cliente.telefone && (
                      <a
                        href={`tel:${cliente.telefone.replace(/\D/g, '')}`}
                        className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 bg-slate-50 p-2 rounded-lg"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{cliente.telefone}</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Footer info */}
      <div className="p-4 border-t border-slate-100 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 bg-slate-50/50">
        <span>
          Mostrando{' '}
          <strong className="text-slate-800">
            {filteredAndSortedClientes.length}
          </strong>{' '}
          de <strong className="text-slate-800">{clientes.length}</strong> clientes
        </span>
        <span className="text-[11px] text-slate-400">
          Supabase PostgreSQL com RLS
        </span>
      </div>
    </div>
  );
};
