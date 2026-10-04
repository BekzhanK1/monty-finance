import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ActionIcon,
  Box,
  Button,
  Drawer,
  Group,
  Menu,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { IconArrowsExchange, IconCheck, IconChevronDown, IconDots, IconHistory, IconPlus } from '@tabler/icons-react';
import { haptic } from '../../../lib/telegram';
import { Section, useSnackbar } from '../../../ui';
import { foodApi } from '../api';
import { foodKeys } from '../queries';
import { useWarehouses, warehousesKey } from '../WarehouseContext';
import type { Warehouse } from '../types';

const EMOJIS = ['🏠', '🏢', '🏡', '🏘️', '🏖️', '🏕️', '🧊', '📦'];

function errorText(e: unknown, fallback: string) {
  const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === 'string' ? detail : fallback;
}

/** Pill under the page title: which flat the screen is about; tap to switch or manage. */
export function WarehouseSwitcher() {
  const { current } = useWarehouses();
  const [open, setOpen] = useState(false);
  if (!current) return <Box h={32} />;
  return (
    <>
      <UnstyledButton
        onClick={() => {
          haptic('light');
          setOpen(true);
        }}
        className="monty-pressable"
        aria-label={`Склад: ${current.name}. Сменить склад`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 12px',
          borderRadius: 999,
          background: 'var(--monty-surface)',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        <span aria-hidden>{current.emoji}</span>
        {current.name}
        <IconChevronDown size={14} style={{ color: 'var(--monty-hint)' }} />
      </UnstyledButton>
      <WarehousesSheet opened={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function WarehousesSheet({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const snack = useSnackbar();
  const queryClient = useQueryClient();
  const { warehouses, current, select } = useWarehouses();
  const [editing, setEditing] = useState<Warehouse | 'new' | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: foodKeys.all });

  const remove = async (w: Warehouse) => {
    try {
      await foodApi.deleteWarehouse(w.id);
      haptic('success');
      snack(`Склад «${w.name}» удалён`);
      await queryClient.invalidateQueries({ queryKey: warehousesKey });
    } catch (e) {
      haptic('error');
      snack(errorText(e, 'Не удалось удалить склад'), { duration: 5000 });
    }
  };

  return (
    <Drawer
      opened={opened}
      onClose={() => {
        setEditing(null);
        onClose();
      }}
      position="bottom"
      size="auto"
      radius="lg"
      title={<Text fw={700} size="lg">{editing ? (editing === 'new' ? 'Новый склад' : 'Склад') : 'Склады'}</Text>}
      styles={{ body: { paddingBottom: 'calc(16px + var(--monty-safe-bottom))' } }}
    >
      {editing ? (
        <WarehouseForm
          warehouse={editing === 'new' ? null : editing}
          onDone={async created => {
            await refresh();
            if (created) select(created.id);
            setEditing(null);
          }}
        />
      ) : (
        <Stack gap="md">
          <Section>
            {warehouses.map((w, i) => (
              <Group key={w.id} wrap="nowrap" gap={0} pr={8} style={{ borderTop: i > 0 ? '0.5px solid var(--monty-separator)' : undefined }}>
                <UnstyledButton
                  onClick={() => {
                    haptic('selection');
                    select(w.id);
                    onClose();
                  }}
                  aria-pressed={current?.id === w.id}
                  className="monty-pressable"
                  style={{ flex: 1, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <Text fz={24} lh={1} aria-hidden>{w.emoji}</Text>
                  <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={600} lineClamp={1}>{w.name}{w.is_default ? <Text span size="xs" fw={400} style={{ color: 'var(--monty-hint)' }}> · основной</Text> : null}</Text>
                    <Text size="xs" style={{ color: w.attention_count ? 'var(--monty-warning)' : 'var(--monty-hint)' }}>
                      {w.items_count} в наличии{w.attention_count ? ` · ⚠️ ${w.attention_count}` : ''}
                    </Text>
                  </Stack>
                  {current?.id === w.id && <IconCheck size={20} style={{ color: 'var(--monty-accent)' }} />}
                </UnstyledButton>
                <Menu position="bottom-end" withinPortal zIndex={1000}>
                  <Menu.Target>
                    <ActionIcon variant="subtle" radius="xl" aria-label={`Действия: ${w.name}`}><IconDots size={18} /></ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item onClick={() => setEditing(w)}>Переименовать</Menu.Item>
                    {!w.is_default && (
                      <Menu.Item onClick={async () => { await foodApi.updateWarehouse(w.id, { is_default: true }); await refresh(); }}>
                        Сделать основным
                      </Menu.Item>
                    )}
                    {!w.is_default && <Menu.Item color="red" onClick={() => void remove(w)}>Удалить</Menu.Item>}
                  </Menu.Dropdown>
                </Menu>
              </Group>
            ))}
          </Section>

          <Button variant="light" leftSection={<IconPlus size={18} />} onClick={() => setEditing('new')}>Новый склад</Button>
          {warehouses.length > 1 && (
            <Group grow>
              <Button variant="default" leftSection={<IconArrowsExchange size={18} />}
                onClick={() => { onClose(); navigate('/food/transfers/new'); }}>
                Перемещение
              </Button>
              <Button variant="default" leftSection={<IconHistory size={18} />}
                onClick={() => { onClose(); navigate('/food/transfers'); }}>
                Журнал
              </Button>
            </Group>
          )}
          <Text size="xs" ta="center" style={{ color: 'var(--monty-hint)' }}>
            У каждого склада свои остатки. Меню, рецепты и готовка смотрят на выбранный склад.
          </Text>
        </Stack>
      )}
    </Drawer>
  );
}

function WarehouseForm({ warehouse, onDone }: { warehouse: Warehouse | null; onDone: (created: Warehouse | null) => void }) {
  const snack = useSnackbar();
  const [name, setName] = useState(warehouse?.name ?? '');
  const [emoji, setEmoji] = useState(warehouse?.emoji ?? '🏢');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (warehouse) {
        await foodApi.updateWarehouse(warehouse.id, { name: name.trim(), emoji });
        onDone(null);
      } else {
        const created = await foodApi.createWarehouse({ name: name.trim(), emoji });
        snack(`Склад «${created.name}» создан`);
        onDone(created);
      }
      haptic('success');
    } catch (e) {
      setError(errorText(e, 'Не удалось сохранить'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="md">
      <TextInput label="Название" placeholder="Например, квартира на Абая" value={name}
        onChange={e => setName(e.currentTarget.value)} maxLength={100} size="md" data-autofocus error={error} />
      <Group gap={6}>
        {EMOJIS.map(e => (
          <UnstyledButton key={e} onClick={() => setEmoji(e)} aria-pressed={emoji === e} aria-label={`Значок ${e}`}
            style={{ width: 44, height: 44, borderRadius: 12, fontSize: 22, display: 'grid', placeItems: 'center',
              background: emoji === e ? 'var(--monty-accent-soft)' : 'var(--monty-surface-2)',
              boxShadow: emoji === e ? 'inset 0 0 0 1.5px var(--monty-accent)' : 'none' }}>
            {e}
          </UnstyledButton>
        ))}
      </Group>
      <Button size="md" loading={saving} disabled={!name.trim()} onClick={save}>
        {warehouse ? 'Сохранить' : 'Создать склад'}
      </Button>
    </Stack>
  );
}
