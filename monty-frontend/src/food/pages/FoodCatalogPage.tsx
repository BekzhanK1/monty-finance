import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Divider,
  Group,
  LoadingOverlay,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
  IconBook2,
  IconFolderPlus,
  IconPencil,
  IconPlus,
  IconToolsKitchen2,
  IconTrash,
} from '@tabler/icons-react';
import { foodApi, formatIngredientSummary, type FoodDishIngredientPayload } from '../../services/food';
import type { FoodDish, FoodDishIngredientLine, FoodIngredient, FoodMealCategory, FoodUnit } from '../../types';
import { useTelegram } from '../../hooks/useTelegram';
import {
  dishFormModalProps,
  glassSectionShell,
  gradientButton,
  heroVioletShell,
  insetRowShell,
  modalShellResponsive,
  PAGE_WITH_BOTTOM_NAV_PB,
} from '../../theme/dashboardChrome';

type IngDraftRow = {
  key: string;
  ingredientId: string | null;
  quantity: string;
  unitId: string | null;
};

function newRowKey() {
  return globalThis.crypto?.randomUUID?.() ?? `r-${Date.now()}-${Math.random()}`;
}

function normalizeDish(d: FoodDish): FoodDish {
  return {
    ...d,
    ingredients: d.ingredients ?? [],
    description: d.description ?? null,
    servings_default: d.servings_default ?? 4,
    is_archived: d.is_archived ?? false,
    prep_minutes: d.prep_minutes ?? null,
    cook_minutes: d.cook_minutes ?? null,
    updated_at: d.updated_at ?? null,
  };
}

function emptyIngredientRow(defaultUnitId: string | null): IngDraftRow {
  return { key: newRowKey(), ingredientId: null, quantity: '1', unitId: defaultUnitId };
}

function rowsFromLines(lines: FoodDishIngredientLine[] | undefined, defaultUnitId: string | null): IngDraftRow[] {
  const sorted = [...(lines ?? [])].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  if (!sorted.length) return [emptyIngredientRow(defaultUnitId)];
  return sorted.map((line) => ({
    key: `line-${line.id}`,
    ingredientId: String(line.ingredient_id),
    quantity: String(line.quantity),
    unitId: String(line.unit_id),
  }));
}

function buildIngredientPayload(rows: IngDraftRow[]): FoodDishIngredientPayload[] {
  const out: FoodDishIngredientPayload[] = [];
  let order = 0;
  for (const r of rows) {
    if (!r.ingredientId || !r.unitId) continue;
    const q = Number(String(r.quantity).replace(',', '.'));
    if (!Number.isFinite(q) || q <= 0) continue;
    out.push({
      ingredient_id: Number(r.ingredientId),
      quantity: q,
      unit_id: Number(r.unitId),
      sort_order: order++,
    });
  }
  return out;
}

type IngredientEditorProps = {
  units: FoodUnit[];
  ingredients: FoodIngredient[];
  rows: IngDraftRow[];
  setRows: Dispatch<SetStateAction<IngDraftRow[]>>;
  onOpenNewIngredient: () => void;
  isNarrow: boolean;
};

