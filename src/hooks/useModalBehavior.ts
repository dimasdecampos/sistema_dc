import { useEffect, useRef } from 'react';

/**
 * Comportamento comum dos modais: Esc fecha, a página de fundo não rola
 * e o foco volta para o botão que abriu o modal quando ele fecha.
 * (Um modal aninhado, como o recorte de foto, marca-se com `data-nested-modal` e fica com o Esc.)
 */
export function useModalBehavior(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (document.querySelector('[data-nested-modal]')) return;
      onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [isOpen]);
}
