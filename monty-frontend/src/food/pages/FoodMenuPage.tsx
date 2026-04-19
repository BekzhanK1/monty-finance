import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
  ActionIcon,
  Button,
  Card,
  Container,
  Group,
  LoadingOverlay,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  useMantineColorScheme,
} from '@mantine/core';
import { IconCalendarEvent, IconChevronLeft, IconChevronRight, IconTrash } from '@tabler/icons-react';
import { foodApi } from '../../services/food';
import type { FoodDish, FoodMealSlot, FoodSlotKey } from '../../types';
import {
  SLOT_LABELS,
  SLOT_ORDER,
  addDays,
  slotMapKey,
  startOfWeekMonday,
  toISODate,
  weekdayShort,
} from '../weekUtils';
import {
  PAGE_WITH_BOTTOM_NAV_PB,
  gradientButton,
  heroVioletShell,
  modalShellResponsive,
} from '../../theme/dashboardChrome';
import { useTelegram } from '../../hooks/useTelegram';

function normalizeDish(d: FoodDish): FoodDish {
  return { ...d, ingredients: d.ingredients ?? [] };
}

type MenuModalState =
  | { mode: 'new'; date: string; slot_key: FoodSlotKey }
  | { mode: 'edit'; slot: FoodMealSlot };

export function FoodMenuPage() {
  const { colorScheme } = useMantineColorScheme();
  const { haptic } = useTelegram();
  const isNarrow = useMediaQuery('(max-width: 36em)');
  const [weekOffset, setWeekOffset] = useState(0);
  const [dishes, setDishes] = useState<FoodDish[]>([]);
  const [slots, setSlots] = useState<FoodMealSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuModal, setMenuModal] = useState<MenuModalState | null>(null);
  const [dishSelect, setDishSelect] = useState<string | null>(null);
  const [opened, { open, close }] = useDisclosure(false);

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

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const from = toISODate(weekDays[0]);
      const to = toISODate(weekDays[6]);
      const [dList, sList] = await Promise.all([
        foodApi.dishes.list(),
        foodApi.menu.list(from, to),
      ]);
      setDishes(dList.map(normalizeDish));
      setSlots(sList);
    } catch (e) {
      setError('Не удалось загрузить меню.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [weekDays]);

  useEffect(() => {
    void load();
  }, [load]);

  const dishSelectData = useMemo(
    () => dishes.map((d) => ({ value: String(d.id), label: d.title })),
    [dishes],
  );

  const openCell = (dateStr: string, slot_key: FoodSlotKey) => {
    haptic('light');
    const existing = slotByCell.get(slotMapKey(dateStr, slot_key));
    if (existing) {
      setMenuModal({ mode: 'edit', slot: existing });
      setDishSelect(existing.dish_id != null ? String(existing.dish_id) : null);
    } else {
      setMenuModal({ mode: 'new', date: dateStr, slot_key });
      setDishSelect(null);
    }
    open();
  };

  const closeModal = () => {
    haptic('light');
    setMenuModal(null);
    close();
  };

  const saveModal = async () => {
    if (!menuModal) return;
    if (!dishSelect) {
      if (menuModal.mode === 'edit') {
        await foodApi.menu.updateSlot(menuModal.slot.id, { dish_id: null });
        haptic('success');
      }
      closeModal();
      await load();
      return;
    }
    const dish_id = Number(dishSelect);
    if (menuModal.mode === 'new') {
      await foodApi.menu.createSlot({
        slot_date: menuModal.date,
        slot_key: menuModal.slot_key,
        dish_id,
      });
    } else {
      await foodApi.menu.updateSlot(menuModal.slot.id, { dish_id });
    }
    haptic('success');
    closeModal();
    await load();
  };

  const deleteSlot = async () => {
    if (!menuModal || menuModal.mode !== 'edit') return;
    if (!window.confirm('Убрать ячейку из меню?')) return;
    await foodApi.menu.deleteSlot(menuModal.slot.id);
    haptic('light');
    closeModal();
    await load();
  };

  const cellLabel = (dateStr: string, slot_key: FoodSlotKey) => {
    const s = slotByCell.get(slotMapKey(dateStr, slot_key));
    if (!s) return '—';
    if (s.dish_title) return s.dish_title;
    if (s.custom_title) return s.custom_title;
    return '—';
  };

  return (
    <Container size="md" p="md" pb={PAGE_WITH_BOTTOM_NAV_PB}>
      <Stack gap="md">
        <Card
          shadow="lg"
          padding="lg"
          radius="xl"
          withBorder
          className="stagger-item hover-lift"
          style={heroVioletShell(colorScheme)}
        >
          <Group justify="space-between" wrap="wrap" gap="sm">
            <Group gap="xs">
              <IconCalendarEvent size={24} style={{ color: '#667eea' }} />
              <div>
                <Text fw={700} size="lg">
                  План недели
                </Text>
                <Text size="sm" c="dimmed">
                  Нажмите на ячейку, чтобы назначить блюдо из каталога
                </Text>
              </div>
            </Group>
            <Group gap="xs">
              <ActionIcon
                variant="light"
                radius="lg"
                aria-label="Предыдущая неделя"
                onClick={() => {
                  haptic('light');
                  setWeekOffset((w) => w - 1);
                }}
              >
                <IconChevronLeft size={20} />
              </ActionIcon>
              <Text size="sm" fw={600}>
                {toISODate(weekDays[0])} — {toISODate(weekDays[6])}
              </Text>
              <ActionIcon
                variant="light"
                radius="lg"
                aria-label="Следующая неделя"
                onClick={() => {
                  haptic('light');
                  setWeekOffset((w) => w + 1);
                }}
              >
                <IconChevronRight size={20} />
              </ActionIcon>
              <Button size="xs" variant="default" radius="lg" onClick={() => setWeekOffset(0)}>
                Сегодня
              </Button>
            </Group>
          </Group>
        </Card>

        {error && (
          <Text size="sm" c="red">
            {error}
          </Text>
        )}

        <Card withBorder radius="xl" shadow="sm" pos="relative" style={{ overflowX: 'auto' }}>
          <LoadingOverlay visible={loading} />
          <Table striped highlightOnHover horizontalSpacing="sm" verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th />
                {weekDays.map((d) => (
                  <Table.Th key={toISODate(d)} style={{ whiteSpace: 'nowrap' }}>
                    <Text size="xs" fw={700}>
                      {weekdayShort(d)}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {d.getDate()}.{d.getMonth() + 1}
                    </Text>
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {SLOT_ORDER.map((sk) => (
                <Table.Tr key={sk}>
                  <Table.Td>
                    <Text size="sm" fw={600}>
                      {SLOT_LABELS[sk]}
                    </Text>
                  </Table.Td>
                  {weekDays.map((d) => {
                    const ds = toISODate(d);
                    return (
                      <Table.Td key={`${ds}-${sk}`}>
                        <Button
                          variant="light"
                          color="gray"
                          size="compact-xs"
                          radius="md"
                          fullWidth
                          styles={{ label: { whiteSpace: 'normal', textAlign: 'left' } }}
                          onClick={() => openCell(ds, sk)}
                        >
                          {cellLabel(ds, sk)}
                        </Button>
                      </Table.Td>
                    );
                  })}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      </Stack>

      <Modal
        opened={opened}
        onClose={closeModal}
        title={<Text fw={700}>Блюдо в меню</Text>}
        {...modalShellResponsive(!!isNarrow)}
      >
        <Stack gap="md">
          <Select
            label="Блюдо из каталога"
            placeholder="Не выбрано"
            searchable
            clearable
            data={dishSelectData}
            value={dishSelect}
            onChange={setDishSelect}
            radius="lg"
            comboboxProps={{ withinPortal: true }}
          />
          {isNarrow ? (
            <Stack gap="sm">
              <Button onClick={() => void saveModal()} {...gradientButton} fullWidth>
                Сохранить
              </Button>
              <Button variant="default" onClick={closeModal} fullWidth radius="xl">
                Отмена
              </Button>
            </Stack>
          ) : (
            <Group grow>
              <Button variant="default" onClick={closeModal} radius="xl">
                Отмена
              </Button>
              <Button onClick={() => void saveModal()} {...gradientButton}>
                Сохранить
              </Button>
            </Group>
          )}
          {menuModal?.mode === 'edit' ? (
            <Button
              color="red"
              variant="light"
              leftSection={<IconTrash size={16} />}
              onClick={() => void deleteSlot()}
              fullWidth={!!isNarrow}
              radius="xl"
            >
              Удалить ячейку
            </Button>
          ) : null}
        </Stack>
      </Modal>
    </Container>
  );
}
