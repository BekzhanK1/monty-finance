import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  Box,
  Button,
  Chip,
  Container,
  Drawer,
  Group,
  Menu,
  ScrollArea,
  Skeleton,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import {
  IconBasketPlus,
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconDots,
  IconMinus,
  IconPlus,
  IconSearch,
} from '@tabler/icons-react';
import { haptic } from '../../lib/telegram';
import { ListRow, PageHeader, Section, useSnackbar } from '../../ui';
import { foodApi } from './api';
import { useDishes, useFoodMutation, useMealCategories, useMenu } from './queries';
import { SLOTS, addDays, isoDate, parseIsoDate, readinessLabel, startOfWeek, weekDays, weekLabel } from './format';
import { ReadinessBadge } from './components/ReadinessBadge';
import type { Dish, MealSlot, SlotKey } from './types';

const dayShort = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' });
const dayLong = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

export function MenuPage() {
  const navigate = useNavigate();
  const snack = useSnackbar();
  const today = new Date();
  const [monday, setMonday] = useState(() => startOfWeek(today));
  const [selected, setSelected] = useState(() => isoDate(today));
  const [sheet, setSheet] = useState<{ date: string; key: SlotKey; slot: MealSlot | null } | null>(null);

  const days = weekDays(monday);
  const from = isoDate(days[0]);
  const to = isoDate(days[6]);
  const menuQuery = useMenu(from, to);
  const slots = useMemo(() => menuQuery.data ?? [], [menuQuery.data]);
  const toShopping = useFoodMutation(() => foodApi.shoppingFromMenu(isoDate(today) > from ? isoDate(today) : from, to));
  const copyWeek = useFoodMutation(() => foodApi.copyWeek(from));

  const byDay = useMemo(() => {
    const map = new Map<string, MealSlot[]>();
    for (const s of slots) map.set(s.slot_date, [...(map.get(s.slot_date) ?? []), s]);
    return map;
  }, [slots]);

  const shiftWeek = (delta: number) => {
    haptic('selection');
    const next = addDays(monday, delta * 7);
    setMonday(next);
    const keepToday = isoDate(startOfWeek(today)) === isoDate(next);
    setSelected(keepToday ? isoDate(today) : isoDate(next));
  };

  const daySlots = byDay.get(selected) ?? [];
  const selectedDate = parseIsoDate(selected);
  const selectedLabel = dayLong.format(selectedDate).replace(/^./, c => c.toUpperCase());

  return (
    <Container size="sm" pb="var(--monty-page-pb)">
      <PageHeader
        title="Меню"
        onBack={() => navigate('/food')}
        right={
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon variant="subtle" size="lg" radius="xl" aria-label="Действия с неделей">
                <IconDots size={20} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconCopy size={16} />}
                onClick={async () => {
                  const res = await copyWeek.mutateAsync(undefined);
                  snack(res.slots_created ? `Скопировано блюд: ${res.slots_created}` : 'На прошлой неделе нечего копировать');
                }}
              >
                Повторить прошлую неделю
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        }
      />

      {/* Week switcher */}
      <Group justify="space-between" mt="sm" wrap="nowrap">
        <ActionIcon variant="subtle" size="lg" radius="xl" aria-label="Предыдущая неделя" onClick={() => shiftWeek(-1)}>
          <IconChevronLeft size={22} />
        </ActionIcon>
        <Text fw={600}>{weekLabel(monday)}</Text>
        <ActionIcon variant="subtle" size="lg" radius="xl" aria-label="Следующая неделя" onClick={() => shiftWeek(1)}>
          <IconChevronRight size={22} />
        </ActionIcon>
      </Group>

      {/* Day strip */}
      <Group gap={6} mt="xs" grow wrap="nowrap">
        {days.map(d => {
          const iso = isoDate(d);
          const active = iso === selected;
          const isToday = iso === isoDate(today);
          const count = byDay.get(iso)?.length ?? 0;
          return (
            <UnstyledButton
              key={iso}
              onClick={() => {
                haptic('selection');
                setSelected(iso);
              }}
              aria-pressed={active}
              aria-label={`${dayLong.format(d)}, блюд: ${count}`}
              py={8}
              style={{
                borderRadius: 14,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                background: active ? 'var(--monty-accent)' : 'var(--monty-surface)',
                color: active ? 'var(--monty-accent-text)' : 'var(--monty-text)',
              }}
            >
              <Text fz={11} fw={500} tt="capitalize" style={{ color: active ? 'inherit' : 'var(--monty-hint)' }}>
                {dayShort.format(d).replace('.', '')}
              </Text>
              <Text fz={17} fw={isToday ? 800 : 600} lh={1.1} style={{ color: 'inherit' }}>{d.getDate()}</Text>
              <Box h={5} style={{ display: 'flex', gap: 2 }} aria-hidden>
                {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
                  <span key={i} style={{ width: 4, height: 4, borderRadius: 2, background: active ? 'currentColor' : 'var(--monty-accent)' }} />
                ))}
              </Box>
            </UnstyledButton>
          );
        })}
      </Group>

      <Text fw={700} fz="lg" mt="lg" mb={6} px={4}>{selectedLabel}</Text>
      {menuQuery.isPending ? (
        <Skeleton h={220} radius="lg" />
      ) : (
        <Section>
          {SLOTS.map((meta, i) => {
            const slot = daySlots.find(s => s.slot_key === meta.key) ?? null;
            const title = slot ? slot.dish_title ?? slot.custom_title ?? 'Без названия' : null;
            return (
              <ListRow
                key={meta.key}
                divider={i > 0}
                onClick={() => {
                  haptic('light');
                  setSheet({ date: selected, key: meta.key, slot });
                }}
                leading={<Text fz={26} lh={1} w={36} ta="center" aria-hidden>{meta.emoji}</Text>}
                title={title ?? <span style={{ color: 'var(--monty-hint)', fontWeight: 400 }}>{meta.label}</span>}
                subtitle={
                  slot ? (
                    <Group gap={8} component="span">
                      <span>{meta.label} · {slot.servings} порц.</span>
                      {slot.cooked_at ? (
                        <span style={{ color: 'var(--monty-income)' }}>приготовлено</span>
                      ) : slot.dish_id ? (
                        <ReadinessBadge readiness={slot.readiness} label={readinessLabel(slot.readiness, slot.missing_count)} />
                      ) : null}
                    </Group>
                  ) : undefined
                }
                trailing={!slot ? <IconPlus size={20} style={{ color: 'var(--monty-accent)' }} /> : undefined}
                chevron={!!slot}
              />
            );
          })}
        </Section>
      )}

      <Button
        mt="lg"
        fullWidth
        size="md"
        variant="light"
        leftSection={<IconBasketPlus size={20} />}
        loading={toShopping.isPending}
        disabled={slots.length === 0}
        onClick={async () => {
          const res = await toShopping.mutateAsync(undefined);
          haptic('success');
          snack(res.added ? `В список добавлено: ${res.added}` : 'Всё нужное уже есть дома или в списке', {
            action: { label: 'Открыть', onClick: () => navigate('/food/shopping') },
          });
        }}
      >
        Купить продукты на неделю
      </Button>
      <Text size="xs" ta="center" mt={6} style={{ color: 'var(--monty-hint)' }}>
        Учитывает то, что уже есть дома и в списке
      </Text>

      <SlotSheet target={sheet} onClose={() => setSheet(null)} />
    </Container>
  );
}

