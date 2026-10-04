import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  Box,
  Button,
  Container,
  Drawer,
  Group,
  Menu,
  NumberInput,
  Select,
  Skeleton,
  Stack,
  Switch,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { IconCheck, IconDots, IconMenu2, IconPlus, IconRefreshAlert } from '@tabler/icons-react';
import { haptic } from '../../lib/telegram';
import { EmptyState, PageHeader, Section, formatMoney, useSnackbar } from '../../ui';
import { foodApi } from './api';
import { useCompleteShopping, useFoodMutation, useIngredients, useShoppingList, useUnits } from './queries';
import { AISLES, addDays, formatQty, isoDate, parseQuickAdd, startOfWeek } from './format';
import { QtyUnitInput } from './components/QtyUnitInput';
import { ProductPicker } from './components/ProductPicker';
import { findIngredient, unitIdByCode } from './lookup';
import type { Aisle, ShoppingItem } from './types';

export function ShoppingPage() {
  const navigate = useNavigate();
  const snack = useSnackbar();
  const { data: list, isPending, isError, refetch } = useShoppingList();
  const { data: units = [] } = useUnits();
  const { data: ingredients = [] } = useIngredients();
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<ShoppingItem | null>(null);
  const [completing, setCompleting] = useState(false);

  const add = useFoodMutation(foodApi.addShoppingItem);
  const toggle = useFoodMutation(({ id, checked }: { id: number; checked: boolean }) => foodApi.updateShoppingItem(id, { checked }));
  const fromMenu = useFoodMutation(() => {
    const today = new Date();
    return foodApi.shoppingFromMenu(isoDate(today), isoDate(addDays(startOfWeek(today), 6)));
  });
  const lowStock = useFoodMutation(foodApi.shoppingLowStock);

  const items = useMemo(() => list?.items ?? [], [list]);
  const open = items.filter(i => !i.checked);
  const bought = items.filter(i => i.checked);
  const groups = useMemo(() => AISLES
    .map(a => ({ ...a, items: open.filter(i => i.category === a.key) }))
    .filter(g => g.items.length > 0), [open]);

  const submit = async () => {
    const parsed = parseQuickAdd(draft);
    if (!parsed.label) return;
    const known = findIngredient(ingredients, parsed.label);
    haptic('light');
    setDraft('');
    await add.mutateAsync({
      label: known?.name ?? parsed.label,
      quantity: parsed.quantity,
      unit_id: unitIdByCode(units, parsed.unitCode),
      ingredient_id: known?.id ?? null,
    });
  };

  const fill = async (kind: 'menu' | 'low') => {
    const res = kind === 'menu' ? await fromMenu.mutateAsync(undefined) : await lowStock.mutateAsync(undefined);
    haptic('success');
    snack(res.added ? `Добавлено позиций: ${res.added}` : kind === 'menu' ? 'Всё для меню уже есть' : 'Ничего не заканчивается');
  };

  return (
    <Container size="sm" pb={bought.length ? 'calc(var(--monty-page-pb) + 64px)' : 'var(--monty-page-pb)'}>
      <PageHeader
        title="Покупки"
        onBack={() => navigate('/food')}
        right={
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon variant="subtle" size="lg" radius="xl" aria-label="Заполнить список">
                <IconDots size={20} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconMenu2 size={16} />} onClick={() => void fill('menu')}>Из меню до конца недели</Menu.Item>
              <Menu.Item leftSection={<IconRefreshAlert size={16} />} onClick={() => void fill('low')}>То, что заканчивается</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        }
      />

      {/* Quick add */}
      <Box mt="sm" style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--monty-bg)', paddingBottom: 8, paddingTop: 4 }}>
        <ProductPicker
          value={draft}
          onChange={name => setDraft(name)}
          placeholder="Добавить: молоко 2 л"
          aria-label="Добавить в список"
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void submit();
            }
          }}
          rightSection={
            <ActionIcon variant="filled" radius="xl" aria-label="Добавить" disabled={!draft.trim()} onClick={() => void submit()} loading={add.isPending}>
              <IconPlus size={18} />
            </ActionIcon>
          }
          size="md"
          radius="xl"
        />
      </Box>

      {isError ? (
        <EmptyState icon="⚠️" title="Не удалось загрузить" action={{ label: 'Повторить', onClick: () => void refetch() }} />
      ) : isPending ? (
        <Stack gap="md" mt="sm">{[0, 1].map(i => <Skeleton key={i} h={120} radius="lg" />)}</Stack>
      ) : items.length === 0 ? (
        <Stack mt="md" gap="sm">
          <EmptyState icon="🛒" title="Список пуст" description="Добавьте продукт выше или соберите список автоматически." />
          <Button variant="light" size="md" loading={fromMenu.isPending} onClick={() => void fill('menu')}>Собрать из меню</Button>
          <Button variant="default" size="md" loading={lowStock.isPending} onClick={() => void fill('low')}>Что заканчивается дома</Button>
        </Stack>
      ) : (
        <Stack gap="lg" mt="xs">
          {groups.map(group => (
            <Section key={group.key} title={`${group.emoji} ${group.label} · ${group.items.length}`}>
              {group.items.map((item, i) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  divider={i > 0}
                  onToggle={() => {
                    haptic('light');
                    toggle.mutate({ id: item.id, checked: true });
                  }}
                  onEdit={() => setEditing(item)}
                />
              ))}
            </Section>
          ))}
          {open.length === 0 && (
            <Text ta="center" size="sm" style={{ color: 'var(--monty-hint)' }}>Всё куплено 🎉 Завершите покупку внизу.</Text>
          )}
          {bought.length > 0 && (
            <Section title={`В корзине · ${bought.length}`}>
              {bought.map((item, i) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  divider={i > 0}
                  onToggle={() => {
                    haptic('light');
                    toggle.mutate({ id: item.id, checked: false });
                  }}
                  onEdit={() => setEditing(item)}
                />
              ))}
            </Section>
          )}
        </Stack>
      )}

      {bought.length > 0 && (
        <Box
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 'calc(var(--monty-tabbar-h) + var(--monty-safe-bottom))',
            padding: '8px 16px',
            zIndex: 140,
            background: 'linear-gradient(to top, var(--monty-bg) 70%, transparent)',
          }}
        >
          <Container size="sm" p={0}>
            <Button fullWidth size="lg" onClick={() => setCompleting(true)}>
              Завершить покупку · {bought.length}
            </Button>
          </Container>
        </Box>
      )}

      <EditItemSheet item={editing} onClose={() => setEditing(null)} />
      <CompleteSheet opened={completing} count={bought.length} onClose={() => setCompleting(false)} />
    </Container>
  );
}

