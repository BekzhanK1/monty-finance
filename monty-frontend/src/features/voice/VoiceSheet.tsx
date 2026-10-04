import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Drawer,
  Group,
  Loader,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconMicrophone,
  IconPlayerStopFilled,
  IconRefresh,
  IconSend,
  IconTrash,
} from '@tabler/icons-react';
import axios from 'axios';
import dayjs from 'dayjs';
import { voiceApi } from '../../services/finance';
import { useTelegram } from '../../hooks/useTelegram';
import { useCategories, useCreateTransactionsBulk } from '../finance/queries';
import type { Category } from '../../types';
import {
  draftsBalance,
  draftsToPayload,
  formatDraftDate,
  formatRecordingTime,
  isDraftValid,
  toEditable,
  type EditableDraft,
} from './drafts';
import { MAX_RECORDING_SECONDS, useVoiceRecorder, type Recording } from './useVoiceRecorder';

type Step = 'capture' | 'parsing' | 'review';

const EXAMPLES = ['500 такси', 'вчера 3 тыщи продукты и 800 кофе', 'зарплата 450 тысяч'];

const formatNumber = (n: number) => new Intl.NumberFormat('ru-RU').format(n);

function errorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (!error.response) return 'Нет связи с сервером. Проверьте интернет.';
  }
  return fallback;
}

const RECORDER_HINTS: Record<string, string> = {
  denied: 'Нет доступа к микрофону. Разрешите его в настройках Telegram или введите текстом.',
  unsupported: 'Запись голоса недоступна на этом устройстве — введите текстом.',
  error: 'Не удалось включить микрофон — попробуйте ещё раз или введите текстом.',
};

interface VoiceSheetProps {
  opened: boolean;
  onClose: () => void;
  /** Start recording as soon as the sheet opens (long-press entry point). */
  autoStart?: boolean;
  onSaved?: (count: number) => void;
}

