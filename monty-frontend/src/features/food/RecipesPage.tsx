import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionIcon, Chip, CloseButton, Container, Group, ScrollArea, Skeleton, Stack, Text, TextInput } from '@mantine/core';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import { EmptyState, ListRow, PageHeader, Section } from '../../ui';
import { useDishes, useMealCategories } from './queries';
import { ReadinessBadge } from './components/ReadinessBadge';
import { WarehouseSwitcher } from './components/WarehouseSwitcher';
import type { Dish } from './types';

type Filter = 'all' | 'ready' | number;

export function RecipesPage() {
  const navigate = useNavigate();
  const { data: dishes = [], isPending, isError, refetch } = useDishes();
  const { data: categories = [] } = useMealCategories();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dishes
      .filter(d => !q || d.title.toLowerCase().includes(q) || d.ingredients.some(l => l.ingredient_name.toLowerCase().includes(q)))
      .filter(d => filter === 'all' || (filter === 'ready' ? d.pantry_status === 'ready' : d.meal_category_id === filter))
      .sort((a, b) => a.title.localeCompare(b.title, 'ru'));
  }, [dishes, query, filter]);
  const readyCount = dishes.filter(d => d.pantry_status === 'ready').length;

  return (
    <Container size="sm" pb="var(--monty-page-pb)">
      <PageHeader
        title="Рецепты"
        onBack={() => navigate('/food')}
        right={
          <ActionIcon variant="filled" size="lg" radius="xl" aria-label="Новый рецепт" onClick={() => navigate('/food/recipes/new')}>
            <IconPlus size={20} />
          </ActionIcon>
        }
      />
      <WarehouseSwitcher />

      <Stack gap="sm" mt="sm">
        <TextInput
          placeholder="Блюдо или продукт"
          leftSection={<IconSearch size={16} />}
          value={query}
          onChange={e => setQuery(e.currentTarget.value)}
          rightSection={query ? <CloseButton size="sm" aria-label="Очистить" onClick={() => setQuery('')} /> : null}
        />
        <ScrollArea type="never">
          <Group gap={6} wrap="nowrap">
            <Chip checked={filter === 'all'} onChange={() => setFilter('all')} radius="xl">Все</Chip>
            <Chip checked={filter === 'ready'} onChange={() => setFilter('ready')} radius="xl" color="teal">
              Можно приготовить{readyCount ? ` · ${readyCount}` : ''}
            </Chip>
            {categories.map(c => (
              <Chip key={c.id} checked={filter === c.id} onChange={() => setFilter(c.id)} radius="xl">{c.name}</Chip>
            ))}
          </Group>
        </ScrollArea>
      </Stack>

      {isError ? (
        <EmptyState icon="⚠️" title="Не удалось загрузить" action={{ label: 'Повторить', onClick: () => void refetch() }} />
      ) : isPending ? (
        <Skeleton h={260} radius="lg" mt="md" />
      ) : dishes.length === 0 ? (
        <EmptyState icon="📖" title="Рецептов пока нет" description="Добавьте блюда, которые вы готовите, — с составом Monty сам соберёт список покупок."
          action={{ label: 'Добавить рецепт', onClick: () => navigate('/food/recipes/new') }} />
      ) : visible.length === 0 ? (
        <EmptyState icon="🔍" title="Ничего не найдено" />
      ) : (
        <Section style={{ marginTop: 16 }}>
          {visible.map((dish, i) => (
            <ListRow
              key={dish.id}
              divider={i > 0}
              onClick={() => navigate(`/food/recipes/${dish.id}`)}
              title={dish.title}
              subtitle={<RecipeMeta dish={dish} category={categories.find(c => c.id === dish.meal_category_id)?.name} />}
              chevron
            />
          ))}
        </Section>
      )}
    </Container>
  );
}

function RecipeMeta({ dish, category }: { dish: Dish; category?: string }) {
  const minutes = (dish.prep_minutes ?? 0) + (dish.cook_minutes ?? 0);
  const parts = [category, minutes ? `${minutes} мин` : null].filter(Boolean).join(' · ');
  return (
    <Group gap={8} component="span" wrap="nowrap">
      {parts && <span>{parts}</span>}
      {dish.ingredients.length > 0 ? <ReadinessBadge readiness={dish.pantry_status} /> : <Text component="span" size="xs" style={{ color: 'var(--monty-hint)' }}>без состава</Text>}
    </Group>
  );
}
