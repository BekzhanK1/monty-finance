import type { Category, Transaction } from '../../types';
import { AmountText, CategoryIcon, ListRow, groupTint, parseServerDate } from '../../ui';

const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });

const SOURCE_LABEL: Record<string, string> = { voice: '🎤', siri: 'Siri', bot: 'бот' };

interface TransactionRowProps {
  transaction: Transaction;
  category?: Category;
  /** Show the date instead of the time (lists not grouped by day). */
  showDate?: boolean;
  divider?: boolean;
  onClick?: () => void;
}

export function TransactionRow({ transaction, category, showDate = false, divider, onClick }: TransactionRowProps) {
  const date = parseServerDate(transaction.transaction_date);
  const isIncome = category?.type === 'INCOME';
  const isSavings = category?.group === 'SAVINGS';
  const when = showDate ? dateFormat.format(date) : timeFormat.format(date);
  const source = transaction.source ? SOURCE_LABEL[transaction.source] : undefined;
  const subtitle = [transaction.comment || null, source].filter(Boolean).join(' · ') || category?.name;

  return (
    <ListRow
      divider={divider}
      onClick={onClick}
      leading={<CategoryIcon icon={category?.icon ?? '•'} tint={groupTint(category?.group ?? '')} />}
      title={category?.name ?? 'Без категории'}
      subtitle={transaction.comment || source ? subtitle : undefined}
      trailing={
        <AmountText
          value={isIncome ? transaction.amount : -transaction.amount}
          tone={isIncome ? 'income' : isSavings ? 'savings' : 'expense'}
          sign={isIncome ? 'always' : 'auto'}
          fw={600}
        />
      }
      trailingSub={when}
    />
  );
}
