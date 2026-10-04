import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Container,
  Group,
  SegmentedControl,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { IconBackspace, IconCalendar, IconCheck, IconMicrophone } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { haptic } from '../../lib/telegram';
import { useVoiceInput } from '../voice/VoiceContext';
import { useCategories, useCreateTransaction, useTransactions } from '../finance/queries';
import type { Category } from '../../types';
import { CategoryIcon, PageHeader, formatMoney, groupTint } from '../../ui';
import { applyKey, evaluateAmount, formatExpression, hasOperator, type NumpadKey } from './amountExpression';
import { rankCategories } from './rankCategories';

type TxType = 'EXPENSE' | 'INCOME';

const KEYS: NumpadKey[][] = [
  ['7', '8', '9', 'back'],
  ['4', '5', '6', '+'],
  ['1', '2', '3', '-'],
  ['000', '0', 'clear'],
];

const RECENT_SINCE = dayjs().subtract(90, 'day').format('YYYY-MM-DD');
const COLLAPSED_COUNT = 8;

export function AddTransactionPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const openVoice = useVoiceInput();
  const categoriesQuery = useCategories();
  const recentQuery = useTransactions({ start_date: RECENT_SINCE });
  const createTransaction = useCreateTransaction();

  const [type, setType] = useState<TxType>(params.get('type') === 'INCOME' ? 'INCOME' : 'EXPENSE');
  const [expr, setExpr] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [date, setDate] = useState<string | null>(null); // null = today
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount = evaluateAmount(expr);
  const today = dayjs().format('YYYY-MM-DD');
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

  const categories = useMemo(
    () => rankCategories((categoriesQuery.data ?? []).filter(c => c.type === type), recentQuery.data ?? []),
    [categoriesQuery.data, recentQuery.data, type],
  );
  const visible = showAll ? categories : categories.slice(0, COLLAPSED_COUNT);
  const selected = categories.find(c => c.id === categoryId) ?? null;
  // Keep a selection made from the expanded list visible after collapsing.
  const shown = selected && !visible.includes(selected) ? [...visible.slice(0, COLLAPSED_COUNT - 1), selected] : visible;

  const canSave = amount !== null && amount > 0 && selected !== null;

  const press = (key: NumpadKey) => {
    haptic(key === 'clear' ? 'medium' : 'light');
    setExpr(prev => applyKey(prev, key));
  };

  const pickCategory = (category: Category) => {
    haptic('selection');
    setCategoryId(category.id);
  };

  const save = async () => {
    if (!canSave || amount === null || !selected) return;
    setError(null);
    try {
      await createTransaction.mutateAsync({
        category_id: selected.id,
        amount,
        comment: comment.trim() || undefined,
        transaction_date: date,
      });
      haptic('success');
      navigate('/', { replace: true });
    } catch {
      haptic('error');
      setError('Не удалось сохранить. Проверьте соединение и попробуйте ещё раз.');
    }
  };

  const goBack = () => navigate(-1);

  return (
    <Box style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--monty-bg)' }}>
      <Container size="xs" w="100%" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <PageHeader
          title="Новая операция"
          onBack={goBack}
          right={
            <ActionIcon
              variant="light"
              size="lg"
              radius="xl"
              aria-label="Голосом"
              onClick={() => {
                haptic('medium');
                openVoice({ onSaved: () => navigate('/', { replace: true }) });
              }}
            >
              <IconMicrophone size={20} />
            </ActionIcon>
          }
        />

        <SegmentedControl
          mt="sm"
          fullWidth
          value={type}
          onChange={value => {
            haptic('selection');
            setType(value as TxType);
            setCategoryId(null);
            setShowAll(false);
          }}
          data={[
            { value: 'EXPENSE', label: 'Расход' },
            { value: 'INCOME', label: 'Доход' },
          ]}
        />

        {/* Amount */}
        <Stack gap={0} align="center" py="md" mih={92} justify="center" aria-live="polite">
          <Text size="sm" h={20} className="monty-tabular" style={{ color: 'var(--monty-hint)' }}>
            {hasOperator(expr) ? formatExpression(expr) : ''}
          </Text>
          <Text
            fz={44}
            fw={800}
            lh={1.1}
            className="monty-tabular"
            style={{
              letterSpacing: -0.5,
              color: amount ? (type === 'INCOME' ? 'var(--monty-income)' : 'var(--monty-text)') : 'var(--monty-hint)',
            }}
          >
            {formatMoney(amount ?? 0)}
          </Text>
        </Stack>

        {/* Categories */}
        {categoriesQuery.isPending ? (
          <SimpleGrid cols={4} spacing={8}>
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} h={68} radius="md" />)}
          </SimpleGrid>
        ) : (
          <>
            <SimpleGrid cols={4} spacing={8}>
              {shown.map(c => {
                const active = c.id === categoryId;
                return (
                  <UnstyledButton
                    key={c.id}
                    onClick={() => pickCategory(c)}
                    aria-pressed={active}
                    className="monty-pressable"
                    py={8}
                    px={4}
                    style={{
                      borderRadius: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      background: active ? 'var(--monty-accent-soft)' : 'var(--monty-surface)',
                      boxShadow: active ? 'inset 0 0 0 1.5px var(--monty-accent)' : 'none',
                    }}
                  >
                    <CategoryIcon icon={c.icon} size={32} tint={groupTint(c.group)} />
                    <Text fz={11} fw={active ? 600 : 500} ta="center" lineClamp={1} w="100%">{c.name}</Text>
                  </UnstyledButton>
                );
              })}
            </SimpleGrid>
            {categories.length > COLLAPSED_COUNT && (
              <Button variant="subtle" size="xs" mt={4} onClick={() => setShowAll(v => !v)}>
                {showAll ? 'Свернуть' : `Все категории (${categories.length})`}
              </Button>
            )}
            {categories.length === 0 && (
              <Text size="sm" ta="center" py="sm" style={{ color: 'var(--monty-hint)' }}>
                Нет категорий {type === 'INCOME' ? 'доходов' : 'расходов'} — добавьте их в настройках.
              </Text>
            )}
          </>
        )}

        {/* Comment + date */}
        <Group gap={8} mt="sm" wrap="nowrap">
          <TextInput
            placeholder="Комментарий"
            aria-label="Комментарий"
            value={comment}
            onChange={e => setComment(e.currentTarget.value)}
            maxLength={255}
            style={{ flex: 1 }}
          />
          <DateChips date={date} today={today} yesterday={yesterday} onChange={setDate} />
        </Group>

        {error && <Alert mt="sm" color="red" variant="light">{error}</Alert>}

        <Box style={{ flex: 1 }} />
      </Container>

      {/* Numpad + save, pinned to the bottom */}
      <Box
        pt="sm"
        style={{
          position: 'sticky',
          bottom: 0,
          background: 'var(--monty-bg)',
          paddingBottom: 'calc(12px + var(--monty-safe-bottom))',
        }}
      >
        <Container size="xs">
          <SimpleGrid cols={4} spacing={6}>
            {KEYS.flat().map(key => (
              <NumKey key={key} k={key} onPress={press} />
            ))}
            <Button
              h={52}
              radius={12}
              disabled={!canSave}
              loading={createTransaction.isPending}
              onClick={save}
              aria-label="Сохранить"
            >
              <IconCheck size={26} stroke={2.4} />
            </Button>
          </SimpleGrid>
        </Container>
      </Box>
    </Box>
  );
}

