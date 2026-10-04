import { Text, type TextProps } from '@mantine/core';
import { formatMoney, type MoneySign } from './format';

export type AmountTone = 'income' | 'expense' | 'savings' | 'neutral' | 'auto';

const TONE_COLOR: Record<Exclude<AmountTone, 'auto'>, string> = {
  income: 'var(--monty-income)',
  expense: 'var(--monty-text)',
  savings: 'var(--monty-savings)',
  neutral: 'var(--monty-text)',
};

interface AmountTextProps extends Omit<TextProps, 'children' | 'c'> {
  value: number;
  /** `auto`: negatives in the destructive color, the rest neutral. */
  tone?: AmountTone;
  sign?: MoneySign;
}

export function AmountText({ value, tone = 'neutral', sign = 'auto', className, style, ...rest }: AmountTextProps) {
  const color = tone === 'auto'
    ? (value < 0 ? 'var(--monty-negative)' : 'var(--monty-text)')
    : TONE_COLOR[tone];
  return (
    <Text
      {...rest}
      className={['monty-tabular', className].filter(Boolean).join(' ')}
      style={{ color, whiteSpace: 'nowrap', ...style }}
    >
      {formatMoney(value, sign)}
    </Text>
  );
}
