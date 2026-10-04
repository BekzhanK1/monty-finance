export type BudgetGroup = 'BASE' | 'COMFORT' | 'SAVINGS' | 'INCOME';

export const GROUP_LABEL: Record<BudgetGroup, string> = {
  BASE: 'База',
  COMFORT: 'Комфорт',
  SAVINGS: 'Накопления',
  INCOME: 'Доходы',
};

export const GROUP_TINT: Record<BudgetGroup, string> = {
  BASE: 'var(--monty-group-base)',
  COMFORT: 'var(--monty-group-comfort)',
  SAVINGS: 'var(--monty-group-savings)',
  INCOME: 'var(--monty-income)',
};

export function groupTint(group: string): string {
  return GROUP_TINT[group as BudgetGroup] ?? 'var(--monty-accent)';
}
