import { Group, NumberInput, Select } from '@mantine/core';
import { useUnits } from '../queries';
import { unitLabel } from '../format';

// Units offered in pickers; spoons/pinch only make sense inside recipes.
const PANTRY_UNITS = ['pcs', 'g', 'kg', 'ml', 'l', 'pack'];
const RECIPE_UNITS = ['g', 'kg', 'ml', 'l', 'pcs', 'pack', 'tbsp', 'tsp', 'pinch'];

interface QtyUnitInputProps {
  quantity: number | string;
  unitId: number | null;
  onQuantity: (value: number | string) => void;
  onUnit: (unitId: number) => void;
  label?: string;
  forRecipe?: boolean;
  size?: 'sm' | 'md';
}

export function QtyUnitInput({ quantity, unitId, onQuantity, onUnit, label, forRecipe = false, size = 'md' }: QtyUnitInputProps) {
  const { data: units = [] } = useUnits();
  const allowed = forRecipe ? RECIPE_UNITS : PANTRY_UNITS;
  const options = units
    .filter(u => allowed.includes(u.code))
    .sort((a, b) => allowed.indexOf(a.code) - allowed.indexOf(b.code))
    .map(u => ({ value: String(u.id), label: unitLabel(u.code) }));

  return (
    <Group gap={8} wrap="nowrap" align="flex-end">
      <NumberInput
        label={label}
        aria-label={label ? undefined : 'Количество'}
        value={quantity}
        onChange={onQuantity}
        min={0}
        decimalScale={2}
        decimalSeparator=","
        hideControls
        size={size}
        style={{ flex: 1 }}
      />
      <Select
        aria-label="Единица"
        data={options}
        value={unitId ? String(unitId) : null}
        onChange={v => v && onUnit(Number(v))}
        allowDeselect={false}
        size={size}
        w={92}
        comboboxProps={{ withinPortal: true, zIndex: 1000 }}
      />
    </Group>
  );
}
