import { Card, Text, Group, Stack, Progress, UnstyledButton, ActionIcon } from '@mantine/core';
import { IconPencil } from '@tabler/icons-react';
import { useState } from 'react';
import { theme } from '../theme';

interface BudgetCardProps {
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  spent: number;
  limit: number;
  group: 'BASE' | 'COMFORT' | 'SAVINGS';
  onEdit?: (categoryId: number, newLimit: number) => void;
  onClick?: () => void;
}

/**
 * BudgetCard component for displaying budget category information
 * Features:
 * - Progress bar with color coding (green < 50%, yellow 50-75%, red > 75%)
 * - Inline editing of budget limits
 * - Handles savings categories (no limit display)
 * - Consistent card styling with theme tokens
 */
export function BudgetCard({
  categoryId,
  categoryName,
  categoryIcon,
  spent,
  limit,
  group,
  onEdit,
  onClick,
}: BudgetCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(limit.toString());

  // Calculate usage percentage
  const percentage = limit > 0 ? (spent / limit) * 100 : 0;

  // Determine progress bar color based on usage
  const getProgressColor = () => {
    if (percentage < 50) return theme.colors.budgetStatus.safe;
    if (percentage < 75) return theme.colors.budgetStatus.warning;
    if (percentage <= 100) return theme.colors.budgetStatus.danger;
    return theme.colors.budgetStatus.over;
  };

  // Format currency
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ru-KZ', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Handle edit save
  const handleSave = () => {
    const newLimit = parseFloat(editValue);
    if (!isNaN(newLimit) && newLimit >= 0 && onEdit) {
      onEdit(categoryId, newLimit);
    }
    setIsEditing(false);
  };

  // Handle edit cancel
  const handleCancel = () => {
    setEditValue(limit.toString());
    setIsEditing(false);
  };

  const isSavings = group === 'SAVINGS';

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
      <Stack gap={theme.spacing.sm}>
        {/* Header: Icon, Name, Edit Button */}
        <Group justify="space-between" align="center">
          <Group gap={theme.spacing.sm}>
            <Text
              style={{
                fontSize: theme.typography.fontSize.xl,
                lineHeight: theme.typography.lineHeight.tight,
              }}
            >
              {categoryIcon}
            </Text>
            <Text
              style={{
                fontSize: theme.typography.fontSize.md,
                fontWeight: theme.typography.fontWeight.medium,
                color: theme.colors.text.primary,
                lineHeight: theme.typography.lineHeight.normal,
              }}
            >
              {categoryName}
            </Text>
          </Group>
          {onEdit && !isSavings && (
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              aria-label={`Edit budget for ${categoryName}`}
            >
              <IconPencil size={16} />
            </ActionIcon>
          )}
        </Group>

        {/* Amount Display */}
        <Group justify="space-between" align="baseline">
          <Text
            style={{
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.expense.main,
              fontFamily: theme.typography.fontFamily.monospace,
              lineHeight: theme.typography.lineHeight.tight,
            }}
          >
            {formatAmount(spent)} ₸
          </Text>
          {!isSavings && (
            <Text
              size={theme.typography.fontSize.sm}
              style={{
                color: theme.colors.text.tertiary,
                fontFamily: theme.typography.fontFamily.monospace,
                lineHeight: theme.typography.lineHeight.normal,
              }}
            >
              / {formatAmount(limit)} ₸
            </Text>
          )}
        </Group>

        {/* Progress Bar (only for non-savings categories) */}
        {!isSavings && (
          <Stack gap={theme.spacing.xs}>
            <Progress
              value={Math.min(percentage, 100)}
              color={getProgressColor()}
              size="md"
              radius={theme.borderRadius.full}
              style={{
                height: '8px',
              }}
            />
            <Text
              size={theme.typography.fontSize.xs}
              style={{
                color: theme.colors.text.tertiary,
                lineHeight: theme.typography.lineHeight.normal,
              }}
            >
              {percentage.toFixed(0)}% использовано
            </Text>
          </Stack>
        )}

        {/* Edit Mode */}
        {isEditing && (
          <Group gap={theme.spacing.sm} mt={theme.spacing.xs}>
            <input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                flex: 1,
                padding: theme.spacing.sm,
                fontSize: theme.typography.fontSize.md,
                fontFamily: theme.typography.fontFamily.monospace,
                border: `1px solid ${theme.colors.text.tertiary}`,
                borderRadius: theme.borderRadius.sm,
                outline: 'none',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = theme.colors.savings.main;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = theme.colors.text.tertiary;
              }}
              autoFocus
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                backgroundColor: theme.colors.savings.main,
                color: '#ffffff',
                border: 'none',
                borderRadius: theme.borderRadius.sm,
                cursor: 'pointer',
                transition: 'background-color 200ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.savings.dark;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.savings.main;
              }}
            >
              Сохранить
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancel();
              }}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                backgroundColor: theme.colors.background.tertiary,
                color: theme.colors.text.primary,
                border: 'none',
                borderRadius: theme.borderRadius.sm,
                cursor: 'pointer',
                transition: 'background-color 200ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.text.disabled;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.background.tertiary;
              }}
            >
              Отмена
            </button>
          </Group>
        )}
      </Stack>
    </Card>
  );

  // Wrap in UnstyledButton if onClick is provided
  if (onClick && !isEditing) {
    return (
      <UnstyledButton onClick={onClick} style={{ width: '100%' }}>
        {cardContent}
      </UnstyledButton>
    );
  }

  return cardContent;
}
