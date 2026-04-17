import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatCard } from './StatCard';
import { theme } from '../theme';
import { MantineProvider } from '@mantine/core';

// Wrapper component for Mantine context
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

describe('StatCard', () => {
  it('renders label and value correctly', () => {
    render(
      <TestWrapper>
        <StatCard label="Income" value="50,000 ₸" />
      </TestWrapper>
    );
    
    expect(screen.getByText('Income')).toBeInTheDocument();
    expect(screen.getByText('50,000 ₸')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(
      <TestWrapper>
        <StatCard label="Balance" value="20,000 ₸" subtitle="After expenses" />
      </TestWrapper>
    );
    
    expect(screen.getByText('After expenses')).toBeInTheDocument();
  });

  it('applies income color correctly', () => {
    render(
      <TestWrapper>
        <StatCard label="Income" value="50,000 ₸" color="income" />
      </TestWrapper>
    );
    
    const valueElement = screen.getByText('50,000 ₸');
    expect(valueElement).toHaveStyle({ color: theme.colors.income.main });
  });

  it('applies expense color correctly', () => {
    render(
      <TestWrapper>
        <StatCard label="Expense" value="30,000 ₸" color="expense" />
      </TestWrapper>
    );
    
    const valueElement = screen.getByText('30,000 ₸');
    expect(valueElement).toHaveStyle({ color: theme.colors.expense.main });
  });

  it('applies savings color correctly', () => {
    render(
      <TestWrapper>
        <StatCard label="Savings" value="20,000 ₸" color="savings" />
      </TestWrapper>
    );
    
    const valueElement = screen.getByText('20,000 ₸');
    expect(valueElement).toHaveStyle({ color: theme.colors.savings.main });
  });

  it('applies neutral color by default', () => {
    render(
      <TestWrapper>
        <StatCard label="Total" value="100,000 ₸" />
      </TestWrapper>
    );
    
    const valueElement = screen.getByText('100,000 ₸');
    expect(valueElement).toHaveStyle({ color: theme.colors.text.primary });
  });

  it('handles click events when onClick is provided', () => {
    const handleClick = vi.fn();
    render(
      <TestWrapper>
        <StatCard label="Clickable" value="1000" onClick={handleClick} />
      </TestWrapper>
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not render as button when onClick is not provided', () => {
    render(
      <TestWrapper>
        <StatCard label="Not Clickable" value="1000" />
      </TestWrapper>
    );
    
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    const TestIcon = () => <span data-testid="test-icon">💰</span>;
    render(
      <TestWrapper>
        <StatCard label="With Icon" value="1000" icon={<TestIcon />} />
      </TestWrapper>
    );
    
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('uses monospace font for value', () => {
    render(
      <TestWrapper>
        <StatCard label="Amount" value="12,345 ₸" />
      </TestWrapper>
    );
    
    const valueElement = screen.getByText('12,345 ₸');
    expect(valueElement).toHaveStyle({ 
      fontFamily: theme.typography.fontFamily.monospace 
    });
  });

  it('applies consistent card styling', () => {
    const { container } = render(
      <TestWrapper>
        <StatCard label="Test" value="100" />
      </TestWrapper>
    );
    
    const card = container.querySelector('[class*="Card"]');
    expect(card).toHaveStyle({
      boxShadow: theme.shadows.sm,
      backgroundColor: theme.colors.background.primary,
    });
  });
});
