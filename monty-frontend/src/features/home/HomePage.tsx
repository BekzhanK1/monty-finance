import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  Box,
  Container,
  Group,
  Progress,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconBasket,
  IconBook2,
  IconChevronRight,
  IconLayoutGrid,
  IconMicrophone,
  IconSettings,
  IconToolsKitchen2,
} from '@tabler/icons-react';
import { useAuth } from '../../hooks/useAuth';
import { haptic } from '../../lib/telegram';
import { Monty } from '../../brand/monty';
import { useVoiceInput } from '../voice/VoiceContext';
import { useCategories, useDashboard, useGoal, useTransactions } from '../finance/queries';
import { TransactionRow } from '../finance/TransactionRow';
import { AmountText, EmptyState, Section, formatMoney, pluralRu } from '../../ui';
import { SERVICES, type ServiceDef } from '../services/catalog';
import { CatalogTile, ServiceTile } from '../services/ServiceTile';
import { ComingSoonSheet } from '../services/ComingSoonSheet';
import { WarehouseProvider } from '../food/WarehouseContext';
import { useToday } from '../food/queries';
import { useJournalOverview } from '../journal/queries';
import { streakLabel } from '../journal/mood';
import { computeHomeSummary, type HomeSummary } from './summary';
import { montySays, type MontySays } from './montyMood';

const shortDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });

function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

