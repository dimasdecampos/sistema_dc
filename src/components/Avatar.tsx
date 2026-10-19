import React, { useEffect, useState } from 'react';

interface AvatarProps {
  src?: string | null;
  /** Nome da pessoa: vira a letra inicial quando não há foto ou ela não carrega */
  name: string;
  /** Tamanho e estilo extras (largura/altura, texto da inicial). Padrão: 20px */
  className?: string;
}

/**
 * Foto de perfil que nunca fica "quebrada": se o endereço falhar (fotos do Google e do unavatar.io
 * costumam falhar em navegador) mostra a inicial do nome. Não envia a origem do site (referrer),
 * o que evita o bloqueio do Google contra uso em outros sites.
 */
export const Avatar: React.FC<AvatarProps> = ({ src, name, className = 'h-5 w-5 text-[10px]' }) => {
  const [failed, setFailed] = useState(false);

  // Outra foto, outra chance
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <span
        aria-hidden="true"
        className={`flex shrink-0 select-none items-center justify-center rounded-full bg-slate-200 font-bold text-slate-600 ${className}`}
      >
        {(name.trim().charAt(0) || '?').toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-full bg-slate-100 object-cover ${className}`}
    />
  );
};
