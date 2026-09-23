import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  ShieldCheck,
  MapPin,
  Mail,
  User,
  Sparkles,
  Loader2,
  Camera,
} from 'lucide-react';
import { getOfficialGooglePhoto, decodeGoogleJwt } from '../services/authService';

interface GoogleLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (data: {
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
  onLogin,
  defaultEmail = 'dimasrafting@gmail.com',
}) => {
  const [nome, setNome] = useState('Dimas');
  const [email, setEmail] = useState(defaultEmail);
  const [cidade, setCidade] = useState('São Paulo');
  const [isLoading, setIsLoading] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  // Calcula dinamicamente a foto oficial da conta do Google
  const officialGooglePhotoUrl = getOfficialGooglePhoto(email);

  useEffect(() => {
    setPhotoError(false);
  }, [email]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !nome) return;

    setIsLoading(true);
    try {
      await onLogin({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        cidade: cidade.trim(),
        foto: officialGooglePhotoUrl,
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSelect = (qNome: string, qEmail: string, qCidade: string) => {
    setNome(qNome);
    setEmail(qEmail);
    setCidade(qCidade);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* Header with Google Brand */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
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
                Fazer login com o Google
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Entrar e sincronizar foto oficial do Google
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

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Quick Account Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Conta do Google
            </label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() =>
                  handleQuickSelect('Dimas', 'dimasrafting@gmail.com', 'São Paulo')
                }
                className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                  email === 'dimasrafting@gmail.com'
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={getOfficialGooglePhoto('dimasrafting@gmail.com')}
                      alt="Dimas"
                      onError={(e) => {
                        // Fallback suave
                        (e.target as HTMLImageElement).src =
                          'https://lh3.googleusercontent.com/a/default-user';
                      }}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-2xs"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-xs border border-slate-100">
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.28-2.09 3.66-5.17 3.66-9.12z" />
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.36 7.33 24 12 24z" />
                        <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.24C.45 8.14 0 9.99 0 12s.45 3.86 1.24 5.43l4.04-3.14z" />
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.57l4.04 3.14c.95-2.83 3.6-4.96 6.72-4.96z" />
                      </svg>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      Dimas
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      dimasrafting@gmail.com
                    </p>
                  </div>
                </div>
                {email === 'dimasrafting@gmail.com' && (
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Live Official Photo Preview Card */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center gap-3">
            <div className="relative shrink-0">
              <img
                src={officialGooglePhotoUrl}
                alt="Foto Google"
                onError={() => setPhotoError(true)}
                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs"
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-emerald-600" />
                <span>Foto Oficial do Google</span>
              </p>
              <p className="text-[11px] text-slate-500 truncate mt-0.5 font-mono">
                {email}
              </p>
              <p className="text-[10px] text-emerald-700 font-medium mt-0.5">
                Carregada diretamente da base oficial de perfis Google
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
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
                  className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 transition"
                  placeholder="Seu nome"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                E-mail do Google (busca foto oficial automaticamente)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 transition"
                  placeholder="usuario@gmail.com"
                />
              </div>
            </div>

            {/* Cidade */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cidade (gravada no banco Supabase)
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 transition"
                  placeholder="Ex: São Paulo, Rio de Janeiro..."
                />
              </div>
            </div>

            {/* Security Notice */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Ao entrar, os botões de <strong>Editar</strong> e{' '}
                <strong>Excluir</strong> clientes serão ativados. Seus dados e
                foto oficial são salvos na tabela <strong>usuarios</strong> do
                Supabase.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !email || !nome}
              className="w-full py-3 px-4 mt-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-2xl shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
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
                  <span>Continuar com o Google</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