function NumKey({ k, onPress }: { k: NumpadKey; onPress: (k: NumpadKey) => void }) {
  const label = k === 'back' ? <IconBackspace size={22} /> : k === 'clear' ? 'C' : k === '-' ? '−' : k;
  const isOp = k === '+' || k === '-' || k === 'back' || k === 'clear';
  return (
    <UnstyledButton
      onClick={() => onPress(k)}
      aria-label={k === 'back' ? 'Стереть' : k === 'clear' ? 'Очистить' : k === '-' ? 'Минус' : k === '+' ? 'Плюс' : k}
      className="monty-pressable monty-tabular"
      h={52}
      style={{
        borderRadius: 12,
        display: 'grid',
        placeItems: 'center',
        fontSize: 22,
        fontWeight: 500,
        background: isOp ? 'color-mix(in srgb, var(--monty-text) 8%, var(--monty-surface))' : 'var(--monty-surface)',
        color: isOp ? 'var(--monty-accent)' : 'var(--monty-text)',
        userSelect: 'none',
      }}
    >
      {label}
    </UnstyledButton>
  );
}

function DateChips({
  date,
  today,
  yesterday,
  onChange,
}: {
  date: string | null;
  today: string;
  yesterday: string;
  onChange: (date: string | null) => void;
}) {
  const custom = date !== null && date !== yesterday;
  const chip = (active: boolean) => ({
    height: 36,
    padding: '0 12px',
    borderRadius: 18,
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: 'nowrap' as const,
    background: active ? 'var(--monty-accent)' : 'var(--monty-surface)',
    color: active ? 'var(--monty-accent-text)' : 'var(--monty-text)',
  });

  return (
    <Group gap={6} wrap="nowrap">
      <UnstyledButton style={chip(date === null)} onClick={() => onChange(null)}>Сегодня</UnstyledButton>
      <UnstyledButton style={chip(date === yesterday)} onClick={() => onChange(yesterday)}>Вчера</UnstyledButton>
      <Box component="label" style={{ ...chip(custom), position: 'relative', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
        {custom ? dayjs(date).format('D.MM') : <IconCalendar size={18} />}
        <input
          type="date"
          aria-label="Другая дата"
          max={today}
          value={date ?? today}
          onChange={e => onChange(!e.target.value || e.target.value === today ? null : e.target.value)}
          style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', cursor: 'pointer' }}
        />
      </Box>
    </Group>
  );
}
