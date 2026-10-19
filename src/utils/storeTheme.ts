/** Cor padrão da loja (verde do site) */
export const DEFAULT_STORE_COLOR = '#059669';

/** Sugestões de cor na tela de personalização */
export const STORE_COLOR_PRESETS = [
  '#059669', // verde
  '#2563eb', // azul
  '#7c3aed', // roxo
  '#db2777', // rosa
  '#ea580c', // laranja
  '#ca8a04', // dourado
  '#0891b2', // turquesa
  '#0f172a', // grafite
] as const;

/** "#abc" ou "#AABBCC" -> "#aabbcc"; qualquer outra coisa -> null */
export function normalizeHex(input: string | null | undefined): string | null {
  if (!input) return null;
  const value = input.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(value)) return value;
  if (/^#[0-9a-f]{3}$/.test(value)) {
    return '#' + value.slice(1).split('').map((c) => c + c).join('');
  }
  return null;
}

function toRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Cor da loja válida, ou a padrão */
export function resolveStoreColor(color: string | null | undefined): string {
  return normalizeHex(color) ?? DEFAULT_STORE_COLOR;
}

/** Branco ou grafite, o que tiver melhor contraste sobre a cor de fundo */
export function readableTextColor(hex: string): '#ffffff' | '#0f172a' {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? '#0f172a' : '#ffffff';
}

/** Escurece (percent < 0) ou clareia (percent > 0) a cor, de -100 a 100 */
export function shadeColor(hex: string, percent: number): string {
  const [r, g, b] = toRgb(hex);
  const target = percent < 0 ? 0 : 255;
  const p = Math.min(1, Math.abs(percent) / 100);
  const mix = (v: number) => Math.round(v + (target - v) * p);
  return '#' + [mix(r), mix(g), mix(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** Cor com transparência (0 a 1) para fundos suaves */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = toRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
