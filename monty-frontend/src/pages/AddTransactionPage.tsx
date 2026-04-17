import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Text,
  Button,
  Group,
  Stack,
  UnstyledButton,
  SegmentedControl,
  TextInput,
  useMantineColorScheme,
  Card,
  SimpleGrid,
} from '@mantine/core';
import { IconCheck, IconArrowLeft, IconBackspace } from '@tabler/icons-react';
import { categoriesApi, transactionsApi } from '../api';
import { useTelegram } from '../hooks/useTelegram';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import type { Category } from '../types';

export function AddTransactionPage() {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { colorScheme } = useMantineColorScheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
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
    ['clear', '0', 'backspace'],
  ];

  const filteredCategories = categories.filter(c => c.type === transactionType);

  if (loading) {
    return (
      <Container size="sm" pb={100}>
        <LoadingSkeleton />
      </Container>
    );
  }

  return (
    <Container size="sm" p="md" pb={100}>
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" className="animate-slide-down">
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={20} />}
            onClick={() => {
              haptic('light');
              navigate('/');
            }}
            radius="xl"
          >
            Назад
          </Button>
        </Group>

        {/* Type Selector */}
        <Card 
          shadow="md" 
          padding="md" 
          radius="xl" 
          withBorder
          className="stagger-item"
          style={{
            background: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <SegmentedControl
            fullWidth
            value={transactionType}
            onChange={(val) => {
              haptic('light');
              setTransactionType(val as 'EXPENSE' | 'INCOME');
              setSelectedCategory(null);
            }}
            data={[
              { value: 'EXPENSE', label: 'Расход' },
              { value: 'INCOME', label: 'Доход' },
            ]}
            radius="lg"
            size="md"
          />
        </Card>

        {/* Amount Display */}
        <Card 
          shadow="lg" 
          padding="xl" 
          radius="xl" 
          withBorder
          className="stagger-item"
          style={{
            background: colorScheme === 'dark'
              ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Text
            fw={700}
            ta="center"
            className="gradient-text"
            style={{ 
              fontFamily: 'monospace', 
              fontSize: '3rem',
              minHeight: 80,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {amount || '0'} ₸
          </Text>
        </Card>

        {/* Numpad */}
        <Card 
          shadow="md" 
          padding="lg" 
          radius="xl" 
          withBorder
          className="stagger-item"
          style={{
            background: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Stack gap="sm">
            {numpad.map((row, i) => (
              <Group key={i} gap="sm" justify="center" grow>
                {row.map(key => (
                  <Button
                    key={key}
                    size="xl"
                    variant="light"
                    radius="xl"
                    h={64}
                    onClick={() => handleNumberClick(key)}
                    className="hover-scale"
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 600,
                    }}
                  >
                    {key === 'backspace' ? <IconBackspace size={24} /> : key === 'clear' ? 'C' : key}
                  </Button>
                ))}
              </Group>
            ))}
          </Stack>
        </Card>

        {/* Comment */}
        <Card 
          shadow="md" 
          padding="md" 
          radius="xl" 
          withBorder
          className="stagger-item"
          style={{
            background: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <TextInput
            label="Комментарий"
            placeholder="На что потрачено..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            size="md"
            radius="lg"
            styles={{
              label: {
                marginBottom: '8px',
                fontWeight: 600,
              }
            }}
          />
        </Card>

        {/* Categories */}
        <Card 
          shadow="md" 
          padding="lg" 
          radius="xl" 
          withBorder
          className="stagger-item"
          style={{
            background: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Text fw={600} size="md" mb="md">Категория</Text>
          <SimpleGrid cols={{ base: 2, xs: 3 }} spacing="sm">
            {filteredCategories.map(cat => (
              <UnstyledButton
                key={cat.id}
                onClick={() => handleCategoryClick(cat)}
                className="hover-scale transition-all"
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  background: selectedCategory?.id === cat.id 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : colorScheme === 'dark' 
                      ? 'rgba(255, 255, 255, 0.05)' 
                      : 'rgba(0, 0, 0, 0.03)',
                  color: selectedCategory?.id === cat.id ? 'white' : 'inherit',
                  border: selectedCategory?.id === cat.id 
                    ? '2px solid rgba(255, 255, 255, 0.3)' 
                    : '2px solid transparent',
                  boxShadow: selectedCategory?.id === cat.id 
                    ? '0 4px 12px rgba(102, 126, 234, 0.3)' 
                    : 'none',
                }}
              >
                <Stack gap="xs" align="center">
                  <Text style={{ fontSize: '2rem' }}>{cat.icon}</Text>
                  <Text 
                    size="sm" 
                    fw={selectedCategory?.id === cat.id ? 600 : 500}
                    ta="center"
                    lineClamp={2}
                  >
                    {cat.name}
                  </Text>
                </Stack>
              </UnstyledButton>
            ))}
          </SimpleGrid>
        </Card>

        {/* Submit Button */}
        <Button
          fullWidth
          size="xl"
          radius="xl"
          leftSection={<IconCheck size={24} />}
          disabled={!selectedCategory || !amount}
          loading={submitting}
          onClick={handleSubmit}
          variant="gradient"
          gradient={{ from: 'blue', to: 'violet', deg: 135 }}
          className="stagger-item hover-scale"
          style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            height: '64px',
          }}
        >
          Добавить {transactionType === 'EXPENSE' ? 'расход' : 'доход'}
        </Button>
      </Stack>
    </Container>
  );
}
