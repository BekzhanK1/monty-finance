import { Box } from '@mantine/core';

interface CategoryIconProps {
  icon: string;
  size?: number;
  /** CSS color used for the tinted circle behind the emoji. */
  tint?: string;
}

export function CategoryIcon({ icon, size = 36, tint = 'var(--monty-accent)' }: CategoryIconProps) {
  return (
    <Box
      aria-hidden
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        fontSize: size * 0.5,
        lineHeight: 1,
        background: `color-mix(in srgb, ${tint} 14%, transparent)`,
      }}
    >
      {icon}
    </Box>
  );
}
