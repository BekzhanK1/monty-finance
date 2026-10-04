import { useRef } from 'react';
import { ActionIcon, Stack } from '@mantine/core';
import { IconMicrophone, IconPlus } from '@tabler/icons-react';
import { useTelegram } from '../hooks/useTelegram';
import { useNavigate } from 'react-router-dom';
import { useVoiceInput } from '../features/voice/VoiceContext';

const LONG_PRESS_MS = 450;

/** Tap → add form; long-press (or the mic button) → voice input. */
export function FloatingActionButton() {
  const { haptic } = useTelegram();
  const navigate = useNavigate();
  const openVoice = useVoiceInput();
  const pressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);

  const clearTimer = () => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handlePointerDown = () => {
    longPressed.current = false;
    clearTimer();
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      haptic('heavy');
      openVoice({ autoStart: true });
    }, LONG_PRESS_MS);
  };

  const handleClick = () => {
    clearTimer();
    if (longPressed.current) return;
    haptic('medium');
    navigate('/add');
  };

  return (
    <Stack
      gap="sm"
      align="center"
      hiddenFrom="sm"
      style={{
        position: 'fixed',
        bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
        right: 16,
        zIndex: 1000,
      }}
    >
      <ActionIcon
        size={48}
        radius="xl"
        variant="white"
        color="violet"
        onClick={() => {
          haptic('medium');
          openVoice();
        }}
        aria-label="Добавить голосом"
        className="hover-lift"
        style={{ boxShadow: '0 6px 18px rgba(102, 126, 234, 0.3)' }}
      >
        <IconMicrophone size={24} />
      </ActionIcon>
      <ActionIcon
        size={64}
        radius="xl"
        variant="gradient"
        gradient={{ from: 'blue', to: 'violet', deg: 135 }}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={clearTimer}
        onPointerLeave={clearTimer}
        onContextMenu={e => e.preventDefault()}
        aria-label="Добавить операцию (удерживайте для голоса)"
        className="hover-lift"
        style={{ boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)', touchAction: 'manipulation', WebkitUserSelect: 'none', userSelect: 'none' }}
      >
        <IconPlus size={32} stroke={2.5} />
      </ActionIcon>
    </Stack>
  );
}
