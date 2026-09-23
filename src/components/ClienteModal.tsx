import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, MapPin, Loader2, Save } from 'lucide-react';
import { Cliente, ClienteInput } from '../types/cliente';
import { maskPhone } from '../utils/formatters';

interface ClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ClienteInput, id?: string) => Promise<void>;
  clienteToEdit?: Cliente | null;
}

const CIDADES_SUGESTOES = [
  'São Paulo',
  'Rio de Janeiro',
  'Belo Horizonte',
  'Curitiba',
  'Porto Alegre',
  'Salvador',
  'Brasília',
  'Fortaleza',
  'Recife',
  'Goiânia',
  'Florianópolis',
  'Campinas',
  'Manaus',
  'Belém',
  'Vitória',
];

export const ClienteModal: React.FC<ClienteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  clienteToEdit,
}) => {
  const isEditing = Boolean(clienteToEdit);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cidade, setCidade] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (clienteToEdit) {
      setNome(clienteToEdit.nome || '');
      setEmail(clienteToEdit.email || '');
      setTelefone(clienteToEdit.telefone || '');
      setCidade(clienteToEdit.cidade || '');
    } else {
      setNome('');
      setEmail('');
      setTelefone('');
      setCidade('');
    }
    setErrors({});
  }, [clienteToEdit, isOpen]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!nome.trim()) {
      newErrors.nome = 'O nome completo é obrigatório.';
    } else if (nome.trim().length < 3) {
      newErrors.nome = 'O nome deve ter pelo menos 3 caracteres.';
    }

    if (!email.trim()) {
      newErrors.email = 'O e-mail é obrigatório.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Insira um e-mail válido (ex: nome@dominio.com).';
    }

    if (!cidade.trim()) {
      newErrors.cidade = 'A cidade é obrigatória.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSave(
        {
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          telefone: telefone.trim(),
          cidade: cidade.trim(),
        },
        clienteToEdit?.id
      );
      onClose();
    } catch (err) {
      console.error('Falha ao salvar cliente:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-lg text-slate-900">
              {isEditing ? 'Editar Cliente' : 'Novo Cadastro de Cliente'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditing
                ? 'Atualize as informações do cliente no banco Supabase.'
                : 'Preencha os dados abaixo para registrar o cliente.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Campo Nome */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Nome Completo <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ex: Ana Clara Santos"
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value);
                  if (errors.nome) setErrors((prev) => ({ ...prev, nome: '' }));
                }}
                className={`w-full pl-10 pr-4 py-2.5 text-sm bg-white border rounded-xl focus:outline-hidden focus:ring-2 transition shadow-2xs ${
                  errors.nome
                    ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500 text-rose-900'
                    : 'border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900'
                }`}
                disabled={isSubmitting}
                autoFocus
              />
            </div>
            {errors.nome && (
              <p className="text-xs text-rose-500 mt-1 font-medium">{errors.nome}</p>
            )}
          </div>

          {/* Campo Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              E-mail <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="Ex: ana.santos@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                }}
                className={`w-full pl-10 pr-4 py-2.5 text-sm bg-white border rounded-xl focus:outline-hidden focus:ring-2 transition shadow-2xs ${
                  errors.email
                    ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500 text-rose-900'
                    : 'border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900'
                }`}
                disabled={isSubmitting}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-rose-500 mt-1 font-medium">{errors.email}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Campo Telefone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Telefone / WhatsApp
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="(11) 98765-4321"
                  value={telefone}
                  onChange={(e) => {
                    setTelefone(maskPhone(e.target.value));
                  }}
                  maxLength={15}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 transition shadow-2xs"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Campo Cidade */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Cidade <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  list="cidades-list"
                  placeholder="Ex: São Paulo"
                  value={cidade}
                  onChange={(e) => {
                    setCidade(e.target.value);
                    if (errors.cidade) setErrors((prev) => ({ ...prev, cidade: '' }));
                  }}
                  className={`w-full pl-10 pr-4 py-2.5 text-sm bg-white border rounded-xl focus:outline-hidden focus:ring-2 transition shadow-2xs ${
                    errors.cidade
                      ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500 text-rose-900'
                      : 'border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900'
                  }`}
                  disabled={isSubmitting}
                />
                <datalist id="cidades-list">
                  {CIDADES_SUGESTOES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              {errors.cidade && (
                <p className="text-xs text-rose-500 mt-1 font-medium">{errors.cidade}</p>
              )}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
              disabled={isSubmitting}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs shadow-emerald-600/30 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEditing ? 'Salvar Alterações' : 'Cadastrar Cliente'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
