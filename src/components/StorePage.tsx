import React, { useEffect, useMemo, useState } from 'react';
import { Avatar } from './Avatar';
import { ArrowLeft, BadgeCheck, MapPin, Package, Pencil, Store } from 'lucide-react';
import { Category, Listing } from '../types/marketplace';
import { SellerProfile, fetchSellerProfile, storeDisplayName } from '../services/storeService';
import { PremiumBadge } from './PremiumBadge';
import { readableTextColor, resolveStoreColor, shadeColor, withAlpha } from '../utils/storeTheme';
import { ListingCard } from './ListingCard';

interface StorePageProps {
  sellerId: string;
  /** Todos os anúncios carregados no app (a loja filtra os do vendedor) */
  listings: Listing[];
  categories: Category[];
  currentUserId?: string;
  onBack: () => void;
  onViewListing: (listing: Listing) => void;
  /** Só para o dono da loja: atalho para personalizar */
  onEditStore?: () => void;
}

/** Loja do vendedor premium: nome e cor próprios, estatísticas, filtro de categorias e produtos */
export const StorePage: React.FC<StorePageProps> = ({
  sellerId,
  listings,
  categories,
  currentUserId,
  onBack,
  onViewListing,
  onEditStore,
}) => {
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(false);
    setCategoryFilter('all');
    fetchSellerProfile(sellerId)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  const sellerSales = useMemo(
    () => listings.filter((l) => l.user_id === sellerId && l.type === 'SALE'),
    [listings, sellerId]
  );
  const activeProducts = useMemo(() => sellerSales.filter((l) => l.status === 'ACTIVE'), [sellerSales]);

  // Só categorias em que o vendedor tem produto, da que tem mais para a que tem menos
  const categoryChips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of activeProducts) counts.set(l.category_id, (counts.get(l.category_id) || 0) + 1);
    return categories
      .filter((c) => counts.has(c.id))
      .map((c) => ({ category: c, count: counts.get(c.id) as number }))
      .sort((a, b) => b.count - a.count);
  }, [activeProducts, categories]);

  const visibleProducts = useMemo(
    () => (categoryFilter === 'all' ? activeProducts : activeProducts.filter((l) => l.category_id === categoryFilter)),
    [activeProducts, categoryFilter]
  );

  const backButton = (
    <button
      type="button"
      onClick={onBack}
      className="mb-2 inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
    >
      <ArrowLeft className="h-4 w-4" />
      Voltar
    </button>
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {backButton}
        <div className="animate-pulse space-y-4">
          <div className="h-44 rounded-3xl bg-slate-200/70" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-56 rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Loja só existe para vendedor premium
  if (loadError || !profile || !profile.is_premium) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {backButton}
        <div className="mx-auto max-w-md rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <Store className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-3 text-lg font-extrabold text-slate-900">Loja não disponível</h2>
          <p className="mt-1 text-sm text-slate-500">
            {loadError
              ? 'Não foi possível carregar esta loja agora. Tente de novo em instantes.'
              : 'Este vendedor não tem uma loja ativa.'}
          </p>
        </div>
      </div>
    );
  }

  const color = resolveStoreColor(profile.store_color);
  const textOnColor = readableTextColor(color);
  const isOwner = Boolean(currentUserId) && currentUserId === sellerId;
  const name = storeDisplayName(profile);

  const stats = [
    { icon: Package, label: 'Produtos à venda', value: activeProducts.length },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {backButton}

      {/* Faixa da loja na cor escolhida pelo vendedor */}
      <section
        className="relative overflow-hidden rounded-2xl p-2.5 shadow-sm sm:p-5"
        style={{
          background: `linear-gradient(135deg, ${color}, ${shadeColor(color, -30)})`,
          color: textOnColor,
        }}
      >
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full"
          style={{ background: withAlpha(textOnColor, 0.08) }}
        />

        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar
              src={profile.avatar_url}
              name={name}
              className="h-12 w-12 border-2 border-white/70 text-xl sm:h-14 sm:w-14"
            />
            <div className="min-w-0">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
                style={{ background: withAlpha(textOnColor, 0.18) }}
              >
                <BadgeCheck className="h-3.5 w-3.5" />
                Loja Premium
              </span>
              <h1 className="mt-1 flex items-center gap-2 break-words text-xl font-extrabold leading-tight sm:text-2xl">
                <span className="min-w-0 break-words">{name}</span>
                <PremiumBadge className="h-5 w-5 sm:h-6 sm:w-6" />
              </h1>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm" style={{ opacity: 0.85 }}>
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {profile.store_name ? `por ${profile.nome} · ` : ''}
                  {profile.cidade || 'São Luis do Paraitinga - SP'}
                </span>
              </p>
            </div>
          </div>

          {isOwner && onEditStore && (
            <button
              type="button"
              onClick={onEditStore}
              className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition hover:opacity-90"
              style={{ background: textOnColor, color: color }}
            >
              <Pencil className="h-4 w-4" />
              Personalizar minha loja
            </button>
          )}
        </div>

        {/* Números da loja */}
        <dl className="relative mt-3 flex flex-wrap gap-2">
          {stats.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs"
              style={{ background: withAlpha(textOnColor, 0.14) }}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" style={{ opacity: 0.85 }} />
              <dd className="text-sm font-black tabular-nums">{value}</dd>
              <dt className="font-semibold" style={{ opacity: 0.85 }}>{label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* Filtro de categorias */}
      {categoryChips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {[{ id: 'all', label: 'Todas', icon: '🛍️', count: activeProducts.length }, ...categoryChips.map(({ category, count }) => ({
            id: category.id,
            label: category.name,
            icon: category.icon,
            count,
          }))].map((chip) => {
            const selected = categoryFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setCategoryFilter(chip.id)}
                aria-pressed={selected}
                className="cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-semibold transition"
                style={
                  selected
                    ? { background: color, borderColor: color, color: textOnColor }
                    : { background: '#ffffff', borderColor: withAlpha(color, 0.35), color: shadeColor(color, -20) }
                }
              >
                {chip.icon} {chip.label} <span style={{ opacity: 0.7 }}>({chip.count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Produtos */}
      {visibleProducts.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white px-4 py-14 text-center">
          <Package className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-700">
            {activeProducts.length === 0 ? 'Esta loja ainda não tem produtos à venda.' : 'Nenhum produto nesta categoria.'}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {visibleProducts.map((item) => (
            <ListingCard key={item.id} listing={item} onClick={onViewListing} currentUserId={currentUserId} />
          ))}
        </div>
      )}
    </div>
  );
};
