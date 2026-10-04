import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import type { TransactionInput, VoiceDraft } from '../../types';

/** A draft being reviewed; `key` keeps React rows stable while items are removed. */
export interface EditableDraft extends VoiceDraft {
  key: string;
}

let nextKey = 0;

export function toEditable(drafts: VoiceDraft[]): EditableDraft[] {
  return drafts.map(draft => ({ ...draft, key: `draft-${nextKey++}` }));
}

export function isDraftValid(draft: VoiceDraft): boolean {
  return Number.isInteger(draft.amount) && draft.amount > 0 && draft.category_id > 0;
}

export function draftsToPayload(drafts: VoiceDraft[], rawText: string): TransactionInput[] {
  return drafts.map(draft => ({
    category_id: draft.category_id,
    amount: draft.amount,
    comment: draft.comment.trim() || undefined,
    transaction_date: draft.transaction_date,
    source: 'voice',
    raw_text: rawText.slice(0, 500),
  }));
}

/** Signed total: income adds, expenses subtract. */
export function draftsBalance(drafts: VoiceDraft[]): number {
  return drafts.reduce((sum, d) => sum + (d.type === 'INCOME' ? d.amount : -d.amount), 0);
}

export function formatDraftDate(isoDate: string | null, today: dayjs.Dayjs = dayjs()): string {
  if (!isoDate) return 'Сегодня';
  const date = dayjs(isoDate);
  const diff = today.startOf('day').diff(date.startOf('day'), 'day');
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Вчера';
  if (diff === 2) return 'Позавчера';
  return date.locale('ru').format('D MMMM');
}

export function formatRecordingTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
