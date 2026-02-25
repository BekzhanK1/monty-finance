import { useEffect, useState } from 'react';
import {
  Container,
  Stack,
  Text,
  Card,
  Group,
  NumberInput,
  TextInput,
  Button,
  LoadingOverlay,
  ActionIcon,
  Modal,
  Select,
} from '@mantine/core';
import { IconPlus, IconTrash, IconPencil } from '@tabler/icons-react';
import { settingsApi, categoriesApi } from '../api';
import { useTelegram } from '../hooks/useTelegram';
import type { Settings, BudgetConfig } from '../types';

const GROUP_LABELS: Record<string, string> = {
  BASE: 'База',
  COMFORT: 'Комфорт',
  SAVINGS: 'Накопления',
  INCOME: 'Доход',
};

export function SettingsPage() {
  const { haptic } = useTelegram();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [budgets, setBudgets] = useState<BudgetConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{
    id: number;
    name: string;
    icon: string;
    group: string;
    type: string;
    budget: number;
  } | null>(null);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsData, budgetsData] = await Promise.all([
        settingsApi.get(),
        settingsApi.getBudgets(),
      ]);
      setSettings(settingsData);
      setBudgets(budgetsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = async (key: string, value: string) => {
    if (!settings) return;
    setSaving(true);
    try {
      await settingsApi.update(key, value);
      setSettings({ ...settings, [key]: value });
      haptic('success');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const openEditCategory = (budget: BudgetConfig) => {
    setEditingCategory({
      id: budget.category_id,
      name: budget.category_name,
      icon: budget.category_icon,
      group: budget.group,
      type: budget.type,
      budget: budget.limit_amount,
    });
    setIsNewCategory(false);
    setCategoryModal(true);
  };

  const openNewCategory = () => {
    setEditingCategory({
      id: 0,
      name: '',
      icon: '📦',
      group: 'BASE',
      type: 'EXPENSE',
      budget: 0,
    });
    setIsNewCategory(true);
    setCategoryModal(true);
  };

  const handleSaveCategory = async () => {
    if (!editingCategory) return;
    setSaving(true);
    try {
      if (isNewCategory) {
        const newCat = await categoriesApi.create({
          name: editingCategory.name,
          icon: editingCategory.icon,
          group: editingCategory.group as any,
          type: editingCategory.type as any,
        });
        if (editingCategory.budget > 0) {
          await settingsApi.updateBudget(newCat.id, editingCategory.budget);
        }
      } else {
        await categoriesApi.update(editingCategory.id, {
          name: editingCategory.name,
          icon: editingCategory.icon,
          group: editingCategory.group as any,
          type: editingCategory.type as any,
        });
        if (editingCategory.budget >= 0) {
          await settingsApi.updateBudget(editingCategory.id, editingCategory.budget);
        }
      }
      setCategoryModal(false);
      setEditingCategory(null);
      loadData();
      haptic('success');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    setDeleteError(null);
    setSaving(true);
    try {
      await categoriesApi.delete(id);
      await loadData();
      haptic('success');
    } catch (e: unknown) {
      console.error(e);
      const err = e as { response?: { data?: { detail?: string } } };
      setDeleteError(err.response?.data?.detail ?? 'Не удалось удалить категорию');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingOverlay visible />;
  }

  const baseTotal = budgets.filter(b => b.group === 'BASE').reduce((sum, b) => sum + b.limit_amount, 0);
  const comfortTotal = budgets.filter(b => b.group === 'COMFORT').reduce((sum, b) => sum + b.limit_amount, 0);
  const expensesTotal = baseTotal + comfortTotal; // только траты (база + комфорт)

  const groupedBudgets = {
    BASE: budgets.filter(b => b.group === 'BASE'),
    COMFORT: budgets.filter(b => b.group === 'COMFORT'),
    SAVINGS: budgets.filter(b => b.group === 'SAVINGS'),
    INCOME: budgets.filter(b => b.group === 'INCOME'),
  };

  return (
    <Container size="sm" pb={100}>
      <LoadingOverlay visible={saving} />
      <Stack gap="lg">
        {deleteError && (
          <Text c="red" size="sm" mb="md">
            {deleteError}
          </Text>
        )}
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Text fw={600} mb="md">Цель</Text>
          <Stack gap="sm">
            <NumberInput
              label="Сумма цели"
              value={parseInt(settings?.target_amount || '0')}
              onChange={(val) => handleSettingChange('target_amount', String(val))}
              thousandSeparator=" "
              suffix=" ₸"
            />
            <TextInput
              label="Дата достижения"
              type="date"
              value={settings?.target_date || ''}
              onChange={(e) => handleSettingChange('target_date', e.target.value)}
            />
          </Stack>
        </Card>

        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Text fw={600} mb="md">Бюджет</Text>
          <Stack gap="sm">
            <NumberInput
              label="Общий семейный бюджет (₸)"
              description="Сумма на месяц, может меняться от заработка"
              value={parseInt(settings?.total_budget || '0')}
              onChange={(val) => handleSettingChange('total_budget', String(val))}
              thousandSeparator=" "
              suffix=" ₸"
            />
            <NumberInput
              label="День зарплаты"
              value={parseInt(settings?.salary_day || '10')}
              onChange={(val) => handleSettingChange('salary_day', String(val))}
              min={1}
              max={31}
            />
            <Group justify="space-between">
              <Text size="sm" c="dimmed">База</Text>
              <Text size="sm" fw={500}>{baseTotal.toLocaleString('ru-RU')} ₸</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Комфорт</Text>
              <Text size="sm" fw={500}>{comfortTotal.toLocaleString('ru-RU')} ₸</Text>
            </Group>
            <Group justify="space-between" pt="xs" style={{ borderTop: '1px solid #eee' }}>
              <Text size="sm" fw={500}>На траты</Text>
              <Text size="sm" fw={500}>{expensesTotal.toLocaleString('ru-RU')} ₸</Text>
            </Group>
          </Stack>
        </Card>

        <Group justify="flex-end" mb="md">
          <Button
            size="xs"
            variant="light"
            leftSection={<IconPlus size={14} />}
            onClick={openNewCategory}
          >
            Добавить категорию
          </Button>
        </Group>

        {['BASE', 'COMFORT', 'SAVINGS', 'INCOME'].map(group => {
          const items = groupedBudgets[group as keyof typeof groupedBudgets];
          if (items.length === 0) return null;
          const isSavings = group === 'SAVINGS';
          const total = items.reduce((sum, b) => sum + b.limit_amount, 0);
          return (
            <Card key={group} shadow="sm" padding="md" radius="md" withBorder>
              <Group justify="space-between" mb="sm">
                <Text fw={600}>{GROUP_LABELS[group]}</Text>
                {group !== 'INCOME' && !isSavings && (
                  <Text size="sm" c="dimmed">{total.toLocaleString('ru-RU')} ₸</Text>
                )}
                {group !== 'INCOME' && isSavings && (
                  <Text size="sm" c="dimmed">Без лимита</Text>
                )}
              </Group>
              <Stack gap="xs">
                {items.map(budget => (
                  <Group key={budget.category_id} justify="space-between" py={2}>
                    <Group gap="xs">
                      <Text size="lg">{budget.category_icon}</Text>
                      <Text size="sm">{budget.category_name}</Text>
                      {isSavings ? (
                        <Text size="xs" c="dimmed">Без лимита</Text>
                      ) : budget.limit_amount > 0 ? (
                        <Text size="xs" c="dimmed">{budget.limit_amount.toLocaleString('ru-RU')} ₸</Text>
                      ) : null}
                    </Group>
                    <Group gap={4}>
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        size="sm"
                        onClick={() => openEditCategory(budget)}
                      >
                        <IconPencil size={14} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={() => handleDeleteCategory(budget.category_id)}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Group>
                  </Group>
                ))}
              </Stack>
            </Card>
          );
        })}
      </Stack>

      <Modal
        opened={categoryModal}
        onClose={() => {
          setCategoryModal(false);
          setEditingCategory(null);
        }}
        title={isNewCategory ? 'Новая категория' : 'Редактировать категорию'}
        centered
      >
        <Stack>
          <TextInput
            label="Название"
            value={editingCategory?.name || ''}
            onChange={(e) => setEditingCategory(prev => prev ? { ...prev, name: e.target.value } : null)}
          />
          <TextInput
            label="Иконка"
            value={editingCategory?.icon || ''}
            onChange={(e) => setEditingCategory(prev => prev ? { ...prev, icon: e.target.value } : null)}
          />
          <Select
            label="Группа"
            data={[
              { value: 'BASE', label: 'База' },
              { value: 'COMFORT', label: 'Комфорт' },
              { value: 'SAVINGS', label: 'Накопления' },
              { value: 'INCOME', label: 'Доход' },
            ]}
            value={editingCategory?.group || 'BASE'}
            onChange={(val) => setEditingCategory(prev => prev ? { ...prev, group: val || 'BASE' } : null)}
          />
          <Select
            label="Тип"
            data={[
              { value: 'EXPENSE', label: 'Расход' },
              { value: 'INCOME', label: 'Доход' },
            ]}
            value={editingCategory?.type || 'EXPENSE'}
            onChange={(val) => setEditingCategory(prev => prev ? { ...prev, type: val || 'EXPENSE' } : null)}
          />
          <NumberInput
            label="Бюджет на месяц"
            value={editingCategory?.budget || 0}
            onChange={(val) => setEditingCategory(prev => prev ? { ...prev, budget: Number(val) || 0 } : null)}
            thousandSeparator=" "
            suffix=" ₸"
          />
          <Button onClick={handleSaveCategory} loading={saving}>
            Сохранить
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
}
