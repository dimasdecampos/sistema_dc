import React, { useEffect, useState } from 'react';
import { BadgeCheck, Check, ExternalLink, Loader2, Lock, Store } from 'lucide-react';
import { UserProfile } from '../types/marketplace';
import { SellerProfile, updateStoreSettings } from '../services/storeService';
import {
  STORE_COLOR_PRESETS,
  normalizeHex,
  readableTextColor,
  resolveStoreColor,
  shadeColor,
} from '../utils/storeTheme';

interface StoreSettingsProps {
  user: UserProfile;
  onSaved: (profile: SellerProfile) => void;
  onOpenStore: () => void;
}

/** "Minha loja" no painel: personalização (premium) ou convite para falar com o admin */
export const StoreSettings: React.FC<StoreSettingsProps> = ({ user, onSaved, onOpenStore }) => {
  const [name, setName] = useState(user.store_name || user.nome);
  const [color, setColor] = useState(resolveStoreColor(user.store_color));
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  // Mantém o formulário em dia quando o perfil é recarregado (ex.: o admin acabou de conceder o premium)
  useEffect(() => {
    setName(user.store_name || user.nome);
    setColor(resolveStoreColor(user.store_color));
  }, [user.id, user.store_name, user.store_color, user.nome]);

  if (!user.id) return null;

  if (!user.is_premium) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
          <Lock className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold text-slate-900">Loja personalizada · Premium</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            Com o premium você ganha uma página de loja só sua, com nome e cor da sua marca, todos os seus
            produtos, filtro por categoria e o número de vendas. Fale com o administrador para ativar.
          </p>
        </div>
      </div>
    );
  }

  const validColor = normalizeHex(color);
  const previewColor = validColor ?? resolveStoreColor(null);
  const unchanged =
    name.trim() === (user.store_name || user.nome) && previewColor === resolveStoreColor(user.store_color);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      const saved = await updateStoreSettings(user.id, { store_name: name, store_color: previewColor });
      onSaved(saved);
      setMessage({ kind: 'ok', text: 'Loja atualizada!' });
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Não foi possível salvar.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSave}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
          <Store className="h-4 w-4 text-brand-600" />
          Minha loja
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
            <BadgeCheck className="h-3 w-3" />
            Premium
          </span>
        </h3>
        <button
          type="button"
          onClick={onOpenStore}
          className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-brand-700 transition hover:text-brand-800"
        >
          Ver minha loja
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Nome da loja
            </span>
            <input
              type="text"
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Brechó da Ana"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 transition focus:border-brand-500 focus:bg-white focus:outline-hidden"
            />
            <span className="mt-1 block text-right text-[11px] text-slate-400">{name.length}/40</span>
          </label>

          <div>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Cor da loja
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {STORE_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setColor(preset)}
                  aria-label={`Cor ${preset}`}
                  aria-pressed={previewColor === preset}
                  className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 transition ${
                    previewColor === preset ? 'border-slate-900 scale-110' : 'border-white shadow-sm hover:scale-105'
                  }`}
                  style={{ background: preset, color: readableTextColor(preset) }}
                >
                  {previewColor === preset && <Check className="h-4 w-4" />}
                </button>
              ))}
              <label className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
                <input
                  type="color"
                  value={previewColor}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
                />
                Outra cor
              </label>
            </div>
          </div>
        </div>

        {/* Prévia ao vivo */}
        <div>
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Prévia</span>
          <div
            className="rounded-2xl p-4"
            style={{
              background: `linear-gradient(135deg, ${previewColor}, ${shadeColor(previewColor, -30)})`,
              color: readableTextColor(previewColor),
            }}
          >
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">
              <BadgeCheck className="h-3 w-3" />
              Loja Premium
            </span>
            <p className="mt-1.5 break-words text-lg font-extrabold leading-tight">{name.trim() || user.nome}</p>
            <p className="mt-0.5 text-xs opacity-80">por {user.nome}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isSaving || unchanged || name.trim().length === 0}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar loja
        </button>
        {message && (
          <span className={`text-xs font-semibold ${message.kind === 'ok' ? 'text-brand-700' : 'text-rose-600'}`}>
            {message.text}
          </span>
        )}
      </div>
    </form>
  );
};
