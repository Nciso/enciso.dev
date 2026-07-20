// Generate a simple, grayscale Open Graph image (1200×630) to public/og.png.
// Rendered from an inline SVG via sharp (already a dependency). Regenerated on
// every build so it always reflects the configured domain.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PUBLIC_DIR = join(ROOT, 'public');
const SITE = process.env.PUBLIC_SITE_URL || 'https://enciso.dev';
const HOST = SITE.replace(/^https?:\/\//, '').replace(/\/$/, '');

const FONT = 'Helvetica, Arial, sans-serif';

const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#0d0f0e"/>
  <rect x="20" y="20" width="1160" height="590" rx="24" fill="none" stroke="#26302b" stroke-width="2"/>

  <!-- eyebrow -->
  <g transform="translate(80, 118)">
    <circle cx="9" cy="-6" r="9" fill="#5fbf8f"/>
    <text x="30" y="0" font-family="${FONT}" font-size="26" font-weight="600" letter-spacing="3" fill="#9aa39e">ENRIQUE ENCISO</text>
  </g>

  <!-- headline -->
  <text x="80" y="320" font-family="${FONT}" font-size="88" font-weight="700" fill="#fafafa">Ask about Enrique.</text>

  <!-- subtitle -->
  <text x="80" y="392" font-family="${FONT}" font-size="34" fill="#b3b3b3">A browser-native AI that answers from published content —</text>
  <text x="80" y="440" font-family="${FONT}" font-size="34" fill="#b3b3b3">private, grounded, and running with no backend.</text>

  <!-- footer -->
  <text x="80" y="560" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="28" fill="#8a938e">${HOST}</text>
  <text x="1120" y="560" text-anchor="end" font-family="${FONT}" font-size="26" fill="#8a938e">100% local inference</text>
</svg>`;

mkdirSync(PUBLIC_DIR, { recursive: true });
const buf = await sharp(Buffer.from(svg)).png().toBuffer();
writeFileSync(join(PUBLIC_DIR, 'og.png'), buf);
console.log(`[build-og] public/og.png (${(buf.length / 1024).toFixed(0)} KB) for ${HOST}`);
