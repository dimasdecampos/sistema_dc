import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_SITE_CONFIG,
  fetchSiteConfig,
  resetSiteConfig,
  saveSiteConfig,
} from '../services/siteConfigService';
import {
  createCategory,
  deleteCategory,
  loadCategories,
  updateCategory,
} from '../services/categoryService';
import type { Category, SiteConfig } from '../types/marketplace';
import type { ToastType } from './useToasts';

interface Options {
  showToast: (title: string, message?: string, type?: ToastType) => void;
  /** Recarrega anúncios e conversas depois de mudar categorias */
  reload: () => void;
}

/** Configuração do site (site_config) e categorias, com as ações do painel de administração. */
export function useSiteAdmin({ showToast, reload }: Options) {
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const [categories, setCategories] = useState<Category[]>([]);
  // Evita mostrar "acesso restrito" enquanto a configuração ainda carrega
  const [configReady, setConfigReady] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchSiteConfig()
      .then(setSiteConfig)
      .catch(() => {})
      .finally(() => setConfigReady(true));
    loadCategories().then(setCategories).catch((e) => console.warn('Erro ao carregar categorias:', e));
  }, []);

  // Edição campo a campo: atualiza a tela na hora e grava no banco após uma breve pausa
  const handleConfigChange = useCallback(
    (newCfg: SiteConfig) => {
      setSiteConfig(newCfg);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveSiteConfig(newCfg).catch((e) => showToast('Erro ao salvar configurações', String(e), 'error'));
      }, 800);
    },
    [showToast]
  );

  const handleSaveConfig = useCallback(
    async (newCfg: SiteConfig) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      try {
        const saved = await saveSiteConfig(newCfg);
        setSiteConfig(saved);
        showToast('Configurações salvas!', 'Os ajustes foram gravados no banco de dados.', 'success');
      } catch (e) {
        showToast('Erro ao salvar configurações', String(e), 'error');
      }
    },
    [showToast]
  );

  const handleResetConfig = useCallback(async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    try {
      const def = await resetSiteConfig(siteConfig);
      setSiteConfig(def);
      showToast('Configurações restauradas', 'Os parâmetros padrão foram redefinidos.', 'info');
    } catch (e) {
      showToast('Erro ao restaurar configurações', String(e), 'error');
    }
  }, [siteConfig, showToast]);

  const handleCreateCategory = async (input: { name: string; slug?: string; icon: string }) => {
    try {
      const created = await createCategory(input);
      setCategories(await loadCategories());
      showToast('Categoria criada!', `A categoria "${created.name}" foi adicionada com sucesso.`, 'success');
    } catch (e) {
      showToast('Erro ao criar categoria', String(e), 'error');
    }
  };

  const handleUpdateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      const updatedCat = await updateCategory(id, updates);
      setCategories(await loadCategories());
      reload();
      showToast('Categoria atualizada!', `A categoria "${updatedCat.name}" foi atualizada.`, 'success');
    } catch (e) {
      showToast('Erro ao atualizar categoria', String(e), 'error');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const res = await deleteCategory(id);
      setCategories(await loadCategories());
      reload();
      showToast(
        'Categoria excluída!',
        `Categoria removida. ${res.movedCount} produto(s) foram movidos para a categoria alternativa.`,
        'success'
      );
    } catch (e) {
      showToast('Erro ao excluir', String(e), 'error');
    }
  };

  return {
    siteConfig,
    categories,
    configReady,
    handleConfigChange,
    handleSaveConfig,
    handleResetConfig,
    handleCreateCategory,
    handleUpdateCategory,
    handleDeleteCategory,
  };
}
