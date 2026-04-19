import { useCallback, useEffect, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Container,
  Group,
  LoadingOverlay,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  Title,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { IconFridge, IconPlus, IconTrash } from '@tabler/icons-react';
import { foodApi } from '../../services/food';
import type { FoodIngredient, FoodPantryItem, FoodUnit } from '../../types';
import {
  glassSectionShell,
  gradientButton,
  heroVioletShell,
  insetRowShell,
  modalShellResponsive,
  PAGE_WITH_BOTTOM_NAV_PB,
} from '../../theme/dashboardChrome';
import { useTelegram } from '../../hooks/useTelegram';

export function FoodPantryPage() {
  const { colorScheme } = useMantineColorScheme();
  const { haptic } = useTelegram();
  const isNarrow = useMediaQuery('(max-width: 36em)');
  const [rows, setRows] = useState<FoodPantryItem[]>([]);
  const [ingredients, setIngredients] = useState<FoodIngredient[]>([]);
  const [units, setUnits] = useState<FoodUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [ingId, setIngId] = useState<string | null>(null);
  const [qty, setQty] = useState<number | string>(1);
  const [unitId, setUnitId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [p, ing, u] = await Promise.all([
        foodApi.pantry.list(),
        foodApi.ingredients.list(),
        foodApi.units.list(),
      ]);
      setRows(p);
      setIngredients(ing);
      setUnits(u);
      setUnitId(u[0] ? String(u[0].id) : null);
    } catch (e) {
      setError('Не удалось загрузить кладовую.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openAdd = () => {
    haptic('light');
    setIngId(ingredients[0] ? String(ingredients[0].id) : null);
    const sel = ingredients[0];
    setQty(1);
    setUnitId(sel ? String(sel.default_unit_id) : units[0] ? String(units[0].id) : null);
    open();
  };

  const submitAdd = async () => {
    if (!ingId || !unitId) return;
    const q = typeof qty === 'number' ? qty : Number(qty);
    if (!Number.isFinite(q) || q <= 0) return;
    try {
      await foodApi.pantry.upsert({
        ingredient_id: Number(ingId),
        quantity: q,
        unit_id: Number(unitId),
      });
      haptic('success');
      close();
      await load();
    } catch (e) {
      setError('Не удалось сохранить (возможно, другая единица для этого продукта уже в списке).');
      console.error(e);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm('Убрать из кладовой?')) return;
    await foodApi.pantry.delete(id);
    haptic('light');
    await load();
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
              <IconFridge size={26} style={{ color: '#667eea' }} />
              <div>
                <Title order={3} size="h4" fw={800}>
                  Кладовая
                </Title>
                <Text size="sm" c="dimmed" mt={4}>
                  Что есть дома. Позже можно будет вычитать из списка покупок.
                </Text>
              </div>
            </Group>
            <Button
              leftSection={<IconPlus size={16} />}
              size="sm"
              radius="xl"
              variant="gradient"
              gradient={{ from: 'blue', to: 'violet', deg: 135 }}
              onClick={openAdd}
            >
              Добавить
            </Button>
          </Group>
        </Card>

        {error && (
          <Alert color="red" variant="light" radius="lg" onClose={() => setError(null)} withCloseButton>
            {error}
          </Alert>
        )}

        {rows.length === 0 && !loading ? (
          <Card withBorder radius="xl" padding="lg" style={glassSectionShell(colorScheme)}>
            <Text size="sm" c="dimmed">
              Пока пусто — добавьте продукты из справочника.
            </Text>
          </Card>
        ) : null}

        <Stack gap="sm">
          {rows.map((r) => (
            <Card
              key={r.id}
              withBorder
              padding="md"
              radius="lg"
              className="hover-lift transition-all"
              style={insetRowShell(colorScheme)}
            >
              <Group justify="space-between" wrap="nowrap" gap="sm">
                <div style={{ minWidth: 0 }}>
                  <Text fw={600}>{r.ingredient_name}</Text>
                  <Text size="sm" c="dimmed">
                    {r.quantity} {r.unit_code}
                  </Text>
                  {r.note ? (
                    <Text size="xs" c="dimmed" mt={4}>
                      {r.note}
                    </Text>
                  ) : null}
                </div>
                <ActionIcon color="red" variant="light" radius="lg" aria-label="Удалить" onClick={() => void remove(r.id)}>
                  <IconTrash size={18} />
                </ActionIcon>
              </Group>
            </Card>
          ))}
        </Stack>
      </Stack>

      <Modal
        opened={opened}
        onClose={() => {
          haptic('light');
          close();
        }}
        title={<Text fw={700}>В кладовую</Text>}
        {...modalShellResponsive(!!isNarrow)}
      >
        <Stack gap="md">
          <Select
            label="Продукт"
            searchable
            data={ingredients.map((i) => ({ value: String(i.id), label: i.name }))}
            value={ingId}
            onChange={(v) => {
              setIngId(v);
              const ing = ingredients.find((x) => String(x.id) === v);
              if (ing) setUnitId(String(ing.default_unit_id));
            }}
            radius="lg"
            comboboxProps={{ withinPortal: true }}
          />
          <NumberInput label="Количество" value={qty} onChange={setQty} min={0.001} step={0.5} radius="lg" hideControls />
          <Select
            label="Единица"
            data={units.map((u) => ({ value: String(u.id), label: `${u.name} (${u.code})` }))}
            value={unitId}
            onChange={setUnitId}
            radius="lg"
            comboboxProps={{ withinPortal: true }}
          />
          <Text size="xs" c="dimmed">
            Если продукт уже есть, количество прибавится к запасу (при той же единице).
          </Text>
          <Button onClick={() => void submitAdd()} {...gradientButton} fullWidth={!!isNarrow}>
            Сохранить
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
}
