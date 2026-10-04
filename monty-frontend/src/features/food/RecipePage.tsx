import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ActionIcon,
  Box,
  Button,
  Chip,
  Container,
  Drawer,
  Group,
  Menu,
  Skeleton,
  Stack,
  Text,
} from '@mantine/core';
import { IconCalendarPlus, IconDots, IconMinus, IconPencil, IconPlus, IconArchive } from '@tabler/icons-react';
import { haptic } from '../../lib/telegram';
import { EmptyState, PageHeader, Section, useSnackbar } from '../../ui';
import { foodApi } from './api';
import { useWarehouseId } from './WarehouseContext';
import { useAvailability, useDishes, useFoodMutation, useMealCategories } from './queries';
import { SLOTS, addDays, formatQty, isoDate } from './format';
import { ReadinessBadge } from './components/ReadinessBadge';
import type { AvailabilityLine, Dish, SlotKey } from './types';

const LINE_MARK: Record<AvailabilityLine['status'], { icon: string; color: string }> = {
  ok: { icon: '✓', color: 'var(--monty-income)' },
  short: { icon: '◐', color: 'var(--monty-warning)' },
  none: { icon: '○', color: 'var(--monty-hint)' },
  unit_mismatch: { icon: '?', color: 'var(--monty-warning)' },
  always_home: { icon: '•', color: 'var(--monty-hint)' },
};

export function RecipePage() {
  const { id } = useParams();
  const dishId = Number(id);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data: dishes, isPending } = useDishes();
  const dish = dishes?.find(d => d.id === dishId);

  if (isPending) {
    return <Container size="sm" pt="md"><Skeleton h={300} radius="lg" /></Container>;
  }
  if (!dish) {
    return (
      <Container size="sm">
        <PageHeader title="Рецепт" onBack={() => navigate('/food/recipes')} />
        <EmptyState icon="🤷" title="Рецепт не найден" action={{ label: 'К рецептам', onClick: () => navigate('/food/recipes') }} />
      </Container>
    );
  }
  const initial = Number(params.get('servings')) || dish.servings_default;
  return <RecipeView key={dish.id} dish={dish} initialServings={initial} />;
}

function RecipeView({ dish, initialServings }: { dish: Dish; initialServings: number }) {
  const navigate = useNavigate();
  const snack = useSnackbar();
  const { data: categories = [] } = useMealCategories();
  const [servings, setServings] = useState(initialServings);
  const [planning, setPlanning] = useState(false);
  const availability = useAvailability(dish.id, servings);
  const wid = useWarehouseId();
  const cook = useFoodMutation(() => foodApi.cookDish(dish.id, wid, servings));
  const buy = useFoodMutation(() => foodApi.dishToShopping(dish.id, wid, servings));
  const archive = useFoodMutation(() => foodApi.archiveDish(dish.id));

  const category = categories.find(c => c.id === dish.meal_category_id)?.name;
  const minutes = (dish.prep_minutes ?? 0) + (dish.cook_minutes ?? 0);
  const readiness = availability.data?.readiness ?? null;
  const steps = dish.recipe_text.split(/\n+/).map(s => s.trim()).filter(Boolean);

  const changeServings = (next: number) => {
    if (next < 1 || next > 50) return;
    haptic('selection');
    setServings(next);
  };

  return (
    <Container size="sm" pb="calc(96px + var(--monty-safe-bottom))">
      <PageHeader
        title=""
        onBack={() => navigate(-1)}
        right={
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon variant="subtle" size="lg" radius="xl" aria-label="Действия с рецептом"><IconDots size={20} /></ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => navigate(`/food/recipes/${dish.id}/edit`)}>Редактировать</Menu.Item>
              <Menu.Item leftSection={<IconArchive size={16} />} color="red"
                onClick={async () => { await archive.mutateAsync(undefined); snack('Рецепт в архиве'); navigate('/food/recipes', { replace: true }); }}>
                В архив
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        }
      />

      <Stack gap={4} mt={4}>
        <Text fz={28} fw={800} lh={1.15}>{dish.title}</Text>
        <Text size="sm" style={{ color: 'var(--monty-hint)' }}>
          {[category, minutes ? `${minutes} мин` : null].filter(Boolean).join(' · ')}
        </Text>
      </Stack>

      <Group justify="space-between" mt="lg" p="sm" style={{ background: 'var(--monty-surface)', borderRadius: 14 }}>
        <Text fw={500}>Порций</Text>
        <Group gap="xs">
          <ActionIcon variant="default" radius="xl" size="lg" aria-label="Меньше порций" onClick={() => changeServings(servings - 1)} disabled={servings <= 1}>
            <IconMinus size={16} />
          </ActionIcon>
          <Text fw={700} w={28} ta="center" className="monty-tabular">{servings}</Text>
          <ActionIcon variant="default" radius="xl" size="lg" aria-label="Больше порций" onClick={() => changeServings(servings + 1)}>
            <IconPlus size={16} />
          </ActionIcon>
        </Group>
      </Group>

      <Stack gap="lg" mt="lg">
        <Section
          title={<Group gap={8} component="span"><span>Состав</span>{readiness && <ReadinessBadge readiness={readiness} />}</Group>}
          footer={dish.ingredients.length ? '✓ есть дома · ◐ не хватает · ○ нет' : undefined}
        >
          {dish.ingredients.length === 0 ? (
            <EmptyState title="Состав не указан" description="Добавьте ингредиенты — и Monty сможет собрать список покупок."
              action={{ label: 'Добавить', onClick: () => navigate(`/food/recipes/${dish.id}/edit`) }} />
          ) : availability.isPending ? (
            <Skeleton h={120} />
          ) : (
            (availability.data?.lines ?? []).map((line, i) => <IngredientLine key={`${line.ingredient_id}-${i}`} line={line} divider={i > 0} />)
          )}
        </Section>

        {steps.length > 0 && (
          <Section title="Приготовление" padded>
            <Stack gap="sm">
              {steps.map((step, i) => (
                <Group key={i} gap="sm" wrap="nowrap" align="flex-start">
                  <Box style={{ width: 24, height: 24, flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--monty-accent-soft)', color: 'var(--monty-accent)', fontSize: 13, fontWeight: 700 }}>
                    {i + 1}
                  </Box>
                  <Text style={{ whiteSpace: 'pre-wrap' }}>{step}</Text>
                </Group>
              ))}
            </Stack>
          </Section>
        )}
      </Stack>

      {/* Actions */}
      <Box style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 140, padding: '8px 16px calc(12px + var(--monty-safe-bottom))', background: 'linear-gradient(to top, var(--monty-bg) 75%, transparent)' }}>
        <Container size="sm" p={0}>
          <Group grow gap="sm">
            <Button variant="default" size="md" leftSection={<IconCalendarPlus size={18} />} onClick={() => setPlanning(true)}>В меню</Button>
            {readiness && readiness !== 'ready' ? (
              <Button size="md" loading={buy.isPending}
                onClick={async () => {
                  const res = await buy.mutateAsync(undefined);
                  haptic('success');
                  snack(res.added ? `В список добавлено: ${res.added}` : 'Всё уже в списке',
                    { action: { label: 'Открыть', onClick: () => navigate('/food/shopping') } });
                }}>
                Докупить
              </Button>
            ) : (
              <Button size="md" loading={cook.isPending} disabled={dish.ingredients.length === 0}
                onClick={async () => {
                  const res = await cook.mutateAsync(undefined);
                  haptic('success');
                  snack(res.consumed.length ? `Приготовлено — списали ${res.consumed.length} продукт(а)` : 'Приготовлено');
                }}>
                Приготовил
              </Button>
            )}
          </Group>
        </Container>
      </Box>

      <PlanSheet opened={planning} dish={dish} servings={servings} onClose={() => setPlanning(false)} />
    </Container>
  );
}

