import React from 'react';
import { BadgeCheck } from 'lucide-react';

interface PremiumBadgeProps {
  className?: string;
}

/** Selo dourado de "verificado": identifica vendedores premium (loja oficial) */
export const PremiumBadge: React.FC<PremiumBadgeProps> = ({ className = 'h-4 w-4' }) => (
  <BadgeCheck
    role="img"
    aria-label="Vendedor premium"
    className={`shrink-0 fill-amber-400 stroke-white drop-shadow-sm ${className}`}
  />
);
