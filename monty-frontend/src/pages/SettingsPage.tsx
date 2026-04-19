import { useEffect, useState } from 'react';
import { useMediaQuery } from '@mantine/hooks';
import {
  Container,
  Stack,
  Text,
  Card,
  Group,
  NumberInput,
  TextInput,
  Button,
  ActionIcon,
  Modal,
  Select,
  Box,
  useMantineColorScheme,
  Divider,
} from '@mantine/core';
import { IconPlus, IconTrash, IconPencil, IconTarget, IconWallet, IconCategory } from '@tabler/icons-react';
import { settingsApi, categoriesApi } from '../api';
import { useTelegram } from '../hooks/useTelegram';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import type { Settings, BudgetConfig } from '../types';
import { modalShellResponsive } from '../theme/dashboardChrome';

const GROUP_LABELS: Record<string, string> = {
  BASE: 'База',
  COMFORT: 'Комфорт',
  SAVINGS: 'Накопления',
  INCOME: 'Доход',
};

const GROUP_ICONS: Record<string, string> = {
  BASE: '🏠',
  COMFORT: '✨',
  SAVINGS: '💰',
  INCOME: '💵',
};

export function SettingsPage() {
  const { haptic } = useTelegram();
  const { colorScheme } = useMantineColorScheme();
  const isNarrow = useMediaQuery('(max-width: 36em)');
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
    haptic('medium');
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
    haptic('medium');
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
    if (!window.confirm('Удалить категорию?')) return;
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
    return (
      <Container size="sm" pb={100}>
        <LoadingSkeleton />
      </Container>
    );
  }

  const baseTotal = budgets.filter(b => b.group === 'BASE').reduce((sum, b) => sum + b.limit_amount, 0);
  const comfortTotal = budgets.filter(b => b.group === 'COMFORT').reduce((sum, b) => sum + b.limit_amount, 0);
  const expensesTotal = baseTotal + comfortTotal;

  const groupedBudgets = {
    BASE: budgets.filter(b => b.group === 'BASE'),
    COMFORT: budgets.filter(b => b.group === 'COMFORT'),
    SAVINGS: budgets.filter(b => b.group === 'SAVINGS'),
    INCOME: budgets.filter(b => b.group === 'INCOME'),
  };

  return (
    <Container size="sm" pb={100}>
      <Stack gap="lg">
        {/* Header */}
        <Box className="animate-slide-down">
          <Text fw={700} size="xl" mb="xs">Настройки</Text>
          <Text size="sm" c="dimmed">Управление бюджетом и категориями</Text>
        </Box>

        {deleteError && (
          <Card 
            shadow="md" 
            padding="md" 
            radius="xl" 
            withBorder
            style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <Text c="red" size="sm">{deleteError}</Text>
          </Card>
        )}

        {/* Goal Settings */}
        <Card 
          shadow="lg" 
          padding="lg" 
          radius="xl" 
          withBorder
          className="stagger-item"
          style={{
            background: colorScheme === 'dark'
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)'
              : 'linear-gradient(135deg, rgba(236, 253, 245, 0.9) 0%, rgba(209, 250, 229, 0.9) 100%)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Group gap="xs" mb="lg">
            <IconTarget size={24} style={{ color: '#10b981' }} />
            <Text fw={700} size="lg">Цель</Text>
          </Group>
          <Stack gap="md">
            <NumberInput
              label="Сумма цели"
              value={parseInt(settings?.target_amount || '0')}
              onChange={(val) => handleSettingChange('target_amount', String(val))}
              thousandSeparator=" "
              suffix=" ₸"
              size="md"
              radius="lg"
              disabled={saving}
            />
            <TextInput
              label="Дата достижения"
              type="date"
              value={settings?.target_date || ''}
              onChange={(e) => handleSettingChange('target_date', e.target.value)}
              size="md"
              radius="lg"
              disabled={saving}
            />
          </Stack>
        </Card>

        {/* Budget Settings */}
        <Card 
          shadow="lg" 
          padding="lg" 
          radius="xl" 
          withBorder
          className="stagger-item"
          style={{
            background: colorScheme === 'dark'
              ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)'
              : 'linear-gradient(135deg, rgba(239, 246, 255, 0.9) 0%, rgba(219, 234, 254, 0.9) 100%)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Group gap="xs" mb="lg">
            <IconWallet size={24} style={{ color: '#3b82f6' }} />
            <Text fw={700} size="lg">Бюджет</Text>
          </Group>
          <Stack gap="md">
            <NumberInput
              label="Общий семейный бюджет"
              description="Сумма на месяц"
              value={parseInt(settings?.total_budget || '0')}
              onChange={(val) => handleSettingChange('total_budget', String(val))}
              thousandSeparator=" "
              suffix=" ₸"
              size="md"
              radius="lg"
              disabled={saving}
            />
            <NumberInput
              label="День зарплаты"
              value={parseInt(settings?.salary_day || '10')}
              onChange={(val) => handleSettingChange('salary_day', String(val))}
              min={1}
              max={31}
              size="md"
              radius="lg"
              disabled={saving}
            />
            <Divider />
            <Group justify="space-between">
              <Text size="sm" c="dimmed">База</Text>
              <Text size="md" fw={600}>{baseTotal.toLocaleString('ru-RU')} ₸</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Комфорт</Text>
              <Text size="md" fw={600}>{comfortTotal.toLocaleString('ru-RU')} ₸</Text>
            </Group>
            <Divider />
            <Group justify="space-between">
              <Text size="md" fw={700}>На траты</Text>
              <Text size="lg" fw={700} className="gradient-text">{expensesTotal.toLocaleString('ru-RU')} ₸</Text>
            </Group>
          </Stack>
        </Card>

        {/* Add Category Button */}
        <Button
          size="lg"
          radius="xl"
          leftSection={<IconPlus size={20} />}
          onClick={openNewCategory}
          variant="gradient"
          gradient={{ from: 'blue', to: 'violet', deg: 135 }}
          className="stagger-item hover-scale"
        >
          Добавить категорию
        </Button>

        {/* Categories */}
        {['BASE', 'COMFORT', 'SAVINGS', 'INCOME'].map((group, groupIndex) => {
          const items = groupedBudgets[group as keyof typeof groupedBudgets];
          if (items.length === 0) return null;
          const isSavings = group === 'SAVINGS';
          const total = items.reduce((sum, b) => sum + b.limit_amount, 0);
          return (
            <Card 
              key={group} 
              shadow="md" 
              padding="lg" 
              radius="xl" 
              withBorder
              className="stagger-item"
              style={{
                background: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                animationDelay: `${(groupIndex + 3) * 0.1}s`,
              }}
            >
              <Group justify="space-between" mb="lg">
                <Group gap="sm">
                  <Text size="2rem">{GROUP_ICONS[group]}</Text>
                  <Text fw={700} size="lg">{GROUP_LABELS[group]}</Text>
                </Group>
                {group !== 'INCOME' && !isSavings && (
                  <Text size="md" fw={600} c="dimmed">{total.toLocaleString('ru-RU')} ₸</Text>
                )}
              </Group>
              <Stack gap="sm">
                {items.map((budget) => (
                  <Card
                    key={budget.category_id}
                    padding="md"
                    radius="lg"
                    withBorder
                    className="hover-lift"
                    style={{
                      background: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.5)',
                      cursor: 'pointer',
                    }}
                    onClick={() => openEditCategory(budget)}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="md" style={{ flex: 1, minWidth: 0 }}>
                        <Text size="2rem">{budget.category_icon}</Text>
                        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                          <Text size="md" fw={600}>{budget.category_name}</Text>
                          {!isSavings && budget.limit_amount > 0 && (
                            <Text size="sm" c="dimmed">{budget.limit_amount.toLocaleString('ru-RU')} ₸</Text>
                          )}
                        </Stack>
                      </Group>
                      <Group gap="xs">
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          size="lg"
                          radius="lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditCategory(budget);
                          }}
                          className="hover-scale"
                        >
                          <IconPencil size={18} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="lg"
                          radius="lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(budget.category_id);
                          }}
                          className="hover-scale"
                        >
                          <IconTrash size={18} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  </Card>
                ))}
              </Stack>
            </Card>
          );
        })}
      </Stack>

      {/* Edit/Create Category Modal */}
      <Modal
        opened={categoryModal}
        onClose={() => {
          haptic('light');
          setCategoryModal(false);
          setEditingCategory(null);
        }}
        title={
          <Group gap="sm">
            <IconCategory size={24} />
            <Text fw={700} size="lg">{isNewCategory ? 'Новая категория' : 'Редактировать'}</Text>
          </Group>
        }
        {...modalShellResponsive(!!isNarrow)}
      >
        <Stack gap="md">
          <TextInput
            label="Название"
            value={editingCategory?.name || ''}
            onChange={(e) => setEditingCategory(prev => prev ? { ...prev, name: e.target.value } : null)}
            size="md"
            radius="lg"
          />
          <TextInput
            label="Иконка (эмодзи)"
            value={editingCategory?.icon || ''}
            onChange={(e) => setEditingCategory(prev => prev ? { ...prev, icon: e.target.value } : null)}
            size="md"
            radius="lg"
          />
          <Select
            label="Группа"
            data={[
              { value: 'BASE', label: '🏠 База' },
              { value: 'COMFORT', label: '✨ Комфорт' },
              { value: 'SAVINGS', label: '💰 Накопления' },
              { value: 'INCOME', label: '💵 Доход' },
            ]}
            value={editingCategory?.group || 'BASE'}
            onChange={(val) => setEditingCategory(prev => prev ? { ...prev, group: val || 'BASE' } : null)}
            size="md"
            radius="lg"
          />
          <Select
            label="Тип"
            data={[
              { value: 'EXPENSE', label: 'Расход' },
              { value: 'INCOME', label: 'Доход' },
            ]}
            value={editingCategory?.type || 'EXPENSE'}
            onChange={(val) => setEditingCategory(prev => prev ? { ...prev, type: val || 'EXPENSE' } : null)}
            size="md"
            radius="lg"
          />
          <NumberInput
            label="Бюджет на месяц"
            value={editingCategory?.budget || 0}
            onChange={(val) => setEditingCategory(prev => prev ? { ...prev, budget: Number(val) || 0 } : null)}
            thousandSeparator=" "
            suffix=" ₸"
            size="md"
            radius="lg"
          />
          <Button 
            onClick={handleSaveCategory} 
            loading={saving}
            size="lg"
            radius="xl"
            variant="gradient"
            gradient={{ from: 'blue', to: 'violet', deg: 135 }}
            mt="md"
            fullWidth={!!isNarrow}
          >
            Сохранить
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
}