function ItemRow({ item, divider, onToggle, onEdit }: { item: ShoppingItem; divider: boolean; onToggle: () => void; onEdit: () => void }) {
  return (
    <Group wrap="nowrap" gap={0} style={{ position: 'relative' }}>
      {divider && <Box aria-hidden style={{ position: 'absolute', top: 0, left: 56, right: 0, height: 1, transform: 'scaleY(0.5)', background: 'var(--monty-separator)' }} />}
      <UnstyledButton
        onClick={onToggle}
        role="checkbox"
        aria-checked={item.checked}
        aria-label={item.label}
        style={{ padding: '14px 12px 14px 16px', display: 'grid', placeItems: 'center' }}
      >
        <Box
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            border: item.checked ? 'none' : '2px solid var(--monty-separator)',
            background: item.checked ? 'var(--monty-accent)' : 'transparent',
            color: 'var(--monty-accent-text)',
            transition: 'background 150ms ease',
          }}
        >
          {item.checked && <IconCheck size={16} stroke={3} />}
        </Box>
      </UnstyledButton>
      <UnstyledButton onClick={onEdit} className="monty-pressable" style={{ flex: 1, minWidth: 0, padding: '10px 16px 10px 0' }}>
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Stack gap={0} style={{ minWidth: 0 }}>
            <Text
              fw={500}
              lineClamp={1}
              style={{ textDecoration: item.checked ? 'line-through' : undefined, color: item.checked ? 'var(--monty-hint)' : undefined }}
            >
              {item.label}
            </Text>
            {item.sources && <Text size="xs" lineClamp={1} style={{ color: 'var(--monty-hint)' }}>для: {item.sources}</Text>}
          </Stack>
          {item.quantity != null && (
            <Text size="sm" fw={500} className="monty-tabular" style={{ color: 'var(--monty-hint)', whiteSpace: 'nowrap' }}>
              {formatQty(item.quantity, item.unit_code)}
            </Text>
          )}
        </Group>
      </UnstyledButton>
    </Group>
  );
}

