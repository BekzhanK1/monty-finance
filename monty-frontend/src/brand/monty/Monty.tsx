import { useId, useMemo, type CSSProperties } from 'react';
import { MONTY_HEAD_VIEWBOX, MONTY_MOOD_LABELS, montyCss, montySvg, type MontyMood } from './art';

let stylesInjected = false;
function ensureStyles() {
  if (stylesInjected || typeof document === 'undefined') return;
  stylesInjected = true;
  const el = document.createElement('style');
  el.dataset.monty = '';
  el.textContent = montyCss('.monty');
  document.head.appendChild(el);
}

interface MontyProps {
  mood?: MontyMood;
  size?: number | string;
  /** Head-only crop for avatars and small spots. */
  head?: boolean;
  animated?: boolean;
  /** Accessible label; pass null when Monty is purely decorative next to text that says the same. */
  label?: string | null;
  className?: string;
  style?: CSSProperties;
}

/** Monty, the mascot. The artwork lives in ./art.ts and is shared with the asset exporter. */
export function Monty({ mood = 'idle', size = 96, head = false, animated = true, label, className, style }: MontyProps) {
  ensureStyles();
  const id = `m${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const html = useMemo(
    () =>
      montySvg({
        mood,
        id,
        width: '100%',
        height: '100%',
        still: !animated,
        ...(head ? { viewBox: MONTY_HEAD_VIEWBOX, shadow: false, fx: false, tail: false } : {}),
      }),
    [mood, id, animated, head],
  );
  const aria = label === null ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label ?? MONTY_MOOD_LABELS[mood] };

  return (
    <span
      {...aria}
      className={className}
      style={{ display: 'inline-block', width: size, height: size, lineHeight: 0, flexShrink: 0, ...style }}
      // Our own generated markup, no user input.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
