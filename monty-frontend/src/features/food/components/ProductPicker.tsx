import { Autocomplete, type AutocompleteProps } from '@mantine/core';
import { useMemo } from 'react';
import { useIngredients } from '../queries';
import type { FoodIngredient } from '../types';

interface ProductPickerProps extends Omit<AutocompleteProps, 'data' | 'value' | 'onChange'> {
  value: string;
  onChange: (name: string, ingredient: FoodIngredient | null) => void;
}

/** Free text with suggestions from known products; matching is case-insensitive. */
export function ProductPicker({ value, onChange, ...rest }: ProductPickerProps) {
  const { data = [] } = useIngredients();
  const byName = useMemo(() => new Map(data.map(i => [i.name.trim().toLowerCase(), i])), [data]);
  const names = useMemo(() => [...new Set(data.map(i => i.name))].sort((a, b) => a.localeCompare(b, 'ru')), [data]);

  return (
    <Autocomplete
      {...rest}
      value={value}
      // Suggest only once something is typed — an empty field shouldn't dump the whole catalogue.
      data={value.trim() ? names : []}
      limit={8}
      onChange={name => onChange(name, byName.get(name.trim().toLowerCase()) ?? null)}
      comboboxProps={{ withinPortal: true, zIndex: 1000 }}
    />
  );
}
