import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  Box,
  Button,
  Chip,
  CloseButton,
  Container,
  Drawer,
  Group,
  NumberInput,
  ScrollArea,
  SegmentedControl,
  Skeleton,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { IconArrowsExchange, IconHistory, IconMinus, IconPlus, IconSearch } from '@tabler/icons-react';
import { haptic } from '../../lib/telegram';
import { EmptyState, ListRow, PageHeader, Section, useSnackbar } from '../../ui';
import { foodApi } from './api';
import { useWarehouseId } from './WarehouseContext';
import { useFoodMutation, useIngredients, useMovements, usePantry, useUnits } from './queries';
import { useWarehouses } from './WarehouseContext';
import { LOCATIONS, addDays, formatQty, isoDate, parseIsoDate, stepFor, stockNote, unitLabel } from './format';
import { ProductPicker } from './components/ProductPicker';
import { WarehouseSwitcher } from './components/WarehouseSwitcher';
import { QtyUnitInput } from './components/QtyUnitInput';
import type { Location, MovementKind, PantryItem } from './types';

type Filter = 'all' | 'attention' | Location;

const ATTENTION = new Set(['expired', 'expiring', 'low', 'out']);

export function PantryPage() {
  const navigate = useNavigate();
  const { data = [], isPending, isError, refetch } = usePantry();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<PantryItem | null>(null);
  const [adding, setAdding] = useState(false);
  const adjust = useFoodMutation(({ id, delta }: { id: number; delta: number }) => foodApi.adjustPantry(id, delta));

  const attentionCount = data.filter(i => ATTENTION.has(i.status)).length;
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data
      .filter(i => !q || i.ingredient_name.toLowerCase().includes(q))
      .filter(i => filter === 'all' || (filter === 'attention' ? ATTENTION.has(i.status) : i.location === filter));
  }, [data, filter, query]);
  const groups = LOCATIONS
    .map(l => ({ ...l, items: visible.filter(i => i.location === l.key) }))
    .filter(g => g.items.length > 0);

  return (
    <Container size="sm" pb="var(--monty-page-pb)">
      <PageHeader
        title="Запасы"
        onBack={() => navigate('/food')}
        right={
          <ActionIcon variant="filled" size="lg" radius="xl" aria-label="Добавить продукт" onClick={() => setAdding(true)}>
            <IconPlus size={20} />
          </ActionIcon>
        }
      />

      <WarehouseSwitcher />

      <Stack gap="sm" mt="sm">
        <TextInput
          placeholder="Найти продукт"
          leftSection={<IconSearch size={16} />}
          value={query}
          onChange={e => setQuery(e.currentTarget.value)}
          rightSection={query ? <CloseButton size="sm" aria-label="Очистить" onClick={() => setQuery('')} /> : null}
        />
        <ScrollArea type="never">
          <Group gap={6} wrap="nowrap">
            <Chip checked={filter === 'all'} onChange={() => setFilter('all')} radius="xl">Все · {data.length}</Chip>
            {attentionCount > 0 && (
              <Chip checked={filter === 'attention'} onChange={() => setFilter('attention')} radius="xl" color="orange">
                ⚠️ Внимание · {attentionCount}
              </Chip>
            )}
            {LOCATIONS.map(l => (
              <Chip key={l.key} checked={filter === l.key} onChange={() => setFilter(l.key)} radius="xl">{l.emoji} {l.label}</Chip>
            ))}
          </Group>
        </ScrollArea>
      </Stack>

      {isError ? (
        <EmptyState icon="⚠️" title="Не удалось загрузить" action={{ label: 'Повторить', onClick: () => void refetch() }} />
      ) : isPending ? (
        <Stack gap="md" mt="md">{[0, 1].map(i => <Skeleton key={i} h={140} radius="lg" />)}</Stack>
      ) : data.length === 0 ? (
        <EmptyState
          icon="🧺"
          title="Запасы пусты"
          description="Добавьте, что есть дома, — или завершите покупку в списке, и купленное появится здесь само."
          action={{ label: 'Добавить продукт', onClick: () => setAdding(true) }}
        />
      ) : groups.length === 0 ? (
        <ElsewhereHint query={query} />
      ) : (
        <Stack gap="lg" mt="md">
          {groups.map(group => (
            <Section key={group.key} title={`${group.emoji} ${group.label} · ${group.items.length}`}>
              {group.items.map((item, i) => (
                <StockRow
                  key={item.id}
                  item={item}
                  divider={i > 0}
                  onOpen={() => setEditing(item)}
                  onStep={delta => {
                    haptic('selection');
                    adjust.mutate({ id: item.id, delta });
                  }}
                />
              ))}
            </Section>
          ))}
        </Stack>
      )}

      <EditSheet item={editing} onClose={() => setEditing(null)} />
      <AddSheet opened={adding} onClose={() => setAdding(false)} />
    </Container>
  );
}

