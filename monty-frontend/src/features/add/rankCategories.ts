import type { Category, Transaction } from '../../types';

/** Most used first (by count in `recent`), then the original order. */
export function rankCategories(categories: Category[], recent: Transaction[]): Category[] {
  const counts = new Map<number, number>();
  for (const t of recent) counts.set(t.category_id, (counts.get(t.category_id) ?? 0) + 1);
  return categories
    .map((category, index) => ({ category, index, count: counts.get(category.id) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.index - b.index)
    .map(entry => entry.category);
}
