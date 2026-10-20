import React, { useState } from 'react';
import {
  GripVertical,
} from 'lucide-react';
import { Category, Listing } from '../../types/marketplace';

interface AdminMoveTabProps {
  categories: Category[];
  listings: Listing[];
  onMoveListingCategory: (listingId: string, targetCategoryId: string) => void;
}

export const AdminMoveTab: React.FC<AdminMoveTabProps> = ({ categories, listings, onMoveListingCategory }) => {
  // Drag and Drop State
  const [draggedListingId, setDraggedListingId] = useState<string | null>(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);
  const [dragSearch, setDragSearch] = useState('');
  const [dragTypeFilter, setDragTypeFilter] = useState<'ALL' | 'WANTED' | 'SALE'>('ALL');

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, listingId: string) => {
    setDraggedListingId(listingId);
    e.dataTransfer.setData('text/plain', listingId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCategoryId !== categoryId) {
      setDragOverCategoryId(categoryId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, categoryId: string) => {
    if (dragOverCategoryId === categoryId) {
      setDragOverCategoryId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetCategoryId: string) => {
    e.preventDefault();
    setDragOverCategoryId(null);
    const listingId = e.dataTransfer.getData('text/plain') || draggedListingId;
    if (listingId) {
      onMoveListingCategory(listingId, targetCategoryId);
    }
    setDraggedListingId(null);
  };

  // Filtros para Drag and Drop
  const filteredListingsForDrag = listings.filter((item) => {
    if (dragTypeFilter !== 'ALL' && item.type !== dragTypeFilter) return false;
    if (dragSearch && !item.title.toLowerCase().includes(dragSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <GripVertical className="w-5 h-5 text-brand-600" />
            <span>Mover Produtos de Categoria (Arrastar e Soltar)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Arraste um card de produto e solte em qualquer uma das caixas de categoria abaixo para reorganizar instantaneamente!
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar produto..."
            value={dragSearch}
            onChange={(e) => setDragSearch(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-brand-500"
          />
          <select
            value={dragTypeFilter}
            onChange={(e) => setDragTypeFilter(e.target.value as 'ALL' | 'WANTED' | 'SALE')}
            className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700"
          >
            <option value="ALL">Todos os Tipos</option>
            <option value="SALE">Apenas Venda</option>
            <option value="WANTED">Apenas Procuras</option>
          </select>
        </div>
      </div>

      {/* Áreas de Soltura de Categoria (Drop Targets) */}
      <div>
        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">
          Solte aqui para trocar de categoria:
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {categories.map((cat) => {
            const isOver = dragOverCategoryId === cat.id;
            const catListings = listings.filter((l) => l.category_id === cat.id);

            return (
              <div
                key={cat.id}
                onDragOver={(e) => handleDragOver(e, cat.id)}
                onDragLeave={(e) => handleDragLeave(e, cat.id)}
                onDrop={(e) => handleDrop(e, cat.id)}
                className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                  isOver
                    ? 'border-brand-500 bg-brand-50/90 scale-[1.02] shadow-md'
                    : 'border-dashed border-slate-200 bg-slate-50/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{cat.icon}</span>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 leading-tight">
                      {cat.name}
                    </h4>
                    <span className="text-[10px] text-slate-500">
                      {catListings.length} {catListings.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-center text-[10px] font-bold text-slate-400 border-t border-slate-200/60 pt-1.5">
                  {isOver ? '👉 Solte aqui!' : 'Zona de Soltura'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista de Produtos Arrastáveis */}
      <div className="pt-4 border-t border-slate-100">
        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">
          Itens disponíveis para arrastar ({filteredListingsForDrag.length}):
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredListingsForDrag.map((item) => {
            const isDragging = draggedListingId === item.id;
            const currentCat = categories.find((c) => c.id === item.category_id);

            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                className={`p-3.5 rounded-2xl border bg-white shadow-2xs hover:shadow-md transition cursor-grab active:cursor-grabbing flex flex-col justify-between gap-2.5 ${
                  isDragging ? 'opacity-40 border-brand-500' : 'border-slate-200 hover:border-brand-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span
                        className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                          item.type === 'WANTED'
                            ? 'bg-brand-100 text-brand-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.type === 'WANTED' ? 'Procura' : 'Venda'}
                      </span>
                      <h4 className="font-bold text-xs text-slate-900 mt-1 line-clamp-1">
                        {item.title}
                      </h4>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-slate-700 shrink-0">
                    {item.price ? `R$ ${item.price}` : 'Sob consulta'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
                  <span className="text-slate-500 flex items-center gap-1 font-medium">
                    <span>Atual:</span>
                    <strong className="text-slate-800">
                      {currentCat ? `${currentCat.icon} ${currentCat.name}` : 'Sem categoria'}
                    </strong>
                  </span>

                  {/* Seletor Rápido Alternativo (Ideal para Mobile / Touch) */}
                  <select
                    value={item.category_id}
                    onChange={(e) => onMoveListingCategory(item.id, e.target.value)}
                    className="text-[10px] font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700"
                    title="Ou selecione a categoria diretamente"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
