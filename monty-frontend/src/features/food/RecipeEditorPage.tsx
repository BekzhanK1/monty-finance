import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Container,
  Group,
  NumberInput,
  Select,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { haptic } from '../../lib/telegram';
import { PageHeader, Section, useSnackbar } from '../../ui';
import { foodApi } from './api';
import { useDishes, useFoodMutation, useIngredients, useMealCategories, useUnits } from './queries';
import { ProductPicker } from './components/ProductPicker';
import { QtyUnitInput } from './components/QtyUnitInput';
import { findIngredient } from './lookup';
import type { Dish, DishInput, FoodIngredient } from './types';

interface LineDraft {
  key: number;
  name: string;
  ingredientId: number | null;
  quantity: number | string;
  unitId: number | null;
}

interface Draft {
  title: string;
  categoryId: number | null;
  servings: number | string;
  minutes: number | string;
  recipe: string;
  lines: LineDraft[];
}

let lineKey = 0;
const emptyLine = (): LineDraft => ({ key: ++lineKey, name: '', ingredientId: null, quantity: '', unitId: null });

function draftFrom(dish: Dish | undefined, defaultCategory: number | null): Draft {
  if (!dish) {
    return { title: '', categoryId: defaultCategory, servings: 2, minutes: '', recipe: '', lines: [emptyLine()] };
  }
  return {
    title: dish.title,
    categoryId: dish.meal_category_id,
    servings: dish.servings_default,
    minutes: (dish.prep_minutes ?? 0) + (dish.cook_minutes ?? 0) || '',
    recipe: dish.recipe_text,
    lines: dish.ingredients.length
      ? dish.ingredients.map(l => ({ key: ++lineKey, name: l.ingredient_name, ingredientId: l.ingredient_id, quantity: l.quantity, unitId: l.unit_id }))
      : [emptyLine()],
  };
}

export function RecipeEditorPage() {
  const { id } = useParams();
  const isNew = id === undefined;
  const { data: dishes, isPending } = useDishes();
  const { data: categories, isPending: categoriesPending } = useMealCategories();
  const dish = isNew ? undefined : dishes?.find(d => d.id === Number(id));

  if ((!isNew && isPending) || categoriesPending) {
    return <Container size="sm" pt="md"><Skeleton h={320} radius="lg" /></Container>;
  }
  return <Editor key={dish?.id ?? 'new'} dish={dish} initial={draftFrom(dish, categories?.[2]?.id ?? categories?.[0]?.id ?? null)} />;
}

