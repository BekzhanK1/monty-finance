/**
 * StatCard Usage Examples
 * 
 * This file demonstrates various ways to use the StatCard component
 */

import { Stack, SimpleGrid } from '@mantine/core';
import { IconTrendingUp, IconTrendingDown, IconPigMoney, IconWallet } from '@tabler/icons-react';
import { StatCard } from './StatCard';

export function StatCardExamples() {
  return (
    <Stack gap="xl" p="md">
      {/* Basic Usage */}
      <div>
        <h3>Basic Usage</h3>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
          <StatCard label="Income" value="50,000 ₸" color="income" />
          <StatCard label="Expense" value="30,000 ₸" color="expense" />
          <StatCard label="Savings" value="20,000 ₸" color="savings" />
          <StatCard label="Balance" value="40,000 ₸" color="neutral" />
        </SimpleGrid>
      </div>

      {/* With Subtitles */}
      <div>
        <h3>With Subtitles</h3>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          <StatCard 
            label="Monthly Income" 
            value="50,000 ₸" 
            color="income"
            subtitle="This month"
          />
          <StatCard 
            label="Monthly Expense" 
            value="30,000 ₸" 
            color="expense"
            subtitle="This month"
          />
          <StatCard 
            label="Net Savings" 
            value="20,000 ₸" 
            color="savings"
            subtitle="After expenses"
          />
        </SimpleGrid>
      </div>

      {/* With Icons */}
      <div>
        <h3>With Icons</h3>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
          <StatCard 
            label="Income" 
            value="50,000 ₸" 
            color="income"
            icon={<IconTrendingUp size={24} />}
          />
          <StatCard 
            label="Expense" 
            value="30,000 ₸" 
            color="expense"
            icon={<IconTrendingDown size={24} />}
          />
          <StatCard 
            label="Savings" 
            value="20,000 ₸" 
            color="savings"
            icon={<IconPigMoney size={24} />}
          />
          <StatCard 
            label="Balance" 
            value="40,000 ₸" 
            color="neutral"
            icon={<IconWallet size={24} />}
          />
        </SimpleGrid>
      </div>

      {/* Clickable Cards */}
      <div>
        <h3>Clickable Cards</h3>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          <StatCard 
            label="View Income" 
            value="50,000 ₸" 
            color="income"
            subtitle="Click to see details"
            icon={<IconTrendingUp size={24} />}
            onClick={() => alert('Income details clicked!')}
          />
          <StatCard 
            label="View Expenses" 
            value="30,000 ₸" 
            color="expense"
            subtitle="Click to see details"
            icon={<IconTrendingDown size={24} />}
            onClick={() => alert('Expense details clicked!')}
          />
          <StatCard 
            label="View Savings" 
            value="20,000 ₸" 
            color="savings"
            subtitle="Click to see details"
            icon={<IconPigMoney size={24} />}
            onClick={() => alert('Savings details clicked!')}
          />
        </SimpleGrid>
      </div>

      {/* Different Value Formats */}
      <div>
        <h3>Different Value Formats</h3>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
          <StatCard label="Count" value={42} color="neutral" />
          <StatCard label="Percentage" value="75%" color="savings" />
          <StatCard label="Large Amount" value="1,234,567 ₸" color="income" />
          <StatCard label="Decimal" value="12,345.67 ₸" color="expense" />
        </SimpleGrid>
      </div>
    </Stack>
  );
}
