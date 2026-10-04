import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  UnstyledButton,
} from '@mantine/core';
import { IconArrowDown, IconPlus, IconTrash } from '@tabler/icons-react';
import { haptic } from '../../lib/telegram';
import { EmptyState, PageHeader, Section, useSnackbar } from '../../ui';
import { foodApi } from './api';
import { useFoodMutation, usePantry } from './queries';
import { useWarehouses } from './WarehouseContext';
import { formatQty, unitLabel } from './format';
import type { PantryItem } from './types';

interface Line {
  key: number;
  itemId: number | null;
  quantity: number | string;
}

let lineKey = 0;
const newLine = (itemId: number | null = null): Line => ({ key: ++lineKey, itemId, quantity: '' });

function errorText(e: unknown) {
  const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === 'string' ? detail : 'Не удалось провести перемещение';
}

/** Перемещение: pick source and target warehouses, then lines from the source's stock. */
export function TransferNewPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const snack = useSnackbar();
  const { warehouses, current } = useWarehouses();
  const [fromId, setFromId] = useState<number | null>(() => Number(params.get('from')) || null);
  const [toId, setToId] = useState<number | null>(null);
  const [lines, setLines] = useState<Line[]>(() => [newLine(Number(params.get('item')) || null)]);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const source = warehouses.find(w => w.id === (fromId ?? current?.id)) ?? null;
  const target = warehouses.find(w => w.id === toId) ?? warehouses.find(w => w.id !== source?.id) ?? null;
  const stock = usePantry(source?.id ?? 0);
  const available = useMemo(() => (stock.data ?? []).filter(i => i.quantity > 0), [stock.data]);
  const byId = useMemo(() => new Map(available.map(i => [i.id, i])), [available]);

  const post = useFoodMutation(foodApi.createTransfer);

  const setLine = (key: number, patch: Partial<Line>) => setLines(ls => ls.map(l => (l.key === key ? { ...l, ...patch } : l)));
  const chosen = new Set(lines.map(l => l.itemId).filter(Boolean));
  const ready = lines.filter(l => l.itemId && typeof l.quantity === 'number' && l.quantity > 0);
  const over = ready.some(l => (l.quantity as number) > (byId.get(l.itemId!)?.quantity ?? 0));
  const canPost = source && target && source.id !== target.id && ready.length > 0 && !over;

  const submit = async () => {
    if (!canPost || !source || !target) return;
    setError(null);
    try {
      const doc = await post.mutateAsync({
        from_warehouse_id: source.id,
        to_warehouse_id: target.id,
        comment: comment.trim() || null,
        lines: ready.map(l => {
          const item = byId.get(l.itemId!)!;
          return { ingredient_id: item.ingredient_id, quantity: l.quantity as number, unit_id: item.unit_id };
        }),
      });
      haptic('success');
      snack(`Перемещение № ${doc.number} проведено: ${doc.lines.length} поз.`, {
        action: { label: 'Журнал', onClick: () => navigate('/food/transfers') },
      });
      navigate(-1);
    } catch (e) {
      haptic('error');
      setError(errorText(e));
    }
  };

  if (warehouses.length < 2) {
    return (
      <Container size="sm">
        <PageHeader title="Перемещение" onBack={() => navigate(-1)} />
        <EmptyState icon="🏠" title="Нужен второй склад" description="Создайте ещё один склад — и между ними можно будет перемещать продукты." />
      </Container>
    );
  }

  const warehouseOptions = warehouses.map(w => ({ value: String(w.id), label: `${w.emoji} ${w.name}` }));

  return (
    <Container size="sm" pb="calc(96px + var(--monty-safe-bottom))">
      <PageHeader title="Перемещение" onBack={() => navigate(-1)} />

      <Stack gap="lg" mt="md">
        <Section padded>
          <Stack gap={4}>
            <Select label="Откуда" data={warehouseOptions} value={source ? String(source.id) : null}
              onChange={v => { if (v) { setFromId(Number(v)); setLines([newLine()]); if (Number(v) === target?.id) setToId(null); } }}
              allowDeselect={false} size="md" comboboxProps={{ withinPortal: true }} />
            <Box ta="center" style={{ color: 'var(--monty-hint)' }}><IconArrowDown size={18} /></Box>
            <Select label="Куда" data={warehouseOptions.filter(o => o.value !== String(source?.id))}
              value={target ? String(target.id) : null} onChange={v => v && setToId(Number(v))}
              allowDeselect={false} size="md" comboboxProps={{ withinPortal: true }} />
          </Stack>
        </Section>

        <Section title="Что перемещаем" footer={source ? `Показаны продукты в наличии на складе «${source.name}».` : undefined}>
          {stock.isPending ? (
            <Skeleton h={80} />
          ) : available.length === 0 ? (
            <EmptyState icon="📦" title="На складе пусто" description="Выберите другой склад отправления." />
          ) : (
            <Stack gap={0}>
              {lines.map((line, i) => (
                <TransferLine
                  key={line.key}
                  line={line}
                  divider={i > 0}
                  items={available.filter(it => it.id === line.itemId || !chosen.has(it.id))}
                  item={line.itemId ? byId.get(line.itemId) ?? null : null}
                  onChange={patch => setLine(line.key, patch)}
                  onRemove={() => setLines(ls => (ls.length > 1 ? ls.filter(l => l.key !== line.key) : [newLine()]))}
                />
              ))}
              {lines.length < available.length && (
                <Box p="sm">
                  <Button variant="subtle" leftSection={<IconPlus size={16} />} onClick={() => setLines(ls => [...ls, newLine()])}>
                    Добавить продукт
                  </Button>
                </Box>
              )}
            </Stack>
          )}
        </Section>

        <TextInput label="Комментарий" placeholder="Например, везём на дачу" value={comment}
          onChange={e => setComment(e.currentTarget.value)} maxLength={300} size="md" />

        {error && <Alert color="red" variant="light">{error}</Alert>}
      </Stack>

      <Box style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 140, padding: '8px 16px calc(12px + var(--monty-safe-bottom))', background: 'linear-gradient(to top, var(--monty-bg) 75%, transparent)' }}>
        <Container size="sm" p={0}>
          <Button fullWidth size="lg" disabled={!canPost} loading={post.isPending} onClick={submit}>
            {ready.length ? `Провести · ${ready.length} поз.` : 'Провести'}
          </Button>
        </Container>
      </Box>
    </Container>
  );
}

