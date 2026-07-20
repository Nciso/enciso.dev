import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// The Markdown knowledge base. Every published document lives here and is the
// single source of truth for both the rendered pages and the search index.
const docs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    order: z.number().default(99),
  }),
});

export const collections = { docs };
