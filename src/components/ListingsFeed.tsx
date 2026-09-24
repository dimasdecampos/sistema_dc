import React from 'react';
import { Search, Tag, Filter, PlusCircle, Sparkles } from 'lucide-react';
import { Listing, Category } from '../types/marketplace';
import { ListingCard } from './ListingCard';
import { getStoredCategories } from '../services/categoryService';

interface ListingsFeedProps {
  listings: Listing[];
  activeType: 'ALL' | 'WANTED' | 'SALE';
  selectedCategory: string;
  searchQuery: string;
  categories?: Category[];
  onSelectType: (type: 'ALL' | 'WANTED' | 'SALE') => void;
  onSelectCategory: (catId: string) => void;
  onSearchChange: (search: string) => void;
  onListingClick: (listing: Listing) => void;
  onOpenWantedModal: () => void;
  onOpenSaleModal: () => void;
  currentUserId?: string;
}

export const ListingsFeed: React.FC<ListingsFeedProps> = ({
  listings,
  activeType,
  selectedCategory,
  searchQuery,
  categories = getStoredCategories(),
  onSelectType,
  onSelectCategory,
  onSearchChange,
  onListingClick,
  onOpenWantedModal,
  onOpenSaleModal,
  currentUserId,
}) => {
  // Filter listings
  const filtered = listings.filter((l) => {
    if (activeType !== 'ALL' && l.type !== activeType) return false;
    if (selectedCategory !== 'all' && l.category_id !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = l.title.toLowerCase().includes(q);
      const matchDesc = l.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    return true;
  });

  const wantedCount = listings.filter((l) => l.type === 'WANTED').length;
  const saleCount = listings.filter((l) => l.type === 'SALE').length;

  return (
    <div className="space-y-6">
      {/* Top Controls: Type Tabs & Category Filter */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Main Segmented Control */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/70 overflow-x-auto">
            <button
              onClick={() => onSelectType('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeType === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({listings.length})
            </button>

            <button
              onClick={() => onSelectType('WANTED')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeType === 'WANTED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Quem procura ({wantedCount})</span>
            </button>

            <button
              onClick={() => onSelectType('SALE')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeType === 'SALE'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>À Venda ({saleCount})</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filtrar por palavra..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-500 text-slate-900 transition"
            />
          </div>
        </div>

        {/* Category horizontal scroll pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => onSelectCategory('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            Todas as categorias
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Listings */}
      {filtered.length === 0 ? (
        <div className="p-12 bg-white rounded-3xl border border-dashed border-slate-300 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">
            Nenhum resultado encontrado
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Seja o primeiro a publicar o que procura ou a colocar um produto à venda na cidade!
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={onOpenWantedModal}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition cursor-pointer"
            >
              + Publicar o que procuro
            </button>
            <button
              onClick={onOpenSaleModal}
              className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold hover:bg-amber-600 transition cursor-pointer"
            >
              + Anunciar para venda
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => (
            <ListingCard
              key={item.id}
              listing={item}
              onClick={onListingClick}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
};