/** When a search finds nothing here, say which other warehouse has it («где лежит»). */
function ElsewhereHint({ query }: { query: string }) {
  const { current } = useWarehouses();
  const q = query.trim().toLowerCase();
  const all = usePantry('all');
  const elsewhere = q
    ? (all.data ?? []).filter(i => i.warehouse_id !== current?.id && i.quantity > 0 && i.ingredient_name.toLowerCase().includes(q))
    : [];
  if (!elsewhere.length) return <EmptyState icon="🔍" title="Ничего не найдено" />;
  return (
    <Section title="Есть на других складах" style={{ marginTop: 16 }}>
      {elsewhere.map((i, n) => (
        <ListRow key={i.id} divider={n > 0} title={i.ingredient_name} subtitle={i.warehouse_name}
          trailing={<Text size="sm" fw={500} className="monty-tabular">{formatQty(i.quantity, i.unit_code)}</Text>} />
      ))}
    </Section>
  );
}

function StockRow({ item, divider, onOpen, onStep }: { item: PantryItem; divider: boolean; onOpen: () => void; onStep: (delta: number) => void }) {
  const note = stockNote(item);
  const tone = note?.tone === 'danger' ? 'var(--monty-negative)' : note?.tone === 'warning' ? 'var(--monty-warning)' : 'var(--monty-hint)';
  const step = stepFor(item.unit_code);
  const empty = item.quantity <= 0;

  return (
    <Group wrap="nowrap" gap={8} pr={12} style={{ position: 'relative' }}>
      {divider && <Box aria-hidden style={{ position: 'absolute', top: 0, left: 16, right: 0, height: 1, transform: 'scaleY(0.5)', background: 'var(--monty-separator)' }} />}
      <UnstyledButton onClick={onOpen} className="monty-pressable" style={{ flex: 1, minWidth: 0, padding: '10px 0 10px 16px' }}>
        <Text fw={500} lineClamp={1} style={{ opacity: empty ? 0.55 : 1 }}>{item.ingredient_name}</Text>
        <Text size="xs" lineClamp={1} style={{ color: tone }}>
          {note?.text ?? (item.expires_on ? `до ${parseIsoDate(item.expires_on).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}` : ' ')}
        </Text>
      </UnstyledButton>
      <ActionIcon variant="default" radius="xl" size={30} aria-label={`Меньше: ${item.ingredient_name}`} disabled={empty} onClick={() => onStep(-step)}>
        <IconMinus size={14} />
      </ActionIcon>
      <Text fw={600} size="sm" w={64} ta="center" className="monty-tabular" style={{ whiteSpace: 'nowrap' }}>
        {formatQty(item.quantity, item.unit_code)}
      </Text>
      <ActionIcon variant="default" radius="xl" size={30} aria-label={`Больше: ${item.ingredient_name}`} onClick={() => onStep(step)}>
        <IconPlus size={14} />
      </ActionIcon>
    </Group>
  );
}

