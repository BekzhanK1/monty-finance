import { Card, Text, Group, Stack, Badge, ActionIcon, UnstyledButton } from '@mantine/core';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { theme } from '../theme';
import type { Transaction, Category } from '../types';

interface TransactionCardProps {
  transaction: Transaction;
  category: Category;
  onClick?: () => void;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
}

/**
 * TransactionCard component for displaying transaction information
 * Features:
 * - Semantic colors based on transaction type (income/expense/savings)
 * - Category icon and name display
 * - Transaction date and amount
 * - Optional comment display
 * - Edit and delete action buttons
 * - Consistent card styling with theme tokens
 */
export function TransactionCard({
  transaction,
  category,
  onClick,
  onEdit,
  onDelete,
}: TransactionCardProps) {
  // Determine transaction type
  const isIncome = category.type === 'INCOME';
  const isSavings = category.group === 'SAVINGS';

  const getBadgeColor = () => {
    if (isIncome) return 'green';
    if (isSavings) return 'blue';
    return 'red';
  };

  // Format currency
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ru-KZ', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleString('ru-RU', {
      timeZone: 'Asia/Almaty',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const cardContent = (
    <Card
      shadow="sm"
      padding={theme.spacing.md}
      radius={theme.borderRadius.md}
      style={{
        boxShadow: theme.shadows.sm,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 200ms ease, transform 200ms ease',
        backgroundColor: theme.colors.background.primary,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.boxShadow = theme.shadows.md;
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.boxShadow = theme.shadows.sm;
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      <Group justify="space-between" wrap="nowrap" gap={theme.spacing.sm}>
        {/* Left side: Icon, Category, Date, Comment */}
        <Group gap={theme.spacing.sm} wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
          <Text
            style={{
              fontSize: theme.typography.fontSize.xl,
              lineHeight: theme.typography.lineHeight.tight,
            }}
          >
            {category.icon}
          </Text>
          <Stack gap={theme.spacing.xs} style={{ minWidth: 0, flex: 1 }}>
            <Text
              style={{
                fontSize: theme.typography.fontSize.md,
                fontWeight: theme.typography.fontWeight.medium,
                color: theme.colors.text.primary,
                lineHeight: theme.typography.lineHeight.normal,
              }}
            >
              {category.name}
            </Text>
            <Text
              size={theme.typography.fontSize.xs}
              style={{
                color: theme.colors.text.tertiary,
                lineHeight: theme.typography.lineHeight.normal,
              }}
            >
              {formatDate(transaction.transaction_date)}
            </Text>
            {transaction.comment && (
              <Text
                size={theme.typography.fontSize.xs}
                style={{
                  color: theme.colors.text.secondary,
                  lineHeight: theme.typography.lineHeight.normal,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                📝 {transaction.comment}
              </Text>
            )}
          </Stack>
        </Group>

        {/* Right side: Amount Badge and Action Buttons */}
        <Group gap={theme.spacing.xs} wrap="nowrap">
          <Badge
            color={getBadgeColor()}
            variant="light"
            size="lg"
            style={{
              fontFamily: theme.typography.fontFamily.monospace,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
            }}
          >
            {isIncome ? '+' : '−'}{formatAmount(transaction.amount)} ₸
          </Badge>
          
          {/* Action Buttons */}
          {(onEdit || onDelete) && (
            <Group gap={theme.spacing.xs} wrap="nowrap">
              {onEdit && (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(transaction);
                  }}
                  aria-label={`Edit transaction for ${category.name}`}
                  style={{
                    transition: 'background-color 200ms ease',
                  }}
                >
                  <IconEdit size={16} />
                </ActionIcon>
              )}
              {onDelete && (
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(transaction);
                  }}
                  aria-label={`Delete transaction for ${category.name}`}
                  style={{
                    transition: 'background-color 200ms ease',
                  }}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              )}
            </Group>
          )}
        </Group>
      </Group>
    </Card>
  );

  // Wrap in UnstyledButton if onClick is provided
  if (onClick) {
    return (
      <UnstyledButton onClick={onClick} style={{ width: '100%' }}>
        {cardContent}
      </UnstyledButton>
    );
  }

  return cardContent;
}