function IngredientEditor({
  units,
  ingredients,
  rows,
  setRows,
  onOpenNewIngredient,
  isNarrow,
}: IngredientEditorProps) {
  const unitData = useMemo(
    () => units.map((u) => ({ value: String(u.id), label: `${u.name} (${u.code})` })),
    [units],
  );
  const ingData = useMemo(
    () => ingredients.map((i) => ({ value: String(i.id), label: i.name })),
    [ingredients],
  );

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="xs">
        <Text fw={600} size="sm" style={{ flex: '1 1 140px' }}>
          Состав (опционально)
        </Text>
        <Button
          size="xs"
          variant="light"
          radius="lg"
          onClick={onOpenNewIngredient}
          style={{ flex: isNarrow ? '1 1 100%' : '0 0 auto', alignSelf: isNarrow ? 'stretch' : 'center' }}
        >
          Новый продукт
        </Button>
      </Group>
      {rows.map((row, idx) => (
        <Card key={row.key} withBorder padding="sm" radius="md" variant="light">
          <Stack gap="xs">
            <Select
              label={idx === 0 ? 'Продукт' : undefined}
              placeholder="Выберите"
              searchable
              clearable
              data={ingData}
              value={row.ingredientId}
              onChange={(v) =>
                setRows((prev) =>
                  prev.map((p) => (p.key === row.key ? { ...p, ingredientId: v } : p)),
                )
              }
              size="sm"
              radius="md"
              comboboxProps={{ withinPortal: true }}
            />
            <Group align="flex-end" wrap="wrap" gap="xs" justify="space-between">
              <NumberInput
                label={idx === 0 ? 'Кол-во' : undefined}
                min={0.001}
                step={0.5}
                value={Number(row.quantity.replace(',', '.')) || undefined}
                onChange={(v) =>
                  setRows((prev) =>
                    prev.map((p) => (p.key === row.key ? { ...p, quantity: v != null ? String(v) : '' } : p)),
                  )
                }
                style={{ flex: '1 1 96px', minWidth: 88, maxWidth: isNarrow ? '100%' : 120 }}
                size="sm"
                radius="md"
                hideControls
              />
              <Select
                label={idx === 0 ? 'Единица' : undefined}
                data={unitData}
                value={row.unitId}
                onChange={(v) =>
                  setRows((prev) => prev.map((p) => (p.key === row.key ? { ...p, unitId: v } : p)))
                }
                style={{ flex: '2 1 140px', minWidth: 120, maxWidth: '100%' }}
                size="sm"
                radius="md"
                comboboxProps={{ withinPortal: true }}
              />
              <ActionIcon
                variant="subtle"
                color="red"
                radius="md"
                aria-label="Удалить строку"
                size="lg"
                onClick={() =>
                  setRows((prev) => (prev.length <= 1 ? prev : prev.filter((p) => p.key !== row.key)))
                }
              >
                <IconTrash size={18} />
              </ActionIcon>
            </Group>
          </Stack>
        </Card>
      ))}
      <Button
        size="xs"
        variant="default"
        radius="lg"
        leftSection={<IconPlus size={14} />}
        onClick={() =>
          setRows((prev) => [...prev, emptyIngredientRow(prev[prev.length - 1]?.unitId ?? unitData[0]?.value ?? null)])
        }
      >
        Строка состава
      </Button>
    </Stack>
  );
}

