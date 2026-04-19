import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Container,
  Group,
  LoadingOverlay,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { IconShoppingCart } from '@tabler/icons-react';
import { foodApi } from '../../services/food';
import type { FoodShoppingList, FoodUnit } from '../../types';
import {
  glassSectionShell,
  gradientButton,
  heroVioletShell,
  modalShellResponsive,
  PAGE_WITH_BOTTOM_NAV_PB,
} from '../../theme/dashboardChrome';
import { addDays, startOfWeekMonday, toISODate } from '../weekUtils';
import { useTelegram } from '../../hooks/useTelegram';
export function FoodShoppingPage() {
  const { colorScheme } = useMantineColorScheme();
  const { haptic } = useTelegram();
  const isNarrow = useMediaQuery('(max-width: 36em)');
  const [list, setList] = useState<FoodShoppingList | null>(null);
  const [units, setUnits] = useState<FoodUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
  const [manualLabel, setManualLabel] = useState('');
  const [manualQty, setManualQty] = useState<number | string>('');
  const [manualUnitId, setManualUnitId] = useState<string | null>(null);

  const weekRange = useMemo(() => {
    const start = startOfWeekMonday(new Date());
    const end = addDays(start, 6);
    return { from: toISODate(start), to: toISODate(end) };
  }, []);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [latest, u] = await Promise.all([foodApi.shopping.getLatest(), foodApi.units.list()]);
      setList(latest);
      setUnits(u);
      setManualUnitId(u[0] ? String(u[0].id) : null);
    } catch (e) {
      setError('Не удалось загрузить список.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const created = await foodApi.shopping.generate(weekRange.from, weekRange.to);
      setList(created);
      haptic('success');
    } catch (e) {
      setError('Не удалось собрать список. Добавьте блюда с составом в меню на эту неделю.');
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const toggleItem = async (itemId: number, checked: boolean) => {
    try {
      const updated = await foodApi.shopping.patchItem(itemId, { checked });
      setList(updated);
      haptic('light');
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualAdd = async () => {
    if (!list) return;
    const label = manualLabel.trim();
    if (!label) return;
    const qty =
      manualQty === '' || manualQty === undefined
        ? null
        : typeof manualQty === 'number'
          ? manualQty
          : Number(manualQty);
    const updated = await foodApi.shopping.addItem(list.id, {
      label,
      quantity: qty != null && Number.isFinite(qty) && qty > 0 ? qty : null,
      unit_id: manualUnitId ? Number(manualUnitId) : null,
    });
    setList(updated);
    setManualLabel('');
    setManualQty('');
    closeAdd();
    haptic('success');
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
          style={heroVioletShell(colorScheme)}
        >
          <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
            <Group gap="sm">
              <IconShoppingCart size={26} style={{ color: '#667eea' }} />
              <div>
                <Title order={3} size="h4" fw={800}>
                  Список покупок
                </Title>
                <Text size="sm" c="dimmed" mt={4}>
                  Собирается из состава блюд в меню на выбранные даты (одинаковые продукты суммируются).
                </Text>
              </div>
            </Group>
            <Button
              size="sm"
              radius="xl"
              variant="gradient"
              gradient={{ from: 'blue', to: 'violet', deg: 135 }}
              loading={generating}
              onClick={() => void handleGenerate()}
            >
              На эту неделю
            </Button>
          </Group>
          <Text size="xs" c="dimmed" mt="sm">
            Период: {weekRange.from} — {weekRange.to}
          </Text>
        </Card>

        {error && (
          <Alert color="red" variant="light" radius="lg">
            {error}
          </Alert>
        )}

        {!list && !loading ? (
          <Card withBorder radius="xl" padding="lg" style={glassSectionShell(colorScheme)}>
            <Text size="sm" c="dimmed">
              Пока нет сохранённого списка. Нажмите «На эту неделю», чтобы собрать позиции из меню (нужны блюда с
              заполненным составом).
            </Text>
          </Card>
        ) : null}

        {list ? (
          <Card shadow="md" padding="lg" radius="xl" withBorder style={glassSectionShell(colorScheme)}>
            <Group justify="space-between" mb="md" wrap="wrap">
              <Text fw={700}>{list.title}</Text>
              <Button size="xs" variant="light" radius="lg" onClick={() => openAdd()}>
                + Своя строка
              </Button>
            </Group>
            <Stack gap={0}>
              {list.items.length === 0 ? (
                <Text size="sm" c="dimmed">
                  Список пуст — в меню на эту неделю нет блюд с ингредиентами.
                </Text>
              ) : (
                list.items.map((it) => (
                  <Group
                    key={it.id}
                    wrap="nowrap"
                    py="sm"
                    style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
                    align="flex-start"
                  >
                    <Checkbox
                      checked={it.checked}
                      onChange={(e) => void toggleItem(it.id, e.currentTarget.checked)}
                      mt={4}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text fw={600} size="sm" td={it.checked ? 'line-through' : undefined} c={it.checked ? 'dimmed' : undefined}>
                        {it.label}
                      </Text>
                      {it.quantity != null && it.unit_code ? (
                        <Text size="xs" c="dimmed">
                          {it.quantity} {it.unit_code}
                        </Text>
                      ) : null}
                    </div>
                  </Group>
                ))
              )}
            </Stack>
          </Card>
        ) : null}
      </Stack>

      <Modal
        opened={addOpened}
        onClose={() => {
          haptic('light');
          closeAdd();
        }}
        title={<Text fw={700}>Своя позиция</Text>}
        {...modalShellResponsive(!!isNarrow)}
      >
        <Stack gap="md">
          <TextInput label="Название" value={manualLabel} onChange={(e) => setManualLabel(e.currentTarget.value)} radius="lg" />
          <NumberInput label="Количество (необязательно)" value={manualQty} onChange={setManualQty} min={0} radius="lg" hideControls />
          <Select
            label="Единица"
            data={units.map((u) => ({ value: String(u.id), label: `${u.name} (${u.code})` }))}
            value={manualUnitId}
            onChange={setManualUnitId}
            radius="lg"
            comboboxProps={{ withinPortal: true }}
          />
          <Button onClick={() => void handleManualAdd()} {...gradientButton} fullWidth={!!isNarrow}>
            Добавить в список
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
}
