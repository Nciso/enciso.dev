// Generate public/favicon.ico from the identity's resting signal pose.
//
// Why an .ico at all: HTML pages reference /favicon.svg via <link>, but raw
// files (llms.txt, llms-full.txt) have no <head>, so browsers fall back to
// auto-requesting /favicon.ico at the site root. Without one they show a stale
// cached icon. This ships a real multi-size .ico so those pages get our mark.
//
// The strokes use a single neutral gray (an .ico can't theme-switch like the
// SVG), chosen to read on both light and dark browser tab strips.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PUBLIC_DIR = join(ROOT, 'public');

// The deterministic resting pose for seed "Enrique Enciso · enciso.dev" —
// 7 center-origin strokes leaning right (matches public/favicon.svg).
const BARS = [
  { x: 6, y1: 14.24, y2: 17.76, w: 2.18 },
  { x: 9.33, y1: 7.61, y2: 24.39, w: 2.55 },
  { x: 12.67, y1: 12.39, y2: 19.61, w: 2.09 },
  { x: 16, y1: 6.65, y2: 25.35, w: 2.31 },
  { x: 19.33, y1: 5.55, y2: 26.45, w: 2.72 },
  { x: 22.67, y1: 5, y2: 27, w: 2.09 },
  { x: 26, y1: 7.52, y2: 24.48, w: 2.29 },
];

const INK = '#8a8a8a'; // neutral: visible on light and dark tab strips

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <g fill="none" stroke="${INK}" stroke-linecap="round">
    ${BARS.map(
      (b) => `<line x1="${b.x}" y1="${b.y1}" x2="${b.x}" y2="${b.y2}" stroke-width="${b.w}"/>`
    ).join('\n    ')}
  </g>
</svg>`;

/** Wrap one or more PNG buffers into a single .ico container. */
function pngsToIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4); // image count

  const entries = [];
  const blobs = [];
  let offset = 6 + images.length * 16;
  for (const { size, data } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 ⇒ 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8); // size of image data
    entry.writeUInt32LE(offset, 12); // offset of image data
    entries.push(entry);
    blobs.push(data);
    offset += data.length;
  }
  return Buffer.concat([header, ...entries, ...blobs]);
}

const sizes = [16, 32, 48];
const images = [];
for (const size of sizes) {
  const data = await sharp(Buffer.from(svg), { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  images.push({ size, data });
}

mkdirSync(PUBLIC_DIR, { recursive: true });
writeFileSync(join(PUBLIC_DIR, 'favicon.ico'), pngsToIco(images));
console.log('favicon.ico written to public/ (16/32/48px)');