export function VoiceSheet({ opened, onClose, autoStart = false, onSaved }: VoiceSheetProps) {
  const { haptic } = useTelegram();
  const categoriesQuery = useCategories();
  const saveMutation = useCreateTransactionsBulk();
  const [step, setStep] = useState<Step>('capture');
  const [text, setText] = useState('');
  const [rawText, setRawText] = useState('');
  const [drafts, setDrafts] = useState<EditableDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  const parse = async (input: Recording | { text: string }) => {
    setStep('parsing');
    setError(null);
    try {
      const result = await voiceApi.parse('blob' in input ? { audio: input.blob, filename: input.filename } : input);
      setRawText(result.text);
      setDrafts(toEditable(result.drafts));
      setStep('review');
      haptic('success');
    } catch (e) {
      setError(errorMessage(e, 'Не получилось разобрать. Попробуйте ещё раз.'));
      setStep('capture');
      haptic('error');
    }
  };

  const recorder = useVoiceRecorder(recording => void parse(recording));
  const { cancel: cancelRecording, start: startRecording } = recorder;

  const reset = () => {
    setStep('capture');
    setText('');
    setRawText('');
    setDrafts([]);
    setError(null);
  };

  const handleClose = () => {
    cancelRecording();
    reset();
    onClose();
  };

  useEffect(() => {
    if (opened && autoStart) void startRecording();
  }, [opened, autoStart, startRecording]);

  const toggleRecording = async () => {
    if (recorder.status === 'recording') {
      haptic('medium');
      const recording = await recorder.stop();
      if (recording) {
        void parse(recording);
      } else {
        setError('Запись пустая — скажите, например, «500 такси».');
      }
    } else {
      haptic('medium');
      setError(null);
      await recorder.start();
    }
  };

  const submitText = () => {
    const value = text.trim();
    if (!value) return;
    haptic('light');
    void parse({ text: value });
  };

  const updateDraft = (key: string, patch: Partial<EditableDraft>) => {
    setDrafts(prev => prev.map(d => (d.key === key ? { ...d, ...patch } : d)));
  };

  const setDraftCategory = (key: string, category: Category) => {
    updateDraft(key, {
      category_id: category.id,
      category_name: category.name,
      category_icon: category.icon,
      type: category.type,
    });
  };

  const removeDraft = (key: string) => {
    haptic('light');
    setDrafts(prev => prev.filter(d => d.key !== key));
  };

  const allValid = drafts.length > 0 && drafts.every(isDraftValid);

  const save = async () => {
    if (!allValid) return;
    try {
      await saveMutation.mutateAsync(draftsToPayload(drafts, rawText));
      haptic('success');
      onSaved?.(drafts.length);
      handleClose();
    } catch (e) {
      setError(errorMessage(e, 'Не удалось сохранить. Попробуйте ещё раз.'));
      haptic('error');
    }
  };

  const recorderHint = RECORDER_HINTS[recorder.status];
  const isRecording = recorder.status === 'recording';
  const canRecord = recorder.status !== 'unsupported';

  return (
    <Drawer
      opened={opened}
      onClose={handleClose}
      position="bottom"
      size="auto"
      radius="lg"
      title={<Text fw={700} size="lg">{step === 'review' ? 'Проверьте' : 'Голосовой ввод'}</Text>}
      styles={{
        content: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, maxHeight: '90dvh' },
        body: { paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' },
      }}
    >
      <Stack gap="md">
        {error && (
          <Alert color="red" radius="lg" icon={<IconAlertCircle size={18} />} variant="light">
            {error}
          </Alert>
        )}

        {step === 'capture' && (
          <>
            {canRecord && (
              <Stack align="center" gap="xs" py="sm">
                <UnstyledButton
                  onClick={toggleRecording}
                  aria-label={isRecording ? 'Остановить запись' : 'Начать запись'}
                  className={isRecording ? 'voice-pulse' : 'hover-scale'}
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    color: isRecording ? 'white' : 'var(--monty-accent-text)',
                    background: isRecording ? 'var(--monty-negative)' : 'var(--monty-accent)',
                    boxShadow: '0 8px 24px color-mix(in srgb, var(--monty-accent) 35%, transparent)',
                  }}
                >
                  {isRecording ? <IconPlayerStopFilled size={36} /> : <IconMicrophone size={40} />}
                </UnstyledButton>
                <Text size="sm" c="dimmed" ta="center">
                  {isRecording
                    ? `Слушаю… ${formatRecordingTime(recorder.elapsed)} / ${formatRecordingTime(MAX_RECORDING_SECONDS)} · нажмите, чтобы закончить`
                    : 'Нажмите и скажите, на что потратили'}
                </Text>
              </Stack>
            )}

            {recorderHint && (
              <Text size="sm" c="dimmed" ta="center">{recorderHint}</Text>
            )}

            <TextInput
              placeholder={canRecord ? 'или напишите: 500 такси' : 'Например: 500 такси'}
              value={text}
              onChange={e => setText(e.currentTarget.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') submitText();
              }}
              disabled={isRecording}
              size="md"
              maxLength={500}
              rightSection={
                <ActionIcon
                  variant="subtle"
                  radius="xl"
                  onClick={submitText}
                  disabled={!text.trim() || isRecording}
                  aria-label="Разобрать текст"
                >
                  <IconSend size={18} />
                </ActionIcon>
              }
            />

            <Group gap={6} justify="center">
              {EXAMPLES.map(example => (
                <Text key={example} size="xs" c="dimmed" px={8} py={2}
                  style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 999 }}>
                  «{example}»
                </Text>
              ))}
            </Group>
          </>
        )}

        {step === 'parsing' && (
          <Stack align="center" py="xl" gap="sm">
            <Loader type="dots" />
            <Text c="dimmed">Разбираю…</Text>
          </Stack>
        )}

        {step === 'review' && (
          <>
            {rawText && (
              <Text size="sm" c="dimmed" fs="italic">«{rawText}»</Text>
            )}

            <Stack gap="sm" style={{ overflowY: 'auto', maxHeight: '50dvh' }}>
              {drafts.map(draft => (
                <DraftCard
                  key={draft.key}
                  draft={draft}
                  categories={categoriesQuery.data ?? []}
                  onChange={patch => updateDraft(draft.key, patch)}
                  onCategory={category => setDraftCategory(draft.key, category)}
                  onRemove={() => removeDraft(draft.key)}
                />
              ))}
              {drafts.length === 0 && (
                <Text c="dimmed" ta="center" py="md">Ничего не осталось — запишите ещё раз.</Text>
              )}
            </Stack>

            {drafts.length > 1 && (
              <Group justify="space-between">
                <Text c="dimmed" size="sm">Итого</Text>
                <Text fw={700} className="monty-tabular" style={{ color: draftsBalance(drafts) >= 0 ? 'var(--monty-income)' : 'var(--monty-text)' }}>
                  {draftsBalance(drafts) > 0 ? '+' : ''}{formatNumber(draftsBalance(drafts))} ₸
                </Text>
              </Group>
            )}

            <Group grow>
              <Button
                variant="default"
                size="md"
                leftSection={<IconRefresh size={18} />}
                onClick={() => { haptic('light'); reset(); }}
              >
                Заново
              </Button>
              <Button
                size="md"
                disabled={!allValid}
                loading={saveMutation.isPending}
                onClick={save}
              >
                {drafts.length > 1 ? `Сохранить (${drafts.length})` : 'Сохранить'}
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Drawer>
  );
}

