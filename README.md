# Browser-Native AI Knowledge Site

A personal website that behaves like queryable documentation. Visitors ask
natural-language questions and get answers **grounded in published Markdown** —
with source citations. All retrieval and AI inference happen **in the visitor's
browser**. No backend, no inference API, no per-answer cost.

If a browser can't run the on-device model, it gracefully falls back to local
search, and can hand the grounded prompt off to ChatGPT.

## How it works

```
Markdown (src/content) ──build──▶ chunks + search index (public/search-index.json)
                                        │
                        Browser ◀───────┘
                          │
             MiniSearch retrieval ─▶ top chunks ─▶ WebLLM (WebGPU) ─▶ answer + Sources
                                              └─ (no WebGPU) ─▶ top matches only
                                              └─ Continue in ChatGPT (copies grounded prompt)
```

- **Content** — every fact lives in `src/content/**/*.md` with frontmatter
  (`title`, `description`, `tags`). This is the single source of truth.
- **Build-time index** — `scripts/build-index.mjs` splits each doc by heading
  into chunks and writes `public/search-index.json`, plus `llms.txt` /
  `llms-full.txt` for external AI systems. Runs automatically via `prebuild`.
- **Retrieval** — `src/components/ask/search.ts` loads the index into MiniSearch
  and returns the top-N chunks entirely client-side.
- **Inference** — `src/components/ask/webllm.ts` runs a ~1B model
  (`Llama-3.2-1B-Instruct`) via WebLLM/WebGPU. Downloaded only after the visitor
  clicks **Enable Local AI**, then cached for near-instant repeat visits.
- **Grounding** — `src/components/ask/prompt.ts` builds the same
  context-constrained prompt for both the local model and the ChatGPT handoff:
  only answer from context, never invent, cite sources.

## Develop

```bash
pnpm install
pnpm dev      # rebuilds the index, then starts Astro at http://localhost:4321
pnpm build    # static output in dist/ (prebuild regenerates the index)
pnpm preview  # serve the production build locally
```

Deploy `dist/` to any static host (Cloudflare Pages, Vercel, Netlify, GitHub
Pages). No server configuration required.

## Editing the knowledge base

Add or edit files in `src/content/`. Each heading (`##` / `###`) becomes a
retrievable, individually-citable chunk. Rebuild (`pnpm build`) and the
index, pages, and `llms.txt` regenerate automatically.

## Stack

Astro · React · TypeScript · MiniSearch · WebLLM · 100% static.
