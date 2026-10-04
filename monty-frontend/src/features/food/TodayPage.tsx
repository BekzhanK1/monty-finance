import { useNavigate } from 'react-router-dom';
import { ActionIcon, Box, Button, Container, Group, Skeleton, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconBasket, IconCheck, IconChevronRight } from '@tabler/icons-react';
import { haptic } from '../../lib/telegram';
import { EmptyState, ListRow, PageHeader, Section, useSnackbar } from '../../ui';
import { foodApi } from './api';
import { useWarehouseId } from './WarehouseContext';
import { useFoodMutation, useToday } from './queries';
import { SLOTS, formatQty, readinessLabel, stockNote } from './format';
import { ReadinessBadge } from './components/ReadinessBadge';
import { WarehouseSwitcher } from './components/WarehouseSwitcher';
import type { MealSlot, PantryItem } from './types';

const todayFormat = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

export function TodayPage() {
  const navigate = useNavigate();
  const { data, isPending, isError, refetch } = useToday();
  const snack = useSnackbar();
  const wid = useWarehouseId();
  const lowStock = useFoodMutation(() => foodApi.shoppingLowStock(wid));

  const subtitle = todayFormat.format(new Date());

  return (
    <Container size="sm" pb="var(--monty-page-pb)">
      <PageHeader title="Кухня" subtitle={subtitle.charAt(0).toUpperCase() + subtitle.slice(1)} onBack={() => navigate('/services')} />
      <WarehouseSwitcher />

      {isError ? (
        <EmptyState icon="⚠️" title="Не удалось загрузить" action={{ label: 'Повторить', onClick: () => void refetch() }} />
      ) : isPending ? (
        <Stack gap="md" mt="md">
          <Skeleton h={160} radius="lg" />
          <Skeleton h={64} radius="lg" />
        </Stack>
      ) : (
        <Stack gap="lg" mt="md">
          <TodayMeals slots={data.slots} />

          <ShoppingCard open={data.shopping_open} onOpen={() => navigate('/food/shopping')} />

          {data.expiring.length > 0 && (
            <Section title="Скоро испортится" action={{ label: 'Запасы', onClick: () => navigate('/food/pantry') }}>
              {data.expiring.map((item, i) => <StockRow key={item.id} item={item} divider={i > 0} />)}
            </Section>
          )}

          {data.low_stock.length > 0 && (
            <Section
              title="Заканчивается"
              footer="Отметьте минимальный остаток у продукта в «Запасах» — и он попадёт сюда."
            >
              {data.low_stock.map((item, i) => <StockRow key={item.id} item={item} divider={i > 0} />)}
              <Box p="sm">
                <Button
                  variant="light"
                  fullWidth
                  loading={lowStock.isPending}
                  onClick={async () => {
                    const res = await lowStock.mutateAsync(undefined);
                    haptic('success');
                    snack(res.added ? `В список добавлено: ${res.added}` : 'Всё уже в списке', {
                      action: { label: 'Открыть', onClick: () => navigate('/food/shopping') },
                    });
                  }}
                >
                  Добавить в список покупок
                </Button>
              </Box>
            </Section>
          )}

          {data.tomorrow_planned === 0 && (
            <UnstyledButton onClick={() => navigate('/food/menu')} className="monty-pressable">
              <Group
                justify="space-between"
                p="md"
                wrap="nowrap"
                style={{ borderRadius: 'var(--monty-radius-card)', background: 'var(--monty-accent-soft)' }}
              >
                <Stack gap={0}>
                  <Text fw={600}>На завтра ничего не запланировано</Text>
                  <Text size="sm" style={{ color: 'var(--monty-subtitle)' }}>Спланируйте меню — список покупок соберётся сам</Text>
                </Stack>
                <IconChevronRight size={20} style={{ color: 'var(--monty-accent)', flexShrink: 0 }} />
              </Group>
            </UnstyledButton>
          )}
        </Stack>
      )}
    </Container>
  );
}

