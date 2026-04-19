import { useCallback, useEffect, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Container,
  Group,
  LoadingOverlay,
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
  Select,
  Alert,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPlus,
  IconTrash,
  IconPencil,
  IconBook2,
  IconFolderPlus,
  IconToolsKitchen2,
} from '@tabler/icons-react';
import { foodApi } from '../../services/food';
import type { FoodDish, FoodMealCategory } from '../../types';
import {
  glassSectionShell,
  gradientButton,
  heroVioletShell,
  insetRowShell,
  modalShell,
  PAGE_WITH_BOTTOM_NAV_PB,
} from '../../theme/dashboardChrome';
import { useTelegram } from '../../hooks/useTelegram';

export function FoodCatalogPage() {
  const { colorScheme } = useMantineColorScheme();
  const { haptic } = useTelegram();
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
    await foodApi.dishes.create({
      title,
      recipe_text: dishRecipe,
      meal_category_id: Number(dishCategoryId),
    });
    setDishTitle('');
    setDishRecipe('');
    closeDish();
    haptic('success');
    await load();
  };

  const startEdit = (d: FoodDish) => {
    haptic('light');
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
    haptic('success');
    await load();
  };

  const handleDeleteDish = async (id: number) => {
    if (!window.confirm('Удалить блюдо?')) return;
    await foodApi.dishes.delete(id);
    haptic('light');
    await load();
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
                  Категории и рецепты текстом
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
                onClick={() => {
                  haptic('light');
                  openDish();
                }}
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
                  inCat.map((d) => (
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
                  ))
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
        {...modalShell}
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
          <Button onClick={() => void handleAddCategory()} {...gradientButton} mt="md">
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
        {...modalShell}
      >
        <Stack gap="md">
          <Select
            label="Категория"
            data={categories.map((c) => ({ value: String(c.id), label: c.name }))}
            value={dishCategoryId}
            onChange={setDishCategoryId}
            size="md"
            radius="lg"
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
            minRows={4}
            value={dishRecipe}
            onChange={(e) => setDishRecipe(e.currentTarget.value)}
            size="md"
            radius="lg"
          />
          <Button onClick={() => void handleAddDish()} {...gradientButton} mt="md">
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
        {...modalShell}
      >
        <Stack gap="md">
          <Select
            label="Категория"
            data={categories.map((c) => ({ value: String(c.id), label: c.name }))}
            value={dishCategoryId}
            onChange={setDishCategoryId}
            size="md"
            radius="lg"
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
            minRows={4}
            value={dishRecipe}
            onChange={(e) => setDishRecipe(e.currentTarget.value)}
            size="md"
            radius="lg"
          />
          <Button onClick={() => void handleSaveEdit()} {...gradientButton} mt="md">
            Сохранить
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
}