/** The superapp hub: money first, every other service one tap away, Monty keeping you company. */
export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const dashboardQuery = useDashboard();
  const goalQuery = useGoal();
  const categoriesQuery = useCategories();
  const dashboard = dashboardQuery.data;
  const recentQuery = useTransactions(
    { start_date: dashboard?.period_start },
    { enabled: !!dashboard?.period_start },
  );
  const [soon, setSoon] = useState<ServiceDef | null>(null);

  const summary = useMemo(() => (dashboard ? computeHomeSummary(dashboard) : null), [dashboard]);
  const goal = goalQuery.data;
  const goalPercent = goal && goal.target_amount > 0
    ? Math.min(100, Math.max(0, goal.progress_percent ?? (goal.current_savings / goal.target_amount) * 100))
    : undefined;
  const says = useMemo(() => montySays(summary, { goalPercent }), [summary, goalPercent]);
  const categoriesById = useMemo(
    () => new Map((categoriesQuery.data ?? []).map(c => [c.id, c])),
    [categoriesQuery.data],
  );

  return (
    <Container size="sm" pb="var(--monty-page-pb)">
      <Group justify="space-between" wrap="nowrap" pt="md" pb={4}>
        <Group gap={10} wrap="nowrap" style={{ minWidth: 0 }}>
          <Box
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              overflow: 'hidden',
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(135deg, #7b7bf0, #4338ca)',
            }}
          >
            <Monty head mood="happy" size={44} animated={false} label={null} />
          </Box>
          <Stack gap={0} style={{ minWidth: 0 }}>
            <Text size="xs" style={{ color: 'var(--monty-hint)' }}>{greeting()}</Text>
            <Text fw={700} fz={18} lh={1.2} lineClamp={1}>{user?.first_name ?? 'Monty'}</Text>
          </Stack>
        </Group>
        <ActionIcon variant="subtle" size="lg" radius="xl" aria-label="Настройки" onClick={() => navigate('/settings')}>
          <IconSettings size={22} />
        </ActionIcon>
      </Group>

      <Stack gap="lg" mt="sm">
        {dashboardQuery.isError ? (
          <Box style={{ borderRadius: 'var(--monty-radius-card)', background: 'var(--monty-surface)' }}>
            <EmptyState
              icon={<Monty mood="worried" size={96} />}
              title="Не удалось загрузить бюджет"
              description="Проверьте соединение и попробуйте ещё раз."
              action={{ label: 'Повторить', onClick: () => void dashboardQuery.refetch() }}
            />
          </Box>
        ) : summary ? (
          <MoneyCard summary={summary} says={says} />
        ) : (
          <Skeleton h={232} radius={24} />
        )}

        <QuickActions />

        <Section title="Сервисы" action={{ label: 'Все', onClick: () => navigate('/services') }} padded>
          <SimpleGrid cols={4} spacing={4} verticalSpacing="md">
            {SERVICES.slice(0, 7).map(s => <CatalogTile key={s.key} service={s} onSoon={setSoon} />)}
            <ServiceTile title="Все" icon={IconLayoutGrid} tint="#8e8e93" onClick={() => navigate('/services')} />
          </SimpleGrid>
        </Section>

        <JournalWidget />

        <WarehouseProvider>
          <KitchenWidget />
        </WarehouseProvider>

        {goal && goal.target_amount > 0 && goalPercent !== undefined && (
          <Section title="Цель" padded>
            <Group justify="space-between" align="flex-end" mb={8} wrap="nowrap">
              <Stack gap={0}>
                <AmountText value={goal.current_savings} fz={22} fw={700} tone="savings" />
                <Text size="xs" style={{ color: 'var(--monty-hint)' }}>из {formatMoney(goal.target_amount)}</Text>
              </Stack>
              <Text fw={700} className="monty-tabular" style={{ color: 'var(--monty-savings)' }}>{goalPercent.toFixed(0)}%</Text>
            </Group>
            <Progress value={goalPercent} size={8} radius="xl" color="var(--monty-savings)"
              styles={{ root: { background: 'color-mix(in srgb, var(--monty-text) 10%, transparent)' } }} />
            {goal.days_remaining > 0 && (
              <Text size="xs" mt={8} style={{ color: 'var(--monty-hint)' }}>
                {`${goal.days_remaining} ${pluralRu(goal.days_remaining, ['день', 'дня', 'дней'])} до цели`}
                {goal.daily_needed > 0 ? ` · откладывать ${formatMoney(goal.daily_needed)} в день` : ''}
              </Text>
            )}
          </Section>
        )}

        <Section title="Последние операции" action={{ label: 'Все', onClick: () => navigate('/transactions') }}>
          {recentQuery.isPending && dashboard?.period_start ? (
            <Stack p="md" gap="sm">
              {[0, 1, 2].map(i => <Skeleton key={i} h={36} radius="md" />)}
            </Stack>
          ) : (recentQuery.data ?? []).length === 0 ? (
            <EmptyState
              icon={<Monty mood="idle" size={88} />}
              title="Пока пусто"
              description="Добавьте первую трату — кнопкой ＋ или голосом."
            />
          ) : (
            (recentQuery.data ?? []).slice(0, 4).map((t, i) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                category={categoriesById.get(t.category_id)}
                showDate
                divider={i > 0}
                onClick={() => navigate(`/transactions?focus=${t.id}`)}
              />
            ))
          )}
        </Section>
      </Stack>

      <ComingSoonSheet service={soon} onClose={() => setSoon(null)} />
    </Container>
  );
}

const onCard = {
  text: '#ffffff',
  dim: 'rgba(255,255,255,0.78)',
  track: 'rgba(255,255,255,0.22)',
};

