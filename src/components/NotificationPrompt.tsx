import React, { useState } from 'react';
import { BellRing, Loader2, Smartphone } from 'lucide-react';
import {
  NotificationState,
  enableNotifications,
  getNotificationState,
  needsIosInstall,
} from '../services/notificationService';

/** Convite para ativar os avisos de mensagem nova (precisa de um toque, regra dos navegadores) */
export const NotificationPrompt: React.FC = () => {
  const [state, setState] = useState<NotificationState>(getNotificationState);
  const [isLoading, setIsLoading] = useState(false);

  // iPhone/iPad: antes de pedir permissão é preciso instalar o site na Tela de Início
  if (needsIosInstall()) {
    return (
      <div className="flex items-start gap-2.5 border-b border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="leading-relaxed">
          Para receber avisos de mensagens no iPhone, toque em <strong>Compartilhar</strong> e depois em{' '}
          <strong>Adicionar à Tela de Início</strong>. Abra o TemAqui por esse ícone e ative os avisos.
        </p>
      </div>
    );
  }

  if (state === 'unsupported' || state === 'granted') return null;

  if (state === 'denied') {
    return (
      <p className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] leading-relaxed text-slate-500">
        Os avisos estão bloqueados neste navegador. Para ativar, libere as notificações do site nas configurações do
        navegador.
      </p>
    );
  }

  const handleEnable = async () => {
    setIsLoading(true);
    try {
      setState(await enableNotifications());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 border-b border-emerald-100 bg-emerald-50 px-4 py-3">
      <BellRing className="h-4 w-4 shrink-0 text-emerald-600" />
      <p className="min-w-0 flex-1 text-xs leading-snug text-emerald-900">
        Quer ser avisado quando chegar mensagem nova?
      </p>
      <button
        type="button"
        onClick={handleEnable}
        disabled={isLoading}
        className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Ativar avisos
      </button>
    </div>
  );
};
