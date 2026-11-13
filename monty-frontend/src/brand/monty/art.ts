/*
 * Monty, the mascot — the single source of truth for the character.
 *
 * The same definitions drive three outputs:
 *   - the React <Monty> component (SVG string + CSS keyframes generated below),
 *   - standalone animated .svg files (SVG with the CSS embedded),
 *   - GIF/PNG exports (scripts/export-monty.ts samples `poseAt` frame by frame).
 *
 * Pure TypeScript with no imports, so Node can run it directly for the export script.
 */

export const MONTY_MOODS = ['idle', 'happy', 'celebrate', 'worried', 'sleepy', 'thinking'] as const;
export type MontyMood = (typeof MONTY_MOODS)[number];

export const MONTY_MOOD_LABELS: Record<MontyMood, string> = {
  idle: 'Monty спокоен',
  happy: 'Monty радуется',
  celebrate: 'Monty празднует',
  worried: 'Monty волнуется',
  sleepy: 'Monty спит',
  thinking: 'Monty думает',
};

/** Brand palette. */
export const MONTY_COLORS = {
  ink: '#1e1b4b',
  accent: '#5b5bd6',
  deep: '#4338ca',
  lavender: '#b9bdf8',
  sky: '#c9dcff',
  spark: '#4f6bff',
  blush: '#ff8fbf',
} as const;

/* ------------------------------------------------------------------ */
/* Animation model                                                     */
/* ------------------------------------------------------------------ */

type Part = 'all' | 'shadow' | 'tail' | 'body' | 'head' | 'earL' | 'earR' | 'eyes' | 'fx';

export interface Pose {
  tx?: number;
  ty?: number;
  /** degrees */
  r?: number;
  sx?: number;
  sy?: number;
  o?: number;
}
type Keyframe = [offset: number, pose: Pose];
interface Anim {
  /** seconds; every duration divides LOOP_S so exported GIFs loop seamlessly */
  dur: number;
  frames: Keyframe[];
}
export type PoseMap = Partial<Record<Part, Pose>>;

/** Length of one full loop for every mood, in seconds. */
export const LOOP_S = 3;

/** Pivot of each part, in the 200×200 viewBox. */
const ORIGIN: Record<Part, [number, number]> = {
  all: [104, 176],
  shadow: [104, 177],
  tail: [80, 164],
  body: [104, 172],
  head: [106, 130],
  earL: [80, 62],
  earR: [138, 58],
  eyes: [108, 94],
  fx: [168, 44],
};

const PART_CLASS: Record<Part, string> = {
  all: 'm-all',
  shadow: 'm-shadow',
  tail: 'm-tail',
  body: 'm-body',
  head: 'm-head',
  earL: 'm-ear-l',
  earR: 'm-ear-r',
  eyes: 'm-eyes',
  fx: 'm-fx',
};

const breathe: Anim = { dur: 3, frames: [[0, { sy: 1 }], [0.5, { sy: 1.025, sx: 0.99 }], [1, { sy: 1 }]] };
const headBob: Anim = { dur: 3, frames: [[0, { ty: 0, r: 0 }], [0.5, { ty: -1.5, r: 1.5 }], [1, { ty: 0, r: 0 }]] };
const tailWag = (dur: number, from: number, to: number): Anim => ({
  dur,
  frames: [[0, { r: from }], [0.5, { r: to }], [1, { r: from }]],
});
const blink: Anim = {
  dur: 3,
  frames: [[0, { sy: 1 }], [0.86, { sy: 1 }], [0.9, { sy: 0.1 }], [0.94, { sy: 1 }], [1, { sy: 1 }]],
};
const earTwitch: Anim = {
  dur: 3,
  frames: [[0, { r: 0 }], [0.4, { r: 0 }], [0.45, { r: -9 }], [0.5, { r: 2 }], [0.55, { r: 0 }], [1, { r: 0 }]],
};