function ExpiryChips({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const today = new Date();
  const presets = [
    { label: '3 дня', date: isoDate(addDays(today, 3)) },
    { label: 'Неделя', date: isoDate(addDays(today, 7)) },
    { label: 'Месяц', date: isoDate(addDays(today, 30)) },
  ];
  const custom = value !== null && !presets.some(p => p.date === value);
  return (
    <Stack gap={6}>
      <Text size="sm" fw={500}>Годен до</Text>
      <Group gap={6}>
        <Chip checked={value === null} onChange={() => onChange(null)} radius="xl" size="sm">Без срока</Chip>
        {presets.map(p => (
          <Chip key={p.label} checked={value === p.date} onChange={() => onChange(p.date)} radius="xl" size="sm">{p.label}</Chip>
        ))}
        <Box component="label" style={{ position: 'relative' }}>
          <Chip checked={custom} onChange={() => {}} radius="xl" size="sm" tabIndex={-1}>
            {custom && value ? parseIsoDate(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : 'Дата…'}
          </Chip>
          <input
            type="date"
            aria-label="Своя дата"
            min={isoDate(today)}
            value={value ?? ''}
            onChange={e => onChange(e.target.value || null)}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
          />
        </Box>
      </Group>
    </Stack>
  );
}

function EditSheet({ item, onClose }: { item: PantryItem | null; onClose: () => void }) {
  const navigate = useNavigate();
  const snack = useSnackbar();
  const [form, setForm] = useState<{
    id: number; quantity: number | string; unitId: number; location: Location; expires: string | null; min: number | string;
  } | null>(null);
  const save = useFoodMutation((f: NonNullable<typeof form>) => foodApi.updatePantry(f.id, {
    quantity: typeof f.quantity === 'number' ? f.quantity : 0,
    unit_id: f.unitId,
    location: f.location,
    expires_on: f.expires,
    min_quantity: typeof f.min === 'number' && f.min > 0 ? f.min : null,
  }));
  const remove = useFoodMutation(foodApi.deletePantry);
  const { warehouses } = useWarehouses();
  const [historyFor, setHistoryFor] = useState<PantryItem | null>(null);
  const toList = useFoodMutation((p: PantryItem) => foodApi.addShoppingItem({
    label: p.ingredient_name, ingredient_id: p.ingredient_id,
  }));

  if (item && form?.id !== item.id) {
    setForm({
      id: item.id, quantity: item.quantity, unitId: item.unit_id, location: item.location,
      expires: item.expires_on, min: item.min_quantity ?? '',
    });
  }

  return (
    <Drawer opened={item !== null} onClose={onClose} position="bottom" size="auto" radius="lg"
      title={<Text fw={700} size="lg">{item?.ingredient_name}</Text>}
      styles={{ body: { paddingBottom: 'calc(16px + var(--monty-safe-bottom))' } }}>
      {form && item && (
        <Stack gap="md">
          <QtyUnitInput label="Сколько есть" quantity={form.quantity} unitId={form.unitId}
            onQuantity={v => setForm({ ...form, quantity: v })} onUnit={u => setForm({ ...form, unitId: u })} />
          <SegmentedControl
            fullWidth
            value={form.location}
            onChange={v => setForm({ ...form, location: v as Location })}
            data={LOCATIONS.map(l => ({ value: l.key, label: `${l.emoji} ${l.label}` }))}
            size="sm"
          />
          <ExpiryChips value={form.expires} onChange={v => setForm({ ...form, expires: v })} />
          <NumberInput
            label="Напомнить купить, когда меньше"
            description="Продукт появится в «Заканчивается» и попадёт в список одной кнопкой"
            placeholder="Не напоминать"
            value={form.min}
            onChange={v => setForm({ ...form, min: v })}
            min={0}
            decimalScale={2}
            decimalSeparator=","
            hideControls
            rightSection={<Text size="sm" pr="xs" style={{ color: 'var(--monty-hint)' }}>{unitLabel(item.unit_code)}</Text>}
            size="md"
          />
          <Button size="md" loading={save.isPending}
            onClick={async () => { await save.mutateAsync(form); haptic('success'); onClose(); }}>
            Сохранить
          </Button>
          <Group grow>
            {warehouses.length > 1 && item.quantity > 0 && (
              <Button variant="default" leftSection={<IconArrowsExchange size={16} />}
                onClick={() => { onClose(); navigate(`/food/transfers/new?from=${item.warehouse_id}&item=${item.id}`); }}>
                Переместить
              </Button>
            )}
            <Button variant="default" leftSection={<IconHistory size={16} />} onClick={() => setHistoryFor(item)}>
              История
            </Button>
          </Group>
          <Group grow>
            <Button variant="default" loading={toList.isPending}
              onClick={async () => {
                await toList.mutateAsync(item);
                haptic('success');
                snack(`«${item.ingredient_name}» в списке покупок`, { action: { label: 'Открыть', onClick: () => navigate('/food/shopping') } });
                onClose();
              }}>
              В список покупок
            </Button>
            <Button variant="light" color="red" loading={remove.isPending}
              onClick={async () => { await remove.mutateAsync(item.id); haptic('light'); onClose(); }}>
              Удалить
            </Button>
          </Group>
        </Stack>
      )}
      <MovementsSheet item={historyFor} onClose={() => setHistoryFor(null)} />
    </Drawer>
  );
}

const KIND_LABEL: Record<MovementKind, string> = {
  receipt: 'Поступление',
  purchase: 'Покупка',
  cook: 'Готовка',
  adjust: 'Корректировка',
  transfer_out: 'Перемещение',
  transfer_in: 'Перемещение',
  transfer_cancel: 'Отмена перемещения',
  writeoff: 'Списание',
};

const movedAt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function MovementsSheet({ item, onClose }: { item: PantryItem | null; onClose: () => void }) {
  const { data, isPending } = useMovements(item?.id ?? null);
  return (
    <Drawer opened={item !== null} onClose={onClose} position="bottom" size="70%" radius="lg"
      title={<Text fw={700} size="lg">История · {item?.ingredient_name}</Text>}
      styles={{ body: { paddingBottom: 'calc(16px + var(--monty-safe-bottom))' } }}>
      {isPending ? <Skeleton h={160} radius="lg" /> : !data?.length ? (
        <EmptyState icon="🗒️" title="Движений пока нет" />
      ) : (
        <Section>
          {data.map((m, i) => (
            <ListRow
              key={m.id}
              divider={i > 0}
              title={`${KIND_LABEL[m.kind]}${m.transfer_number ? ` № ${m.transfer_number}` : ''}`}
              subtitle={[movedAt.format(new Date(/[zZ]$/.test(m.created_at) ? m.created_at : `${m.created_at}Z`)), m.note, m.user_name]
                .filter(Boolean).join(' · ')}
              trailing={
                <Text fw={600} className="monty-tabular" style={{ color: m.quantity > 0 ? 'var(--monty-income)' : 'var(--monty-text)', whiteSpace: 'nowrap' }}>
                  {m.quantity > 0 ? '+' : '−'}{formatQty(Math.abs(m.quantity), m.unit_code)}
                </Text>
              }
            />
          ))}
        </Section>
      )}
    </Drawer>
  );
}

function AddSheet({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const snack = useSnackbar();
  const { data: units = [] } = useUnits();
  const { data: ingredients = [] } = useIngredients();
  const [name, setName] = useState('');
  const [ingredientId, setIngredientId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number | string>(1);
  const [unitId, setUnitId] = useState<number | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [expires, setExpires] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wid = useWarehouseId();
  const add = useFoodMutation(foodApi.addPantry);

  const pcs = units.find(u => u.code === 'pcs')?.id ?? null;
  const effectiveUnit = unitId ?? pcs;

  const reset = () => {
    setName(''); setIngredientId(null); setQuantity(1); setUnitId(null); setLocation(null); setExpires(null); setError(null);
  };

  const submit = async () => {
    if (!name.trim() || !effectiveUnit || typeof quantity !== 'number' || quantity <= 0) return;
    setError(null);
    try {
      await add.mutateAsync({
        ingredient_id: ingredientId, name: name.trim(), quantity, unit_id: effectiveUnit,
        location, expires_on: expires, warehouse_id: wid,
      });
      haptic('success');
      snack(`«${name.trim()}» добавлено в запасы`);
      reset();
      onClose();
    } catch (e: unknown) {
      haptic('error');
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Не удалось добавить');
    }
  };

  return (
    <Drawer opened={opened} onClose={() => { reset(); onClose(); }} position="bottom" size="auto" radius="lg"
      title={<Text fw={700} size="lg">Добавить в запасы</Text>}
      styles={{ body: { paddingBottom: 'calc(16px + var(--monty-safe-bottom))' } }}>
      <Stack gap="md">
        <ProductPicker
          label="Продукт"
          placeholder="Например, молоко"
          value={name}
          onChange={(value, ingredient) => {
            setName(value);
            setIngredientId(ingredient?.id ?? null);
            if (ingredient) setUnitId(ingredient.default_unit_id);
          }}
          size="md"
          data-autofocus
        />
        <QtyUnitInput label="Количество" quantity={quantity} unitId={effectiveUnit} onQuantity={setQuantity} onUnit={setUnitId} />
        <Stack gap={6}>
          <Text size="sm" fw={500}>Где хранится</Text>
          <SegmentedControl
            fullWidth
            value={location ?? 'auto'}
            onChange={v => setLocation(v === 'auto' ? null : (v as Location))}
            data={[{ value: 'auto', label: 'Авто' }, ...LOCATIONS.map(l => ({ value: l.key, label: l.label }))]}
            size="xs"
          />
        </Stack>
        <ExpiryChips value={expires} onChange={setExpires} />
        {error && <Text size="sm" c="red">{error}</Text>}
        <Button size="md" loading={add.isPending} disabled={!name.trim() || !(typeof quantity === 'number' && quantity > 0)} onClick={submit}>
          Добавить
        </Button>
        {ingredients.length === 0 && (
          <Text size="xs" ta="center" style={{ color: 'var(--monty-hint)' }}>Новые продукты сохраняются в справочник автоматически</Text>
        )}
      </Stack>
    </Drawer>
  );
}
