import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import type { VoiceDraft } from '../../types';
import { draftsBalance, draftsToPayload, formatDraftDate, formatRecordingTime, isDraftValid } from './drafts';
import { filenameForMime, pickMimeType } from './useVoiceRecorder';

const draft = (patch: Partial<VoiceDraft> = {}): VoiceDraft => ({
  amount: 500,
  category_id: 2,
  category_name: 'Транспорт',
  category_icon: '🚕',
  type: 'EXPENSE',
  comment: 'такси',
  transaction_date: null,
  ...patch,
});

describe('voice drafts', () => {
  it('builds a bulk payload tagged as voice with the raw text', () => {
    expect(draftsToPayload([draft(), draft({ comment: '  ', transaction_date: '2026-10-03' })], 'сырой')).toEqual([
      { category_id: 2, amount: 500, comment: 'такси', transaction_date: null, source: 'voice', raw_text: 'сырой' },
      { category_id: 2, amount: 500, comment: undefined, transaction_date: '2026-10-03', source: 'voice', raw_text: 'сырой' },
    ]);
  });

  it('validates amount and category', () => {
    expect(isDraftValid(draft())).toBe(true);
    expect(isDraftValid(draft({ amount: 0 }))).toBe(false);
    expect(isDraftValid(draft({ amount: 10.5 }))).toBe(false);
    expect(isDraftValid(draft({ category_id: 0 }))).toBe(false);
  });

  it('sums income minus expenses', () => {
    expect(draftsBalance([draft({ amount: 1000, type: 'INCOME' }), draft({ amount: 300 })])).toBe(700);
  });

  it('formats relative dates', () => {
    const today = dayjs('2026-10-04');
    expect(formatDraftDate(null, today)).toBe('Сегодня');
    expect(formatDraftDate('2026-10-04', today)).toBe('Сегодня');
    expect(formatDraftDate('2026-10-03', today)).toBe('Вчера');
    expect(formatDraftDate('2026-10-02', today)).toBe('Позавчера');
    expect(formatDraftDate('2026-09-28', today)).toBe('28 сентября');
  });

  it('formats recording time', () => {
    expect(formatRecordingTime(7)).toBe('0:07');
    expect(formatRecordingTime(30)).toBe('0:30');
  });
});

describe('recorder format selection', () => {
  it('prefers webm/opus and falls back to mp4 on iOS', () => {
    expect(pickMimeType(() => true)).toBe('audio/webm;codecs=opus');
    expect(pickMimeType(type => type === 'audio/mp4')).toBe('audio/mp4');
    expect(pickMimeType(() => false)).toBeUndefined();
  });

  it('names uploads by container', () => {
    expect(filenameForMime('audio/mp4')).toBe('voice.mp4');
    expect(filenameForMime('audio/ogg;codecs=opus')).toBe('voice.ogg');
    expect(filenameForMime('audio/webm;codecs=opus')).toBe('voice.webm');
  });
});