const ANIMS: Record<MontyMood, Partial<Record<Part, Anim>>> = {
  idle: {
    body: breathe,
    head: headBob,
    tail: tailWag(1.5, -5, 8),
    earR: earTwitch,
    eyes: blink,
  },
  happy: {
    body: breathe,
    head: { dur: 1.5, frames: [[0, { r: -2.5 }], [0.5, { r: 3, ty: -1.5 }], [1, { r: -2.5 }]] },
    tail: tailWag(1, -8, 12),
    earR: earTwitch,
    fx: {
      dur: 1.5,
      frames: [[0, { sx: 0.85, sy: 0.85, o: 0.7 }], [0.18, { sx: 1.15, sy: 1.15, o: 1 }], [0.36, { sx: 1, sy: 1, o: 1 }], [1, { sx: 0.85, sy: 0.85, o: 0.7 }]],
    },
  },
  celebrate: {
    all: {
      dur: 1,
      frames: [
        [0, { ty: 0, sy: 1, sx: 1 }],
        [0.12, { ty: 0, sy: 0.9, sx: 1.06 }],
        [0.4, { ty: -20, sy: 1.06, sx: 0.97 }],
        [0.68, { ty: 0, sy: 0.93, sx: 1.04 }],
        [0.82, { ty: 0, sy: 1, sx: 1 }],
        [1, { ty: 0, sy: 1, sx: 1 }],
      ],
    },
    shadow: {
      dur: 1,
      frames: [[0, { sx: 1, o: 1 }], [0.12, { sx: 1.05, o: 1 }], [0.4, { sx: 0.7, o: 0.5 }], [0.68, { sx: 1.05, o: 1 }], [1, { sx: 1, o: 1 }]],
    },
    tail: tailWag(0.5, -10, 14),
    earL: { dur: 1, frames: [[0, { r: 0 }], [0.4, { r: 8 }], [0.7, { r: -3 }], [1, { r: 0 }]] },
    earR: { dur: 1, frames: [[0, { r: 0 }], [0.4, { r: -8 }], [0.7, { r: 3 }], [1, { r: 0 }]] },
    fx: { dur: 1, frames: [[0, { r: -4, sx: 0.95, sy: 0.95 }], [0.5, { r: 4, sx: 1.08, sy: 1.08 }], [1, { r: -4, sx: 0.95, sy: 0.95 }]] },
  },
  worried: {
    all: {
      dur: 3,
      frames: [[0, { tx: 0 }], [0.04, { tx: -1.2 }], [0.08, { tx: 1.2 }], [0.12, { tx: -1 }], [0.16, { tx: 0.8 }], [0.2, { tx: 0 }], [1, { tx: 0 }]],
    },
    body: breathe,
    head: { dur: 3, frames: [[0, { ty: 1, r: -2 }], [0.5, { ty: 1.5, r: -2.5 }], [1, { ty: 1, r: -2 }]] },
    tail: tailWag(3, -3, 3),
    earL: { dur: 3, frames: [[0, { r: -14 }], [1, { r: -14 }]] },
    earR: { dur: 3, frames: [[0, { r: 14 }], [1, { r: 14 }]] },
    eyes: blink,
    fx: { dur: 1.5, frames: [[0, { ty: -2, o: 0 }], [0.2, { ty: 0, o: 1 }], [0.8, { ty: 7, o: 1 }], [1, { ty: 9, o: 0 }]] },
  },
  sleepy: {
    body: { dur: 3, frames: [[0, { sy: 1 }], [0.5, { sy: 1.045, sx: 0.985 }], [1, { sy: 1 }]] },
    head: { dur: 3, frames: [[0, { ty: 2, r: -4 }], [0.5, { ty: 0.5, r: -3 }], [1, { ty: 2, r: -4 }]] },
    tail: tailWag(3, -2, 3),
    earL: { dur: 3, frames: [[0, { r: -6 }], [1, { r: -6 }]] },
    earR: { dur: 3, frames: [[0, { r: 6 }], [1, { r: 6 }]] },
    fx: { dur: 3, frames: [[0, { ty: 6, tx: -3, o: 0 }], [0.25, { ty: 2, tx: -1, o: 1 }], [0.8, { ty: -6, tx: 2, o: 1 }], [1, { ty: -9, tx: 3, o: 0 }]] },
  },
  thinking: {
    body: breathe,
    head: { dur: 3, frames: [[0, { r: 4 }], [0.5, { r: 5.5, ty: -1 }], [1, { r: 4 }]] },
    tail: tailWag(3, -4, 6),
    eyes: blink,
    earL: earTwitch,
    fx: { dur: 1.5, frames: [[0, { sx: 0.96, sy: 0.96 }], [0.5, { sx: 1.05, sy: 1.05 }], [1, { sx: 0.96, sy: 0.96 }]] },
  },
};

