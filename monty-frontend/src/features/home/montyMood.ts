import type { MontyMood } from '../../brand/monty';
import { formatMoney } from '../../ui/format';
import type { HomeSummary } from './summary';

export interface MontySays {
  mood: MontyMood;
  text: string;
}

/**
 * What Monty feels and says on the home card. Money problems win over everything
 * else, then good news, then time-of-day flavour.
 */
export function montySays(
  summary: HomeSummary | null,
  opts: { now?: Date; goalPercent?: number } = {},
): MontySays {
  const now = opts.now ?? new Date();
  const hour = now.getHours();

  if (!summary) return { mood: 'idle', text: 'Секунду, считаю…' };
  if (!summary.hasBudgets) {
    return { mood: 'thinking', text: 'Задайте бюджеты — и я посчитаю, сколько можно тратить в день.' };
  }
  if (summary.remaining < 0) {
    return { mood: 'worried', text: `Бюджет превышен на ${formatMoney(-summary.remaining)}. Давай притормозим до конца периода.` };
  }
  if (summary.overToday > 0) {
    return { mood: 'worried', text: `Сегодня вышли за лимит на ${formatMoney(summary.overToday)}. Завтра я пересчитаю лимит.` };
  }
  if (summary.pace === 'over') {
    return { mood: 'worried', text: `Темп выше плана: к концу периода выйдет ${formatMoney(summary.forecast)}.` };
  }
  if ((opts.goalPercent ?? 0) >= 100) {
    return { mood: 'celebrate', text: 'Цель достигнута! Я горжусь тобой.' };
  }
  if (hour >= 23 || hour < 6) {
    return { mood: 'sleepy', text: 'Поздно уже. Лимит на завтра будет готов утром.' };
  }
  if (summary.spentToday === 0 && hour >= 18) {
    return { mood: 'celebrate', text: 'Сегодня ни одной траты — так держать!' };
  }
  if (summary.pace === 'under') {
    return { mood: 'happy', text: 'Тратите медленнее плана — отлично!' };
  }
  return { mood: 'idle', text: 'Всё идёт по плану.' };
}
