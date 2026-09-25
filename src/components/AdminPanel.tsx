import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  FolderTree,
  MoveRight,
  ShieldCheck,
  BarChart3,
  Plus,
  Trash2,
  Edit2,
  Save,
  RotateCcw,
  Tag,
  Search,
  CheckCircle2,
  AlertTriangle,
  GripVertical,
  Check,
  X,
  Sparkles,
  ExternalLink,
  Info,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Cloud,
  Database,
  UploadCloud,
  UserCheck,
} from 'lucide-react';
import { Category, Listing, SiteConfig, UserProfile } from '../types/marketplace';
import { Usuario } from '../types/auth';
import { getStoredCredentials } from '../lib/supabase';
import {
  ensureBucketExists,
  SUPABASE_STORAGE_BUCKET,
  SUPABASE_STORAGE_FOLDER,
} from '../services/storageService';

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
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'categories' | 'dragdrop' | 'listings' | 'metrics'>('config');

  // Form de Configurações
  const [formConfig, setFormConfig] = useState<SiteConfig>(() => ({ ...config }));
  const [isConfigSaved, setIsConfigSaved] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [lastAutoSaved, setLastAutoSaved] = useState<string | null>(null);
  const lastEmittedConfigRef = useRef<string>(JSON.stringify(config));

  // Sincroniza form quando a prop config mudar externamente (ex: reset ou troca de perfil)
  useEffect(() => {
    const configStr = JSON.stringify(config);
    if (configStr !== lastEmittedConfigRef.current) {
      lastEmittedConfigRef.current = configStr;
      setFormConfig({ ...config });
    }
  }, [config]);

  // Atualiza campo e salva instantaneamente no perfil do usuário
  const handleConfigFieldChange = <K extends keyof SiteConfig>(field: K, value: SiteConfig[K]) => {
    const updated: SiteConfig = { ...formConfig, [field]: value };
    setFormConfig(updated);
    lastEmittedConfigRef.current = JSON.stringify(updated);
    if (onConfigChange) {
      onConfigChange(updated);
    }
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastAutoSaved(timeStr);
  };

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

  // Drag and Drop State
  const [draggedListingId, setDraggedListingId] = useState<string | null>(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);
  const [dragSearch, setDragSearch] = useState('');
  const [dragTypeFilter, setDragTypeFilter] = useState<'ALL' | 'WANTED' | 'SALE'>('ALL');

  // Moderação State
  const [modSearch, setModSearch] = useState('');
  const [modTypeFilter, setModTypeFilter] = useState<'ALL' | 'WANTED' | 'SALE'>('ALL');
  const [modStatusFilter, setModStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');

  // Supabase Storage Bucket Test State
  const [bucketStatus, setBucketStatus] = useState<string | null>(null);
  const [isCheckingBucket, setIsCheckingBucket] = useState(false);

  const handleTestBucket = async () => {
    setIsCheckingBucket(true);
    setBucketStatus(null);
    try {
      const res = await ensureBucketExists(SUPABASE_STORAGE_BUCKET);
      setBucketStatus(res.message);
    } catch (e: unknown) {
      setBucketStatus(`Erro ao testar bucket: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsCheckingBucket(false);
    }
  };

  // Manipulação de Configurações
  const handleSaveConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formConfig);
    setIsConfigSaved(true);
    setTimeout(() => setIsConfigSaved(false), 3000);
  };

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

  // Métricas
  const totalWanted = listings.filter((l) => l.type === 'WANTED').length;
  const totalSale = listings.filter((l) => l.type === 'SALE').length;
  const activeWanted = listings.filter((l) => l.type === 'WANTED' && l.status === 'ACTIVE').length;
  const activeSale = listings.filter((l) => l.type === 'SALE' && l.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      {/* Top Banner do Admin */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black">Painel de Administração /admin</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-slate-950">
                Super Admin
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Configurações completas da plataforma, gestão de categorias com CRUD e movimentação por arrastar e soltar (drag & drop).
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
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-emerald-100 text-emerald-800">
            {categories.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('dragdrop')}
          className={`px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'dragdrop'
              ? 'bg-emerald-600 text-white shadow-sm'
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

        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'metrics'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Métricas</span>
        </button>
      </div>

      {/* ABA 1: CONFIGURAÇÕES GERAIS */}
      {activeTab === 'config' && (
        <form onSubmit={handleSaveConfigSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-600" />
                <span>Configurações do Marketplace</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Personalize cidade, títulos, banner de aviso e parâmetros da inteligência de matches.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onResetConfig}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer flex items-center gap-1.5 border border-slate-200"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Padrões</span>
              </button>

              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Ajustes</span>
              </button>
            </div>
          </div>

          {/* Banner Informativo de Perfil do Administrador */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50/40 to-slate-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    Configurações salvas no perfil de: <strong className="text-emerald-700">{currentUser?.nome || googleUser?.nome || 'Dimas'}</strong>
                  </span>
                  <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                    {currentUser?.email || googleUser?.email || 'dimasrafting@gmail.com'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Cada mudança que você fizer neste painel é guardada e vinculada ao seu perfil imediatamente.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-white px-3 py-1 rounded-xl border border-emerald-200 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{lastAutoSaved ? `Gravado no perfil às ${lastAutoSaved}` : 'Vinculado ao seu perfil'}</span>
              </span>
            </div>
          </div>

          {isConfigSaved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Configurações salvas e aplicadas em tempo real ao seu perfil!</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nome da Plataforma
              </label>
              <input
                type="text"
                value={formConfig.siteName}
                onChange={(e) => handleConfigFieldChange('siteName', e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-emerald-500"
                placeholder="Ex.: TemAqui"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Cidade de Operação (com UF)
              </label>
              <input
                type="text"
                value={formConfig.cityName}
                onChange={(e) => handleConfigFieldChange('cityName', e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-emerald-500"
                placeholder="Ex.: Socorro - SP"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Slogan / Tagline do Topo
              </label>
              <input
                type="text"
                value={formConfig.tagline}
                onChange={(e) => handleConfigFieldChange('tagline', e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-emerald-500"
                placeholder="Ex.: Marketplace local baseado em Procura e Oferta"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Título Principal da Página Inicial (Hero)
              </label>
              <input
                type="text"
                value={formConfig.heroTitle}
                onChange={(e) => handleConfigFieldChange('heroTitle', e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-emerald-500"
                placeholder="Ex.: O que você está procurando em Socorro?"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Subtítulo Explicativo da Página Inicial
              </label>
              <input
                type="text"
                value={formConfig.heroSubtitle}
                onChange={(e) => handleConfigFieldChange('heroSubtitle', e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-emerald-500"
                placeholder="Ex.: Diga o que você precisa. O sistema te avisa quando um morador cadastrar uma oferta."
              />
            </div>
          </div>

          {/* Banner de Aviso no Topo */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="noticeBannerEnabled"
                  checked={formConfig.noticeBannerEnabled}
                  onChange={(e) =>
                    handleConfigFieldChange('noticeBannerEnabled', e.target.checked)
                  }
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="noticeBannerEnabled" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Exibir Banner de Aviso no Topo do Site
                </label>
              </div>

              <select
                value={formConfig.noticeBannerType}
                onChange={(e) =>
                  handleConfigFieldChange(
                    'noticeBannerType',
                    e.target.value as 'info' | 'warning' | 'success'
                  )
                }
                className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700"
              >
                <option value="success">Verde (Sucesso / Destaque)</option>
                <option value="info">Azul (Informativo)</option>
                <option value="warning">Amarelo (Aviso)</option>
              </select>
            </div>

            {formConfig.noticeBannerEnabled && (
              <input
                type="text"
                value={formConfig.noticeBannerText}
                onChange={(e) =>
                  handleConfigFieldChange('noticeBannerText', e.target.value)
                }
                className="w-full text-xs font-medium bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-emerald-500"
                placeholder="Texto do aviso exibido para todos os usuários..."
              />
            )}
          </div>

          {/* Contato & Algoritmo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>Telefone de Contato</span>
              </label>
              <input
                type="text"
                value={formConfig.contactPhone}
                onChange={(e) => handleConfigFieldChange('contactPhone', e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:bg-white focus:outline-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>E-mail de Suporte</span>
              </label>
              <input
                type="text"
                value={formConfig.contactEmail}
                onChange={(e) => handleConfigFieldChange('contactEmail', e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:bg-white focus:outline-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Limiar de Match</span>
                <span className="text-emerald-700 font-extrabold">{formConfig.autoMatchThreshold}%</span>
              </label>
              <input
                type="range"
                min={20}
                max={75}
                step={5}
                value={formConfig.autoMatchThreshold}
                onChange={(e) =>
                  handleConfigFieldChange('autoMatchThreshold', Number(e.target.value))
                }
                className="w-full accent-emerald-600 mt-2"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Pontuação mínima (0-100) para cruzar Procura e Oferta.
              </p>
            </div>
          </div>

          {/* Seção Supabase Storage: Bucket 'img' */}
          <div className="pt-4 border-t border-slate-100">
            <div className="p-4 bg-gradient-to-r from-emerald-50/60 via-slate-50 to-slate-50 border border-emerald-100 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Supabase Storage (Bucket: <code className="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded text-xs font-mono">{SUPABASE_STORAGE_BUCKET}</code>)
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Pasta: {SUPABASE_STORAGE_FOLDER}/
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                      Máx. 5 fotos/produto
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900">
                      Redimensionamento WebP (1200px)
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Todos os uploads são salvos na pasta <strong>{SUPABASE_STORAGE_FOLDER}/</strong> do bucket <strong>{SUPABASE_STORAGE_BUCKET}</strong>. As imagens são redimensionadas no navegador antes do upload para economizar ~90% a 95% do armazenamento do Supabase.
                  </p>
                  {bucketStatus && (
                    <div className="mt-2 text-xs font-semibold text-emerald-800 bg-white p-2 rounded-lg border border-emerald-200 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{bucketStatus}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <button
                  type="button"
                  onClick={handleTestBucket}
                  disabled={isCheckingBucket}
                  className="px-3 py-2 text-xs font-bold bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl shadow-2xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                >
                  <UploadCloud className="w-4 h-4 text-emerald-600" />
                  <span>{isCheckingBucket ? 'Verificando...' : 'Verificar / Criar Bucket Img'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Administradores Autorizados */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Administradores Autorizados</h3>
                <p className="text-xs text-slate-500">
                  Qualquer pessoa que logar com um e-mail desta lista terá acesso liberado ao painel <code>/admin</code>.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  placeholder="adicionar.novo.admin@gmail.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:bg-white focus:outline-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newAdminEmail.trim() || !newAdminEmail.includes('@')) return;
                    const currentList = formConfig.adminEmails || ['dimasrafting@gmail.com'];
                    const updated = Array.from(new Set([...currentList, newAdminEmail.trim().toLowerCase()]));
                    handleConfigFieldChange('adminEmails', updated);
                    setNewAdminEmail('');
                  }}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  + Adicionar Admin
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {(formConfig.adminEmails || ['dimasrafting@gmail.com']).map((email) => {
                  const isPrimary = email.toLowerCase() === 'dimasrafting@gmail.com';
                  return (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200"
                    >
                      <span>{email}</span>
                      {isPrimary ? (
                        <span className="text-[10px] text-emerald-800 font-extrabold bg-emerald-100 px-1.5 py-0.5 rounded-md">
                          Admin Principal
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (formConfig.adminEmails || []).filter((e) => e !== email);
                            handleConfigFieldChange('adminEmails', updated);
                          }}
                          className="text-slate-400 hover:text-rose-600 transition cursor-pointer p-0.5"
                          title="Remover admin"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ABA 2: CRUD DE CATEGORIAS */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-emerald-600" />
                <span>Gestão Completa de Categorias (CRUD)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Crie, renomeie, mude ícones emoji e exclua categorias com reatribuição automática.
              </p>
            </div>

            <button
              onClick={() => setIsCreatingCategory(!isCreatingCategory)}
              className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>{isCreatingCategory ? 'Cancelar Criação' : '+ Nova Categoria'}</span>
            </button>
          </div>

          {/* Form de Criação */}
          {isCreatingCategory && (
            <form onSubmit={handleCreateCategorySubmit} className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
              <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
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
                    className="w-full text-center text-sm font-bold bg-white border border-emerald-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nome da Categoria</label>
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Ex.: Instrumentos Musicais"
                    className="w-full text-xs font-semibold bg-white border border-emerald-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div className="sm:col-span-1 flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
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

                      <td className="py-3 px-3 text-center font-bold text-emerald-700">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                          {catWantedCount}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSaveEditCategory(cat.id)}
                              className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition cursor-pointer"
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
                              className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
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
      )}

      {/* ABA 3: MOVER PRODUTOS COM DRAG AND DROP */}
      {activeTab === 'dragdrop' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <GripVertical className="w-5 h-5 text-emerald-600" />
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
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-emerald-500"
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
                        ? 'border-emerald-500 bg-emerald-50/90 scale-[1.02] shadow-md'
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
                      isDragging ? 'opacity-40 border-emerald-500' : 'border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />
                        <div>
                          <span
                            className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                              item.type === 'WANTED'
                                ? 'bg-emerald-100 text-emerald-800'
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
      )}

      {/* ABA 4: MODERAÇÃO DE ANÚNCIOS */}
      {activeTab === 'listings' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Tag className="w-5 h-5 text-emerald-600" />
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
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-emerald-500"
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
                                ? 'bg-emerald-100 text-emerald-800'
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
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
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
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                title="Editar publicação"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Excluir publicação "${item.title}" definitivamente? Todas as fotos deste anúncio serão removidas do Supabase Storage.`)) {
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
      )}

      {/* ABA 5: MÉTRICAS */}
      {activeTab === 'metrics' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Procuras Registradas
            </span>
            <div className="text-3xl font-black text-emerald-600 mt-2">{totalWanted}</div>
            <p className="text-[11px] text-slate-500 mt-1">{activeWanted} ativas no momento</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Produtos à Venda
            </span>
            <div className="text-3xl font-black text-amber-600 mt-2">{totalSale}</div>
            <p className="text-[11px] text-slate-500 mt-1">{activeSale} ativos no momento</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total de Categorias
            </span>
            <div className="text-3xl font-black text-slate-900 mt-2">{categories.length}</div>
            <p className="text-[11px] text-slate-500 mt-1">Configuradas e ativas</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Taxa de Atendimento
            </span>
            <div className="text-3xl font-black text-teal-600 mt-2">
              {totalWanted > 0 ? `${Math.round((activeSale / totalWanted) * 100)}%` : '100%'}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Relação oferta / procura</p>
          </div>
        </div>
      )}
    </div>
  );
};