const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * x);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const DEFAULT: Required<Pose> = { tx: 0, ty: 0, r: 0, sx: 1, sy: 1, o: 1 };
const full = (p: Pose): Required<Pose> => ({ ...DEFAULT, ...p });

function sample(anim: Anim, tSeconds: number): Required<Pose> {
  const phase = ((tSeconds % anim.dur) + anim.dur) % anim.dur / anim.dur;
  const frames = anim.frames;
  for (let i = 0; i < frames.length - 1; i++) {
    const [o0, p0] = frames[i];
    const [o1, p1] = frames[i + 1];
    if (phase >= o0 && phase <= o1) {
      const k = o1 === o0 ? 0 : ease((phase - o0) / (o1 - o0));
      const a = full(p0);
      const b = full(p1);
      return {
        tx: lerp(a.tx, b.tx, k),
        ty: lerp(a.ty, b.ty, k),
        r: lerp(a.r, b.r, k),
        sx: lerp(a.sx, b.sx, k),
        sy: lerp(a.sy, b.sy, k),
        o: lerp(a.o, b.o, k),
      };
    }
  }
  return full(frames[frames.length - 1][1]);
}

/** Every part's pose at `t` seconds into the loop (used by the frame exporter). */
export function poseAt(mood: MontyMood, t: number): PoseMap {
  const out: PoseMap = {};
  for (const [part, anim] of Object.entries(ANIMS[mood]) as [Part, Anim][]) out[part] = sample(anim, t);
  return out;
}

const n = (v: number) => Math.round(v * 1000) / 1000;

function cssTransform(p: Required<Pose>): string {
  return `translate(${n(p.tx)}px, ${n(p.ty)}px) rotate(${n(p.r)}deg) scale(${n(p.sx)}, ${n(p.sy)})`;
}

/** Keyframes + selectors for every mood; scope is the root class of the <svg>. */
export function montyCss(scope = '.monty'): string {
  const out: string[] = [];
  for (const part of Object.keys(ORIGIN) as Part[]) {
    const [x, y] = ORIGIN[part];
    out.push(`${scope} .${PART_CLASS[part]}{transform-box:view-box;transform-origin:${x}px ${y}px}`);
  }
  for (const mood of MONTY_MOODS) {
    for (const [part, anim] of Object.entries(ANIMS[mood]) as [Part, Anim][]) {
      const name = `monty-${mood}-${part}`;
      const steps = anim.frames
        .map(([o, p]) => {
          const f = full(p);
          return `${n(o * 100)}%{transform:${cssTransform(f)};opacity:${n(f.o)}}`;
        })
        .join('');
      out.push(`@keyframes ${name}{${steps}}`);
      out.push(
        `${scope}[data-mood="${mood}"] .${PART_CLASS[part]}{animation:${name} ${anim.dur}s ease-in-out infinite}`,
      );
    }
  }
  out.push(`${scope}.monty-still *{animation:none!important}`);
  out.push(`@media (prefers-reduced-motion: reduce){${scope} *{animation:none!important}}`);
  return out.join('\n');
}

/* ------------------------------------------------------------------ */
/* Artwork                                                             */
/* ------------------------------------------------------------------ */

const C = MONTY_COLORS;

