const shortDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });

export function parseDay(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function rangeLabel(start: string, end: string): string {
  return `${shortDate.format(parseDay(start))} – ${shortDate.format(parseDay(end))}`;
}

/**
 * Quintile cut-offs over the days that had spending. Ranking (not share of the max) keeps one
 * big purchase from washing every other day out to the lightest step.
 */
export function heatThresholds(values: number[]): number[] {
  const spent = values.filter(v => v > 0).sort((a, b) => a - b);
  if (spent.length === 0) return [];
  return [0.2, 0.4, 0.6, 0.8].map(q => spent[Math.min(spent.length - 1, Math.floor(q * spent.length))]);
}

/** 0 = nothing spent; 1–5 = sequential step by quintile. */
export function heatLevel(value: number, thresholds: number[]): number {
  if (value <= 0) return 0;
  return 1 + thresholds.filter(t => value > t).length;
}

export interface CalendarCell {
  date: string;
  expense: number;
  future: boolean;
}

/** Rows of 7 (Mon–Sun); leading/trailing slots are null so the first day lands on its weekday. */
export function calendarWeeks(days: CalendarCell[]): (CalendarCell | null)[][] {
  if (days.length === 0) return [];
  const lead = (parseDay(days[0].date).getDay() + 6) % 7;
  const cells: (CalendarCell | null)[] = [...Array(lead).fill(null), ...days];
  while (cells.length % 7) cells.push(null);
  const weeks: (CalendarCell | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Signed % change and whether it is good news (spending down is good, income up is good). */
export function delta(current: number, previous: number, upIsGood: boolean): { pct: number; good: boolean } | null {
  if (!previous) return null;
  const pct = Math.round(((current - previous) * 100) / previous);
  if (pct === 0) return { pct, good: true };
  return { pct, good: upIsGood ? pct > 0 : pct < 0 };
}

export const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

/** Compact axis ticks (no-break space so ticks never wrap): 1 250 000 → "1,3 млн", 45 000 → "45 тыс". */
export function compactTick(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}\u00a0млн`;
  if (abs >= 1_000) return `${Math.round(value / 1_000).toLocaleString('ru-RU')}\u00a0тыс`;
  return value.toLocaleString('ru-RU');
}