function IngredientLine({ line, divider }: { line: AvailabilityLine; divider: boolean }) {
  const mark = LINE_MARK[line.status];
  const note =
    line.status === 'short' ? `есть ${formatQty(line.have, line.unit_code)}`
    : line.status === 'unit_mismatch' ? 'дома в других единицах'
    : line.status === 'always_home' ? 'всегда дома'
    : null;
  return (
    <Group wrap="nowrap" gap={12} px={16} py={10} style={{ position: 'relative' }}>
      {divider && <Box aria-hidden style={{ position: 'absolute', top: 0, left: 44, right: 0, height: 1, transform: 'scaleY(0.5)', background: 'var(--monty-separator)' }} />}
      <Text w={16} ta="center" fw={700} style={{ color: mark.color }} aria-hidden>{mark.icon}</Text>
      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
        <Text lineClamp={1}>{line.name}</Text>
        {note && <Text size="xs" style={{ color: mark.color }}>{note}</Text>}
      </Stack>
      <Text size="sm" fw={500} className="monty-tabular" style={{ color: 'var(--monty-hint)', whiteSpace: 'nowrap' }}>
        {formatQty(line.need, line.unit_code)}
      </Text>
    </Group>
  );
}

const dayChip = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric' });

function PlanSheet({ opened, dish, servings, onClose }: { opened: boolean; dish: Dish; servings: number; onClose: () => void }) {
  const navigate = useNavigate();
  const snack = useSnackbar();
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const [day, setDay] = useState(isoDate(today));
  const [slot, setSlot] = useState<SlotKey>('dinner');
  const create = useFoodMutation(() => foodApi.createSlot({ slot_date: day, slot_key: slot, dish_id: dish.id, servings }));

  return (
    <Drawer opened={opened} onClose={onClose} position="bottom" size="auto" radius="lg"
      title={<Text fw={700} size="lg">Добавить в меню</Text>}
      styles={{ body: { paddingBottom: 'calc(16px + var(--monty-safe-bottom))' } }}>
      <Stack gap="md">
        <Group gap={6}>
          {days.map((d, i) => (
            <Chip key={isoDate(d)} checked={day === isoDate(d)} onChange={() => setDay(isoDate(d))} radius="xl" size="sm">
              {i === 0 ? 'Сегодня' : i === 1 ? 'Завтра' : dayChip.format(d)}
            </Chip>
          ))}
        </Group>
        <Group gap={6}>
          {SLOTS.map(s => (
            <Chip key={s.key} checked={slot === s.key} onChange={() => setSlot(s.key)} radius="xl" size="sm">{s.emoji} {s.label}</Chip>
          ))}
        </Group>
        <Button size="md" loading={create.isPending}
          onClick={async () => {
            await create.mutateAsync(undefined);
            haptic('success');
            snack(`«${dish.title}» в меню`, { action: { label: 'Меню', onClick: () => navigate('/food/menu') } });
            onClose();
          }}>
          Добавить · {servings} порц.
        </Button>
      </Stack>
    </Drawer>
  );
}
