import { pluralRu } from '../../ui';

export const MOODS = [
  { value: 1, emoji: '😞', label: 'Очень плохо' },
  { value: 2, emoji: '😕', label: 'Плохо' },
  { value: 3, emoji: '😐', label: 'Нормально' },
  { value: 4, emoji: '🙂', label: 'Хорошо' },
  { value: 5, emoji: '😄', label: 'Отлично' },
] as const;

/** Nearest mood for an average like 3.6; null stays null (unknown, not neutral). */
export function moodOf(value: number | null | undefined) {
  if (value == null) return null;
  const level = Math.min(5, Math.max(1, Math.round(value)));
  return MOODS[level - 1];
}

export const moodEmoji = (value: number | null | undefined) => moodOf(value)?.emoji ?? '·';

export function formatMood(value: number | null | undefined): string {
  return value == null ? '—' : value.toFixed(1).replace('.', ',');
}

export function streakLabel(days: number): string {
  return `${days} ${pluralRu(days, ['день', 'дня', 'дней'])}`;
}

/** Local YYYY-MM-DD (the backend counts days in Asia/Almaty, which is the device zone for us). */
export function isoDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface DayGroup<T> {
  date: string;
  items: T[];
}

/** Entries arrive newest first; keep that order and bucket them by entry_date. */
export function groupByDay<T extends { entry_date: string }>(entries: T[]): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  for (const entry of entries) {
    const last = groups[groups.length - 1];
    if (last && last.date === entry.entry_date) last.items.push(entry);
    else groups.push({ date: entry.entry_date, items: [entry] });
  }
  return groups;
}

/** One-line preview: the AI summary if there is one, else the start of the text. */
export function entryPreview(entry: { summary: string | null; content: string | null }, max = 90): string {
  const text = (entry.summary ?? entry.content ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return 'Только настроение';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** "Траты в плохие дни выше на 35%" — or null when there is not enough data to say anything. */
export function spendingInsight(low: { days: number; avg_spent: number | null }, high: { days: number; avg_spent: number | null }): string | null {
  if (low.days < 2 || high.days < 2 || !low.avg_spent || !high.avg_spent) return null;
  // "X% more" is relative to the smaller side, whichever it is.
  const [more, less] = low.avg_spent >= high.avg_spent ? [low.avg_spent, high.avg_spent] : [high.avg_spent, low.avg_spent];
  const diff = Math.round(((more - less) / less) * 100);
  if (diff < 10) return 'Настроение почти не влияет на траты';
  return low.avg_spent > high.avg_spent
    ? `В плохие дни вы тратите на ${diff}% больше, чем в хорошие`
    : `В хорошие дни вы тратите на ${diff}% больше, чем в плохие`;
}

/** Whether one of the streak's freezes falls in the ISO week (Mon–Sun) of `today`. */
export function frozenThisWeek(frozenDays: string[], today: string): boolean {
  const t = new Date(`${today}T00:00:00`);
  const monday = new Date(t);
  monday.setDate(t.getDate() - ((t.getDay() + 6) % 7));
  const mondayIso = isoDay(monday);
  return frozenDays.some(d => d >= mondayIso && d <= today);
}
