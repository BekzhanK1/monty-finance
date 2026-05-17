import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
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
  const [draftSaving, setDraftSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [applyingPantry, setApplyingPantry] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState<Record<number, string>>({});
  const [addOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
  const [regenOpened, { open: openRegen, close: closeRegen }] = useDisclosure(false);
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
      setPriceDraft(
        Object.fromEntries(
          (latest?.items ?? []).map((it) => [
            it.id,
            it.actual_price != null ? String(it.actual_price) : '',
          ]),
        ),
      );
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

  const runGenerate = async (mode: 'new' | 'merge_draft') => {
    setGenerating(true);
    setError(null);
    try {
      const created = await foodApi.shopping.generate(weekRange.from, weekRange.to, mode);
      setList(created);
      haptic('success');
      closeRegen();
    } catch (e) {
      setError(
        mode === 'merge_draft'
          ? 'Не удалось обновить черновик. Нужен список со статусом «черновик».'
          : 'Не удалось собрать список. Добавьте блюда с составом в меню на эту неделю.',
      );
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateClick = () => {
    if (list && (list.status === 'active' || list.status === 'draft')) {
      openRegen();
      return;
    }
    void runGenerate('new');
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

  const saveItemPrice = async (itemId: number) => {
    const raw = priceDraft[itemId]?.trim() ?? '';
    const parsed = raw === '' ? null : Number(raw.replace(',', '.'));
    if (parsed != null && (!Number.isFinite(parsed) || parsed < 0)) return;
    try {
      const updated = await foodApi.shopping.patchItem(itemId, { actual_price: parsed });
      setList(updated);
      haptic('light');
    } catch (e) {
      console.error(e);
    }
  };

  const handleToDraft = async () => {
    if (!list || list.status !== 'active' || list.linked_transaction_id) return;
    setDraftSaving(true);
    setError(null);
    try {
      const updated = await foodApi.shopping.updateList(list.id, { status: 'draft' });
      setList(updated);
      haptic('success');
    } catch (e) {
      setError('Не удалось перевести список в черновик.');
      console.error(e);
    } finally {
      setDraftSaving(false);
    }
  };

  const handleCompleteList = async () => {
    if (!list) return;
    if (!window.confirm('Отметить список как завершённый (без записи в Finance)?')) return;
    try {
      const updated = await foodApi.shopping.updateList(list.id, { status: 'done' });
      setList(updated);
      haptic('success');
    } catch (e) {
      setError('Не удалось завершить список.');
      console.error(e);
    }
  };

  const handleFinalize = async () => {
    if (!list) return;
    if (!window.confirm('Создать одну трату в Finance на сумму позиций с ценами?')) return;
    setFinalizing(true);
    setError(null);
    try {
      const result = await foodApi.shopping.finalize(list.id);
      setList(result.list);
      haptic('success');
    } catch (e) {
      setError('Не удалось оформить в Finance. Укажите цены и попробуйте снова.');
      console.error(e);
    } finally {
      setFinalizing(false);
    }
  };

  const handleApplyToPantry = async () => {
    if (!list) return;
    setApplyingPantry(true);
    setError(null);
    try {
      const updated = await foodApi.shopping.applyToPantry(list.id);
      setList(updated);
      haptic('success');
    } catch (e) {
      setError('Не удалось перенести отмеченные позиции на склад.');
      console.error(e);
    } finally {
      setApplyingPantry(false);
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
              onClick={handleGenerateClick}
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

        {list?.status === 'done' && !list.linked_transaction_id ? (
          <Alert color="gray" variant="light" radius="lg">
            Список завершён. Сгенерируйте новый из меню или откройте архив позже.
          </Alert>
        ) : null}

        {list ? (
          <Card shadow="md" padding="lg" radius="xl" withBorder style={glassSectionShell(colorScheme)} opacity={list.status === 'done' ? 0.85 : 1}>
            <Group justify="space-between" mb="md" wrap="wrap">
              <div>
                <Text fw={700}>{list.title}</Text>
                {list.linked_transaction_id ? (
                  <Text size="xs" c="dimmed">
                    Оформлено в Finance
                  </Text>
                ) : null}
              </div>
              <Group gap="xs">
                <Button size="xs" variant="light" radius="lg" onClick={() => openAdd()}>
                  + Своя строка
                </Button>
                {!list.linked_transaction_id && list.status === 'active' ? (
                  <>
                    <Button
                      size="xs"
                      variant="light"
                      color="teal"
                      radius="lg"
                      loading={applyingPantry}
                      onClick={() => void handleApplyToPantry()}
                    >
                      На склад
                    </Button>
                    <Button
                      size="xs"
                      variant="light"
                      color="violet"
                      radius="lg"
                      loading={draftSaving}
                      onClick={() => void handleToDraft()}
                    >
                      В черновик
                    </Button>
                    <Button
                      size="xs"
                      variant="light"
                      color="gray"
                      radius="lg"
                      onClick={() => void handleCompleteList()}
                    >
                      Завершить
                    </Button>
                    <Button
                      size="xs"
                      variant="gradient"
                      gradient={{ from: 'blue', to: 'violet', deg: 135 }}
                      radius="lg"
                      loading={finalizing}
                      onClick={() => void handleFinalize()}
                    >
                      В Finance
                    </Button>
                  </>
                ) : null}
              </Group>
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
                      <Group gap={6} wrap="wrap">
                        <Text
                          fw={600}
                          size="sm"
                          td={it.checked ? 'line-through' : undefined}
                          c={it.checked ? 'dimmed' : undefined}
                        >
                          {it.label}
                        </Text>
                        {it.unit_mismatch ? (
                          <Badge size="xs" color="orange" variant="light">
                            единицы
                          </Badge>
                        ) : null}
                      </Group>
                      {it.quantity != null && it.unit_code ? (
                        <Text size="xs" c="dimmed">
                          {it.quantity} {it.unit_code}
                        </Text>
                      ) : null}
                    </div>
                    <NumberInput
                      placeholder="₸"
                      value={priceDraft[it.id] ?? ''}
                      onChange={(v) =>
                        setPriceDraft((prev) => ({
                          ...prev,
                          [it.id]: v === '' || v === undefined ? '' : String(v),
                        }))
                      }
                      onBlur={() => void saveItemPrice(it.id)}
                      min={0}
                      hideControls
                      size="xs"
                      w={72}
                      radius="md"
                      disabled={!!list.linked_transaction_id}
                    />
                  </Group>
                ))
              )}
            </Stack>
            {(list.total_amount ?? 0) > 0 ? (
              <Text fw={700} size="sm" mt="md" ta="right">
                Итого: {Math.round(list.total_amount ?? 0)} ₸
              </Text>
            ) : null}
          </Card>
        ) : null}
      </Stack>

      <Modal
        opened={regenOpened}
        onClose={() => {
          haptic('light');
          closeRegen();
        }}
        title={<Text fw={700}>Список уже есть</Text>}
        {...modalShellResponsive(!!isNarrow)}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Как обновить покупки из меню на {weekRange.from} — {weekRange.to}?
          </Text>
          <Button
            onClick={() => void runGenerate('new')}
            loading={generating}
            {...gradientButton}
            fullWidth={!!isNarrow}
          >
            Создать новый список
          </Button>
          <Text size="xs" c="dimmed">
            Текущий активный список будет завершён; ручные строки не переносятся.
          </Text>
          <Button
            variant="light"
            color="violet"
            radius="xl"
            disabled={list?.status !== 'draft'}
            loading={generating}
            onClick={() => void runGenerate('merge_draft')}
            fullWidth={!!isNarrow}
          >
            Обновить черновик
          </Button>
          {list?.status === 'active' ? (
            <Text size="xs" c="dimmed">
              Чтобы обновить список из меню и сохранить свои строки: нажмите «В черновик» на карточке списка, затем
              «Обновить черновик».
            </Text>
          ) : list?.status !== 'draft' ? (
            <Text size="xs" c="dimmed">
              Доступно только для списка в статусе «черновик».
            </Text>
          ) : (
            <Text size="xs" c="dimmed">
              Позиции из меню пересоберутся; свои строки без продукта из справочника останутся.
            </Text>
          )}
          <Button variant="default" radius="xl" onClick={closeRegen} fullWidth={!!isNarrow}>
            Отмена
          </Button>
        </Stack>
      </Modal>

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
