import { lazy, type ComponentType } from 'react';

/** React.lazy for a named export: lazyPage(() => import('./X'), 'X'). */
export function lazyPage<M extends Record<string, unknown>, K extends keyof M & string>(
  load: () => Promise<M>,
  name: K,
) {
  return lazy(async () => ({ default: (await load())[name] as ComponentType }));
}
