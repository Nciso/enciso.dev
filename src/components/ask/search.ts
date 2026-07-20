// Local retrieval over the build-time index using MiniSearch.
// Loads once, searches entirely in the browser — no network after the initial
// index fetch, which is a small static JSON file.

import MiniSearch from 'minisearch';
import type { Chunk, Source } from './types';

let indexPromise: Promise<{ mini: MiniSearch; byId: Map<string, Chunk> }> | null = null;

async function load() {
  if (!indexPromise) {
    indexPromise = (async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}search-index.json`);
      if (!res.ok) throw new Error(`Failed to load search index (${res.status})`);
      const { chunks } = (await res.json()) as { chunks: Chunk[] };

      const mini = new MiniSearch<Chunk>({
        fields: ['title', 'heading', 'text', 'tags'],
        storeFields: ['id'],
        searchOptions: {
          boost: { title: 3, heading: 2, tags: 2 },
          prefix: true,
          fuzzy: 0.2,
          combineWith: 'OR',
        },
      });
      mini.addAll(chunks.map((c) => ({ ...c, tags: c.tags.join(' ') })));
      const byId = new Map(chunks.map((c) => [c.id, c]));
      return { mini, byId };
    })();
  }
  return indexPromise;
}

/** Retrieve the top-N most relevant chunks for a query. */
export async function retrieve(query: string, topN = 4): Promise<Chunk[]> {
  const { mini, byId } = await load();
  const results = mini.search(query);
  const chunks: Chunk[] = [];
  for (const r of results) {
    const chunk = byId.get(r.id as string);
    if (chunk) chunks.push(chunk);
    if (chunks.length >= topN) break;
  }
  return chunks;
}

/** Warm the index so the first real query is instant. */
export function warmSearch() {
  void load().catch(() => {});
}

/** Collapse chunks into a deduplicated, page-level source list for citations. */
export function toSources(chunks: Chunk[]): Source[] {
  const seen = new Set<string>();
  const sources: Source[] = [];
  for (const c of chunks) {
    if (seen.has(c.url)) continue;
    seen.add(c.url);
    sources.push({ title: c.title, heading: c.heading, url: c.url });
  }
  return sources;
}
