import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Box, Button, Container, Group, Skeleton, Stack, Text } from '@mantine/core';
import { IconArrowRight, IconPlus } from '@tabler/icons-react';
import { haptic } from '../../lib/telegram';
import { EmptyState, PageHeader, useSnackbar } from '../../ui';
import { foodApi } from './api';
import { useFoodMutation, useTransfers } from './queries';
import { formatQty } from './format';
import type { Transfer } from './types';

const when = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function serverDate(iso: string) {
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
}

/** Журнал перемещений: posted documents, newest first; a document can be cancelled (unposted). */
export function TransfersPage() {
  const navigate = useNavigate();
  const { data, isPending } = useTransfers();

  return (
    <Container size="sm" pb="calc(24px + var(--monty-safe-bottom))">
      <PageHeader title="Перемещения" onBack={() => navigate(-1)} right={
        <Button size="xs" radius="xl" leftSection={<IconPlus size={14} />} onClick={() => navigate('/food/transfers/new')}>Новое</Button>
      } />
      {isPending ? (
        <Stack gap="sm" mt="md">{[0, 1].map(i => <Skeleton key={i} h={110} radius="lg" />)}</Stack>
      ) : !data?.length ? (
        <EmptyState icon="🚚" title="Перемещений ещё не было"
          description="Перевозите продукты между квартирами — остатки на обоих складах поменяются сами."
          action={{ label: 'Новое перемещение', onClick: () => navigate('/food/transfers/new') }} />
      ) : (
        <Stack gap="sm" mt="md">{data.map(doc => <TransferCard key={doc.id} doc={doc} />)}</Stack>
      )}
    </Container>
  );
}

function TransferCard({ doc }: { doc: Transfer }) {
  const snack = useSnackbar();
  const [confirm, setConfirm] = useState(false);
  const cancel = useFoodMutation(() => foodApi.cancelTransfer(doc.id));
  const cancelled = doc.cancelled_at !== null;

  const doCancel = async () => {
    if (!confirm) {
      haptic('warning');
      setConfirm(true);
      return;
    }
    try {
      await cancel.mutateAsync(undefined);
      haptic('success');
      snack(`Перемещение № ${doc.number} отменено — продукты вернулись на «${doc.from_warehouse_name}»`);
    } catch (e) {
      haptic('error');
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      snack(typeof detail === 'string' ? detail : 'Не удалось отменить', { duration: 6000 });
    } finally {
      setConfirm(false);
    }
  };

  return (
    <Box p="md" style={{ background: 'var(--monty-surface)', borderRadius: 'var(--monty-radius-card)', opacity: cancelled ? 0.6 : 1 }}>
      <Group justify="space-between" wrap="nowrap" mb={6}>
        <Text fw={700}>№ {doc.number}</Text>
        {cancelled ? <Badge color="gray" variant="light">Отменён</Badge> : <Badge color="teal" variant="light">Проведён</Badge>}
      </Group>
      <Group gap={6} wrap="nowrap" mb={4}>
        <Text fw={500} lineClamp={1}>{doc.from_warehouse_name}</Text>
        <IconArrowRight size={16} style={{ color: 'var(--monty-hint)', flexShrink: 0 }} />
        <Text fw={500} lineClamp={1}>{doc.to_warehouse_name}</Text>
      </Group>
      <Text size="xs" mb="sm" style={{ color: 'var(--monty-hint)' }}>
        {when.format(serverDate(doc.created_at))}{doc.user_name ? ` · ${doc.user_name}` : ''}{doc.comment ? ` · ${doc.comment}` : ''}
      </Text>
      <Stack gap={4}>
        {doc.lines.map(line => (
          <Group key={line.ingredient_id} justify="space-between" wrap="nowrap">
            <Text size="sm" lineClamp={1}>{line.ingredient_name}</Text>
            <Text size="sm" fw={500} className="monty-tabular" style={{ color: 'var(--monty-subtitle)', whiteSpace: 'nowrap' }}>
              {formatQty(line.quantity, line.unit_code)}
            </Text>
          </Group>
        ))}
      </Stack>
      {!cancelled && (
        <Button mt="sm" variant={confirm ? 'light' : 'subtle'} color="red" size="xs" loading={cancel.isPending} onClick={doCancel}>
          {confirm ? 'Точно отменить? Вернуть всё обратно' : 'Отменить проведение'}
        </Button>
      )}
    </Box>
  );
}