function face(mood: MontyMood): string {
  const line = (w = 4.6) => `fill="none" stroke="${C.ink}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
  const stroke = line();
  const happyEyes = `<path d="M79 99 Q88 87 97 99" ${stroke}/><path d="M119 95 Q128 83 137 95" ${stroke}/>`;
  const openEye = (cx: number, cy: number, dx = 0, dy = 0, rx = 5.2, ry = 6.8) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${C.ink}"/>` +
    `<circle cx="${cx + 1.8 + dx}" cy="${cy - 2.4 + dy}" r="1.9" fill="#fff"/>`;
  const openEyes = (dx = 0, dy = 0, rx?: number, ry?: number) =>
    `<g class="m-eyes">${openEye(88 + dx, 96 + dy, 0, 0, rx, ry)}${openEye(128 + dx, 92 + dy, 0, 0, rx, ry)}</g>`;
  const blush = (o: number) =>
    `<ellipse cx="78" cy="109" rx="8" ry="4.5" fill="${C.blush}" opacity="${o}"/>` +
    `<ellipse cx="140" cy="104" rx="8" ry="4.5" fill="${C.blush}" opacity="${o}"/>`;
  const catMouth = `<path d="M102 108 q4 4 8 0 q4 4 8 0" ${line(3)}/>`;

  switch (mood) {
    case 'happy':
      return happyEyes + blush(0.38);
    case 'celebrate':
      return (
        happyEyes +
        blush(0.45) +
        `<path d="M101 106 Q110 120 119 105 Z" fill="${C.ink}" stroke="${C.ink}" stroke-width="2.4" stroke-linejoin="round"/>` +
        `<path d="M105 111.5 Q110 116 115 110.5 Q110 109 105 111.5 Z" fill="#ff7aa8"/>`
      );
    case 'worried':
      return (
        openEyes(0, 1, 4.8, 6.2) +
        `<path d="M79 88 L95 79" ${line(3.2)}/><path d="M121 75 L137 83" ${line(3.2)}/>` +
        `<path d="M100 113 q4 -3.5 8 0 q4 3.5 8 0" ${line(3)}/>` +
        blush(0.18)
      );
    case 'sleepy':
      return (
        `<path d="M80 96 Q88 102.5 96 96" ${line(4)}/><path d="M120 92 Q128 98.5 136 92" ${line(4)}/>` +
        blush(0.32) +
        `<ellipse cx="110" cy="110" rx="3" ry="2.4" fill="${C.ink}" opacity=".85"/>`
      );
    case 'thinking':
      return openEyes(2, -2) + `<path d="M104 110 L114 108.5" ${line(3)}/>` + blush(0.22);
    case 'idle':
    default:
      return openEyes() + catMouth + blush(0.28);
  }
}

function fx(mood: MontyMood): string {
  const spark = `fill="none" stroke="${C.spark}" stroke-width="5.5" stroke-linecap="round"`;
  switch (mood) {
    case 'happy':
      return `<g class="m-fx"><path d="M170 26 L164 41" ${spark}/><path d="M176 52 L189 45" ${spark}/></g>`;
    case 'celebrate': {
      const bits = [
        `<rect x="30" y="40" width="8" height="5" rx="1.5" fill="#ffb547" transform="rotate(-25 34 42)"/>`,
        `<rect x="160" y="88" width="8" height="5" rx="1.5" fill="#29c5a6" transform="rotate(30 164 90)"/>`,
        `<circle cx="52" cy="22" r="3.4" fill="#ff7aa8"/>`,
        `<circle cx="182" cy="74" r="3" fill="${C.spark}"/>`,
        `<rect x="22" y="76" width="7" height="4.5" rx="1.5" fill="${C.spark}" transform="rotate(20 25 78)"/>`,
        `<path d="M170 26 L164 41" ${spark}/><path d="M176 52 L189 45" ${spark}/>`,
        // a coin, because this is still about money
        `<g transform="translate(28 112)"><circle r="9" fill="#ffc94a" stroke="#e6a417" stroke-width="2"/><path d="M-3.5 -4 h7 M-3.5 -1 h7 M0 -1 v6" stroke="#b07a00" stroke-width="1.8" stroke-linecap="round"/></g>`,
      ];
      return `<g class="m-fx">${bits.join('')}</g>`;
    }
    case 'worried':
      return `<g class="m-fx"><path d="M160 52 C 160 52, 153 62, 153 66.5 A 7 7 0 0 0 167 66.5 C 167 62, 160 52, 160 52 Z" fill="#9cc3ff" stroke="#6f9cf0" stroke-width="1.5"/><ellipse cx="157.5" cy="65" rx="1.6" ry="2.6" fill="#fff" opacity=".9"/></g>`;
    case 'sleepy': {
      const z = (x: number, y: number, s: number, o: number) =>
        `<path d="M${x} ${y} h${s} l${-s} ${s * 1.1} h${s}" fill="none" stroke="${C.accent}" stroke-width="${2.2 + s / 10}" stroke-linecap="round" stroke-linejoin="round" opacity="${o}"/>`;
      return `<g class="m-fx">${z(160, 56, 8, 0.6)}${z(170, 38, 11, 0.8)}${z(181, 15, 13, 1)}</g>`;
    }
    case 'thinking':
      return (
        `<g class="m-fx">` +
        `<circle cx="160" cy="62" r="3.2" fill="#fff" stroke="${C.lavender}" stroke-width="2"/>` +
        `<circle cx="168" cy="50" r="5" fill="#fff" stroke="${C.lavender}" stroke-width="2"/>` +
        `<ellipse cx="180" cy="30" rx="16" ry="12" fill="#fff" stroke="${C.lavender}" stroke-width="2"/>` +
        `<circle cx="173" cy="30" r="2.2" fill="${C.accent}"/><circle cx="180" cy="30" r="2.2" fill="${C.accent}"/><circle cx="187" cy="30" r="2.2" fill="${C.accent}"/>` +
        `</g>`
      );
    default:
      return '';
  }
}