/** The bank-card style hero: today's money in the centre, Monty reacting in the corner. */
function MoneyCard({ summary, says }: { summary: HomeSummary; says: MontySays }) {
  const navigate = useNavigate();
  const over = summary.remaining < 0;
  const overToday = summary.overToday > 0;

  let label = 'Можно потратить сегодня';
  let amount = summary.safePerDay;
  if (!summary.hasBudgets) {
    label = 'Потрачено за период';
    amount = summary.spent;
  } else if (over) {
    label = 'Бюджет превышен на';
    amount = -summary.remaining;
  } else if (overToday) {
    label = 'Дневной лимит превышен на';
    amount = summary.overToday;
  }

  const detail = !summary.hasBudgets
    ? 'Бюджеты не заданы'
    : over
      ? `Потрачено ${formatMoney(summary.spent)} из ${formatMoney(summary.limit)}`
      : `Осталось ${formatMoney(summary.remaining)} на ${summary.daysLeft} ${pluralRu(summary.daysLeft, ['день', 'дня', 'дней'])}`;

  return (
    <UnstyledButton
      onClick={() => {
        haptic('light');
        navigate('/budgets');
      }}
      className="monty-pressable"
      aria-label={`${label} ${formatMoney(amount)}. Открыть бюджеты`}
      style={{
        display: 'block',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 24,
        padding: 20,
        color: onCard.text,
        background: over || overToday
          ? 'linear-gradient(135deg, #8b6cf0 0%, #6b4fd8 45%, #b33d7a 100%)'
          : 'linear-gradient(135deg, #8a8af5 0%, #5b5bd6 45%, #3730a3 100%)',
        boxShadow: '0 12px 32px -14px rgba(67, 56, 202, 0.65)',
      }}
    >
      {/* soft glow behind Monty */}
      <Box aria-hidden style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.28), rgba(255,255,255,0) 70%)' }} />
      <Monty mood={says.mood} size={104} label={null} style={{ position: 'absolute', right: 4, top: 0 }} />

      <Stack gap={2} style={{ position: 'relative' }}>
        {/* Only the top lines make room for Monty; the rest runs full width under him. */}
        <Text size="sm" fw={500} pr={100} style={{ color: onCard.dim }}>{label}</Text>
        <AmountText value={amount} sign="never" fz={38} fw={800} lh={1.15} pr={100} style={{ color: onCard.text, letterSpacing: -0.5 }} />
        <Text size="sm" style={{ color: onCard.dim }}>{detail}</Text>
        {summary.hasBudgets && !over && summary.spentToday > 0 && (
          <Text size="xs" style={{ color: onCard.dim }}>
            {`Сегодня ${formatMoney(summary.spentToday)} из ${formatMoney(summary.dailyLimit)}`}
          </Text>
        )}
      </Stack>

      {summary.hasBudgets && (
        <Box mt="md" style={{ position: 'relative' }}>
          <Progress
            value={Math.min(100, summary.spentPercent)}
            size={6}
            radius="xl"
            color="#ffffff"
            styles={{ root: { background: onCard.track } }}
            aria-label={`Потрачено ${Math.round(summary.spentPercent)}% бюджета`}
          />
          {/* Where spending "should" be today. */}
          <Box
            aria-hidden
            style={{
              position: 'absolute',
              top: -3,
              left: `calc(${Math.min(100, summary.timePercent)}% - 1px)`,
              width: 2,
              height: 12,
              borderRadius: 1,
              background: '#fff',
              opacity: 0.7,
            }}
          />
        </Box>
      )}

      <Group mt="md" gap={8} wrap="nowrap" style={{ position: 'relative' }}>
        <Box
          px={12}
          py={8}
          style={{
            flex: 1,
            minWidth: 0,
            borderRadius: 14,
            background: 'rgba(255,255,255,0.16)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <Text size="xs" fw={500} lh={1.35} style={{ color: onCard.text }}>{says.text}</Text>
        </Box>
        <Group gap={2} wrap="nowrap" style={{ color: onCard.dim, flexShrink: 0 }}>
          <Text size="xs" fw={600}>
            {summary.periodEnd ? `до ${shortDate.format(summary.periodEnd)}` : 'Бюджеты'}
          </Text>
          <IconChevronRight size={16} />
        </Group>
      </Group>
    </UnstyledButton>
  );
}

function QuickActions() {
  const navigate = useNavigate();
  const openVoice = useVoiceInput();
  const actions = [
    { label: 'Расход', icon: IconArrowUpRight, onClick: () => navigate('/add') },
    { label: 'Доход', icon: IconArrowDownLeft, onClick: () => navigate('/add?type=INCOME') },
    { label: 'Голосом', icon: IconMicrophone, onClick: () => openVoice() },
  ];
  return (
    <Group grow gap="sm">
      {actions.map(a => (
        <UnstyledButton
          key={a.label}
          onClick={() => {
            haptic('light');
            a.onClick();
          }}
          className="monty-pressable"
          py={12}
          style={{
            borderRadius: 16,
            background: 'var(--monty-surface)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Box style={{ width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--monty-accent-soft)', color: 'var(--monty-accent)' }}>
            <a.icon size={20} stroke={2} />
          </Box>
          <Text size="xs" fw={600}>{a.label}</Text>
        </UnstyledButton>
      ))}
    </Group>
  );
}

