import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Title,
  Text,
  Button,
  Group,
  Stack,
  UnstyledButton,
  LoadingOverlay,
  SegmentedControl,
  TextInput,
} from '@mantine/core';
import { IconCheck, IconArrowLeft } from '@tabler/icons-react';
import { categoriesApi, transactionsApi } from '../api';
import { useTelegram } from '../hooks/useTelegram';
import type { Category } from '../types';

export function AddTransactionPage() {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const [categories, setCategories] = useState<Category[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [transactionType, setTransactionType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');

  useEffect(() => {
    categoriesApi.getAll()
      .then(cats => setCategories(cats))
      .finally(() => setLoading(false));
  }, []);

  const handleNumberClick = (num: string) => {
    haptic('light');
    if (num === 'clear') {
      setAmount('');
    } else if (num === 'backspace') {
      setAmount(prev => prev.slice(0, -1));
    } else {
      setAmount(prev => prev + num);
    }
  };

  const handleCategoryClick = (category: Category) => {
    haptic('medium');
    setSelectedCategory(category);
  };

  const handleSubmit = async () => {
    if (!selectedCategory || !amount) return;
    
    setSubmitting(true);
    haptic('heavy');
    
    try {
      await transactionsApi.create(selectedCategory.id, parseInt(amount), comment.trim() || undefined);
      navigate('/');
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const numpad = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['backspace', '0', 'clear'],
  ];

  const filteredCategories = categories.filter(c => c.type === transactionType);

  if (loading) {
    return <LoadingOverlay visible />;
  }

  return (
    <Container size="sm" p="md" pb={100}>
      <Group mb="md">
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={18} />}
          onClick={() => navigate('/')}
        >
          Назад
        </Button>
      </Group>

      <SegmentedControl
        fullWidth
        mb="md"
        value={transactionType}
        onChange={(val) => {
          setTransactionType(val as 'EXPENSE' | 'INCOME');
          setSelectedCategory(null);
        }}
        data={[
          { value: 'EXPENSE', label: 'Расход' },
          { value: 'INCOME', label: 'Доход' },
        ]}
      />

      <Title order={3} mb="md">{transactionType === 'EXPENSE' ? 'Добавить расход' : 'Добавить доход'}</Title>

      {/* Amount Display */}
      <Stack align="center" mb="xl">
        <Text
          fw={700}
          style={{ fontFamily: 'monospace', fontSize: 48, minHeight: 60 }}
        >
          {amount || '0'} ₸
        </Text>
      </Stack>

      {/* Numpad */}
      <Stack gap="xs" mb="xl">
        {numpad.map((row, i) => (
          <Group key={i} gap="xs" justify="center">
            {row.map(key => (
              <Button
                key={key}
                size="xl"
                variant="light"
                style={{ width: 80, height: 60 }}
                onClick={() => handleNumberClick(key)}
              >
                {key === 'backspace' ? '⌫' : key === 'clear' ? 'C' : key}
              </Button>
            ))}
          </Group>
        ))}
      </Stack>

      {/* Comment (optional) */}
      <TextInput
        label="Комментарий (необязательно)"
        placeholder="На что потрачено, для уведомлений и анализа"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        mb="md"
      />

      {/* Categories */}
      <Stack gap="xs">
        <Text fw={600} size="sm">Категория</Text>
        <Group gap="xs">
          {filteredCategories.map(cat => (
            <UnstyledButton
              key={cat.id}
              onClick={() => handleCategoryClick(cat)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                backgroundColor: selectedCategory?.id === cat.id ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-gray-1)',
                color: selectedCategory?.id === cat.id ? 'white' : 'inherit',
                transition: 'all 0.2s',
              }}
            >
              <Group gap={4}>
                <span style={{ fontSize: 18 }}>{cat.icon}</span>
                <Text size="sm">{cat.name}</Text>
              </Group>
            </UnstyledButton>
          ))}
        </Group>
      </Stack>

      {/* Submit */}
      <Button
        fullWidth
        size="lg"
        mt="xl"
        leftSection={<IconCheck size={20} />}
        disabled={!selectedCategory || !amount}
        loading={submitting}
        onClick={handleSubmit}
      >
        Добавить
      </Button>
    </Container>
  );
}
