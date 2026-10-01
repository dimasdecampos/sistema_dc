import React, { useState } from 'react';
import {
  X,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Mail,
  ArrowRight,
  Database,
  Lock,
  User,
  MapPin,
  Sparkles,
} from 'lucide-react';
import {
  signInWithSupabaseGoogle,
  signInWithQuickAccess,
  signInWithSupabasePassword,
  signUpWithSupabase,
} from '../services/supabaseAuth';
import { Usuario } from '../types/auth';

interface GoogleLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserLoggedIn?: (user: Usuario) => void;
  title?: string;
  subtitle?: string;
}

export const GoogleLoginModal: React.FC<GoogleLoginModalProps> = ({
  isOpen,
  onClose,
  onUserLoggedIn,
  title = 'Acesse sua Conta',
  subtitle = 'Conecte sua conta para anunciar seu desapego, registrar o que procura e conversar pelo chat.',
}) => {
  const [activeTab, setActiveTab] = useState<'google' | 'password'>('google');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('dimasrafting@gmail.com');
  const [nome, setNome] = useState('Dimas Rafting');
  const [cidade, setCidade] = useState('São Luis do Paraitinga - SP');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  // 1. Login com Google oficial via Supabase OAuth
  const handleSupabaseGoogleOAuth = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await signInWithSupabaseGoogle();
      // Se redirecionou, o navegador irá navegar
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('provider is not enabled') ||
        msg.includes('Unsupported provider') ||
        msg.includes('Chave Anon') ||
        msg.includes('não conectado')
      ) {
        setErrorMessage(
          'Dica: O Google OAuth no painel do Supabase ainda não foi habilitado ou a chave está pendente. Você pode entrar imediatamente pelo formulário de Acesso Rápido abaixo com seu e-mail do Google!'
        );
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Acesso Rápido Direto com Conta Google / E-mail (100% garantido e sem restrições)
  const handleQuickAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const loggedUser = await signInWithQuickAccess(
        email.trim(),
        nome.trim() || undefined,
        cidade.trim() || undefined
      );
      if (onUserLoggedIn) {
        onUserLoggedIn(loggedUser);
      }
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Login ou Cadastro com Senha no Supabase
  const handlePasswordAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Por favor, informe um e-mail válido.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      let loggedUser: Usuario;
      if (isSignUp) {
        loggedUser = await signUpWithSupabase(
          email.trim(),
          password,
          nome.trim() || undefined,
          cidade.trim() || undefined
        );
      } else {
        loggedUser = await signInWithSupabasePassword(email.trim(), password);
      }

      if (onUserLoggedIn) {
        onUserLoggedIn(loggedUser);
      }
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-center shrink-0">
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
              <h3 className="font-extrabold text-lg text-slate-900 leading-tight">
                {title}
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span>Login Google & Supabase</span>
                <span>•</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <Database className="w-3 h-3 text-emerald-600" />
                  PostgreSQL
                </span>
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

        {/* Tabs de Seleção de Login */}
        <div className="flex border-b border-slate-200/90 bg-slate-100/50 p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('google');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'google'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Conta Google (Direto)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('password');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'password'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-slate-600" />
            <span>E-mail / Senha Supabase</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed text-center">
            {subtitle}
          </p>

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-snug">{errorMessage}</div>
            </div>
          )}

          {activeTab === 'google' ? (
            <div className="space-y-4">
              {/* Botão Oficial OAuth do Google via Supabase */}
              <button
                type="button"
                onClick={handleSupabaseGoogleOAuth}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-bold text-sm rounded-2xl border-2 border-slate-200/90 hover:border-slate-400 shadow-xs hover:shadow-md flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed select-none group"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 text-[#4285F4] animate-spin shrink-0" />
                    <span>Conectando com o Google...</span>
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
                    <span>Continuar com o Google (OAuth)</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform ml-auto" />
                  </>
                )}
              </button>

              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-slate-200/90 w-full" />
                <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                  ou acesso direto por e-mail
                </span>
              </div>

              {/* Formulário de Acesso Rápido Garantido (sem bloqueios de popup ou iframe) */}
              <form onSubmit={handleQuickAccessSubmit} className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/90">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Seu E-mail do Google:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('dimasrafting@gmail.com');
                      setNome('Dimas Rafting');
                    }}
                    className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer underline"
                  >
                    Usar dimasrafting@gmail.com
                  </button>
                </div>

                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: seu.email@gmail.com"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-medium transition"
                />

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mb-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>Nome:</span>
                    </label>
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Seu nome"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mb-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>Cidade:</span>
                    </label>
                    <input
                      type="text"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      placeholder="Sua cidade"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>Entrar Agora e Continuar</span>
                </button>
              </form>
            </div>
          ) : (
            /* Formulário E-mail e Senha no Supabase */
            <form onSubmit={handlePasswordAuthSubmit} className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/90">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800">
                  {isSignUp ? 'Criar Conta no Supabase' : 'Entrar com Senha'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer underline"
                >
                  {isSignUp ? 'Já tem conta? Entrar' : 'Não tem conta? Cadastrar'}
                </button>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Senha</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {isSignUp && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Nome</label>
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Seu nome"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Cidade</label>
                    <input
                      type="text"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      placeholder="Sua cidade"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>{isSignUp ? 'Criar Conta no Supabase' : 'Entrar no Supabase'}</span>
              </button>
            </form>
          )}

          {/* Selo de Garantia e Conexão */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Autenticação Integrada com Supabase</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Seus anúncios e conversas são sincronizados em tempo real com o banco de dados PostgreSQL do Supabase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