function TransferLine({ line, divider, items, item, onChange, onRemove }: {
  line: Line;
  divider: boolean;
  items: PantryItem[];
  item: PantryItem | null;
  onChange: (patch: Partial<Line>) => void;
  onRemove: () => void;
}) {
  const over = item && typeof line.quantity === 'number' && line.quantity > item.quantity;
  return (
    <Box px="md" py="sm" style={{ borderTop: divider ? '0.5px solid var(--monty-separator)' : undefined }}>
      <Group gap={8} wrap="nowrap" align="flex-start">
        <Stack gap={8} style={{ flex: 1, minWidth: 0 }}>
          <Select
            aria-label="Продукт"
            placeholder="Продукт"
            searchable
            data={items.map(it => ({ value: String(it.id), label: `${it.ingredient_name} · ${formatQty(it.quantity, it.unit_code)}` }))}
            value={line.itemId ? String(line.itemId) : null}
            onChange={v => onChange({ itemId: v ? Number(v) : null, quantity: '' })}
            comboboxProps={{ withinPortal: true }}
            nothingFoundMessage="Нет в наличии"
          />
          {item && (
            <Group gap={8} wrap="nowrap">
              <NumberInput
                aria-label="Количество"
                value={line.quantity}
                onChange={v => onChange({ quantity: v })}
                min={0}
                max={item.quantity}
                decimalScale={2}
                decimalSeparator=","
                hideControls
                rightSection={<Text size="sm" pr="xs" style={{ color: 'var(--monty-hint)' }}>{unitLabel(item.unit_code)}</Text>}
                error={over ? `Есть только ${formatQty(item.quantity, item.unit_code)}` : undefined}
                style={{ flex: 1 }}
              />
              <UnstyledButton
                onClick={() => onChange({ quantity: item.quantity })}
                style={{ padding: '0 12px', height: 36, borderRadius: 18, background: 'var(--monty-accent-soft)', color: 'var(--monty-accent)', fontWeight: 600, fontSize: 14 }}
              >
                Всё
              </UnstyledButton>
            </Group>
          )}
        </Stack>
        <ActionIcon variant="subtle" color="red" radius="xl" mt={4} aria-label="Убрать строку" onClick={onRemove}>
          <IconTrash size={18} />
        </ActionIcon>
      </Group>
    </Box>
  );
}
