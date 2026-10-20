import { useCallback, useState } from 'react';
import type { ToastMessage } from '../components/Toast';

export type ToastType = 'success' | 'error' | 'info';

/** Fila de avisos na tela. `showToast` e `dismissToast` têm identidade estável (não reiniciam o tempo dos avisos). */
export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((title: string, message?: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, dismissToast };
}