function SlotSheet({ target, onClose }: { target: { date: string; key: SlotKey; slot: MealSlot | null } | null; onClose: () => void }) {
  const [picking, setPicking] = useState(false);
  const meta = SLOTS.find(s => s.key === target?.key);
  const slot = target?.slot ?? null;
  const showPicker = !slot || picking;

  const close = () => {
    setPicking(false);
    onClose();
  };

  return (
    <Drawer
      opened={target !== null}
      onClose={close}
      position="bottom"
      size={showPicker ? '85%' : 'auto'}
      radius="lg"
      title={<Text fw={700} size="lg">{meta?.emoji} {meta?.label}{target ? ` · ${dayLong.format(parseIsoDate(target.date))}` : ''}</Text>}
      styles={{ body: { paddingBottom: 'calc(16px + var(--monty-safe-bottom))' } }}
    >
      {target && (showPicker ? (
        <DishPicker target={target} onDone={close} />
      ) : (
        slot && <SlotActions slot={slot} onReplace={() => setPicking(true)} onDone={close} />
      ))}
    </Drawer>
  );
}

function SlotActions({ slot, onReplace, onDone }: { slot: MealSlot; onReplace: () => void; onDone: () => void }) {
  const navigate = useNavigate();
  const snack = useSnackbar();
  const update = useFoodMutation((servings: number) => foodApi.updateSlot(slot.id, { servings }));
  const remove = useFoodMutation(() => foodApi.deleteSlot(slot.id));
  const cook = useFoodMutation(() => foodApi.cookSlot(slot.id));
  const [servings, setServings] = useState(slot.servings);

  const changeServings = (next: number) => {
    if (next < 1 || next > 50) return;
    haptic('selection');
    setServings(next);
    void update.mutateAsync(next);
  };

  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Text fz={22} fw={700}>{slot.dish_title ?? slot.custom_title}</Text>
        {slot.dish_id && !slot.cooked_at && (
          <ReadinessBadge readiness={slot.readiness} label={readinessLabel(slot.readiness, slot.missing_count)} />
        )}
      </Stack>

      <Group justify="space-between" p="sm" style={{ background: 'var(--monty-surface-2)', borderRadius: 14 }}>
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

      <Group grow>
        {slot.dish_id && (
          <Button variant="default" size="md" onClick={() => { onDone(); navigate(`/food/recipes/${slot.dish_id}?servings=${servings}`); }}>
            Рецепт
          </Button>
        )}
        <Button variant="default" size="md" onClick={onReplace}>Заменить</Button>
      </Group>
      {!slot.cooked_at && (
        <Button
          size="md"
          loading={cook.isPending}
          onClick={async () => {
            await cook.mutateAsync(undefined);
            haptic('success');
            snack('Приготовлено — продукты списаны из запасов');
            onDone();
          }}
        >
          Приготовил
        </Button>
      )}
      <Button
        variant="subtle"
        color="red"
        loading={remove.isPending}
        onClick={async () => {
          await remove.mutateAsync(undefined);
          haptic('light');
          onDone();
        }}
      >
        Убрать из меню
      </Button>
    </Stack>
  );
}

