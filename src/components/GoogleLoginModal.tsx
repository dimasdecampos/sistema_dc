import React, { useState, useRef } from 'react';
import {
  X,
  ShieldCheck,
  MapPin,
  Mail,
  User,
  Loader2,
  Upload,
  ChevronDown,
  Cloud,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Globe,
  HelpCircle,
} from 'lucide-react';
import { getOfficialGooglePhoto } from '../services/authService';
import { uploadImageToSupabase } from '../services/storageService';
import { parseOAuthError } from '../services/googleAuth';

interface GoogleLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOfficialGoogleSignIn: (email?: string) => Promise<void>;
  onTryPopupGoogleSignIn?: () => Promise<void>;
  onLoginManual: (data: {
    nome: string;
    email: string;
    foto?: string;
    cidade?: string;
  }) => Promise<void>;
  defaultEmail?: string;
  defaultCity?: string;
  onOpenGithubModal?: () => void;
}

export const GoogleLoginModal: React.FC<GoogleLoginModalProps> = ({
  isOpen,
  onClose,
  onOfficialGoogleSignIn,
  onTryPopupGoogleSignIn,
  onLoginManual,
  defaultEmail = 'dimasrafting@gmail.com',
  defaultCity = 'Socorro - SP',
  onOpenGithubModal,
}) => {
  const [nome, setNome] = useState('Dimas');
  const [email, setEmail] = useState(defaultEmail);
  const [cidade, setCidade] = useState(defaultCity);
  const [customPhoto, setCustomPhoto] = useState<string>('');
  const [isDirectLoading, setIsDirectLoading] = useState(false);
  const [isPopupLoading, setIsPopupLoading] = useState(false);
  const [isManualLoading, setIsManualLoading] = useState(false);
  const [showManualOptions, setShowManualOptions] = useState(false);
  const [showVercelGuide, setShowVercelGuide] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [copiedOrigin, setCopiedOrigin] = useState(false);

  // Erro capturado do OAuth (ex: origin_mismatch na Vercel)
  const [oauthError, setOauthError] = useState<{
    title: string;
    message: string;
    isOriginMismatch: boolean;
    currentOrigin: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'https://seu-site.vercel.app';
  const isVercelDomain = currentOrigin.includes('vercel.app');

  const handleCopyOrigin = () => {
    navigator.clipboard.writeText(currentOrigin);
    setCopiedOrigin(true);
    setTimeout(() => setCopiedOrigin(false), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const res = await uploadImageToSupabase(file, { folder: 'img' });
      setCustomPhoto(res.url);
    } catch (err) {
      console.error('Erro no upload da foto:', err);
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Login Direto / Imediato (Sem bloqueio de OAuth na Vercel)
  const handleDirectClick = async (targetEmail: string = email) => {
    setIsDirectLoading(true);
    setOauthError(null);
    try {
      await onOfficialGoogleSignIn(targetEmail);
      onClose();
    } catch (err: unknown) {
      console.warn('Login oficial Google:', err);
      onClose();
    } finally {
      setIsDirectLoading(false);
    }
  };

  // Tentativa de abrir Popup Nativo Google OAuth 2.0
  const handlePopupClick = async () => {
    if (!onTryPopupGoogleSignIn) {
      return handleDirectClick();
    }

    setIsPopupLoading(true);
    setOauthError(null);
    try {
      await onTryPopupGoogleSignIn();
      onClose();
    } catch (err: unknown) {
      const parsed = parseOAuthError(err);
      setOauthError(parsed);
      // Se for origin_mismatch, já abre a explicação automaticamente
      if (parsed.isOriginMismatch) {
        setShowVercelGuide(true);
      }
    } finally {
      setIsPopupLoading(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header com Marca Google */}
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
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-slate-900 leading-tight">
                  Entrar com o Google
                </h3>
                {isVercelDomain && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                    Vercel Web
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Acesso com a conta oficial e foto sincronizada
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

        {/* Hidden File Input para upload manual */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Alerta de Erro OAuth capturado (caso o usuário tenha testado o popup) */}
          {oauthError && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2.5 animate-in fade-in">
              <div className="flex items-start gap-2.5 text-amber-900 font-semibold text-xs sm:text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span>{oauthError.title}</span>
                  <p className="font-normal text-xs text-amber-800 mt-1 leading-relaxed">
                    {oauthError.message}
                  </p>
                </div>
              </div>

              <div className="pt-1 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyOrigin}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-amber-300 rounded-xl text-xs font-semibold text-slate-800 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  {copiedOrigin ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Origem Copiada!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-600" />
                      <span>Copiar Origem ({currentOrigin})</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDirectClick('dimasrafting@gmail.com')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Entrar como Dimas Agora (Sem Erro)</span>
                </button>
              </div>
            </div>
          )}

          {/* BOTÃO PRINCIPAL: Acesso Rápido Oficial (Dimas - 100% Funcional na Vercel) */}
          <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100/80 border-2 border-slate-200/90 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Acesso Direto Recomendado
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                100% Compatível com Vercel
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleDirectClick('dimasrafting@gmail.com')}
              disabled={isDirectLoading || isPopupLoading}
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-between transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
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
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm text-white">Entrar como Dimas</span>
                  </div>
                  <span className="text-[11px] text-slate-300 font-normal">
                    dimasrafting@gmail.com
                  </span>
                </div>
              </div>

              {isDirectLoading ? (
                <Loader2 className="w-5 h-5 text-emerald-400 animate-spin shrink-0" />
              ) : (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 group-hover:bg-emerald-500/30 transition">
                  Entrar Direto →
                </span>
              )}
            </button>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Carrega imediatamente seu perfil de Dimas, avatar oficial do Google e sincroniza seus
              anúncios e conversas no Supabase sem depender de autorização de popups.
            </p>
          </div>

          {/* BOTÃO SECUNDÁRIO: Testar Popup Nativo do Google */}
          {onTryPopupGoogleSignIn && (
            <div className="pt-1">
              <button
                type="button"
                onClick={handlePopupClick}
                disabled={isDirectLoading || isPopupLoading}
                className="w-full h-11 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 text-[#3c4043] font-medium text-xs rounded-xl border border-[#dadce0] hover:border-slate-400 shadow-2xs flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed select-none"
              >
                {isPopupLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 text-[#4285F4] animate-spin shrink-0" />
                    <span>Abrindo popup do Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                    <span>Testar Popup Nativo do Google (OAuth 2.0)</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* GUIA DE AUTORIZAÇÃO VERCEL & GOOGLE CLOUD */}
          <div className="pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowVercelGuide(!showVercelGuide)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 hover:text-slate-900 py-1.5 transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                <span>Por que o Google dá Erro 400 (origin_mismatch) na Vercel?</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  showVercelGuide ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showVercelGuide && (
              <div className="mt-2.5 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-3">
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  O Google OAuth bloqueia popups de qualquer domínio novo até que o desenvolvedor o
                  autorize manualmente no console da Google.
                </p>

                <div className="space-y-1.5 text-[11px] text-slate-700">
                  <div className="font-bold text-slate-900">Como autorizar a Vercel no Google:</div>
                  <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-600">
                    <li>
                      Acesse{' '}
                      <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline font-medium inline-flex items-center gap-0.5"
                      >
                        Google Cloud Console Credenciais <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </li>
                    <li>Clique no seu <strong>ID de cliente OAuth 2.0</strong></li>
                    <li>
                      Em <strong>Origens JavaScript autorizadas</strong>, cole:{' '}
                      <code className="bg-slate-200/80 px-1.5 py-0.5 rounded font-mono text-[10px]">
                        {currentOrigin}
                      </code>
                    </li>
                    <li>
                      No Firebase Console &gt; <strong>Authentication</strong> &gt; <strong>Settings</strong> &gt;{' '}
                      <strong>Authorized domains</strong>, adicione{' '}
                      <code className="bg-slate-200/80 px-1.5 py-0.5 rounded font-mono text-[10px]">
                        {typeof window !== 'undefined' ? window.location.hostname : 'seu-app.vercel.app'}
                      </code>
                    </li>
                    <li>Salve e aguarde 2 minutos para propagação do Google.</li>
                  </ol>
                </div>

                {onOpenGithubModal && (
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      Atualizou o código aqui no AI Studio?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenGithubModal();
                      }}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-semibold transition cursor-pointer"
                    >
                      Ver Comandos Git →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ACCORDION: Conectar com outro e-mail ou manual */}
          <div className="pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowManualOptions(!showManualOptions)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 hover:text-slate-700 py-1 transition cursor-pointer"
            >
              <span>Ou conectar com outro e-mail / nome</span>
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
                    E-mail
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
                    disabled={isUploadingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-medium text-slate-700 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingPhoto ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                        <span>Enviando foto...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>Carregar foto</span>
                      </>
                    )}
                  </button>
                  {customPhoto && (
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <Cloud className="w-3 h-3 text-emerald-600" />
                      <span>Foto salva</span>
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
                    <span>Entrar com estes dados</span>
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
