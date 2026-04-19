import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Drawer,
  Group,
  LoadingOverlay,
  Stack,
  Table,
  Text,
  Title,
  useMantineColorScheme,
} from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconNotebook } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { foodApi } from '../../services/food';
import type { FoodDish, FoodMealCategory, FoodMealSlot } from '../../types';
import {
  glassSectionShell,
  PAGE_WITH_BOTTOM_NAV_PB,
} from '../../theme/dashboardChrome';
import {
  SLOT_LABELS,
  SLOT_ORDER,
  addDays,
  slotMapKey,
  startOfWeekMonday,
  toISODate,
  weekdayLong,
} from '../weekUtils';
import { useTelegram } from '../../hooks/useTelegram';

function normalizeDish(d: FoodDish): FoodDish {
  return { ...d, ingredients: d.ingredients ?? [] };
}

export function FoodGuidePage() {
  const { colorScheme } = useMantineColorScheme();
  const { haptic } = useTelegram();
  const [weekOffset, setWeekOffset] = useState(0);
  const [slots, setSlots] = useState<FoodMealSlot[]>([]);
  const [dishes, setDishes] = useState<FoodDish[]>([]);
  const [categories, setCategories] = useState<FoodMealCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<FoodDish | null>(null);
  const [detailTitle, setDetailTitle] = useState('');

  const weekStart = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    return startOfWeekMonday(base);
  }, [weekOffset]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const slotByCell = useMemo(() => {
    const m = new Map<string, FoodMealSlot>();
    for (const s of slots) {
      const k = slotMapKey(s.slot_date, s.slot_key);
      const prev = m.get(k);
      if (!prev || prev.id < s.id) m.set(k, s);
    }
    return m;
  }, [slots]);

  const dishById = useMemo(() => {
    const m = new Map<number, FoodDish>();
    for (const d of dishes) m.set(d.id, d);
    return m;
  }, [dishes]);

  const catById = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of categories) m.set(c.id, c.name);
    return m;
  }, [categories]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = toISODate(weekDays[0]);
      const to = toISODate(weekDays[6]);
      const [sList, dList, cats] = await Promise.all([
        foodApi.menu.list(from, to),
        foodApi.dishes.list(),
        foodApi.mealCategories.list(),
      ]);
      setSlots(sList);
      setDishes(dList.map(normalizeDish));
      setCategories(cats);
    } finally {
      setLoading(false);
    }
  }, [weekDays]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDish = (slot: FoodMealSlot) => {
    haptic('light');
    setDrawerOpen(true);
    if (slot.dish_id) {
      const d = dishById.get(slot.dish_id);
      if (d) {
        setDetail(d);
        setDetailTitle(d.title);
        return;
      }
    }
    setDetail(null);
    setDetailTitle(slot.custom_title || slot.dish_title || 'Меню');
  };

  const closeDrawer = () => {
    haptic('light');
    setDrawerOpen(false);
    setDetail(null);
    setDetailTitle('');
  };

  const emeraldHero =
    colorScheme === 'dark'
      ? {
          background:
            'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.18) 50%, rgba(102, 126, 234, 0.12) 100%)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }
      : {
          background:
            'linear-gradient(135deg, rgba(236, 253, 245, 0.98) 0%, rgba(255, 255, 255, 0.95) 55%, rgba(238, 242, 255, 0.9) 100%)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
        };

  return (
    <Container size="sm" p="md" pb={PAGE_WITH_BOTTOM_NAV_PB} pos="relative">
      <LoadingOverlay visible={loading} />

      <Stack gap="lg">
        <Card
          shadow="lg"
          padding="lg"
          radius="xl"
          withBorder
          className="stagger-item hover-lift"
          style={emeraldHero}
        >
          <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
            <Group gap="sm">
              <Box
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #10b981 0%, #667eea 100%)',
                  color: '#fff',
                }}
              >
                <IconNotebook size={22} stroke={1.6} />
              </Box>
              <div>
                <Title order={2} size="h4" fw={800}>
                  Кухня на неделю
                </Title>
                <Text size="sm" c="dimmed" mt={4}>
                  Только просмотр: меню и рецепты. Редактирование — в «Каталог» и «Меню».
                </Text>
              </div>
            </Group>
            <Group gap={6} wrap="nowrap">
              <Button
                variant="light"
                size="compact-sm"
                radius="xl"
                px="xs"
                onClick={() => {
                  haptic('light');
                  setWeekOffset((w) => w - 1);
                }}
              >
                <IconChevronLeft size={18} />
              </Button>
              <Text size="xs" fw={600} style={{ whiteSpace: 'nowrap' }}>
                {toISODate(weekDays[0])} — {toISODate(weekDays[6])}
              </Text>
              <Button
                variant="light"
                size="compact-sm"
                radius="xl"
                px="xs"
                onClick={() => {
                  haptic('light');
                  setWeekOffset((w) => w + 1);
                }}
              >
                <IconChevronRight size={18} />
              </Button>
              <Button variant="default" size="compact-xs" radius="lg" onClick={() => setWeekOffset(0)}>
                Сегодня
              </Button>
            </Group>
          </Group>
        </Card>

        {weekDays.map((day) => {
          const ds = toISODate(day);
          return (
            <Card
              key={ds}
              shadow="md"
              padding="lg"
              radius="xl"
              withBorder
              className="stagger-item"
              style={glassSectionShell(colorScheme)}
            >
              <Text fw={800} size="md" tt="capitalize" mb="sm">
                {weekdayLong(day)}{' '}
                <Text span c="dimmed" size="sm" fw={500}>
                  {day.getDate()}.{String(day.getMonth() + 1).padStart(2, '0')}
                </Text>
              </Text>
              <Stack gap="xs">
                {SLOT_ORDER.map((sk) => {
                  const slot = slotByCell.get(slotMapKey(ds, sk));
                  const label = SLOT_LABELS[sk];
                  const title =
                    slot?.dish_id && dishById.get(slot.dish_id)
                      ? dishById.get(slot.dish_id)!.title
                      : slot?.custom_title || slot?.dish_title || null;
                  return (
                    <Group
                      key={sk}
                      justify="space-between"
                      wrap="nowrap"
                      gap="sm"
                      py={6}
                      style={{
                        borderBottom: '1px solid rgba(0,0,0,0.06)',
                      }}
                    >
                      <Badge variant="light" color="teal" size="sm" radius="md" style={{ flex: '0 0 auto' }}>
                        {label}
                      </Badge>
                      {title && slot ? (
                        <Button
                          variant="subtle"
                          color="dark"
                          size="compact-sm"
                          radius="md"
                          onClick={() => openDish(slot)}
                          styles={{
                            root: { flex: 1, minWidth: 0, height: 'auto', paddingInline: 8 },
                            label: { whiteSpace: 'normal', textAlign: 'right', fontWeight: 600 },
                          }}
                        >
                          {title}
                        </Button>
                      ) : (
                        <Text size="sm" c="dimmed" style={{ flex: 1, textAlign: 'right' }}>
                          —
                        </Text>
                      )}
                    </Group>
                  );
                })}
              </Stack>
            </Card>
          );
        })}

        <Button component={Link} to="/food/catalog" variant="light" color="violet" radius="xl" fullWidth>
          Открыть каталог блюд
        </Button>
      </Stack>

      <Drawer
        opened={drawerOpen}
        onClose={closeDrawer}
        position="bottom"
        size="92%"
        radius="xl"
        padding="lg"
        title={
          <Text fw={800} size="lg" pr="md">
            {detail?.title ?? detailTitle}
          </Text>
        }
        styles={{
          body: { paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' },
          header: { paddingBottom: 8 },
        }}
      >
        {detail ? (
          <Stack gap="md">
            <Group gap="xs">
              <Badge color="violet" variant="light" radius="md">
                {catById.get(detail.meal_category_id) ?? 'Категория'}
              </Badge>
              {detail.servings_default ? (
                <Badge variant="outline" color="gray" radius="md">
                  {detail.servings_default} порций
                </Badge>
              ) : null}
            </Group>
            {detail.description ? (
              <Text size="sm" c="dimmed">
                {detail.description}
              </Text>
            ) : null}
            <Divider label="Состав" labelPosition="left" />
            {detail.ingredients.length ? (
              <Table striped highlightOnHover withTableBorder withColumnBorders verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Продукт</Table.Th>
                    <Table.Th style={{ width: 100 }}>Кол-во</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {[...detail.ingredients]
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((line) => (
                      <Table.Tr key={line.id}>
                        <Table.Td>
                          <Text size="sm" fw={500}>
                            {line.ingredient_name}
                          </Text>
                          {line.is_optional ? (
                            <Text size="xs" c="dimmed">
                              по желанию
                            </Text>
                          ) : null}
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">
                            {line.quantity} {line.unit_code}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                </Table.Tbody>
              </Table>
            ) : (
              <Text size="sm" c="dimmed">
                Состав не заполнен — только текст рецепта ниже.
              </Text>
            )}
            <Divider label="Рецепт" labelPosition="left" />
            <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
              {detail.recipe_text?.trim() || '—'}
            </Text>
          </Stack>
        ) : (
          <Text size="sm" c="dimmed">
            Для этого слота нет карточки блюда в каталоге — отображается только название из меню.
          </Text>
        )}
      </Drawer>
    </Container>
  );
}
