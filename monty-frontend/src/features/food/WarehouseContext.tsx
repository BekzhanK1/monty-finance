import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { foodApi } from './api';
import type { Warehouse } from './types';

const STORAGE_KEY = 'monty-food-warehouse';

function readStored(): number | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

function writeStored(id: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(id));
  } catch {
    // Private mode / blocked storage: the choice just won't survive a reload.
  }
}

interface WarehouseState {
  warehouses: Warehouse[];
  /** null only while the list is loading for the first time. */
  current: Warehouse | null;
  select: (id: number) => void;
}

const Ctx = createContext<WarehouseState | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const warehousesKey = ['food', 'warehouses'] as const;

/** The warehouse Food screens work in; remembered per device (each of you can be in a different flat). */
export function WarehouseProvider({ children }: { children: ReactNode }) {
  const { data: warehouses = [] } = useQuery({ queryKey: warehousesKey, queryFn: foodApi.warehouses });
  const [selectedId, setSelectedId] = useState<number | null>(readStored);

  const current = useMemo(
    () => warehouses.find(w => w.id === selectedId) ?? warehouses.find(w => w.is_default) ?? warehouses[0] ?? null,
    [warehouses, selectedId],
  );

  const select = useCallback((id: number) => {
    setSelectedId(id);
    writeStored(id);
  }, []);

  const value = useMemo(() => ({ warehouses, current, select }), [warehouses, current, select]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWarehouses(): WarehouseState {
  const value = useContext(Ctx);
  if (!value) throw new Error('useWarehouses must be used inside <WarehouseProvider>');
  return value;
}

/** Current warehouse id; 0 until the list has loaded (queries wait for a real id). */
// eslint-disable-next-line react-refresh/only-export-components
export function useWarehouseId(): number {
  return useWarehouses().current?.id ?? 0;
}
