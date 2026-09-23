import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-xl border backdrop-blur-md transition-all duration-200 animate-in slide-in-from-bottom-5 ${
              isSuccess
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-950'
                : isError
                ? 'bg-rose-50/95 border-rose-200 text-rose-950'
                : 'bg-slate-900/95 border-slate-700 text-white'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {isError && <AlertCircle className="w-5 h-5 text-rose-600" />}
              {!isSuccess && !isError && <Info className="w-5 h-5 text-blue-400" />}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-tight">{toast.title}</p>
              {toast.message && (
                <p className={`text-xs mt-1 leading-relaxed ${isSuccess ? 'text-emerald-800' : isError ? 'text-rose-800' : 'text-slate-300'}`}>
                  {toast.message}
                </p>
              )}
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 p-1 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/5 transition"
              aria-label="Fechar notificação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
