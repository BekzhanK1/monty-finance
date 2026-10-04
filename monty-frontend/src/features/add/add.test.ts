import { describe, expect, it } from 'vitest';
import type { Category, Transaction } from '../../types';
import { applyKey, evaluateAmount, formatExpression, type NumpadKey } from './amountExpression';
import { rankCategories } from './rankCategories';

const type = (keys: NumpadKey[]) => keys.reduce(applyKey, '');

describe('numpad expression', () => {
  it('builds and sums an expression', () => {
    const expr = type(['1', '2', '000', '+', '3', '5', '0', '-', '5', '0']);
    expect(expr).toBe('12000+350-50');
    expect(evaluateAmount(expr)).toBe(12300);
    expect(formatExpression(expr)).toBe('12 000 + 350 − 50');
  });

  it('ignores leading operators and zeros, replaces repeated operators', () => {
    expect(type(['+', '0', '0', '5'])).toBe('5');
    expect(type(['000'])).toBe('');
    expect(type(['5', '+', '-', '2'])).toBe('5-2');
    expect(type(['5', '+', '0', '7'])).toBe('5+7');
  });

  it('ignores a trailing operator when evaluating', () => {
    expect(evaluateAmount('1500+')).toBe(1500);
    expect(evaluateAmount('')).toBeNull();
  });

  it('supports backspace and clear', () => {
    expect(applyKey('1500', 'back')).toBe('150');
    expect(applyKey('1500', 'clear')).toBe('');
  });

  it('caps a single term length', () => {
    expect(type(Array(12).fill('9') as NumpadKey[])).toBe('9999999999');
  });
});

describe('rankCategories', () => {
  const cat = (id: number): Category => ({ id, name: `c${id}`, group: 'BASE', type: 'EXPENSE', icon: '•' });
  const tx = (category_id: number): Transaction => ({ id: String(Math.random()), user_id: 1, category_id, amount: 1, transaction_date: '', comment: null });

  it('puts frequent categories first and keeps the rest stable', () => {
    const ranked = rankCategories([cat(1), cat(2), cat(3), cat(4)], [tx(3), tx(3), tx(2), tx(3), tx(2), tx(4)]);
    expect(ranked.map(c => c.id)).toEqual([3, 2, 4, 1]);
  });
});
