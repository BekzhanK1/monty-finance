export type MoodMode = 'manual' | 'ai';
export type AnalysisStatus = 'pending' | 'done' | 'failed' | 'skipped';

export interface JournalEntry {
  id: string;
  entry_date: string;
  mood: number | null;
  mood_source: 'user' | 'ai' | null;
  content: string | null;
  summary: string | null;
  tags: string[];
  emotions: string[];
  analysis_status: AnalysisStatus;
  created_at: string;
  updated_at: string;
}

export interface Streak {
  current: number;
  best: number;
  today_done: boolean;
  frozen_days: string[];
}

export interface PartnerStatus {
  user_id: number;
  first_name: string;
  streak: Streak;
  last_mood: number | null;
  last_entry_date: string | null;
}

export interface JournalOverview {
  today: string;
  me: Streak;
  today_entries: number;
  mood_mode: MoodMode;
  partners: PartnerStatus[];
}

export interface JournalSettings {
  mood_mode: MoodMode;
  reminder_enabled: boolean;
  reminder_time: string;
}

export interface SpendingBucket {
  days: number;
  avg_spent: number | null;
}

export interface JournalAnalytics {
  days: number;
  start: string;
  end: string;
  entries_count: number;
  days_written: number;
  average_mood: number | null;
  series: { date: string; mood: number | null; entries: number }[];
  weekday: { weekday: number; mood: number | null }[];
  tags: { tag: string; count: number; avg_mood: number | null }[];
  emotions: { emotion: string; count: number }[];
  spending: {
    points: { date: string; mood: number; spent: number }[];
    low_mood: SpendingBucket;
    mid_mood: SpendingBucket;
    high_mood: SpendingBucket;
  };
}
