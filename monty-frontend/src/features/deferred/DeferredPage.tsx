import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Container, Drawer, Group, Skeleton, Stack, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { haptic } from '../../lib/telegram';
import type { Transaction } from '../../types';
import { useCategories, useDeferred, useDeleteDeferred, useRevealDeferred } from '../finance/queries';
import { TransactionRow } from '../finance/TransactionRow';
import { AmountText, CategoryIcon, EmptyState, PageHeader, Section, formatMoney, groupTint, parseServerDate } from '../../ui';

const fullDateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Hidden expenses (opened by five taps on the Settings title). They count nowhere — not in
 * history, budgets, analytics or Telegram — until revealed; then they land on their purchase date.
 */
export function DeferredPage() {
  const navigate = useNavigate();
  const deferred = useDeferred();
  const categories = useCategories();
  const [selected, setSelected] = useState<Transaction | null>(null);

  const categoryById = useMemo(() => new Map((categories.data ?? []).map(c => [c.id, c])), [categories.data]);
  const items = deferred.data ?? [];
  const total = items.reduce((sum, t) => sum + t.amount, 0);

  return (
    <Container size="sm" pb="var(--monty-page-pb)">
      <Stack gap="lg">
        <PageHeader
          title="Отложенные"
          subtitle={items.length ? `Всего ${formatMoney(total)} · видны только вам` : 'Видны только вам'}
          onBack={() => navigate('/settings')}
          right={
            <Button
              size="compact-md"
              radius="xl"
              leftSection={<IconPlus size={16} />}
              onClick={() => navigate('/add?deferred=1')}
            >
              Добавить
            </Button>
          }
        />

        {deferred.isPending ? (
          <Stack gap={8}>{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} h={56} radius="md" />)}</Stack>
        ) : items.length === 0 ? (
          <EmptyState
            icon="🤫"
            title="Пусто"
            description="Расходы отсюда не попадают в историю, бюджеты и аналитику, пока вы их не раскроете."
            action={{ label: 'Добавить', onClick: () => navigate('/add?deferred=1') }}
          />
        ) : (
          <Section>
            {items.map((t, i) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                category={categoryById.get(t.category_id)}
                showDate
                divider={i < items.length - 1}
                onClick={() => setSelected(t)}
              />
            ))}
          </Section>
        )}
      </Stack>

      <DeferredSheet
        transaction={selected}
        category={selected ? categoryById.get(selected.category_id) : undefined}
        onClose={() => setSelected(null)}
      />
    </Container>
  );
}

function DeferredSheet({
  transaction,
  category,
  onClose,
}: {
  transaction: Transaction | null;
  category?: { name: string; icon: string; group: string };
  onClose: () => void;
}) {
  const reveal = useRevealDeferred();
  const remove = useDeleteDeferred();
  const [confirm, setConfirm] = useState<'reveal' | 'delete' | null>(null);

  const close = () => {
    setConfirm(null);
    onClose();
  };

  const act = async (action: 'reveal' | 'delete') => {
    if (!transaction) return;
    if (confirm !== action) {
      haptic('warning');
      setConfirm(action);
      return;
    }
    await (action === 'reveal' ? reveal : remove).mutateAsync(transaction.id);
    haptic('success');
    close();
  };

  return (
    <Drawer
      opened={transaction !== null}
      onClose={close}
      position="bottom"
      size="auto"
      radius="lg"
      title={category && (
        <Group gap="sm">
          <CategoryIcon icon={category.icon} tint={groupTint(category.group)} size={32} />
          <Text fw={700} size="lg">{category.name}</Text>
        </Group>
      )}
      styles={{ body: { paddingBottom: 'calc(16px + var(--monty-safe-bottom))' } }}
    >
      {transaction && (
        <Stack gap="sm">
          <AmountText value={-transaction.amount} tone="expense" fz={28} fw={800} />
          <Text size="sm" style={{ color: 'var(--monty-hint)' }}>
            {fullDateFormat.format(parseServerDate(transaction.transaction_date))}
            {transaction.comment ? ` · ${transaction.comment}` : ''}
          </Text>
          <Text size="xs" style={{ color: 'var(--monty-hint)' }}>
            После раскрытия расход станет обычным: появится в истории и бюджетах на дату покупки, без уведомлений.
          </Text>
          <Group grow mt="xs">
            <Button variant="light" color="red" size="md" loading={remove.isPending} onClick={() => act('delete')}>
              {confirm === 'delete' ? 'Удалить?' : 'Удалить'}
            </Button>
            <Button size="md" loading={reveal.isPending} onClick={() => act('reveal')}>
              {confirm === 'reveal' ? 'Раскрыть?' : 'Раскрыть'}
            </Button>
          </Group>
        </Stack>
      )}
    </Drawer>
  );
}
