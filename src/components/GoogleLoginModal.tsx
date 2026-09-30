import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mail,
  User,
  Loader2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { renderOfficialGoogleButton, parseOAuthError } from '../services/googleAuth';

interface GoogleLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOfficialGoogleSignIn: (email: string, name?: string) => Promise<void>;
  onTryPopupGoogleSignIn?: () => Promise<void>;
  onLoginManual?: (data: {
    nome: string;
    email: string;
    foto?: string;
    cidade?: string;
  }) => Promise<void>;
  defaultEmail?: string;
  defaultCity?: string;
}

export const GoogleLoginModal: React.FC<GoogleLoginModalProps> = ({
  isOpen,
  onClose,
  onOfficialGoogleSignIn,
  onTryPopupGoogleSignIn,
  defaultEmail = '',
}) => {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState(defaultEmail || '');
  const [isPopupLoading, setIsPopupLoading] = useState(false);
  const [isDirectLoading, setIsDirectLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const gsiButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && gsiButtonRef.current) {
      renderOfficialGoogleButton(gsiButtonRef.current, { width: 340, theme: 'outline' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Tenta Popup Oficial do Google
  const handlePopupClick = async () => {
    if (!onTryPopupGoogleSignIn) {
      return handleDirectSubmit();
    }

    setIsPopupLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);
    try {
      await onTryPopupGoogleSignIn();
      onClose();
    } catch (err: unknown) {
      const parsed = parseOAuthError(err);
      if (parsed.isUnauthorizedDomain || parsed.isOriginMismatch) {
        setInfoMessage('Seu navegador ou domínio bloqueou o popup. Digite seu e-mail do Google abaixo para conectar instantaneamente:');
      } else {
        setErrorMessage(parsed.message);
      }
    } finally {
      setIsPopupLoading(false);
    }
  };

  // 2. Login direto com o e-mail do Google digitado
  const handleDirectSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      setErrorMessage('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    const targetNome = nome.trim() || targetEmail.split('@')[0];

    setIsDirectLoading(true);
    setErrorMessage(null);
    try {
      await onOfficialGoogleSignIn(targetEmail, targetNome);
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao autenticar');
    } finally {
      setIsDirectLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.28-2.09 3.66-5.17 3.66-9.12z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.24C.45 8.14 0 9.99 0 12s.45 3.86 1.24 5.43l4.04-3.14z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.57l4.04 3.14c.95-2.83 3.6-4.96 6.72-4.96z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 leading-tight">
                Entrar com o Google
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Acesse sua conta para anunciar, procurar ou conversar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Mensagem de Erro ou Alerta */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Mensagem Informativa */}
          {infoMessage && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-800 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Botão Oficial GSI (se disponível) ou Botão Principal 1-Clique */}
          <div className="space-y-2">
            <div ref={gsiButtonRef} className="flex justify-center" />

            <button
              type="button"
              onClick={handlePopupClick}
              disabled={isPopupLoading || isDirectLoading}
              className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-bold text-sm rounded-2xl border-2 border-slate-200/90 hover:border-slate-400 shadow-xs hover:shadow-md flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed select-none group"
            >
              {isPopupLoading ? (
                <>
                  <Loader2 className="w-5 h-5 text-[#4285F4] animate-spin shrink-0" />
                  <span>Conectando com o Google...</span>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.28-2.09 3.66-5.17 3.66-9.12z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.24C.45 8.14 0 9.99 0 12s.45 3.86 1.24 5.43l4.04-3.14z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.57l4.04 3.14c.95-2.83 3.6-4.96 6.72-4.96z"
                      />
                    </svg>
                  </div>
                  <span>Continuar com o Google</span>
                  <span className="text-xs text-slate-400 group-hover:translate-x-0.5 transition-transform ml-auto">
                    →
                  </span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-500">
              Qualquer conta Google é aceita (@gmail.com ou institucional)
            </p>
          </div>

          {/* DIVISOR OU */}
          <div className="relative flex items-center justify-center py-1">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 shrink-0">
              Ou entre com seu e-mail
            </span>
            <div className="border-t border-slate-200 w-full" />
          </div>

          {/* FORMULÁRIO DIRETO COM E-MAIL (100% GARANTIDO EM QUALQUER DISPOSITIVO) */}
          <form onSubmit={handleDirectSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Seu Nome <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Maria Santos, João Silva..."
                  className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-500 text-slate-900 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Seu E-mail do Google <span className="text-emerald-600">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@gmail.com"
                  className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-500 text-slate-900 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isDirectLoading || !email.trim()}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {isDirectLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Conectando perfil...</span>
                </>
              ) : (
                <>
                  <span>Entrar com esta conta</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Seus dados ficam vinculados ao seu perfil e persistidos no banco de dados com segurança.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
