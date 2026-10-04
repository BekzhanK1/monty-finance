const groupFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

/** 1234567 → "1 234 567" (narrow no-break spaces from ru-RU). */
export function formatNumber(value: number): string {
  return groupFormatter.format(Math.round(value));
}

export type MoneySign = 'auto' | 'always' | 'never';

/** Amount with ₸; `always` prefixes + / −, `auto` only marks negatives. */
export function formatMoney(value: number, sign: MoneySign = 'auto'): string {
  const abs = formatNumber(Math.abs(value));
  if (sign === 'never') return `${abs} ₸`;
  if (value < 0) return `−${abs} ₸`;
  if (sign === 'always' && value > 0) return `+${abs} ₸`;
  return `${abs} ₸`;
}

/** Short form for tight spaces: 1 250 000 → "1,3 млн", 48 500 → "48,5 тыс". */
export function formatCompactMoney(value: number): string {
  const abs = Math.abs(value);
  const minus = value < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${minus}${trim(abs / 1_000_000)} млн ₸`;
  if (abs >= 10_000) return `${minus}${trim(abs / 1_000)} тыс ₸`;
  return `${minus}${formatNumber(abs)} ₸`;
}

function trim(n: number): string {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 1 });
}

/** "1 день", "2 дня", "5 дней". */
export function pluralRu(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

/** Server timestamps are naive UTC ("2026-10-04T05:43:09"); make them explicit before parsing. */
export function parseServerDate(value: string): Date {
  const hasZone = /([zZ]|[+-]\d\d:?\d\d)$/.test(value);
  return new Date(hasZone ? value : `${value}Z`);
}
