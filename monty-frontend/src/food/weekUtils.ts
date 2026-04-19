import type { FoodSlotKey } from '../types';

export const SLOT_ORDER: FoodSlotKey[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export const SLOT_LABELS: Record<FoodSlotKey, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
};

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfWeekMonday(ref: Date): Date {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function weekdayLong(d: Date) {
  return d.toLocaleDateString('ru-RU', { weekday: 'long' });
}

export function weekdayShort(d: Date) {
  return d.toLocaleDateString('ru-RU', { weekday: 'short' });
}

export function slotMapKey(dateStr: string, slotKey: FoodSlotKey) {
  return `${dateStr}|${slotKey}`;
}
