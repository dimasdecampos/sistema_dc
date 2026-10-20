import { describe, expect, it } from 'vitest';
import { formatPrice } from './formatters';

describe('formatPrice', () => {
  it('mostra "A combinar" sem valor', () => {
    expect(formatPrice(null)).toBe('A combinar');
    expect(formatPrice(0)).toBe('A combinar');
  });
  it('formata em reais', () => {
    expect(formatPrice(1234.5)).toMatch(/R\$\s?1\.234,50/);
  });
});
