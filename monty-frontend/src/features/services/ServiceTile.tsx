import { Badge, Box, Text, UnstyledButton } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import type { Icon } from '@tabler/icons-react';
import { haptic } from '../../lib/telegram';
import type { ServiceDef } from './catalog';

interface ServiceTileProps {
  title: string;
  icon: Icon;
  tint: string;
  soon?: boolean;
  onClick: () => void;
}

/** Bank-app style service shortcut: tinted rounded square + short label. */
export function ServiceTile({ title, icon: Icon, tint, soon, onClick }: ServiceTileProps) {
  return (
    <UnstyledButton
      onClick={() => {
        haptic('light');
        onClick();
      }}
      className="monty-pressable"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}
    >
      <Box
        style={{
          position: 'relative',
          width: 52,
          height: 52,
          borderRadius: 16,
          display: 'grid',
          placeItems: 'center',
          color: tint,
          background: `color-mix(in srgb, ${tint} 15%, var(--monty-surface))`,
          opacity: soon ? 0.75 : 1,
        }}
      >
        <Icon size={26} stroke={1.8} />
        {soon && (
          <Badge
            size="xs"
            radius="sm"
            style={{ position: 'absolute', top: -6, right: -10, background: tint, color: '#fff', textTransform: 'none', fontWeight: 600 }}
          >
            скоро
          </Badge>
        )}
      </Box>
      <Text fz={12} fw={500} ta="center" lh={1.2} lineClamp={1} maw="100%">
        {title}
      </Text>
    </UnstyledButton>
  );
}

/** A catalog entry as a tile: navigates, or opens the "coming soon" sheet. */
export function CatalogTile({ service, onSoon }: { service: ServiceDef; onSoon: (s: ServiceDef) => void }) {
  const navigate = useNavigate();
  return (
    <ServiceTile
      title={service.title}
      icon={service.icon}
      tint={service.tint}
      soon={service.comingSoon}
      onClick={() => (service.comingSoon ? onSoon(service) : navigate(service.to!))}
    />
  );
}
