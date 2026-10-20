import React, { useState } from 'react';
import {
  FolderTree,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { Category, Listing } from '../../types/marketplace';

interface AdminCategoriesTabProps {
  categories: Category[];
  listings: Listing[];
  onCreateCategory: (input: { name: string; slug?: string; icon: string }) => void;
  onUpdateCategory: (id: string, updates: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
}

export const AdminCategoriesTab: React.FC<AdminCategoriesTabProps> = ({ categories, listings, onCreateCategory, onUpdateCategory, onDeleteCategory }) => {
  // Form de Nova Categoria
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📦');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Edição de Categoria
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatIcon, setEditCatIcon] = useState('');
  const [editCatSlug, setEditCatSlug] = useState('');

  // Manipulação de Criação de Categoria
  const handleCreateCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    onCreateCategory({
      name: newCatName.trim(),
      icon: newCatIcon.trim() || '📦',
      slug: newCatSlug.trim() || undefined,
    });
    setNewCatName('');
    setNewCatIcon('📦');
    setNewCatSlug('');
    setIsCreatingCategory(false);
  };

  // Iniciar Edição de Categoria
  const startEditCategory = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatIcon(cat.icon);
    setEditCatSlug(cat.slug);
  };

  const handleSaveEditCategory = (catId: string) => {
    if (!editCatName.trim()) return;
    onUpdateCategory(catId, {
      name: editCatName.trim(),
      icon: editCatIcon.trim() || '📦',
      slug: editCatSlug.trim() || undefined,
    });
    setEditingCatId(null);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-brand-600" />
            <span>Gestão Completa de Categorias (CRUD)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Crie, renomeie, mude ícones emoji e exclua categorias com reatribuição automática.
          </p>
        </div>

        <button
          onClick={() => setIsCreatingCategory(!isCreatingCategory)}
          className="px-4 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{isCreatingCategory ? 'Cancelar Criação' : '+ Nova Categoria'}</span>
        </button>
      </div>

      {/* Form de Criação */}
      {isCreatingCategory && (
        <form onSubmit={handleCreateCategorySubmit} className="p-4 bg-brand-50/70 border border-brand-200 rounded-2xl space-y-3">
          <h3 className="text-xs font-black text-brand-950 uppercase tracking-wider">
            Cadastrar Nova Categoria
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Ícone Emoji</label>
              <input
                type="text"
                value={newCatIcon}
                onChange={(e) => setNewCatIcon(e.target.value)}
                placeholder="🔨, 🚲, 🌾..."
                className="w-full text-center text-sm font-bold bg-white border border-brand-300 rounded-xl px-3 py-2"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Nome da Categoria</label>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Ex.: Instrumentos Musicais"
                className="w-full text-xs font-semibold bg-white border border-brand-300 rounded-xl px-3 py-2"
              />
            </div>
            <div className="sm:col-span-1 flex items-end">
              <button
                type="submit"
                className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
              >
                Salvar Categoria
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tabela de Categorias */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
              <th className="py-3 px-3">Ícone</th>
              <th className="py-3 px-3">Nome</th>
              <th className="py-3 px-3">Slug</th>
              <th className="py-3 px-3 text-center">Produtos à Venda</th>
              <th className="py-3 px-3 text-center">Procuras Ativas</th>
              <th className="py-3 px-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.map((cat) => {
              const isEditing = editingCatId === cat.id;
              const catSalesCount = listings.filter(
                (l) => l.category_id === cat.id && l.type === 'SALE'
              ).length;
              const catWantedCount = listings.filter(
                (l) => l.category_id === cat.id && l.type === 'WANTED'
              ).length;

              return (
                <tr key={cat.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-3">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editCatIcon}
                        onChange={(e) => setEditCatIcon(e.target.value)}
                        className="w-12 text-center text-sm font-bold bg-white border border-slate-300 rounded-lg p-1"
                      />
                    ) : (
                      <span className="text-xl">{cat.icon}</span>
                    )}
                  </td>

                  <td className="py-3 px-3 font-bold text-slate-800">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editCatName}
                        onChange={(e) => setEditCatName(e.target.value)}
                        className="w-full text-xs font-bold bg-white border border-slate-300 rounded-lg px-2 py-1"
                      />
                    ) : (
                      <span>{cat.name}</span>
                    )}
                  </td>

                  <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editCatSlug}
                        onChange={(e) => setEditCatSlug(e.target.value)}
                        className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg px-2 py-1"
                      />
                    ) : (
                      <span>{cat.slug}</span>
                    )}
                  </td>

                  <td className="py-3 px-3 text-center font-bold text-amber-700">
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200">
                      {catSalesCount}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center font-bold text-brand-700">
                    <span className="px-2 py-0.5 rounded-full bg-brand-50 border border-brand-200">
                      {catWantedCount}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleSaveEditCategory(cat.id)}
                          className="p-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition cursor-pointer"
                          title="Salvar alterações"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingCatId(null)}
                          className="p-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition cursor-pointer"
                          title="Cancelar edição"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => startEditCategory(cat)}
                          className="p-1.5 text-slate-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition cursor-pointer"
                          title="Editar categoria"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Tem certeza que deseja excluir a categoria "${cat.name}"? Os produtos vinculados serão movidos automaticamente para a categoria Outros.`
                              )
                            ) {
                              onDeleteCategory(cat.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Excluir categoria"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
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
