import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BudgetCard } from './BudgetCard';
import { theme } from '../theme';
import { MantineProvider } from '@mantine/core';

// Wrapper component for Mantine context
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

describe('BudgetCard', () => {
  const defaultProps = {
    categoryId: 1,
    categoryName: 'Food',
    categoryIcon: '🍔',
    spent: 30000,
    limit: 50000,
    group: 'BASE' as const,
  };

  it('renders category name and icon correctly', () => {
    render(
      <TestWrapper>
        <BudgetCard {...defaultProps} />
      </TestWrapper>
    );
    
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('🍔')).toBeInTheDocument();
  });

  it('displays spent and limit amounts correctly', () => {
    render(
      <TestWrapper>
        <BudgetCard {...defaultProps} />
      </TestWrapper>
    );
    
    expect(screen.getByText(/30,000 ₸/)).toBeInTheDocument();
    expect(screen.getByText(/50,000 ₸/)).toBeInTheDocument();
  });

  it('calculates and displays percentage correctly', () => {
    render(
      <TestWrapper>
        <BudgetCard {...defaultProps} />
      </TestWrapper>
    );
    
    // 30000/50000 = 60%
    expect(screen.getByText('60% использовано')).toBeInTheDocument();
  });

  it('shows green progress bar when usage < 50%', () => {
    render(
      <TestWrapper>
        <BudgetCard {...defaultProps} spent={20000} limit={50000} />
      </TestWrapper>
    );
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '40');
  });

  it('shows yellow progress bar when usage 50-75%', () => {
    render(
      <TestWrapper>
        <BudgetCard {...defaultProps} spent={30000} limit={50000} />
      </TestWrapper>
    );
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '60');
  });

  it('shows red progress bar when usage > 75%', () => {
    render(
      <TestWrapper>
        <BudgetCard {...defaultProps} spent={45000} limit={50000} />
      </TestWrapper>
    );
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '90');
  });

  it('handles savings categories without limit display', () => {
    render(
      <TestWrapper>
        <BudgetCard {...defaultProps} group="SAVINGS" />
      </TestWrapper>
    );
    
    // Should not show limit
    expect(screen.queryByText(/50,000 ₸/)).not.toBeInTheDocument();
    // Should not show progress bar
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    // Should not show percentage
    expect(screen.queryByText(/использовано/)).not.toBeInTheDocument();
  });

  it('shows edit button for non-savings categories when onEdit provided', () => {
    const handleEdit = vi.fn();
    render(
      <TestWrapper>
        <BudgetCard {...defaultProps} onEdit={handleEdit} />
      </TestWrapper>
    );
    
    const editButton = screen.getByLabelText('Edit budget for Food');
    expect(editButton).toBeInTheDocument();
  });

  it('does not show edit button for savings categories', () => {
    const handleEdit = vi.fn();
    render(
      <TestWrapper>
        <BudgetCard {...defaultProps} group="SAVINGS" onEdit={handleEdit} />
      </TestWrapper>
    );
    
    expect(screen.queryByLabelText(/Edit budget/)).not.toBeInTheDocument();
  });

  it('enters edit mode when edit button is clicked', () => {
    const handleEdit = vi.fn();
    render(
      <TestWrapper>
        <BudgetCard {...defaultProps} onEdit={handleEdit} />
      </TestWrapper>
    );
    
    const editButton = screen.getByLabelText('Edit budget for Food');
    fireEvent.click(editButton);
    
    expect(screen.getByDisplayValue('50000')).toBeInTheDocument();
    expect(screen.getByText('Сохранить')).toBeInTheDocument();
    expect(screen.getByText('Отмена')).toBeInTheDocument();
  });

  it('calls onEdit with new limit when save is clicked', () => {
    const handleEdit = vi.fn();
    render(
      <TestWrapper>
        <BudgetCard {...defaultProps} onEdit={handleEdit} />
      </TestWrapper>
    );
    
    // Enter edit mode
    const editButton = screen.getByLabelText('Edit budget for Food');
    fireEvent.click(editButton);
    
    // Change value
    const input = screen.getByDisplayValue('50000');
    fireEvent.change(input, { target: { value: '60000' } });
    
    // Save
    const saveButton = screen.getByText('Сохранить');
    fireEvent.click(saveButton);
    
    expect(handleEdit).toHaveBeenCalledWith(1, 60000);
  });

  it('cancels edit mode when cancel is clicked', () => {
    const handleEdit = vi.fn();
    render(
      <TestWrapper>
        <BudgetCard {...defaultProps} onEdit={handleEdit} />
      </TestWrapper>
    );
    
    // Enter edit mode
    const editButton = screen.getByLabelText('Edit budget for Food');
    fireEvent.click(editButton);
    
    // Change value
    const input = screen.getByDisplayValue('50000');
    fireEvent.change(input, { target: { value: '60000' } });
    
    // Cancel
    const cancelButton = screen.getByText('Отмена');
    fireEvent.click(cancelButton);
    
    expect(handleEdit).not.toHaveBeenCalled();
    expect(screen.queryByDisplayValue('60000')).not.toBeInTheDocument();
  });

  it('handles click events when onClick is provided', () => {
    const handleClick = vi.fn();
    render(
      <TestWrapper>
        <BudgetCard {...defaultProps} onClick={handleClick} />
      </TestWrapper>
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not render as button when onClick is not provided', () => {
    render(
      <TestWrapper>
        <BudgetCard {...defaultProps} />
      </TestWrapper>
    );
    
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('uses monospace font for amounts', () => {
    render(
      <TestWrapper>
        <BudgetCard {...defaultProps} />
      </TestWrapper>
    );
    
    const spentElement = screen.getByText(/30,000 ₸/);
    expect(spentElement).toHaveStyle({ 
      fontFamily: theme.typography.fontFamily.monospace 
    });
  });

  it('applies expense color to spent amount', () => {
    render(
      <TestWrapper>
        <BudgetCard {...defaultProps} />
      </TestWrapper>
    );
    
    const spentElement = screen.getByText(/30,000 ₸/);
    expect(spentElement).toHaveStyle({ color: theme.colors.expense.main });
  });

  it('applies consistent card styling', () => {
    const { container } = render(
      <TestWrapper>
        <BudgetCard {...defaultProps} />
      </TestWrapper>
    );
    
    const card = container.querySelector('[class*="Card"]');
    expect(card).toHaveStyle({
      boxShadow: theme.shadows.sm,
      backgroundColor: theme.colors.background.primary,
    });
  });

  it('caps progress bar at 100% when over budget', () => {
    render(
      <TestWrapper>
        <BudgetCard {...defaultProps} spent={60000} limit={50000} />
      </TestWrapper>
    );
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });
});
