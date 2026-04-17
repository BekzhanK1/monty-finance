/**
 * BudgetCard Usage Examples
 * 
 * This file demonstrates various ways to use the BudgetCard component
 */

import { Stack, SimpleGrid } from '@mantine/core';
import { BudgetCard } from './BudgetCard';

export function BudgetCardExamples() {
  const handleEdit = (categoryId: number, newLimit: number) => {
    console.log(`Category ${categoryId} limit updated to ${newLimit}`);
    alert(`Budget updated to ${newLimit} ₸`);
  };

  const handleClick = (categoryName: string) => {
    console.log(`Clicked on ${categoryName}`);
    alert(`Viewing details for ${categoryName}`);
  };

  return (
    <Stack gap="xl" p="md">
      {/* Basic Usage - Different Budget Status Colors */}
      <div>
        <h3>Budget Status Colors</h3>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          <BudgetCard
            categoryId={1}
            categoryName="Food"
            categoryIcon="🍔"
            spent={20000}
            limit={50000}
            group="BASE"
          />
          <BudgetCard
            categoryId={2}
            categoryName="Transport"
            categoryIcon="🚗"
            spent={30000}
            limit={50000}
            group="BASE"
          />
          <BudgetCard
            categoryId={3}
            categoryName="Entertainment"
            categoryIcon="🎬"
            spent={45000}
            limit={50000}
            group="COMFORT"
          />
        </SimpleGrid>
        <p style={{ fontSize: '14px', color: '#868e96', marginTop: '8px' }}>
          Green (&lt;50%), Yellow (50-75%), Red (&gt;75%)
        </p>
      </div>

      {/* Over Budget */}
      <div>
        <h3>Over Budget</h3>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <BudgetCard
            categoryId={4}
            categoryName="Shopping"
            categoryIcon="🛍️"
            spent={60000}
            limit={50000}
            group="COMFORT"
          />
          <BudgetCard
            categoryId={5}
            categoryName="Dining Out"
            categoryIcon="🍽️"
            spent={55000}
            limit={50000}
            group="COMFORT"
          />
        </SimpleGrid>
      </div>

      {/* Savings Categories (No Limit) */}
      <div>
        <h3>Savings Categories</h3>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          <BudgetCard
            categoryId={6}
            categoryName="Emergency Fund"
            categoryIcon="🏦"
            spent={150000}
            limit={0}
            group="SAVINGS"
          />
          <BudgetCard
            categoryId={7}
            categoryName="Vacation"
            categoryIcon="✈️"
            spent={75000}
            limit={0}
            group="SAVINGS"
          />
          <BudgetCard
            categoryId={8}
            categoryName="Investment"
            categoryIcon="📈"
            spent={200000}
            limit={0}
            group="SAVINGS"
          />
        </SimpleGrid>
        <p style={{ fontSize: '14px', color: '#868e96', marginTop: '8px' }}>
          Savings categories don't show limits or progress bars
        </p>
      </div>

      {/* With Edit Functionality */}
      <div>
        <h3>Editable Budgets</h3>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          <BudgetCard
            categoryId={9}
            categoryName="Groceries"
            categoryIcon="🛒"
            spent={35000}
            limit={50000}
            group="BASE"
            onEdit={handleEdit}
          />
          <BudgetCard
            categoryId={10}
            categoryName="Utilities"
            categoryIcon="💡"
            spent={15000}
            limit={25000}
            group="BASE"
            onEdit={handleEdit}
          />
          <BudgetCard
            categoryId={11}
            categoryName="Gym"
            categoryIcon="💪"
            spent={8000}
            limit={15000}
            group="COMFORT"
            onEdit={handleEdit}
          />
        </SimpleGrid>
        <p style={{ fontSize: '14px', color: '#868e96', marginTop: '8px' }}>
          Click the edit icon to modify budget limits
        </p>
      </div>

      {/* Clickable Cards */}
      <div>
        <h3>Clickable Cards</h3>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          <BudgetCard
            categoryId={12}
            categoryName="Food"
            categoryIcon="🍔"
            spent={30000}
            limit={50000}
            group="BASE"
            onClick={() => handleClick('Food')}
          />
          <BudgetCard
            categoryId={13}
            categoryName="Transport"
            categoryIcon="🚗"
            spent={20000}
            limit={40000}
            group="BASE"
            onClick={() => handleClick('Transport')}
          />
          <BudgetCard
            categoryId={14}
            categoryName="Entertainment"
            categoryIcon="🎬"
            spent={15000}
            limit={30000}
            group="COMFORT"
            onClick={() => handleClick('Entertainment')}
          />
        </SimpleGrid>
        <p style={{ fontSize: '14px', color: '#868e96', marginTop: '8px' }}>
          Click cards to view transaction details
        </p>
      </div>

      {/* With Both Edit and Click */}
      <div>
        <h3>Editable and Clickable</h3>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <BudgetCard
            categoryId={15}
            categoryName="Healthcare"
            categoryIcon="🏥"
            spent={12000}
            limit={20000}
            group="BASE"
            onEdit={handleEdit}
            onClick={() => handleClick('Healthcare')}
          />
          <BudgetCard
            categoryId={16}
            categoryName="Education"
            categoryIcon="📚"
            spent={25000}
            limit={40000}
            group="COMFORT"
            onEdit={handleEdit}
            onClick={() => handleClick('Education')}
          />
        </SimpleGrid>
        <p style={{ fontSize: '14px', color: '#868e96', marginTop: '8px' }}>
          Click card to view details, click edit icon to modify budget
        </p>
      </div>

      {/* Different Budget Groups */}
      <div>
        <h3>Budget Groups</h3>
        <Stack gap="md">
          <div>
            <h4 style={{ fontSize: '16px', marginBottom: '8px' }}>BASE (Essential)</h4>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
              <BudgetCard
                categoryId={17}
                categoryName="Rent"
                categoryIcon="🏠"
                spent={80000}
                limit={80000}
                group="BASE"
              />
              <BudgetCard
                categoryId={18}
                categoryName="Groceries"
                categoryIcon="🛒"
                spent={30000}
                limit={40000}
                group="BASE"
              />
              <BudgetCard
                categoryId={19}
                categoryName="Utilities"
                categoryIcon="💡"
                spent={15000}
                limit={20000}
                group="BASE"
              />
            </SimpleGrid>
          </div>
          <div>
            <h4 style={{ fontSize: '16px', marginBottom: '8px' }}>COMFORT (Discretionary)</h4>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
              <BudgetCard
                categoryId={20}
                categoryName="Dining Out"
                categoryIcon="🍽️"
                spent={25000}
                limit={30000}
                group="COMFORT"
              />
              <BudgetCard
                categoryId={21}
                categoryName="Shopping"
                categoryIcon="🛍️"
                spent={20000}
                limit={25000}
                group="COMFORT"
              />
              <BudgetCard
                categoryId={22}
                categoryName="Hobbies"
                categoryIcon="🎨"
                spent={10000}
                limit={15000}
                group="COMFORT"
              />
            </SimpleGrid>
          </div>
        </Stack>
      </div>
    </Stack>
  );
}