/** Today in the kitchen, at a glance. Hidden until Food has something to say. */
function KitchenWidget() {
  const navigate = useNavigate();
  const { data } = useToday();
  if (!data) return null;

  const planned = data.slots.length;
  const cooked = data.slots.filter(s => s.cooked_at).length;
  const next = data.slots.find(s => !s.cooked_at);
  const facts = [
    data.shopping_open > 0 && `${data.shopping_open} ${pluralRu(data.shopping_open, ['покупка', 'покупки', 'покупок'])} в списке`,
    data.expiring.length > 0 && `${data.expiring.length} скоро испортится`,
  ].filter(Boolean) as string[];
  if (planned === 0 && facts.length === 0) return null;

  return (
    <Section title="Кухня сегодня">
      <UnstyledButton
        onClick={() => navigate('/food')}
        className="monty-pressable"
        style={{ display: 'block', width: '100%' }}
      >
        <Group wrap="nowrap" gap={12} px={16} py={12}>
          <Box style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'color-mix(in srgb, #eb6834 15%, var(--monty-surface))', color: '#eb6834', flexShrink: 0 }}>
            {planned > 0 ? <IconToolsKitchen2 size={22} /> : <IconBasket size={22} />}
          </Box>
          <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
            <Text fw={500} lineClamp={1}>
              {planned === 0
                ? 'Меню не запланировано'
                : next
                  ? `Дальше: ${next.dish_title ?? next.custom_title ?? 'блюдо'}`
                  : 'Всё приготовлено 🎉'}
            </Text>
            <Text size="xs" lineClamp={1} style={{ color: 'var(--monty-hint)' }}>
              {[planned > 0 && `${cooked} из ${planned} приготовлено`, ...facts].filter(Boolean).join(' · ')}
            </Text>
          </Stack>
          <IconChevronRight size={18} style={{ color: 'var(--monty-hint)', flexShrink: 0 }} />
        </Group>
      </UnstyledButton>
    </Section>
  );
}

/** Nudge towards today's journal entry and show the streak. */
function JournalWidget() {
  const navigate = useNavigate();
  const { data } = useJournalOverview();
  if (!data) return null;

  const { current, today_done } = data.me;
  const title = today_done ? 'Запись за сегодня есть' : 'Как прошёл день?';
  const subtitle = current > 0
    ? `Серия ${streakLabel(current)}${today_done ? '' : ' — не прерывайте её'}`
    : 'Пара строк — и день сохранён';

  return (
    <Section title="Дневник">
      <UnstyledButton
        onClick={() => navigate('/journal')}
        className="monty-pressable"
        style={{ display: 'block', width: '100%' }}
      >
        <Group wrap="nowrap" gap={12} px={16} py={12}>
          <Box style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'color-mix(in srgb, #a855f7 15%, var(--monty-surface))', color: '#a855f7', flexShrink: 0 }}>
            <IconBook2 size={22} />
          </Box>
          <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
            <Text fw={500} lineClamp={1}>{title}</Text>
            <Text size="xs" lineClamp={1} style={{ color: 'var(--monty-hint)' }}>{subtitle}</Text>
          </Stack>
          {current > 0 && (
            <Text fw={700} fz={15} className="monty-tabular" style={{ color: '#a855f7', flexShrink: 0 }}>🔥 {current}</Text>
          )}
          <IconChevronRight size={18} style={{ color: 'var(--monty-hint)', flexShrink: 0 }} />
        </Group>
      </UnstyledButton>
    </Section>
  );
}
