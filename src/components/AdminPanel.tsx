import React, { useState } from 'react';
import {
  Settings,
  FolderTree,
  ShieldCheck,
  BarChart3,
  Users,
  Tag,
  GripVertical,
  X,
} from 'lucide-react';
import { Category, Listing, SiteConfig, UserProfile } from '../types/marketplace';
import { Usuario } from '../types/auth';
import { AdminOverview } from './AdminOverview';
import { AdminUsers } from './AdminUsers';

import { AdminConfigTab } from './admin/AdminConfigTab';
import { AdminCategoriesTab } from './admin/AdminCategoriesTab';
import { AdminMoveTab } from './admin/AdminMoveTab';
import { AdminModerationTab } from './admin/AdminModerationTab';

interface AdminPanelProps {
  config: SiteConfig;
  categories: Category[];
  listings: Listing[];
  currentUser?: UserProfile;
  googleUser?: Usuario | null;
  onSaveConfig: (newConfig: SiteConfig) => void;
  onConfigChange?: (updatedConfig: SiteConfig) => void;
  onResetConfig: () => void;
  onCreateCategory: (input: { name: string; slug?: string; icon: string }) => void;
  onUpdateCategory: (id: string, updates: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
  onMoveListingCategory: (listingId: string, targetCategoryId: string) => void;
  onDeleteListing: (listingId: string) => void;
  onUpdateListingStatus: (listingId: string, status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED') => void;
  onEditListing?: (listing: Listing) => void;
  onCloseAdmin: () => void;
  /** Recarrega os dados do app depois de ações que mudam o banco (ex.: remover usuário) */
  onDataChanged?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  config,
  categories,
  listings,
  currentUser,
  googleUser,
  onSaveConfig,
  onConfigChange,
  onResetConfig,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onMoveListingCategory,
  onDeleteListing,
  onUpdateListingStatus,
  onEditListing,
  onCloseAdmin,
  onDataChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'categories' | 'dragdrop' | 'listings' | 'metrics' | 'users'>('metrics');

  return (
    <div className="space-y-6">
      {/* Top Banner do Admin */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black">Painel de Administração /admin</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-500 text-slate-950">
                Super Admin
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Números da plataforma, usuários, anúncios, categorias e configurações. Acesso restrito aos administradores.
            </p>
          </div>
        </div>

        <button
          onClick={onCloseAdmin}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer self-start sm:self-auto border border-white/10 flex items-center gap-1.5"
        >
          <X className="w-4 h-4" />
          <span>Sair do Admin</span>
        </button>
      </div>

      {/* Navegação de Abas do Admin */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'metrics'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Visão geral</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Usuários</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'config'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Configurações Gerais</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'categories'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <FolderTree className="w-4 h-4" />
          <span>Categorias (CRUD)</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-brand-100 text-brand-800">
            {categories.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('dragdrop')}
          className={`px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'dragdrop'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <GripVertical className="w-4 h-4" />
          <span>Mover Produtos (Drag & Drop)</span>
        </button>

        <button
          onClick={() => setActiveTab('listings')}
          className={`px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'listings'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Moderação de Anúncios</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-slate-200 text-slate-700">
            {listings.length}
          </span>
        </button>

      </div>

      {activeTab === 'config' && (
        <AdminConfigTab
          config={config}
          currentUser={currentUser}
          googleUser={googleUser}
          onSaveConfig={onSaveConfig}
          onConfigChange={onConfigChange}
          onResetConfig={onResetConfig}
        />
      )}

      {activeTab === 'categories' && (
        <AdminCategoriesTab
          categories={categories}
          listings={listings}
          onCreateCategory={onCreateCategory}
          onUpdateCategory={onUpdateCategory}
          onDeleteCategory={onDeleteCategory}
        />
      )}

      {activeTab === 'dragdrop' && (
        <AdminMoveTab categories={categories} listings={listings} onMoveListingCategory={onMoveListingCategory} />
      )}

      {activeTab === 'listings' && (
        <AdminModerationTab
          categories={categories}
          listings={listings}
          onDeleteListing={onDeleteListing}
          onUpdateListingStatus={onUpdateListingStatus}
          onEditListing={onEditListing}
        />
      )}

      {/* ABA: VISÃO GERAL (números do banco) */}
      {activeTab === 'metrics' && <AdminOverview listings={listings} categories={categories} />}

      {/* ABA: USUÁRIOS */}
      {activeTab === 'users' && (
        <AdminUsers currentUserId={currentUser?.id} onDataChanged={onDataChanged} />
      )}
    </div>
  );
};