function EditItemSheet({ item, onClose }: { item: ShoppingItem | null; onClose: () => void }) {
  const [form, setForm] = useState<{ id: number; label: string; quantity: number | string; unitId: number | null; category: Aisle } | null>(null);
  const save = useFoodMutation((f: NonNullable<typeof form>) => foodApi.updateShoppingItem(f.id, {
    label: f.label.trim(),
    quantity: typeof f.quantity === 'number' && f.quantity > 0 ? f.quantity : null,
    unit_id: typeof f.quantity === 'number' && f.quantity > 0 ? f.unitId : null,
    category: f.category,
  }));
  const remove = useFoodMutation(foodApi.deleteShoppingItem);

  if (item && form?.id !== item.id) {
    setForm({ id: item.id, label: item.label, quantity: item.quantity ?? '', unitId: item.unit_id, category: item.category });
  }

  return (
    <Drawer opened={item !== null} onClose={onClose} position="bottom" size="auto" radius="lg"
      title={<Text fw={700} size="lg">Позиция</Text>}
      styles={{ body: { paddingBottom: 'calc(16px + var(--monty-safe-bottom))' } }}>
      {form && (
        <Stack gap="sm">
          <TextInput label="Название" value={form.label} onChange={e => setForm({ ...form, label: e.currentTarget.value })} size="md" />
          <QtyUnitInput
            label="Сколько"
            quantity={form.quantity}
            unitId={form.unitId}
            onQuantity={v => setForm({ ...form, quantity: v })}
            onUnit={u => setForm({ ...form, unitId: u })}
          />
          <Select
            label="Отдел"
            data={AISLES.map(a => ({ value: a.key, label: `${a.emoji} ${a.label}` }))}
            value={form.category}
            onChange={v => v && setForm({ ...form, category: v as Aisle })}
            allowDeselect={false}
            size="md"
            comboboxProps={{ withinPortal: true, zIndex: 1000 }}
          />
          <Group grow mt="xs">
            <Button variant="light" color="red" size="md" loading={remove.isPending}
              onClick={async () => { await remove.mutateAsync(form.id); haptic('light'); onClose(); }}>
              Удалить
            </Button>
            <Button size="md" disabled={!form.label.trim()} loading={save.isPending}
              onClick={async () => { await save.mutateAsync(form); haptic('success'); onClose(); }}>
              Сохранить
            </Button>
          </Group>
        </Stack>
      )}
    </Drawer>
  );
}

function CompleteSheet({ opened, count, onClose }: { opened: boolean; count: number; onClose: () => void }) {
  const snack = useSnackbar();
  const complete = useCompleteShopping();
  const [toPantry, setToPantry] = useState(true);
  const [total, setTotal] = useState<number | string>('');
  const [error, setError] = useState<string | null>(null);
  const amount = typeof total === 'number' && total > 0 ? Math.round(total) : null;

  const finish = async () => {
    setError(null);
    try {
      const res = await complete.mutateAsync({ to_pantry: toPantry, total_amount: amount });
      haptic('success');
      const parts = [
        res.moved_to_pantry ? `в запасы: ${res.moved_to_pantry}` : null,
        res.transaction_id && amount ? `расход ${formatMoney(amount)}` : null,
      ].filter(Boolean);
      snack(parts.length ? `Готово — ${parts.join(', ')}` : 'Покупка завершена');
      if (res.skipped.length) snack(`Не добавлено в запасы (другие единицы): ${res.skipped.join(', ')}`, { duration: 6000 });
      setTotal('');
      onClose();
    } catch {
      haptic('error');
      setError('Не удалось завершить покупку. Попробуйте ещё раз.');
    }
  };

  return (
    <Drawer opened={opened} onClose={onClose} position="bottom" size="auto" radius="lg"
      title={<Text fw={700} size="lg">Завершить покупку</Text>}
      styles={{ body: { paddingBottom: 'calc(16px + var(--monty-safe-bottom))' } }}>
      <Stack gap="md">
        <Text size="sm" style={{ color: 'var(--monty-hint)' }}>
          Куплено позиций: {count}. Некупленное останется в новом списке.
        </Text>
        <Switch
          checked={toPantry}
          onChange={e => setToPantry(e.currentTarget.checked)}
          label="Положить купленное в запасы"
          description="Количество прибавится к тому, что уже есть дома"
          size="md"
        />
        <NumberInput
          label="Сумма чека"
          description="Если указать — запишем расход в «Продукты» в финансах"
          placeholder="Необязательно"
          value={total}
          onChange={setTotal}
          min={0}
          thousandSeparator=" "
          suffix=" ₸"
          allowDecimal={false}
          allowNegative={false}
          hideControls
          size="md"
        />
        {error && <Text size="sm" c="red">{error}</Text>}
        <Button size="md" loading={complete.isPending} onClick={finish}>
          {amount ? `Готово · ${formatMoney(amount)}` : 'Готово'}
        </Button>
      </Stack>
    </Drawer>
  );
}