function DishPicker({ target, onDone }: { target: { date: string; key: SlotKey; slot: MealSlot | null }; onDone: () => void }) {
  const navigate = useNavigate();
  const { data: dishes = [], isPending } = useDishes();
  const { data: categories = [] } = useMealCategories();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<number | 'ready' | null>(null);
  const save = useFoodMutation(async ({ dish, title }: { dish?: Dish; title?: string }) => {
    const body = dish ? { dish_id: dish.id, custom_title: null } : { dish_id: null, custom_title: title ?? '' };
    if (target.slot) return foodApi.updateSlot(target.slot.id, body);
    return foodApi.createSlot({ slot_date: target.date, slot_key: target.key, servings: dish?.servings_default ?? 2, ...body });
  });

  // Suggest the category matching the meal (Завтрак → breakfast) first.
  const slotLabel = SLOTS.find(s => s.key === target.key)?.label.toLowerCase();
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dishes
      .filter(d => !q || d.title.toLowerCase().includes(q))
      .filter(d => category === null || (category === 'ready' ? d.pantry_status === 'ready' : d.meal_category_id === category))
      .sort((a, b) => {
        const am = categories.find(c => c.id === a.meal_category_id)?.name.toLowerCase() === slotLabel ? 0 : 1;
        const bm = categories.find(c => c.id === b.meal_category_id)?.name.toLowerCase() === slotLabel ? 0 : 1;
        return am - bm || a.title.localeCompare(b.title, 'ru');
      });
  }, [dishes, query, category, categories, slotLabel]);

  const pick = async (args: { dish?: Dish; title?: string }) => {
    haptic('success');
    await save.mutateAsync(args);
    onDone();
  };

  return (
    <Stack gap="sm">
      <TextInput
        placeholder="Найти блюдо"
        leftSection={<IconSearch size={16} />}
        value={query}
        onChange={e => setQuery(e.currentTarget.value)}
        data-autofocus
      />
      <ScrollArea type="never">
        <Group gap={6} wrap="nowrap">
          <Chip checked={category === null} onChange={() => setCategory(null)} radius="xl" size="sm">Все</Chip>
          <Chip checked={category === 'ready'} onChange={() => setCategory('ready')} radius="xl" size="sm">Всё есть дома</Chip>
          {categories.map(c => (
            <Chip key={c.id} checked={category === c.id} onChange={() => setCategory(c.id)} radius="xl" size="sm">{c.name}</Chip>
          ))}
        </Group>
      </ScrollArea>

      {isPending ? (
        <Skeleton h={200} radius="lg" />
      ) : (
        <Section>
          {query.trim() && (
            <ListRow
              leading={<Text fz={22} w={36} ta="center" aria-hidden>✏️</Text>}
              title={`«${query.trim()}»`}
              subtitle="Добавить без рецепта"
              onClick={() => void pick({ title: query.trim() })}
            />
          )}
          {filtered.map((dish, i) => (
            <ListRow
              key={dish.id}
              divider={i > 0 || !!query.trim()}
              title={dish.title}
              subtitle={<ReadinessBadge readiness={dish.ingredients.length ? dish.pantry_status : null} />}
              onClick={() => void pick({ dish })}
            />
          ))}
          {filtered.length === 0 && !query.trim() && (
            <Stack align="center" p="lg" gap="xs">
              <Text size="sm" style={{ color: 'var(--monty-hint)' }}>Нет блюд</Text>
              <Button variant="light" size="xs" onClick={() => { onDone(); navigate('/food/recipes/new'); }}>Создать рецепт</Button>
            </Stack>
          )}
        </Section>
      )}
    </Stack>
  );
}
