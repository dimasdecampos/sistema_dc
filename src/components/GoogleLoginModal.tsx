import React, { useState, useRef } from 'react';
import {
  X,
  ShieldCheck,
  MapPin,
  Mail,
  User,
  Loader2,
  Camera,
  Upload,
  Link as LinkIcon,
  ChevronDown,
} from 'lucide-react';
import { getOfficialGooglePhoto } from '../services/authService';

interface GoogleLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOfficialGoogleSignIn: () => Promise<void>;
  onLoginManual: (data: {
    nome: string;
    email: string;
    foto?: string;
    cidade?: string;
  }) => Promise<void>;
  defaultEmail?: string;
}

export const GoogleLoginModal: React.FC<GoogleLoginModalProps> = ({
  isOpen,
  onClose,
  onOfficialGoogleSignIn,
  onLoginManual,
  defaultEmail = 'dimasrafting@gmail.com',
}) => {
  const [nome, setNome] = useState('Dimas');
  const [email, setEmail] = useState(defaultEmail);
  const [cidade, setCidade] = useState('São Paulo');
  const [customPhoto, setCustomPhoto] = useState<string>('');
  const [isOfficialLoading, setIsOfficialLoading] = useState(false);
  const [isManualLoading, setIsManualLoading] = useState(false);
  const [showManualOptions, setShowManualOptions] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setCustomPhoto(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleOfficialClick = async () => {
    setIsOfficialLoading(true);
    try {
      await onOfficialGoogleSignIn();
      onClose();
    } catch (err: unknown) {
      console.warn('Erro ou cancelamento no login oficial:', err);
      // Se popup for bloqueado pelo navegador, expande as opções manuais
      setShowManualOptions(true);
    } finally {
      setIsOfficialLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !nome) return;

    setIsManualLoading(true);
    try {
      await onLoginManual({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        cidade: cidade.trim(),
        foto: customPhoto || getOfficialGooglePhoto(email),
      });
      onClose();
    } finally {
      setIsManualLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header with Google Brand */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/50 shrink-0">
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
                Login automático e busca da foto oficial do perfil
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Main Action: Official Google Login Button */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleOfficialClick}
              disabled={isOfficialLoading}
              className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 text-sm font-semibold rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-center gap-3 transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {isOfficialLoading ? (
                <>
                  <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                  <span>Conectando com o Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                  <span>Continuar com o Google (Automático)</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-500">
              Abre a tela oficial do Google para escolher sua conta e importar sua foto oficial automaticamente.
            </p>
          </div>

          {/* Security Notice */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Ao logar com o Google, os botões de <strong>Editar</strong> e{' '}
              <strong>Excluir</strong> clientes serão liberados. Seu e-mail, nome e foto oficial são salvos na tabela <strong>usuarios</strong> do Supabase.
            </p>
          </div>

          {/* Accordion: Opção Manual Alternativa */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowManualOptions(!showManualOptions)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 hover:text-slate-700 py-1 transition cursor-pointer"
            >
              <span>Ou conectar conta manualmente</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  showManualOptions ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showManualOptions && (
              <form onSubmit={handleManualSubmit} className="space-y-3 pt-3">
                {/* Nome */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-500 text-slate-900"
                      placeholder="Seu nome"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail do Google
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-500 text-slate-900"
                      placeholder="usuario@gmail.com"
                    />
                  </div>
                </div>

                {/* Cidade */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cidade
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-500 text-slate-900"
                      placeholder="Cidade"
                    />
                  </div>
                </div>

                {/* Foto personalizada opcional */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-medium text-slate-700 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Carregar arquivo de foto</span>
                  </button>
                  {customPhoto && (
                    <span className="text-[10px] text-emerald-600 font-semibold">
                      Foto anexada
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isManualLoading || !email || !nome}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isManualLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Entrar Manualmente</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
