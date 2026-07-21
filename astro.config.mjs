// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// Static output — the entire site (including the AI experience) runs in the
// browser. No SSR, no serverless functions, no backend of any kind.
export default defineConfig({
  // Override the canonical domain with the PUBLIC_SITE_URL env var when deploying.
  site: process.env.PUBLIC_SITE_URL || 'https://enciso.dev',
  integrations: [react()],
  markdown: {
    // No Shiki highlighting — its dark theme clashes with the grayscale design.
    // Code blocks are styled by our own theme-aware CSS (.prose pre). Heading
    // ids remain github-slugger-compatible via Astro's default, so citation
    // anchors still line up with scripts/build-index.mjs chunk anchors.
    syntaxHighlight: false,
  },
  vite: {
    // WebLLM is large and dynamically imported. Vite's dep optimizer produces
    // a stale `.vite/deps/@mlc-ai_web-llm.js?v=…` URL that 404s on the dynamic
    // import in dev. Excluding it serves the package as native ESM and fixes
    // "Failed to fetch dynamically imported module". (No effect on prod build.)
    optimizeDeps: { exclude: ['@mlc-ai/web-llm'] },
  },
});