function transformAttr(part: Part, pose?: Pose): string {
  if (!pose) return '';
  const p = full(pose);
  const [ox, oy] = ORIGIN[part];
  const t = `translate(${n(ox + p.tx)} ${n(oy + p.ty)}) rotate(${n(p.r)}) scale(${n(p.sx)} ${n(p.sy)}) translate(${-ox} ${-oy})`;
  return ` transform="${t}"${p.o !== 1 ? ` opacity="${n(p.o)}"` : ''}`;
}

export interface MontySvgOptions {
  mood?: MontyMood;
  /** Unique prefix for gradient ids — needed when several Montys share a page. */
  id?: string;
  /** Freeze every part in this pose (frame export). Omit to let CSS animate. */
  pose?: PoseMap;
  /** Embed the keyframes so the file animates on its own (standalone .svg). */
  embedCss?: boolean;
  /** Override the viewBox, e.g. a head crop for avatars. */
  viewBox?: string;
  /** Solid background fill, e.g. for GIFs. */
  background?: string;
  /** Draw the soft floor shadow. */
  shadow?: boolean;
  /** Draw the mood's effects (sparkles, Zs, bubble…). */
  fx?: boolean;
  /** Draw the tail (off for tight head crops, where it shows as a stray stub). */
  tail?: boolean;
  width?: number | string;
  height?: number | string;
  still?: boolean;
}

