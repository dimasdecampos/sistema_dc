import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { renderOfficialGoogleButton, parseOAuthError } from '../services/googleAuth';

interface GoogleLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignInWithGoogle: () => Promise<void>;
  title?: string;
  subtitle?: string;
}

export const GoogleLoginModal: React.FC<GoogleLoginModalProps> = ({
  isOpen,
  onClose,
  onSignInWithGoogle,
  title = 'Entrar com o Google',
  subtitle = 'Acesse sua conta para anunciar desapegos, registrar procuras ou conversar no chat.',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const gsiButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      if (gsiButtonRef.current) {
        renderOfficialGoogleButton(gsiButtonRef.current, { width: 340, theme: 'outline' });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleClick = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await onSignInWithGoogle();
      onClose();
    } catch (err: unknown) {
      const parsed = parseOAuthError(err);
      if (!parsed.isClosedByUser) {
        setErrorMessage(parsed.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
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
                {title}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Autenticação oficial do Google
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

        {/* Body */}
        <div className="p-6 space-y-5">
          <p className="text-sm text-slate-600 leading-relaxed text-center">
            {subtitle}
          </p>

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Botão Oficial GSI (se renderizado pelo script do Google) */}
          <div ref={gsiButtonRef} className="flex justify-center empty:hidden" />

          {/* Botão Padrão de Mercado "Continuar com o Google" */}
          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-bold text-sm rounded-2xl border-2 border-slate-200/90 hover:border-slate-400 shadow-xs hover:shadow-md flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed select-none group"
          >
            {isLoading ? (
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

          {/* Selo de Confiança / Padrão de Mercado */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100/90 space-y-1.5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Login Seguro Padrão Google</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Selecione qualquer conta Google (@gmail.com ou institucional). Seus dados e anúncios serão vinculados diretamente ao seu perfil real.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
