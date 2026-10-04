import type { Aisle, Location, PantryItem, Readiness, SlotKey } from './types';

export const UNIT_LABEL: Record<string, string> = {
  g: 'г', kg: 'кг', ml: 'мл', l: 'л', pcs: 'шт', pack: 'уп', tbsp: 'ст. л.', tsp: 'ч. л.', pinch: 'щеп.',
};

export function unitLabel(code: string | null | undefined): string {
  if (!code) return '';
  return UNIT_LABEL[code] ?? code;
}

const qtyFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });

/** 1.5 + "l" → "1,5 л"; large grams/millilitres switch to kg/l for readability. */
export function formatQty(quantity: number | null | undefined, unitCode: string | null | undefined): string {
  if (quantity == null) return '';
  let q = quantity;
  let code = unitCode ?? '';
  if (code === 'g' && q >= 1000) { q /= 1000; code = 'kg'; }
  if (code === 'ml' && q >= 1000) { q /= 1000; code = 'l'; }
  const label = unitLabel(code);
  return label ? `${qtyFormat.format(q)} ${label}` : qtyFormat.format(q);
}

/** Step for the ± buttons in the pantry. */
export function stepFor(unitCode: string): number {
  switch (unitCode) {
    case 'g':
    case 'ml':
      return 100;
    case 'kg':
    case 'l':
      return 0.5;
    default:
      return 1;
  }
}

export const SLOTS: { key: SlotKey; label: string; emoji: string }[] = [
  { key: 'breakfast', label: 'Завтрак', emoji: '🍳' },
  { key: 'lunch', label: 'Обед', emoji: '🍲' },
  { key: 'dinner', label: 'Ужин', emoji: '🍽️' },
  { key: 'snack', label: 'Перекус', emoji: '🍎' },
];

export const AISLES: { key: Aisle; label: string; emoji: string }[] = [
  { key: 'produce', label: 'Овощи и фрукты', emoji: '🥦' },
  { key: 'dairy', label: 'Молочное и яйца', emoji: '🥛' },
  { key: 'meat', label: 'Мясо и рыба', emoji: '🥩' },
  { key: 'bakery', label: 'Хлеб и выпечка', emoji: '🍞' },
  { key: 'grocery', label: 'Бакалея', emoji: '🍝' },
  { key: 'frozen', label: 'Заморозка', emoji: '🧊' },
  { key: 'spices', label: 'Специи и соусы', emoji: '🧂' },
  { key: 'drinks', label: 'Напитки', emoji: '🥤' },
  { key: 'sweets', label: 'Сладкое', emoji: '🍫' },
  { key: 'household', label: 'Для дома', emoji: '🧻' },
  { key: 'other', label: 'Другое', emoji: '🛒' },
];
export const AISLE_META = Object.fromEntries(AISLES.map(a => [a.key, a])) as Record<Aisle, (typeof AISLES)[number]>;

export const LOCATIONS: { key: Location; label: string; emoji: string }[] = [
  { key: 'fridge', label: 'Холодильник', emoji: '🧊' },
  { key: 'freezer', label: 'Морозилка', emoji: '❄️' },
  { key: 'pantry', label: 'Шкаф', emoji: '🗄️' },
];

export const READINESS: Record<Readiness, { label: string; color: string }> = {
  ready: { label: 'Всё есть', color: 'var(--monty-income)' },
  partial: { label: 'Не всё есть', color: 'var(--monty-warning)' },
  missing: { label: 'Нужно купить', color: 'var(--monty-hint)' },
};

export function readinessLabel(readiness: Readiness | null, missingCount: number): string {
  if (!readiness) return 'Без состава';
  if (readiness === 'ready') return 'Всё есть дома';
  return `Не хватает: ${missingCount}`;
}

/** Human status for a pantry item; `null` when nothing worth saying. */
export function stockNote(item: Pick<PantryItem, 'status' | 'days_left'>): { text: string; tone: 'danger' | 'warning' | 'muted' } | null {
  switch (item.status) {
    case 'expired':
      return { text: 'Просрочено', tone: 'danger' };
    case 'expiring': {
      const d = item.days_left ?? 0;
      return { text: d === 0 ? 'Испортится сегодня' : d === 1 ? 'Испортится завтра' : `Испортится через ${d} дн.`, tone: 'warning' };
    }
    case 'out':
      return { text: 'Закончилось', tone: 'muted' };
    case 'low':
      return { text: 'Заканчивается', tone: 'warning' };
    default:
      return null;
  }
}

/** Unit words people type, mapped to unit codes. */
const UNIT_WORDS: [RegExp, string][] = [
  [/^(кг|килограмм(а|ов)?|кило)$/, 'kg'],
  [/^(г|гр|грамм(а|ов)?)$/, 'g'],
  [/^(л|литр(а|ов)?)$/, 'l'],
  [/^(мл|миллилитр(а|ов)?)$/, 'ml'],
  [/^(шт|штук[аи]?|штуки)$/, 'pcs'],
  [/^(уп|упак(овк[аи])?|пачк[аи]|пачек)$/, 'pack'],
];

function unitCodeFor(word: string): string | null {
  const w = word.toLowerCase().replace(/\.$/, '');
  return UNIT_WORDS.find(([re]) => re.test(w))?.[1] ?? null;
}

export interface QuickAdd {
  label: string;
  quantity: number | null;
  unitCode: string | null;
}

/** "молоко 2 л", "2 кг картошки", "яйца 10", "хлеб" → name + optional quantity/unit. */
export function parseQuickAdd(input: string): QuickAdd {
  const tokens = input.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  const num = (t: string) => (/^\d+([.,]\d+)?$/.test(t) ? parseFloat(t.replace(',', '.')) : null);
  // "1.5л" / "500г" glued together
  const glued = (t: string) => {
    const m = t.match(/^(\d+(?:[.,]\d+)?)([a-zа-яё.]+)$/i);
    return m && unitCodeFor(m[2]) ? { q: parseFloat(m[1].replace(',', '.')), u: unitCodeFor(m[2]) } : null;
  };

  let quantity: number | null = null;
  let unitCode: string | null = null;
  const rest: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (quantity === null) {
      const g = glued(t);
      if (g) { quantity = g.q; unitCode = g.u; continue; }
      const n = num(t);
      if (n !== null && n > 0) {
        quantity = n;
        const nextUnit = tokens[i + 1] ? unitCodeFor(tokens[i + 1]) : null;
        if (nextUnit) { unitCode = nextUnit; i++; }
        continue;
      }
    }
    rest.push(t);
  }
  const label = rest.join(' ');
  if (!label) return { label: input.trim(), quantity: null, unitCode: null };
  return { label: label.charAt(0).toUpperCase() + label.slice(1), quantity, unitCode };
}

// ---- dates (local calendar days as YYYY-MM-DD) ----

export function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseIsoDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7; // Monday = 0
  return addDays(d, -day);
}

export function weekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

const rangeFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });

export function weekLabel(monday: Date): string {
  const sunday = addDays(monday, 6);
  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.getDate()}–${rangeFmt.format(sunday)}`;
  }
  return `${rangeFmt.format(monday)} – ${rangeFmt.format(sunday)}`;
}