/** The full character as an SVG string. */
export function montySvg(opts: MontySvgOptions = {}): string {
  const mood = opts.mood ?? 'idle';
  const id = opts.id ?? 'monty';
  const pose = opts.pose;
  const viewBox = opts.viewBox ?? '0 0 200 200';
  const [vx, vy, vw, vh] = viewBox.split(/\s+/).map(Number);
  const g = (part: Part, inner: string) => {
    // In a frozen pose the eyes are a nested group in the face markup; patch it there instead.
    return `<g class="${PART_CLASS[part]}"${transformAttr(part, pose?.[part])}>${inner}</g>`;
  };
  const ref = (name: string) => `url(#${id}-${name})`;

  let faceMarkup = face(mood);
  if (pose?.eyes) faceMarkup = faceMarkup.replace('<g class="m-eyes">', `<g class="m-eyes"${transformAttr('eyes', pose.eyes)}>`);
  let fxMarkup = opts.fx === false ? '' : fx(mood);
  if (pose?.fx && fxMarkup) fxMarkup = fxMarkup.replace('<g class="m-fx">', `<g class="m-fx"${transformAttr('fx', pose.fx)}>`);

  const defs = `<defs>
<radialGradient id="${id}-head" cx="42%" cy="34%" r="72%"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#eff0ff"/><stop offset="1" stop-color="#b6bbf6"/></radialGradient>
<radialGradient id="${id}-body" cx="50%" cy="22%" r="85%"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#e8eaff"/><stop offset="1" stop-color="#a3a9f2"/></radialGradient>
<radialGradient id="${id}-paw" cx="45%" cy="30%" r="80%"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#eef0ff"/><stop offset="1" stop-color="#bfc3f7"/></radialGradient>
<linearGradient id="${id}-ear" x1="0" y1="1" x2=".4" y2="0"><stop offset="0" stop-color="#8e95f4"/><stop offset="1" stop-color="#cfd4ff"/></linearGradient>
<linearGradient id="${id}-inner" x1="0" y1="1" x2=".3" y2="0"><stop offset="0" stop-color="#4f55e6"/><stop offset="1" stop-color="#7d84f5"/></linearGradient>
<linearGradient id="${id}-tail" gradientUnits="userSpaceOnUse" x1="36" y1="98" x2="76" y2="168"><stop offset="0" stop-color="${C.sky}"/><stop offset=".5" stop-color="#6c74f1"/><stop offset="1" stop-color="${C.deep}"/></linearGradient>
<radialGradient id="${id}-shadow"><stop offset="0" stop-color="${C.accent}" stop-opacity=".28"/><stop offset="1" stop-color="${C.accent}" stop-opacity="0"/></radialGradient>
</defs>`;

  const tail = g(
    'tail',
    `<path d="M82 164 C 56 167, 45 151, 45 135 C 45 121, 39 112, 34 104" fill="none" stroke="${ref('tail')}" stroke-width="16" stroke-linecap="round"/>`,
  );

  const body = g(
    'body',
    `<path d="M72 172 C 63 167, 61 140, 78 128 C 91 119, 121 119, 134 128 C 149 140, 147 167, 138 172 Z" fill="${ref('body')}"/>` +
      `<ellipse cx="92" cy="167" rx="12.5" ry="9.5" fill="${ref('paw')}" stroke="${C.accent}" stroke-opacity=".14" stroke-width="1.5"/>` +
      `<ellipse cx="120" cy="167" rx="12.5" ry="9.5" fill="${ref('paw')}" stroke="${C.accent}" stroke-opacity=".14" stroke-width="1.5"/>`,
  );

  const earL = g(
    'earL',
    `<path d="M58 86 C 53 61, 57 37, 70 28 C 79 23, 93 39, 105 53 Z" fill="${ref('ear')}"/>` +
      `<path d="M67 72 C 64 56, 67 44, 73 39 C 79 38, 88 47, 96 56 Z" fill="${ref('inner')}"/>`,
  );
  const earR = g(
    'earR',
    `<path d="M115 52 C 128 40, 141 26, 150 28 C 161 32, 165 60, 161 84 Z" fill="${ref('ear')}"/>` +
      `<path d="M125 52 C 133 44, 142 37, 148 39 C 154 43, 156 58, 155 70 Z" fill="${ref('inner')}"/>`,
  );

  const head = g(
    'head',
    earL +
      earR +
      `<ellipse cx="108" cy="92" rx="54" ry="42" fill="${ref('head')}"/>` +
      // soft rim light on the forehead
      `<ellipse cx="96" cy="66" rx="22" ry="9" fill="#fff" opacity=".55"/>` +
      faceMarkup,
  );

  const shadow =
    opts.shadow === false
      ? ''
      : g('shadow', `<ellipse cx="104" cy="177" rx="54" ry="7" fill="${ref('shadow')}"/>`);

  const bg = opts.background ? `<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="${opts.background}"/>` : '';
  const css = opts.embedCss ? `<style>${montyCss('.monty')}</style>` : '';
  const size = `${opts.width !== undefined ? ` width="${opts.width}"` : ''}${opts.height !== undefined ? ` height="${opts.height}"` : ''}`;
  const cls = `monty${opts.still ? ' monty-still' : ''}`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${size} class="${cls}" data-mood="${mood}">` +
    css +
    defs +
    bg +
    shadow +
    g('all', (opts.tail === false ? '' : tail) + body + head + fxMarkup) +
    `</svg>`
  );
}

/** Square crop around the head — avatars, favicons, list icons. */
export const MONTY_HEAD_VIEWBOX = '44 16 132 132';
