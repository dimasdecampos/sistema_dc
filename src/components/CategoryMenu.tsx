import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, LayoutGrid } from 'lucide-react';
import { Category } from '../types/marketplace';

interface CategoryMenuProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

export const CategoryMenu: React.FC<CategoryMenuProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const selected = categories.find((c) => c.id === selectedCategory);

  const choose = (id: string) => {
    onSelectCategory(id);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
          open || selected
            ? 'bg-brand-50 text-brand-700'
            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden sm:inline">{selected ? selected.name : 'Categorias'}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="fixed inset-x-3 top-16 z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/10 sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:mt-2 sm:w-[26rem]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => choose('all')}
            className={`mb-1 flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span className="text-lg">🛍️</span>
            Todas as categorias
          </button>

          <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                role="menuitem"
                onClick={() => choose(cat.id)}
                className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  selectedCategory === cat.id
                    ? 'bg-brand-50 font-semibold text-brand-700'
                    : 'font-medium text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="text-lg">{cat.icon}</span>
                <span className="truncate">{cat.name}</span>
              </button>
            ))}
          </div>

          {categories.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-slate-400">Nenhuma categoria cadastrada.</p>
          )}
        </div>
      )}
    </div>
  );
};