function TodayMeals({ slots }: { slots: MealSlot[] }) {
  const navigate = useNavigate();
  const snack = useSnackbar();
  const wid = useWarehouseId();
  const cook = useFoodMutation((slotId: number) => foodApi.cookSlot(slotId, wid));
  const uncook = useFoodMutation(foodApi.uncookSlot);

  if (slots.length === 0) {
    return (
      <Section title="Меню на сегодня">
        <EmptyState
          icon="🍽️"
          title="На сегодня ничего не запланировано"
          action={{ label: 'Спланировать', onClick: () => navigate('/food/menu') }}
        />
      </Section>
    );
  }

  const markCooked = async (slot: MealSlot) => {
    haptic('medium');
    const res = await cook.mutateAsync(slot.id);
    haptic('success');
    const written = res.consumed.map(c => `${c.name.toLowerCase()} ${formatQty(c.quantity, c.unit_code)}`).join(', ');
    snack(written ? `Списано: ${written}` : 'Отмечено как приготовленное', {
      action: { label: 'Отменить', onClick: () => void uncook.mutateAsync(slot.id) },
      duration: 5000,
    });
  };

  return (
    <Section title="Меню на сегодня" action={{ label: 'Неделя', onClick: () => navigate('/food/menu') }}>
      {slots.map((slot, i) => {
        const meta = SLOTS.find(s => s.key === slot.slot_key);
        const title = slot.dish_title ?? slot.custom_title ?? 'Без названия';
        const cooked = slot.cooked_at !== null;
        return (
          <ListRow
            key={slot.id}
            divider={i > 0}
            onClick={slot.dish_id ? () => navigate(`/food/recipes/${slot.dish_id}?servings=${slot.servings}`) : undefined}
            leading={<Text fz={26} lh={1} w={36} ta="center" aria-hidden>{meta?.emoji}</Text>}
            title={<span style={{ textDecoration: cooked ? 'line-through' : undefined, opacity: cooked ? 0.6 : 1 }}>{title}</span>}
            subtitle={
              <Group gap={8} component="span">
                <span>{meta?.label} · {slot.servings} порц.</span>
                {!cooked && slot.dish_id && (
                  <ReadinessBadge readiness={slot.readiness} label={readinessLabel(slot.readiness, slot.missing_count)} />
                )}
              </Group>
            }
            action={
              cooked ? (
                <Text size="xs" fw={600} style={{ color: 'var(--monty-income)' }}>Готово ✓</Text>
              ) : (
                <ActionIcon
                  variant="light"
                  radius="xl"
                  size="lg"
                  aria-label={`Приготовил: ${title}`}
                  loading={cook.isPending && cook.variables === slot.id}
                  onClick={() => void markCooked(slot)}
                >
                  <IconCheck size={18} />
                </ActionIcon>
              )
            }
          />
        );
      })}
    </Section>
  );
}

function ShoppingCard({ open, onOpen }: { open: number; onOpen: () => void }) {
  return (
    <UnstyledButton onClick={onOpen} className="monty-pressable">
      <Group justify="space-between" p="md" wrap="nowrap" style={{ borderRadius: 'var(--monty-radius-card)', background: 'var(--monty-surface)' }}>
        <Group gap="sm" wrap="nowrap">
          <Box style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--monty-accent-soft)', color: 'var(--monty-accent)' }}>
            <IconBasket size={22} />
          </Box>
          <Stack gap={0}>
            <Text fw={600}>Список покупок</Text>
            <Text size="sm" style={{ color: 'var(--monty-hint)' }}>
              {open === 0 ? 'Пока пусто' : `${open} ${open === 1 ? 'позиция' : open < 5 ? 'позиции' : 'позиций'} купить`}
            </Text>
          </Stack>
        </Group>
        <IconChevronRight size={20} style={{ color: 'var(--monty-hint)' }} />
      </Group>
    </UnstyledButton>
  );
}

function StockRow({ item, divider }: { item: PantryItem; divider: boolean }) {
  const note = stockNote(item);
  const color = note?.tone === 'danger' ? 'var(--monty-negative)' : note?.tone === 'warning' ? 'var(--monty-warning)' : 'var(--monty-hint)';
  return (
    <ListRow
      divider={divider}
      title={item.ingredient_name}
      subtitle={note ? <span style={{ color }}>{note.text}</span> : undefined}
      trailing={<Text size="sm" className="monty-tabular" style={{ color: 'var(--monty-hint)' }}>{formatQty(item.quantity, item.unit_code)}</Text>}
    />
  );
}
