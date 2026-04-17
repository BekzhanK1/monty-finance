import { ActionIcon } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useTelegram } from '../hooks/useTelegram';
import { useNavigate } from 'react-router-dom';

export function FloatingActionButton() {
  const { haptic } = useTelegram();
  const navigate = useNavigate();

  const handleClick = () => {
    haptic('medium');
    navigate('/add');
  };

  return (
    <ActionIcon
      size={64}
      radius="xl"
      variant="gradient"
      gradient={{ from: 'blue', to: 'violet', deg: 135 }}
      onClick={handleClick}
      className="hover-lift"
      style={{
        position: 'fixed',
        bottom: 88,
        right: 20,
        zIndex: 1000,
        boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
      }}
      hiddenFrom="sm"
    >
      <IconPlus size={32} stroke={2.5} />
    </ActionIcon>
  );
}
