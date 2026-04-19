import { useCallback, useEffect, useState } from 'react';
import {
  ActionIcon,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
  Select,
  Alert,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconTrash, IconPencil } from '@tabler/icons-react';
import { foodApi } from '../../api';
import type { FoodDish, FoodMealCategory } from '../../types';

export function FoodCatalogPage() {
  const [categories, setCategories] = useState<FoodMealCategory[]>([]);
  const [dishes, setDishes] = useState<FoodDish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [catOpened, { open: openCat, close: closeCat }] = useDisclosure(false);
  const [dishOpened, { open: openDish, close: closeDish }] = useDisclosure(false);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);

  const [newCatName, setNewCatName] = useState('');
  const [dishTitle, setDishTitle] = useState('');
  const [dishRecipe, setDishRecipe] = useState('');
  const [dishCategoryId, setDishCategoryId] = useState<string | null>(null);
  const [editingDish, setEditingDish] = useState<FoodDish | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [cats, allDishes] = await Promise.all([
        foodApi.mealCategories.list(),
        foodApi.dishes.list(),
      ]);
      setCategories(cats);
      setDishes(allDishes);
      setDishCategoryId((prev) => prev ?? (cats[0] ? String(cats[0].id) : null));
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

  const handleAddCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    await foodApi.mealCategories.create({
      name,
      sort_order: categories.length ? Math.max(...categories.map((c) => c.sort_order)) + 1 : 0,
    });
    setNewCatName('');
    closeCat();
    await load();
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('Удалить категорию и все блюда в ней?')) return;
    await foodApi.mealCategories.delete(id);
    await load();
  };

  const handleAddDish = async () => {
    const title = dishTitle.trim();
    if (!title || !dishCategoryId) return;
    await foodApi.dishes.create({
      title,
      recipe_text: dishRecipe,
      meal_category_id: Number(dishCategoryId),
    });
    setDishTitle('');
    setDishRecipe('');
    closeDish();
    await load();
  };

  const startEdit = (d: FoodDish) => {
    setEditingDish(d);
    setDishTitle(d.title);
    setDishRecipe(d.recipe_text);
    setDishCategoryId(String(d.meal_category_id));
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
    setEditingDish(null);
    closeEdit();
    await load();
  };

  const handleDeleteDish = async (id: number) => {
    if (!window.confirm('Удалить блюдо?')) return;
    await foodApi.dishes.delete(id);
    await load();
  };

  if (loading) {
    return (
      <Container py="xl">
        <Group justify="center">
          <Loader />
        </Group>
      </Container>
    );
  }

  return (
    <Container size="sm" py="md">
      <Group justify="space-between" mb="md" wrap="nowrap">
        <Text fw={700} size="lg">
          Каталог блюд
        </Text>
        <Group gap="xs">
          <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={openCat}>
            Категория
          </Button>
          <Button size="xs" leftSection={<IconPlus size={14} />} onClick={openDish}>
            Блюдо
          </Button>
        </Group>
      </Group>

      {error && (
        <Alert color="red" mb="md" title="Ошибка">
          {error}
        </Alert>
      )}

      <Stack gap="lg">
        {categories.map((cat) => {
          const inCat = dishes.filter((d) => d.meal_category_id === cat.id);
          return (
            <div key={cat.id}>
              <Group justify="space-between" mb="xs">
                <Text fw={600} size="sm" c="dimmed" tt="uppercase">
                  {cat.name}
                </Text>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  aria-label="Удалить категорию"
                  onClick={() => void handleDeleteCategory(cat.id)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
              <Stack gap="sm">
                {inCat.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    Пока нет блюд — добавьте через «Блюдо».
                  </Text>
                ) : (
                  inCat.map((d) => (
                    <Card key={d.id} padding="sm" radius="md" withBorder>
                      <Group justify="space-between" align="flex-start" wrap="nowrap">
                        <div style={{ minWidth: 0 }}>
                          <Text fw={600}>{d.title}</Text>
                          <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>
                            {d.recipe_text || '—'}
                          </Text>
                        </div>
                        <Group gap={4}>
                          <ActionIcon
                            variant="subtle"
                            aria-label="Изменить"
                            onClick={() => startEdit(d)}
                          >
                            <IconPencil size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            aria-label="Удалить"
                            onClick={() => void handleDeleteDish(d.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Group>
                    </Card>
                  ))
                )}
              </Stack>
            </div>
          );
        })}
      </Stack>

      <Modal opened={catOpened} onClose={closeCat} title="Новая категория">
        <Stack>
          <TextInput
            label="Название"
            placeholder="Например: Бранч"
            value={newCatName}
            onChange={(e) => setNewCatName(e.currentTarget.value)}
          />
          <Button onClick={() => void handleAddCategory()}>Добавить</Button>
        </Stack>
      </Modal>

      <Modal opened={dishOpened} onClose={closeDish} title="Новое блюдо">
        <Stack>
          <Select
            label="Категория"
            data={categories.map((c) => ({ value: String(c.id), label: c.name }))}
            value={dishCategoryId}
            onChange={setDishCategoryId}
          />
          <TextInput
            label="Название"
            value={dishTitle}
            onChange={(e) => setDishTitle(e.currentTarget.value)}
          />
          <Textarea
            label="Рецепт (текст)"
            minRows={4}
            value={dishRecipe}
            onChange={(e) => setDishRecipe(e.currentTarget.value)}
          />
          <Button onClick={() => void handleAddDish()}>Сохранить</Button>
        </Stack>
      </Modal>

      <Modal opened={editOpened} onClose={closeEdit} title="Редактировать блюдо">
        <Stack>
          <Select
            label="Категория"
            data={categories.map((c) => ({ value: String(c.id), label: c.name }))}
            value={dishCategoryId}
            onChange={setDishCategoryId}
          />
          <TextInput
            label="Название"
            value={dishTitle}
            onChange={(e) => setDishTitle(e.currentTarget.value)}
          />
          <Textarea
            label="Рецепт (текст)"
            minRows={4}
            value={dishRecipe}
            onChange={(e) => setDishRecipe(e.currentTarget.value)}
          />
          <Button onClick={() => void handleSaveEdit()}>Сохранить</Button>
        </Stack>
      </Modal>
    </Container>
  );
}
