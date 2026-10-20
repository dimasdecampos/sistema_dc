import { describe, expect, it } from 'vitest';
import { calculateMatchScore, normalizeText } from './matchingService';
import type { Listing } from '../types/marketplace';

const base = {
  description: '',
  category_id: 'c1',
  condition: 'ANY',
  status: 'ACTIVE',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
} as const;

const wanted = (title: string, user_id = 'u1'): Listing => ({ ...base, id: 'w', user_id, type: 'WANTED', title });
const sale = (title: string, user_id = 'u2'): Listing => ({ ...base, id: 's', user_id, type: 'SALE', title });

describe('normalizeText', () => {
  it('remove acentos e coloca em minúsculas', () => {
    expect(normalizeText('Bicicleta Ário 26!')).toContain('bicicleta');
  });
  it('aceita texto vazio', () => {
    expect(normalizeText('')).toBe('');
  });
});

describe('calculateMatchScore', () => {
  it('combina procura e venda do mesmo produto', () => {
    expect(calculateMatchScore(wanted('Bicicleta aro 26'), sale('Bicicleta aro 26 seminova'))).toBeGreaterThan(35);
  });
  it('não combina produtos diferentes', () => {
    expect(calculateMatchScore(wanted('Bicicleta'), sale('Geladeira'))).toBe(0);
  });
  it('não gera match do usuário consigo mesmo', () => {
    expect(calculateMatchScore(wanted('Bicicleta', 'u1'), sale('Bicicleta', 'u1'))).toBe(0);
  });
  it('ignora anúncios inativos', () => {
    expect(calculateMatchScore(wanted('Bicicleta'), { ...sale('Bicicleta'), status: 'COMPLETED' })).toBe(0);
  });
});
