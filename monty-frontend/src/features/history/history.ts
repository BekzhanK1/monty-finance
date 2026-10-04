import type { Category, Transaction } from '../../types';
import { parseServerDate } from '../../ui';

export type KindFilter = 'all' | 'expense' | 'income' | 'savings';

export interface DayGroup {
  /** Local calendar day, `YYYY-MM-DD`. */
  key: string;
  date: Date;
  items: Transaction[];
  /** Income minus expenses (savings count as money leaving). */
  net: number;
}

export function kindOf(category: Category | undefined): Exclude<KindFilter, 'all'> {
  if (category?.type === 'INCOME') return 'income';
  if (category?.group === 'SAVINGS') return 'savings';
  return 'expense';
}

function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** Newest day first; transactions inside a day newest first. */
export function groupByDay(transactions: Transaction[], categories: Map<number, Category>): DayGroup[] {
  const groups = new Map<string, DayGroup>();
  const sorted = [...transactions].sort(
    (a, b) => parseServerDate(b.transaction_date).getTime() - parseServerDate(a.transaction_date).getTime(),
  );
  for (const t of sorted) {
    const date = parseServerDate(t.transaction_date);
    const key = dayKey(date);
    let group = groups.get(key);
    if (!group) {
      group = { key, date: new Date(date.getFullYear(), date.getMonth(), date.getDate()), items: [], net: 0 };
      groups.set(key, group);
    }
    group.items.push(t);
    group.net += kindOf(categories.get(t.category_id)) === 'income' ? t.amount : -t.amount;
  }
  return [...groups.values()];
}

export function totalsByKind(transactions: Transaction[], categories: Map<number, Category>) {
  const totals = { expense: 0, income: 0, savings: 0 };
  for (const t of transactions) totals[kindOf(categories.get(t.category_id))] += t.amount;
  return totals;
}

/** Month window as naive-UTC ISO bounds, matching how the API stores timestamps. */
export function monthBounds(year: number, month: number): { start_date: string; end_date: string } {
  const toApi = (d: Date) => d.toISOString().slice(0, 19);
  return {
    start_date: toApi(new Date(year, month, 1)),
    end_date: toApi(new Date(new Date(year, month + 1, 1).getTime() - 1000)),
  };
}

const weekdayDate = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });

export function dayLabel(date: Date, now: Date = new Date()): string {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((today.getTime() - date.getTime()) / 86_400_000);
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Вчера';
  const label = weekdayDate.format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}