interface DraftCardProps {
  draft: EditableDraft;
  categories: Category[];
  onChange: (patch: Partial<EditableDraft>) => void;
  onCategory: (category: Category) => void;
  onRemove: () => void;
}

function DraftCard({ draft, categories, onChange, onCategory, onRemove }: DraftCardProps) {
  const options = useMemo(
    () => [
      { group: 'Расходы', items: categories.filter(c => c.type === 'EXPENSE').map(c => ({ value: String(c.id), label: `${c.icon} ${c.name}` })) },
      { group: 'Доходы', items: categories.filter(c => c.type === 'INCOME').map(c => ({ value: String(c.id), label: `${c.icon} ${c.name}` })) },
    ].filter(g => g.items.length > 0),
    [categories],
  );
  const today = dayjs().format('YYYY-MM-DD');
  const isIncome = draft.type === 'INCOME';

  return (
    <Card radius="lg" padding="sm" style={{ background: 'var(--monty-surface-2)' }}>
      <Stack gap={8}>
        <Group gap="xs" wrap="nowrap" align="flex-end">
          <NumberInput
            aria-label="Сумма"
            value={draft.amount}
            onChange={value => onChange({ amount: typeof value === 'number' ? Math.round(value) : 0 })}
            min={1}
            thousandSeparator=" "
            suffix=" ₸"
            allowDecimal={false}
            allowNegative={false}
            hideControls
            size="md"
            radius="lg"
            style={{ flex: 1 }}
            styles={{ input: { fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: isIncome ? 'var(--monty-income)' : undefined } }}
            error={draft.amount > 0 ? undefined : true}
          />
          <ActionIcon variant="subtle" color="red" size="lg" radius="xl" onClick={onRemove} aria-label="Убрать">
            <IconTrash size={18} />
          </ActionIcon>
        </Group>
        <Select
          aria-label="Категория"
          data={options}
          value={String(draft.category_id)}
          onChange={value => {
            const category = categories.find(c => String(c.id) === value);
            if (category) onCategory(category);
          }}
          allowDeselect={false}
          searchable
          radius="lg"
          comboboxProps={{ withinPortal: true, zIndex: 1000 }}
        />
        <Group gap="xs" wrap="nowrap">
          <TextInput
            aria-label="Комментарий"
            placeholder="Комментарий"
            value={draft.comment}
            onChange={e => onChange({ comment: e.currentTarget.value })}
            maxLength={255}
            radius="lg"
            style={{ flex: 1 }}
          />
          <TextInput
            aria-label={`Дата: ${formatDraftDate(draft.transaction_date)}`}
            type="date"
            value={draft.transaction_date ?? today}
            max={today}
            onChange={e => {
              const value = e.currentTarget.value;
              onChange({ transaction_date: !value || value === today ? null : value });
            }}
            radius="lg"
            w={150}
          />
        </Group>
      </Stack>
    </Card>
  );
}
