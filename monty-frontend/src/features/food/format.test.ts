import { describe, expect, it } from 'vitest';
import { formatQty, parseQuickAdd, startOfWeek, stockNote, weekLabel, isoDate } from './format';

describe('parseQuickAdd', () => {
  it.each([
    ['молоко 2 л', { label: 'Молоко', quantity: 2, unitCode: 'l' }],
    ['2 кг картошки', { label: 'Картошки', quantity: 2, unitCode: 'kg' }],
    ['яйца 10', { label: 'Яйца', quantity: 10, unitCode: null }],
    ['сыр 300г', { label: 'Сыр', quantity: 300, unitCode: 'g' }],
    ['сметана 1,5 пачки', { label: 'Сметана', quantity: 1.5, unitCode: 'pack' }],
    ['хлеб', { label: 'Хлеб', quantity: null, unitCode: null }],
    ['  йогурт   питьевой  ', { label: 'Йогурт питьевой', quantity: null, unitCode: null }],
    ['7up 2 шт', { label: '7up', quantity: 2, unitCode: 'pcs' }],
  ])('%s', (input, expected) => {
    expect(parseQuickAdd(input)).toEqual(expected);
  });
});

describe('formatQty', () => {
  it('formats with Russian units and rolls up big numbers', () => {
    expect(formatQty(1.5, 'l')).toBe('1,5 л');
    expect(formatQty(1500, 'g')).toBe('1,5 кг');
    expect(formatQty(300, 'g')).toBe('300 г');
    expect(formatQty(2, 'pcs')).toBe('2 шт');
    expect(formatQty(null, 'g')).toBe('');
  });
});

describe('stockNote', () => {
  it('describes urgent states', () => {
    expect(stockNote({ status: 'expiring', days_left: 1 })).toEqual({ text: 'Испортится завтра', tone: 'warning' });
    expect(stockNote({ status: 'expired', days_left: -2 })?.tone).toBe('danger');
    expect(stockNote({ status: 'ok', days_left: null })).toBeNull();
  });
});

describe('weeks', () => {
  it('starts on Monday', () => {
    expect(isoDate(startOfWeek(new Date(2026, 9, 4)))).toBe('2026-09-28'); // Sunday → previous Monday
    expect(isoDate(startOfWeek(new Date(2026, 9, 5)))).toBe('2026-10-05');
    expect(weekLabel(new Date(2026, 9, 5))).toBe('5–11 окт.');
    expect(weekLabel(new Date(2026, 8, 28))).toBe('28 сент. – 4 окт.');
  });
});
