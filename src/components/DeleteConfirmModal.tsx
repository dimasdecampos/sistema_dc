import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';
import { Cliente } from '../types/cliente';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  cliente: Cliente | null;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  cliente,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !cliente) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(cliente.id);
      onClose();
    } catch (err) {
      console.error('Falha ao excluir:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-1">
            Excluir Cliente
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Tem certeza de que deseja excluir o cadastro de{' '}
            <strong className="text-slate-800">{cliente.nome}</strong>?
            Esta ação não pode ser desfeita e removerá o registro permanentemente do banco de dados.
          </p>

          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
            <p className="text-slate-600">
              <strong className="text-slate-700">E-mail:</strong> {cliente.email}
            </p>
            <p className="text-slate-600">
              <strong className="text-slate-700">Cidade:</strong> {cliente.cidade || 'Não informada'}
            </p>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-xs shadow-rose-600/30 transition disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Excluindo...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Confirmar Exclusão</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
