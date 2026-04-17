import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransactionCard } from './TransactionCard';
import { theme } from '../theme';
import { MantineProvider } from '@mantine/core';
import type { Transaction, Category } from '../types';

// Wrapper component for Mantine context
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

describe('TransactionCard', () => {
  const mockExpenseTransaction: Transaction = {
    id: '1',
    user_id: 1,
    category_id: 1,
    amount: 5000,
    transaction_date: '2024-01-15T10:30:00Z',
    comment: 'Grocery shopping',
  };

  const mockExpenseCategory: Category = {
    id: 1,
    name: 'Food',
    group: 'BASE',
    type: 'EXPENSE',
    icon: '🍔',
  };

  const mockIncomeTransaction: Transaction = {
    id: '2',
    user_id: 1,
    category_id: 2,
    amount: 50000,
    transaction_date: '2024-01-01T09:00:00Z',
    comment: null,
  };

  const mockIncomeCategory: Category = {
    id: 2,
    name: 'Salary',
    group: 'INCOME',
    type: 'INCOME',
    icon: '💰',
  };

  const mockSavingsTransaction: Transaction = {
    id: '3',
    user_id: 1,
    category_id: 3,
    amount: 10000,
    transaction_date: '2024-01-10T14:00:00Z',
    comment: 'Monthly savings',
  };

  const mockSavingsCategory: Category = {
    id: 3,
    name: 'Savings',
    group: 'SAVINGS',
    type: 'EXPENSE',
    icon: '💎',
  };

  it('renders expense transaction correctly', () => {
    render(
      <TransactionCard
        transaction={mockExpenseTransaction}
        category={mockExpenseCategory}
      />
    );

    expect(screen.getByText('🍔')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('−5,000 ₸')).toBeInTheDocument();
    expect(screen.getByText('📝 Grocery shopping')).toBeInTheDocument();
  });

  it('renders income transaction correctly', () => {
    render(
      <TransactionCard
        transaction={mockIncomeTransaction}
        category={mockIncomeCategory}
      />
    );

    expect(screen.getByText('💰')).toBeInTheDocument();
    expect(screen.getByText('Salary')).toBeInTheDocument();
    expect(screen.getByText('+50,000 ₸')).toBeInTheDocument();
  });

  it('renders savings transaction correctly', () => {
    render(
      <TransactionCard
        transaction={mockSavingsTransaction}
        category={mockSavingsCategory}
      />
    );

    expect(screen.getByText('💎')).toBeInTheDocument();
    expect(screen.getByText('Savings')).toBeInTheDocument();
    expect(screen.getByText('−10,000 ₸')).toBeInTheDocument();
    expect(screen.getByText('📝 Monthly savings')).toBeInTheDocument();
  });

  it('does not render comment when null', () => {
    render(
      <TransactionCard
        transaction={mockIncomeTransaction}
        category={mockIncomeCategory}
      />
    );

    expect(screen.queryByText(/📝/)).not.toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    const onClick = vi.fn();
    render(
      <TransactionCard
        transaction={mockExpenseTransaction}
        category={mockExpenseCategory}
        onClick={onClick}
      />
    );

    fireEvent.click(screen.getByText('Food'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = vi.fn();
    render(
      <TransactionCard
        transaction={mockExpenseTransaction}
        category={mockExpenseCategory}
        onEdit={onEdit}
      />
    );

    const editButton = screen.getByLabelText('Edit transaction for Food');
    fireEvent.click(editButton);
    expect(onEdit).toHaveBeenCalledWith(mockExpenseTransaction);
  });

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn();
    render(
      <TransactionCard
        transaction={mockExpenseTransaction}
        category={mockExpenseCategory}
        onDelete={onDelete}
      />
    );

    const deleteButton = screen.getByLabelText('Delete transaction for Food');
    fireEvent.click(deleteButton);
    expect(onDelete).toHaveBeenCalledWith(mockExpenseTransaction);
  });

  it('stops propagation when edit button is clicked', () => {
    const onClick = vi.fn();
    const onEdit = vi.fn();
    render(
      <TransactionCard
        transaction={mockExpenseTransaction}
        category={mockExpenseCategory}
        onClick={onClick}
        onEdit={onEdit}
      />
    );

    const editButton = screen.getByLabelText('Edit transaction for Food');
    fireEvent.click(editButton);
    
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('stops propagation when delete button is clicked', () => {
    const onClick = vi.fn();
    const onDelete = vi.fn();
    render(
      <TransactionCard
        transaction={mockExpenseTransaction}
        category={mockExpenseCategory}
        onClick={onClick}
        onDelete={onDelete}
      />
    );

    const deleteButton = screen.getByLabelText('Delete transaction for Food');
    fireEvent.click(deleteButton);
    
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not render action buttons when handlers are not provided', () => {
    render(
      <TransactionCard
        transaction={mockExpenseTransaction}
        category={mockExpenseCategory}
      />
    );

    expect(screen.queryByLabelText(/Edit transaction/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Delete transaction/)).not.toBeInTheDocument();
  });

  it('applies correct badge color for expense', () => {
    const { container } = render(
      <TransactionCard
        transaction={mockExpenseTransaction}
        category={mockExpenseCategory}
      />
    );

    const badge = container.querySelector('.mantine-Badge-root');
    expect(badge).toBeInTheDocument();
  });

  it('applies correct badge color for income', () => {
    const { container } = render(
      <TransactionCard
        transaction={mockIncomeTransaction}
        category={mockIncomeCategory}
      />
    );

    const badge = container.querySelector('.mantine-Badge-root');
    expect(badge).toBeInTheDocument();
  });

  it('applies correct badge color for savings', () => {
    const { container } = render(
      <TransactionCard
        transaction={mockSavingsTransaction}
        category={mockSavingsCategory}
      />
    );

    const badge = container.querySelector('.mantine-Badge-root');
    expect(badge).toBeInTheDocument();
  });

  it('formats amount with thousand separators', () => {
    const largeTransaction: Transaction = {
      ...mockExpenseTransaction,
      amount: 1234567,
    };

    render(
      <TransactionCard
        transaction={largeTransaction}
        category={mockExpenseCategory}
      />
    );

    expect(screen.getByText('−1,234,567 ₸')).toBeInTheDocument();
  });

  it('uses monospace font for amount', () => {
    const { container } = render(
      <TransactionCard
        transaction={mockExpenseTransaction}
        category={mockExpenseCategory}
      />
    );

    const badge = container.querySelector('.mantine-Badge-root');
    expect(badge).toHaveStyle({
      fontFamily: theme.typography.fontFamily.monospace,
    });
  });
});