function Editor({ dish, initial }: { dish: Dish | undefined; initial: Draft }) {
  const navigate = useNavigate();
  const snack = useSnackbar();
  const { data: categories = [] } = useMealCategories();
  const { data: ingredients = [] } = useIngredients();
  const { data: units = [] } = useUnits();
  const [draft, setDraft] = useState<Draft>(initial);
  const [error, setError] = useState<string | null>(null);

  const save = useFoodMutation(async (d: Draft) => {
    // Unknown products are created on the fly with the unit used in this recipe.
    const known = new Map<string, FoodIngredient>();
    const filled = d.lines.filter(l => l.name.trim() && typeof l.quantity === 'number' && l.quantity > 0 && l.unitId);
    const items: DishInput['ingredients'] = [];
    for (const [order, line] of filled.entries()) {
      const name = line.name.trim();
      let ingredient = (line.ingredientId && ingredients.find(i => i.id === line.ingredientId)) || findIngredient(ingredients, name) || known.get(name.toLowerCase()) || null;
      if (!ingredient) {
        ingredient = await foodApi.createIngredient({ name, default_unit_id: line.unitId! });
        known.set(name.toLowerCase(), ingredient);
      }
      items.push({ ingredient_id: ingredient.id, quantity: line.quantity as number, unit_id: line.unitId!, sort_order: order });
    }
    const body: DishInput = {
      title: d.title.trim(),
      meal_category_id: d.categoryId!,
      recipe_text: d.recipe.trim(),
      servings_default: typeof d.servings === 'number' && d.servings > 0 ? d.servings : 2,
      prep_minutes: null,
      cook_minutes: typeof d.minutes === 'number' && d.minutes > 0 ? d.minutes : null,
      ingredients: items,
    };
    return dish ? foodApi.updateDish(dish.id, body) : foodApi.createDish(body);
  });

  const setLine = (key: number, patch: Partial<LineDraft>) =>
    setDraft(d => ({ ...d, lines: d.lines.map(l => (l.key === key ? { ...l, ...patch } : l)) }));

  const canSave = draft.title.trim() && draft.categoryId;

  const submit = async () => {
    if (!canSave) return;
    setError(null);
    try {
      const saved = await save.mutateAsync(draft);
      haptic('success');
      snack(dish ? 'Рецепт сохранён' : 'Рецепт добавлен');
      navigate(`/food/recipes/${saved.id}`, { replace: true });
    } catch {
      haptic('error');
      setError('Не удалось сохранить рецепт. Проверьте поля и попробуйте ещё раз.');
    }
  };

  return (
    <Container size="sm" pb="calc(96px + var(--monty-safe-bottom))">
      <PageHeader title={dish ? 'Рецепт' : 'Новый рецепт'} onBack={() => navigate(-1)} />

      <Stack gap="lg" mt="md">
        <Section padded>
          <Stack gap="sm">
            <TextInput label="Название" placeholder="Например, плов" value={draft.title}
              onChange={e => setDraft({ ...draft, title: e.currentTarget.value })} size="md" maxLength={200} data-autofocus={!dish} />
            <Select label="Приём пищи" data={categories.map(c => ({ value: String(c.id), label: c.name }))}
              value={draft.categoryId ? String(draft.categoryId) : null}
              onChange={v => v && setDraft({ ...draft, categoryId: Number(v) })}
              allowDeselect={false} size="md" comboboxProps={{ withinPortal: true }} />
            <Group grow>
              <NumberInput label="Порций" value={draft.servings} onChange={v => setDraft({ ...draft, servings: v })}
                min={1} max={50} allowDecimal={false} size="md" />
              <NumberInput label="Время, мин" placeholder="—" value={draft.minutes} onChange={v => setDraft({ ...draft, minutes: v })}
                min={0} max={1440} allowDecimal={false} hideControls size="md" />
            </Group>
          </Stack>
        </Section>

        <Section title="Состав" footer="Продукты, которых ещё нет в справочнике, добавятся автоматически.">
          <Stack gap={0}>
            {draft.lines.map((line, i) => (
              <Box key={line.key} px="md" py="sm" style={{ borderTop: i > 0 ? '0.5px solid var(--monty-separator)' : undefined }}>
                <Group gap={8} wrap="nowrap" align="flex-start">
                  <Stack gap={8} style={{ flex: 1, minWidth: 0 }}>
                    <ProductPicker
                      aria-label={`Продукт ${i + 1}`}
                      placeholder="Продукт"
                      value={line.name}
                      onChange={(name, ingredient) => setLine(line.key, {
                        name,
                        ingredientId: ingredient?.id ?? null,
                        // Default unit of a known product (D11), unless the user already picked one.
                        unitId: ingredient ? (line.unitId ?? ingredient.default_unit_id) : line.unitId,
                      })}
                    />
                    <QtyUnitInput
                      forRecipe
                      size="sm"
                      quantity={line.quantity}
                      unitId={line.unitId ?? units.find(u => u.code === 'g')?.id ?? null}
                      onQuantity={v => setLine(line.key, { quantity: v, unitId: line.unitId ?? units.find(u => u.code === 'g')?.id ?? null })}
                      onUnit={u => setLine(line.key, { unitId: u })}
                    />
                  </Stack>
                  <ActionIcon variant="subtle" color="red" radius="xl" mt={4} aria-label="Убрать продукт"
                    onClick={() => setDraft(d => ({ ...d, lines: d.lines.length > 1 ? d.lines.filter(l => l.key !== line.key) : [emptyLine()] }))}>
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>
              </Box>
            ))}
            <Box p="sm">
              <Button variant="subtle" leftSection={<IconPlus size={16} />} onClick={() => setDraft(d => ({ ...d, lines: [...d.lines, emptyLine()] }))}>
                Добавить продукт
              </Button>
            </Box>
          </Stack>
        </Section>

        <Section title="Приготовление" padded footer="Каждый абзац станет отдельным шагом.">
          <Textarea placeholder={'Промыть рис.\nОбжарить мясо с луком…'} value={draft.recipe}
            onChange={e => setDraft({ ...draft, recipe: e.currentTarget.value })} autosize minRows={4} size="md" aria-label="Шаги приготовления" />
        </Section>

        {error && <Alert color="red" variant="light">{error}</Alert>}
        {!draft.categoryId && <Text size="sm" c="red">Выберите приём пищи</Text>}
      </Stack>

      <Box style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 140, padding: '8px 16px calc(12px + var(--monty-safe-bottom))', background: 'linear-gradient(to top, var(--monty-bg) 75%, transparent)' }}>
        <Container size="sm" p={0}>
          <Button fullWidth size="lg" disabled={!canSave} loading={save.isPending} onClick={submit}>Сохранить</Button>
        </Container>
      </Box>
    </Container>
  );
}
