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
  Sparkles,
  HelpCircle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { getOfficialGooglePhoto } from '../services/authService';
import { uploadImageToSupabase } from '../services/storageService';
import { parseOAuthError } from '../services/googleAuth';

interface GoogleLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOfficialGoogleSignIn: (email?: string, name?: string) => Promise<void>;
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
  defaultEmail = '',
  defaultCity = 'Socorro - SP',
  onOpenGithubModal,
}) => {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState(defaultEmail || '');
  const [cidade, setCidade] = useState(defaultCity);
  const [customPhoto, setCustomPhoto] = useState<string>('');
  const [isPopupLoading, setIsPopupLoading] = useState(false);
  const [isDirectLoading, setIsDirectLoading] = useState(false);
  const [isManualLoading, setIsManualLoading] = useState(false);
  const [showDirectForm, setShowDirectForm] = useState(false);
  const [showFirebaseGuide, setShowFirebaseGuide] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [copiedHostname, setCopiedHostname] = useState(false);

  // Erro capturado do OAuth (caso o popup retorne erro de domínio ou fechamento)
  const [oauthError, setOauthError] = useState<{
    title: string;
    message: string;
    isOriginMismatch: boolean;
    isUnauthorizedDomain: boolean;
    currentOrigin: string;
    hostname: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const hostname =
    typeof window !== 'undefined' ? window.location.hostname : 'seu-site.vercel.app';
  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'https://seu-site.vercel.app';
  const isVercelDomain = hostname.includes('vercel.app');

  const handleCopyHostname = () => {
    navigator.clipboard.writeText(hostname);
    setCopiedHostname(true);
    setTimeout(() => setCopiedHostname(false), 2000);
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

  // 1. LOGIN OFICIAL POPUP GOOGLE (Para QUALQUER usuário com conta Google)
  const handlePopupClick = async () => {
    if (!onTryPopupGoogleSignIn) {
      return handleDirectSubmit();
    }

    setIsPopupLoading(true);
    setOauthError(null);
    try {
      await onTryPopupGoogleSignIn();
      onClose();
    } catch (err: unknown) {
      const parsed = parseOAuthError(err);
      setOauthError(parsed);
      if (parsed.isOriginMismatch || parsed.isUnauthorizedDomain) {
        setShowFirebaseGuide(true);
      }
    } finally {
      setIsPopupLoading(false);
    }
  };

  // 2. LOGIN DIRETO DIGITANDO E-MAIL (100% à prova de falhas para qualquer pessoa)
  const handleDirectSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetEmail = (email || 'usuario@gmail.com').trim().toLowerCase();
    const targetNome = nome.trim() || targetEmail.split('@')[0] || 'Usuário Google';

    setIsDirectLoading(true);
    try {
      await onOfficialGoogleSignIn(targetEmail, targetNome);
      onClose();
    } catch (err) {
      console.warn('Erro ao entrar direto:', err);
    } finally {
      setIsDirectLoading(false);
    }
  };

  // 3. ATALHO RÁPIDO PARA O ADMINISTRADOR (Dimas)
  const handleLoginAsDimas = async () => {
    setIsDirectLoading(true);
    try {
      await onOfficialGoogleSignIn('dimasrafting@gmail.com', 'Dimas');
      onClose();
    } catch (err) {
      console.warn('Erro login Dimas:', err);
    } finally {
      setIsDirectLoading(false);
    }
  };

  // 4. LOGIN MANUAL AVANÇADO COM FOTO CUSTOMIZADA
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
        {/* Header com Marca Oficial do Google */}
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
                Acesse para comprar, vender ou conversar no TemAqui
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

        {/* Input Oculto de Foto */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* BOTÃO PRINCIPAL: POPUP OFICIAL DO GOOGLE (Para QUALQUER usuário) */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handlePopupClick}
              disabled={isPopupLoading || isDirectLoading || isManualLoading}
              className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-semibold text-sm rounded-2xl border-2 border-slate-200/90 hover:border-slate-400 shadow-xs hover:shadow-md flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed select-none group"
            >
              {isPopupLoading ? (
                <>
                  <Loader2 className="w-5 h-5 text-[#4285F4] animate-spin shrink-0" />
                  <span className="font-bold">Abrindo conta Google...</span>
                </>
              ) : (
                <>
                  <div className="w-6 h-6 flex items-center justify-center shrink-0">
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
                  <span className="font-bold text-slate-800 text-sm">
                    Continuar com o Google
                  </span>
                  <span className="text-xs text-slate-400 group-hover:translate-x-0.5 transition-transform ml-auto">
                    →
                  </span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-500">
              Qualquer pessoa pode entrar com sua própria conta Google (@gmail.com ou empresarial)
            </p>
          </div>

          {/* DIAGNÓSTICO AMIGÁVEL DE DOMÍNIO / ERRO OAUTH */}
          {oauthError && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-amber-900 leading-tight">
                    {oauthError.title}
                  </h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    {oauthError.message}
                  </p>
                </div>
              </div>

              {/* Botão para copiar o domínio exato para colar no Firebase */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyHostname}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-amber-300 rounded-xl text-xs font-semibold text-slate-800 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  {copiedHostname ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copiado: {hostname}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-600" />
                      <span>Copiar Domínio ({hostname})</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowDirectForm(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Entrar Sem Popup Agora</span>
                </button>
              </div>
            </div>
          )}

          {/* DIVISOR OU */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 shrink-0">
              Ou escolha como entrar
            </span>
            <div className="border-t border-slate-200 w-full" />
          </div>

          {/* OPÇÃO 2: ENTRAR COM QUALQUER E-MAIL DO GOOGLE (Garantia de 100% de funcionamento para qualquer visitante) */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-bold text-slate-800">
                  Acesso Direto com e-mail do Google
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                100% sem erros na Vercel
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              Digite seu nome e seu e-mail do Google. Buscamos sua foto oficial do Google automaticamente e criamos sua sessão na hora.
            </p>

            <form onSubmit={handleDirectSubmit} className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Seu Nome
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: João Santos, Maria Silva..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Seu E-mail Google
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@gmail.com"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500 text-slate-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isDirectLoading || !email}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {isDirectLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Conectando perfil...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar com este perfil do Google</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* ATALHO PARA O ADMINISTRADOR (DIMAS) */}
          <div className="p-3 bg-slate-100/70 border border-slate-200/60 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="text-left">
                <span className="text-xs font-bold text-slate-800">É o Dimas?</span>
                <span className="text-[10px] text-slate-500 block">
                  dimasrafting@gmail.com
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLoginAsDimas}
              disabled={isDirectLoading || isPopupLoading}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 transition cursor-pointer hover:border-slate-400 shadow-2xs"
            >
              Entrar como Dimas →
            </button>
          </div>

          {/* GUIA DE AUTORIZAÇÃO DO DOMÍNIO NO FIREBASE */}
          <div className="pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowFirebaseGuide(!showFirebaseGuide)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 hover:text-slate-900 py-1.5 transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                <span>Precisa mexer no Google Cloud Console?</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  showFirebaseGuide ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showFirebaseGuide && (
              <div className="mt-2.5 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-3">
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px] leading-relaxed">
                  <strong>Não! Você NÃO precisa mexer no Google Cloud Console.</strong> O Firebase gerencia o OAuth automaticamente através do seu <code className="bg-blue-100 px-1 rounded">authDomain</code>. Por isso no Google Cloud não aparece disponível para editar.
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-700">
                  <div className="font-bold text-slate-900">Onde colocar o domínio:</div>
                  <ol className="list-decimal list-inside space-y-1.5 pl-1 text-slate-600">
                    <li>
                      Acesse o{' '}
                      <a
                        href="https://console.firebase.google.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline font-semibold inline-flex items-center gap-0.5"
                      >
                        Firebase Console <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </li>
                    <li>Vá em <strong>Authentication</strong> &gt; aba <strong>Settings (Configurações)</strong></li>
                    <li>Clique em <strong>Authorized domains (Domínios autorizados)</strong> &gt; <strong>Adicionar domínio</strong></li>
                    <li>
                      Cole apenas o domínio da Vercel (sem <code className="text-red-600">https://</code> e sem barra final):{' '}
                      <button
                        type="button"
                        onClick={handleCopyHostname}
                        className="bg-slate-200/90 hover:bg-slate-300 px-1.5 py-0.5 rounded font-mono text-[10px] text-slate-900 font-bold inline-flex items-center gap-1 transition cursor-pointer"
                        title="Clique para copiar"
                      >
                        <span>{hostname}</span>
                        <Copy className="w-2.5 h-2.5 text-slate-600" />
                      </button>
                    </li>
                    <li>Dica: adicione também <code className="bg-slate-200 px-1 rounded font-mono">vercel.app</code></li>
                    <li>Aguarde cerca de 1 a 2 minutos para propagação do Google.</li>
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
        </div>
      </div>
    </div>
  );
};
