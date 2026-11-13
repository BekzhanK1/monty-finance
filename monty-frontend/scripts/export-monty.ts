/*
 * Regenerates Monty's brand assets from src/brand/monty/art.ts.
 *
 *   npm run brand:monty
 *
 * Writes to brand/monty/ at the repo root:
 *   <mood>.svg   animated, self-contained (works in <img>, Telegram web previews, docs)
 *   <mood>.png   512px still, transparent
 *   <mood>.gif   320px animated loop on white (bot messages, chats, slides)
 *   avatar.png   640px bot / profile avatar
 * and public/favicon.svg + public/apple-touch-icon.png.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import gifenc from 'gifenc';
import {
  LOOP_S,
  MONTY_HEAD_VIEWBOX,
  MONTY_MOODS,
  montySvg,
  poseAt,
} from '../src/brand/monty/art.ts';

const { GIFEncoder, quantize, applyPalette } = gifenc;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Kept out of public/ so ~5 MB of GIFs never ship with the web app.
const out = join(root, '../brand/monty');
mkdirSync(out, { recursive: true });

const GIF_SIZE = 320;
const FPS = 25;

function rasterize(svg: string, width: number) {
  const img = new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { loadSystemFonts: false } }).render();
  return { png: img.asPng(), rgba: img.pixels, width: img.width, height: img.height };
}

const avatarBg = (vb: string) => {
  const [x, y, w, h] = vb.split(' ').map(Number);
  return (
    `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7b7bf0"/><stop offset="1" stop-color="#4338ca"/></linearGradient></defs>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#bg)"/>`
  );
};

/** Head-only Monty on the brand gradient, as a full square (Telegram crops avatars to a circle). */
function avatarSvg() {
  const vb = '28 16 160 160';
  const inner = montySvg({ mood: 'happy', id: 'av', viewBox: vb, shadow: false, fx: false, tail: false, still: true });
  return inner.replace(/(<svg[^>]*>)/, `$1${avatarBg(vb)}`);
}

for (const mood of MONTY_MOODS) {
  writeFileSync(join(out, `${mood}.svg`), montySvg({ mood, id: `monty-${mood}`, embedCss: true }));
  writeFileSync(join(out, `${mood}.png`), rasterize(montySvg({ mood, still: true }), 512).png);

  const gif = GIFEncoder();
  const frames = LOOP_S * FPS;
  for (let i = 0; i < frames; i++) {
    const svg = montySvg({ mood, pose: poseAt(mood, i / FPS), background: '#ffffff' });
    const { rgba, width, height } = rasterize(svg, GIF_SIZE);
    const palette = quantize(rgba, 256);
    gif.writeFrame(applyPalette(rgba, palette), width, height, { palette, delay: 1000 / FPS });
  }
  gif.finish();
  writeFileSync(join(out, `${mood}.gif`), gif.bytes());
  console.log(`monty: ${mood}`);
}

writeFileSync(join(out, 'avatar.png'), rasterize(avatarSvg(), 640).png);
writeFileSync(join(out, 'avatar.svg'), avatarSvg());
writeFileSync(
  join(root, 'public/favicon.svg'),
  montySvg({ mood: 'happy', id: 'fav', viewBox: MONTY_HEAD_VIEWBOX, shadow: false, fx: false, tail: false, still: true }),
);
writeFileSync(join(root, 'public/apple-touch-icon.png'), rasterize(avatarSvg(), 180).png);
console.log(`monty: assets written to ${out}`);
