import React, { useState } from 'react';
import {
  Trash2,
  Edit2,
  Tag,
} from 'lucide-react';
import { Category, Listing } from '../../types/marketplace';

interface AdminModerationTabProps {
  categories: Category[];
  listings: Listing[];
  onDeleteListing: (listingId: string) => void;
  onUpdateListingStatus: (listingId: string, status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED') => void;
  onEditListing?: (listing: Listing) => void;
}

export const AdminModerationTab: React.FC<AdminModerationTabProps> = ({ categories, listings, onDeleteListing, onUpdateListingStatus, onEditListing }) => {
  // Moderação State
  const [modSearch, setModSearch] = useState('');
  const [modStatusFilter, setModStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-brand-600" />
            <span>Moderação e Gestão de Anúncios</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Altere status entre ATIVO, CONCLUÍDO e CANCELADO ou remova publicações inadequadas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Filtrar por título..."
            value={modSearch}
            onChange={(e) => setModSearch(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-brand-500"
          />
          <select
            value={modStatusFilter}
            onChange={(e) => setModStatusFilter(e.target.value as any)}
            className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700"
          >
            <option value="ALL">Todos os Status</option>
            <option value="ACTIVE">Ativos</option>
            <option value="COMPLETED">Concluídos</option>
            <option value="CANCELLED">Cancelados</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
              <th className="py-3 px-3">Tipo</th>
              <th className="py-3 px-3">Título</th>
              <th className="py-3 px-3">Categoria</th>
              <th className="py-3 px-3">Preço</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {listings
              .filter((item) => {
                if (modStatusFilter !== 'ALL' && item.status !== modStatusFilter) return false;
                if (modSearch && !item.title.toLowerCase().includes(modSearch.toLowerCase())) return false;
                return true;
              })
              .map((item) => {
                const cat = categories.find((c) => c.id === item.category_id);
                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          item.type === 'WANTED'
                            ? 'bg-brand-100 text-brand-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.type === 'WANTED' ? 'PROCURA' : 'VENDA'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800 max-w-xs truncate">
                      {item.title}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {cat ? `${cat.icon} ${cat.name}` : 'Sem categoria'}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {item.price ? `R$ ${item.price}` : '—'}
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={item.status}
                        onChange={(e) =>
                          onUpdateListingStatus(item.id, e.target.value as any)
                        }
                        className={`text-[10px] font-bold rounded-lg px-2 py-1 border ${
                          item.status === 'ACTIVE'
                            ? 'bg-brand-50 text-brand-800 border-brand-200'
                            : item.status === 'COMPLETED'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        <option value="ACTIVE">ATIVO</option>
                        <option value="COMPLETED">CONCLUÍDO</option>
                        <option value="CANCELLED">CANCELADO</option>
                      </select>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onEditListing && (
                          <button
                            type="button"
                            onClick={() => onEditListing(item)}
                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition cursor-pointer"
                            title="Editar publicação"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Excluir publicação "${item.title}" definitivamente? As fotos (também do Storage) e as conversas deste anúncio serão apagadas. Não dá para desfazer.`)) {
                              onDeleteListing(item.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Excluir publicação e fotos"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