export function FoodCatalogPage() {
  const { colorScheme } = useMantineColorScheme();
  const { haptic } = useTelegram();
  const isNarrow = useMediaQuery('(max-width: 36em)');
  const [categories, setCategories] = useState<FoodMealCategory[]>([]);
  const [dishes, setDishes] = useState<FoodDish[]>([]);
  const [units, setUnits] = useState<FoodUnit[]>([]);
  const [ingredients, setIngredients] = useState<FoodIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [catOpened, { open: openCat, close: closeCat }] = useDisclosure(false);
  const [dishOpened, { open: openDish, close: closeDish }] = useDisclosure(false);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [newIngOpened, { open: openNewIng, close: closeNewIng }] = useDisclosure(false);

  const [newCatName, setNewCatName] = useState('');
  const [dishTitle, setDishTitle] = useState('');
  const [dishRecipe, setDishRecipe] = useState('');
  const [dishCategoryId, setDishCategoryId] = useState<string | null>(null);
  const [editingDish, setEditingDish] = useState<FoodDish | null>(null);
  const [ingRows, setIngRows] = useState<IngDraftRow[]>([]);
  const [newIngName, setNewIngName] = useState('');
  const [newIngUnitId, setNewIngUnitId] = useState<string | null>(null);

  const defaultUnitIdStr = units[0] ? String(units[0].id) : null;

  const load = useCallback(async () => {
    setError(null);
    try {
      const [cats, allDishes, u, ing] = await Promise.all([
        foodApi.mealCategories.list(),
        foodApi.dishes.list(),
        foodApi.units.list(),
        foodApi.ingredients.list(),
      ]);
      setCategories(cats);
      setDishes(allDishes.map(normalizeDish));
      setUnits(u);
      setIngredients(ing);
      setDishCategoryId((prev) => prev ?? (cats[0] ? String(cats[0].id) : null));
      setNewIngUnitId((prev) => prev ?? (u[0] ? String(u[0].id) : null));
    } catch (e) {
      setError('Не удалось загрузить данные. Проверьте, что backend запущен.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openAddDishModal = () => {
    haptic('light');
    setDishTitle('');
    setDishRecipe('');
    setIngRows([emptyIngredientRow(defaultUnitIdStr)]);
    openDish();
  };

  const handleAddCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    await foodApi.mealCategories.create({
      name,
      sort_order: categories.length ? Math.max(...categories.map((c) => c.sort_order)) + 1 : 0,
    });
    setNewCatName('');
    closeCat();
    haptic('success');
    await load();
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('Удалить категорию и все блюда в ней?')) return;
    await foodApi.mealCategories.delete(id);
    haptic('light');
    await load();
  };

  const handleAddDish = async () => {
    const title = dishTitle.trim();
    if (!title || !dishCategoryId) return;
    const payload = buildIngredientPayload(ingRows);
    const created = await foodApi.dishes.create({
      title,
      recipe_text: dishRecipe,
      meal_category_id: Number(dishCategoryId),
    });
    if (payload.length) {
      await foodApi.dishes.replaceIngredients(created.id, payload);
    }
    setDishTitle('');
    setDishRecipe('');
    closeDish();
    haptic('success');
    await load();
  };

  const startEdit = (d: FoodDish) => {
    haptic('light');
    const nd = normalizeDish(d);
    setEditingDish(nd);
    setDishTitle(nd.title);
    setDishRecipe(nd.recipe_text);
    setDishCategoryId(String(nd.meal_category_id));
    setIngRows(rowsFromLines(nd.ingredients, defaultUnitIdStr));
    openEdit();
  };

  const handleSaveEdit = async () => {
    if (!editingDish) return;
    const title = dishTitle.trim();
    if (!title || !dishCategoryId) return;
    await foodApi.dishes.update(editingDish.id, {
      title,
      recipe_text: dishRecipe,
      meal_category_id: Number(dishCategoryId),
    });
    await foodApi.dishes.replaceIngredients(editingDish.id, buildIngredientPayload(ingRows));
    setEditingDish(null);
    closeEdit();
    haptic('success');
    await load();
  };

  const handleDeleteDish = async (id: number) => {
    if (!window.confirm('Удалить блюдо?')) return;
    await foodApi.dishes.delete(id);
    haptic('light');
    await load();
  };

  const handleCreateIngredient = async () => {
    const name = newIngName.trim();
    if (!name || !newIngUnitId) return;
    const row = await foodApi.ingredients.create({ name, default_unit_id: Number(newIngUnitId) });
    setIngredients((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
    setNewIngName('');
    closeNewIng();
    haptic('success');
  };

  if (loading) {
    return (
      <Container size="sm" p="md" pos="relative" style={{ minHeight: 320 }}>
        <LoadingOverlay visible />
      </Container>
    );
  }

  return (
    <Container size="sm" p="md" pb={PAGE_WITH_BOTTOM_NAV_PB}>
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
            <Group gap="xs">
              <IconBook2 size={24} style={{ color: '#667eea' }} />
              <div>
                <Text fw={700} size="lg">
                  Каталог блюд
                </Text>
                <Text size="sm" c="dimmed">
                  Категории, рецепт текстом и состав для списков покупок
                </Text>
              </div>
            </Group>
            <Group gap="xs">
              <Button
                size="sm"
                radius="xl"
                variant="light"
                color="gray"
                leftSection={<IconFolderPlus size={16} />}
                onClick={() => {
                  haptic('light');
                  openCat();
                }}
              >
                Категория
              </Button>
              <Button
                size="sm"
                radius="xl"
                variant="gradient"
                gradient={{ from: 'blue', to: 'violet', deg: 135 }}
                leftSection={<IconPlus size={16} />}
                onClick={openAddDishModal}
              >
                Блюдо
              </Button>
            </Group>
          </Group>
        </Card>

        {error && (
          <Alert color="red" title="Ошибка" radius="lg" variant="light">
            {error}
          </Alert>
        )}

        {categories.map((cat) => {
          const inCat = dishes.filter((d) => d.meal_category_id === cat.id);
          return (
            <Card
              key={cat.id}
              shadow="md"
              padding="lg"
              radius="xl"
              withBorder
              className="stagger-item"
              style={glassSectionShell(colorScheme)}
            >
              <Group justify="space-between" mb="md" wrap="nowrap">
                <Text fw={700} size="md">
                  {cat.name}
                </Text>
                <Group gap="xs" wrap="nowrap">
                  <Badge size="md" variant="light" color="violet">
                    {inCat.length}
                  </Badge>
                  <ActionIcon
                    variant="light"
                    color="red"
                    radius="lg"
                    aria-label="Удалить категорию"
                    onClick={() => void handleDeleteCategory(cat.id)}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>
              </Group>
              <Stack gap="sm">
                {inCat.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    Пока нет блюд — нажмите «Блюдо».
                  </Text>
                ) : (
                  inCat.map((d) => {
                    const summary = formatIngredientSummary(d.ingredients ?? []);
                    return (
                      <Card
                        key={d.id}
                        withBorder
                        padding="md"
                        radius="lg"
                        className="hover-lift transition-all"
                        style={insetRowShell(colorScheme)}
                      >
                        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
                          <div style={{ minWidth: 0 }}>
                            <Text fw={600} size="md">
                              {d.title}
                            </Text>
                            {summary ? (
                              <Text size="xs" c="dimmed" mt={4}>
                                {summary}
                              </Text>
                            ) : null}
                            <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap' }} mt={6}>
                              {d.recipe_text || '—'}
                            </Text>
                          </div>
                          <Group gap={4} wrap="nowrap">
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              radius="lg"
                              aria-label="Изменить"
                              onClick={() => startEdit(d)}
                            >
                              <IconPencil size={18} />
                            </ActionIcon>
                            <ActionIcon
                              variant="light"
                              color="red"
                              radius="lg"
                              aria-label="Удалить"
                              onClick={() => void handleDeleteDish(d.id)}
                            >
                              <IconTrash size={18} />
                            </ActionIcon>
                          </Group>
                        </Group>
                      </Card>
                    );
                  })
                )}
              </Stack>
            </Card>
          );
        })}
      </Stack>

      <Modal
        opened={catOpened}
        onClose={() => {
          haptic('light');
          closeCat();
        }}
        title={
          <Group gap="sm">
            <IconFolderPlus size={24} style={{ color: '#667eea' }} />
            <Text fw={700} size="lg">
              Новая категория
            </Text>
          </Group>
        }
        {...modalShellResponsive(!!isNarrow)}
      >
        <Stack gap="md">
          <TextInput
            label="Название"
            placeholder="Например: Бранч"
            value={newCatName}
            onChange={(e) => setNewCatName(e.currentTarget.value)}
            size="md"
            radius="lg"
          />
          <Button onClick={() => void handleAddCategory()} {...gradientButton} mt="md" fullWidth={!!isNarrow}>
            Добавить
          </Button>
        </Stack>
      </Modal>

      <Modal
        opened={dishOpened}
        onClose={() => {
          haptic('light');
          closeDish();
        }}
        title={
          <Group gap="sm">
            <IconToolsKitchen2 size={24} style={{ color: '#667eea' }} />
            <Text fw={700} size="lg">
              Новое блюдо
            </Text>
          </Group>
        }
        {...dishFormModalProps(!!isNarrow)}
      >
        <Stack gap="md">
          <Select
            label="Категория"
            data={categories.map((c) => ({ value: String(c.id), label: c.name }))}
            value={dishCategoryId}
            onChange={setDishCategoryId}
            size="md"
            radius="lg"
            comboboxProps={{ withinPortal: true }}
          />
          <TextInput
            label="Название"
            value={dishTitle}
            onChange={(e) => setDishTitle(e.currentTarget.value)}
            size="md"
            radius="lg"
          />
          <Textarea
            label="Рецепт (текст)"
            autosize
            minRows={isNarrow ? 3 : 4}
            maxRows={isNarrow ? 8 : 12}
            value={dishRecipe}
            onChange={(e) => setDishRecipe(e.currentTarget.value)}
            size="md"
            radius="lg"
          />
          <Divider label="Состав" labelPosition="center" />
          <IngredientEditor
            units={units}
            ingredients={ingredients}
            rows={ingRows}
            setRows={setIngRows}
            isNarrow={!!isNarrow}
            onOpenNewIngredient={() => {
              haptic('light');
              openNewIng();
            }}
          />
          <Button onClick={() => void handleAddDish()} {...gradientButton} mt="md" fullWidth={!!isNarrow}>
            Сохранить
          </Button>
        </Stack>
      </Modal>

      <Modal
        opened={editOpened}
        onClose={() => {
          haptic('light');
          closeEdit();
        }}
        title={
          <Group gap="sm">
            <IconToolsKitchen2 size={24} style={{ color: '#667eea' }} />
            <Text fw={700} size="lg">
              Редактировать блюдо
            </Text>
          </Group>
        }
        {...dishFormModalProps(!!isNarrow)}
      >
        <Stack gap="md">
          <Select
            label="Категория"
            data={categories.map((c) => ({ value: String(c.id), label: c.name }))}
            value={dishCategoryId}
            onChange={setDishCategoryId}
            size="md"
            radius="lg"
            comboboxProps={{ withinPortal: true }}
          />
          <TextInput
            label="Название"
            value={dishTitle}
            onChange={(e) => setDishTitle(e.currentTarget.value)}
            size="md"
            radius="lg"
          />
          <Textarea
            label="Рецепт (текст)"
            autosize
            minRows={isNarrow ? 3 : 4}
            maxRows={isNarrow ? 8 : 12}
            value={dishRecipe}
            onChange={(e) => setDishRecipe(e.currentTarget.value)}
            size="md"
            radius="lg"
          />
          <Divider label="Состав" labelPosition="center" />
          <IngredientEditor
            units={units}
            ingredients={ingredients}
            rows={ingRows}
            setRows={setIngRows}
            isNarrow={!!isNarrow}
            onOpenNewIngredient={() => {
              haptic('light');
              openNewIng();
            }}
          />
          <Button onClick={() => void handleSaveEdit()} {...gradientButton} mt="md" fullWidth={!!isNarrow}>
            Сохранить
          </Button>
        </Stack>
      </Modal>

      <Modal
        opened={newIngOpened}
        onClose={() => {
          haptic('light');
          closeNewIng();
        }}
        title={<Text fw={700}>Новый продукт</Text>}
        {...modalShellResponsive(!!isNarrow)}
      >
        <Stack gap="md">
          <TextInput
            label="Название"
            placeholder="Например: Гречка"
            value={newIngName}
            onChange={(e) => setNewIngName(e.currentTarget.value)}
            radius="lg"
          />
          <Select
            label="Единица по умолчанию"
            data={units.map((u) => ({ value: String(u.id), label: `${u.name} (${u.code})` }))}
            value={newIngUnitId}
            onChange={setNewIngUnitId}
            radius="lg"
            comboboxProps={{ withinPortal: true }}
          />
          <Button onClick={() => void handleCreateIngredient()} {...gradientButton} fullWidth={!!isNarrow}>
            Добавить в справочник
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
}
