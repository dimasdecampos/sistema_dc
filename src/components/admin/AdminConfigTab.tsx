import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  ShieldCheck,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Check,
  X,
  Phone,
  Mail,
  Cloud,
  UploadCloud,
  UserCheck,
  Copy,
} from 'lucide-react';
import { SiteConfig, UserProfile } from '../../types/marketplace';
import { Usuario } from '../../types/auth';
import { SUPABASE_STORAGE_FIX_SQL } from '../../lib/supabase';
import { SUPABASE_STORAGE_BUCKET, SUPABASE_STORAGE_FOLDER } from '../../services/storageService';
import { testSupabaseStorageBucket } from '../../services/storageDiagnostics';

interface AdminConfigTabProps {
  config: SiteConfig;
  currentUser?: UserProfile;
  googleUser?: Usuario | null;
  onSaveConfig: (newConfig: SiteConfig) => void;
  onConfigChange?: (updatedConfig: SiteConfig) => void;
  onResetConfig: () => void;
}

export const AdminConfigTab: React.FC<AdminConfigTabProps> = ({ config, currentUser, googleUser, onSaveConfig, onConfigChange, onResetConfig }) => {
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

  // Supabase Storage Bucket Test State
  const [bucketStatus, setBucketStatus] = useState<string | null>(null);
  const [isCheckingBucket, setIsCheckingBucket] = useState(false);
  const [bucketTestSuccess, setBucketTestSuccess] = useState<boolean | null>(null);
  const [isCopiedBucketSql, setIsCopiedBucketSql] = useState(false);

  const handleTestBucket = async () => {
    setIsCheckingBucket(true);
    setBucketStatus(null);
    setBucketTestSuccess(null);
    try {
      const res = await testSupabaseStorageBucket(SUPABASE_STORAGE_BUCKET);
      setBucketStatus(res.message);
      setBucketTestSuccess(res.success);
    } catch (e: unknown) {
      setBucketStatus(`Erro ao testar bucket: ${e instanceof Error ? e.message : String(e)}`);
      setBucketTestSuccess(false);
    } finally {
      setIsCheckingBucket(false);
    }
  };

  const handleCopyBucketSql = () => {
    navigator.clipboard.writeText(SUPABASE_STORAGE_FIX_SQL);
    setIsCopiedBucketSql(true);
    setTimeout(() => setIsCopiedBucketSql(false), 3000);
  };

  // Manipulação de Configurações
  const handleSaveConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formConfig);
    setIsConfigSaved(true);
    setTimeout(() => setIsConfigSaved(false), 3000);
  };

  return (
    <form onSubmit={handleSaveConfigSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-brand-600" />
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
            className="px-5 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Ajustes</span>
          </button>
        </div>
      </div>

      {/* Banner Informativo de Perfil do Administrador */}
      <div className="p-3.5 bg-gradient-to-r from-brand-50 via-teal-50/40 to-slate-50 border border-brand-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                Configurações salvas no perfil de: <strong className="text-brand-700">{currentUser?.nome || googleUser?.nome || 'Dimas'}</strong>
              </span>
              <span className="text-[10px] font-extrabold bg-brand-100 text-brand-800 px-2 py-0.5 rounded-full border border-brand-200">
                {currentUser?.email || googleUser?.email || 'dimasrafting@gmail.com'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Cada mudança que você fizer neste painel é guardada e vinculada ao seu perfil imediatamente.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-800 bg-white px-3 py-1 rounded-xl border border-brand-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            <span>{lastAutoSaved ? `Gravado no perfil às ${lastAutoSaved}` : 'Vinculado ao seu perfil'}</span>
          </span>
        </div>
      </div>

      {isConfigSaved && (
        <div className="p-3 bg-brand-50 border border-brand-200 text-brand-800 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-brand-600" />
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
            className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-brand-500"
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
            className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-brand-500"
            placeholder="Ex.: São Luis do Paraitinga - SP"
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
            className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-brand-500"
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
            className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-brand-500"
            placeholder="Ex.: O que você está procurando em São Luis do Paraitinga?"
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
            className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-brand-500"
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
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
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
            className="w-full text-xs font-medium bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-brand-500"
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
            className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:bg-white focus:outline-brand-500"
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
            className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:bg-white focus:outline-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
            <span>Limiar de Match</span>
            <span className="text-brand-700 font-extrabold">{formConfig.autoMatchThreshold}%</span>
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
            className="w-full accent-brand-600 mt-2"
          />
          <p className="text-[10px] text-slate-400 mt-1">
            Pontuação mínima (0-100) para cruzar Procura e Oferta.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Cards por vez nas listas
          </label>
          <input
            type="number"
            min={4}
            max={100}
            value={formConfig.cardsPerPage ?? 16}
            onChange={(e) =>
              handleConfigFieldChange(
                'cardsPerPage',
                Math.min(100, Math.max(4, Math.round(Number(e.target.value)) || 16))
              )
            }
            className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:bg-white focus:outline-brand-500"
          />
          <p className="text-[10px] text-slate-400 mt-1">Padrão: 16.</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Carregar mais anúncios
          </label>
          <select
            value={formConfig.loadMoreMode || 'button'}
            onChange={(e) =>
              handleConfigFieldChange('loadMoreMode', e.target.value as 'button' | 'infinite')
            }
            className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:bg-white focus:outline-brand-500"
          >
            <option value="button">Botão "Ver mais" no fim da página</option>
            <option value="infinite">Rolagem infinita</option>
          </select>
        </div>
      </div>

      {/* Seção Supabase Storage: Bucket 'img' */}
      <div className="pt-4 border-t border-slate-100">
        <div className="p-4 bg-gradient-to-r from-brand-50/60 via-slate-50 to-slate-50 border border-brand-100 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Supabase Storage (Bucket: <code className="bg-brand-100 text-brand-900 px-1.5 py-0.5 rounded text-xs font-mono">{SUPABASE_STORAGE_BUCKET}</code>)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-800">
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
                <div
                  className={`mt-2.5 p-2.5 rounded-xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 ${
                    bucketTestSuccess
                      ? 'bg-brand-50 border-brand-200 text-brand-900'
                      : 'bg-amber-50 border-amber-200 text-amber-950'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {bucketTestSuccess ? (
                      <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <span className="font-semibold">{bucketStatus}</span>
                  </div>

                  {!bucketTestSuccess && (
                    <button
                      type="button"
                      onClick={handleCopyBucketSql}
                      className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      {isCopiedBucketSql ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar SQL de Correção</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <button
              type="button"
              onClick={handleTestBucket}
              disabled={isCheckingBucket}
              className="px-3.5 py-2 text-xs font-bold bg-white hover:bg-brand-50 text-brand-700 border border-brand-300 rounded-xl shadow-2xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
            >
              <UploadCloud className="w-4 h-4 text-brand-600" />
              <span>{isCheckingBucket ? 'Verificando Bucket...' : 'Testar Bucket Img'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Administradores Autorizados */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-brand-600" />
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
              className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:bg-white focus:outline-brand-500"
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
                    <span className="text-[10px] text-brand-800 font-extrabold bg-brand-100 px-1.5 py-0.5 rounded-md">
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
  );
};
