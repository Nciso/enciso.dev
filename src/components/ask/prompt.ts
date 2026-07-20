// Prompt construction. The same grounded context feeds both the local model
// and the "Continue in ChatGPT" handoff, so the two answers stay consistent.

import type { Chunk } from './types';

const SITE = 'https://enciso.dev';

export const SYSTEM_PROMPT = [
  'You are a small AI model running privately in the visitor\'s browser on',
  'Enrique Enciso\'s personal website. You answer questions about Enrique using',
  'only the content published on this site.',
  'Refer to Enrique in the third person ("Enrique", "he", "his"). Do not pretend',
  'to be Enrique or speak as him.',
  'When a visitor says "you" or "your", they mean Enrique — answer about him',
  '(e.g. "You can reach Enrique at…").',
  'Use ONLY the facts in the provided context.',
  'Rules:',
  '- Never invent details. If the context lacks the answer, say the site doesn\'t',
  '  cover that yet and mention what is available.',
  '- Be concise: two to four sentences. Never repeat a sentence or idea.',
  '- Do not restate the question or add a preamble. Just answer.',
  '- Do not mention "the context", "the sources", or "the documents".',
].join('\n');

/** Format retrieved chunks as a numbered context block. */
export function formatContext(chunks: Chunk[]): string {
  if (!chunks.length) return '(no relevant content found)';
  return chunks
    .map(
      (c, i) =>
        `[${i + 1}] ${c.title} — ${c.heading}\n${c.text}\nSource: ${SITE}${c.url}`
    )
    .join('\n\n');
}

/** The user-turn message given to the local model. */
export function buildUserMessage(question: string, chunks: Chunk[]): string {
  return `Question: ${question}\n\nContext:\n${formatContext(chunks)}`;
}

export interface HandoffSource {
  title: string;
  heading: string;
  url: string;
}

/**
 * A short prompt for the ChatGPT handoff that asks ChatGPT to *read the actual
 * webpages* (the relevant source pages plus the full-content llms-full.txt) and
 * answer from them. `origin` is the live site origin so the links resolve; this
 * only works once the site is deployed at a public URL (not localhost).
 */
export function buildHandoffPrompt(
  question: string,
  sources: HandoffSource[],
  origin: string
): string {
  const pages = sources.map(
    (s) =>
      `- ${origin}${s.url}  (${s.title}${
        s.heading && s.heading !== s.title ? ' — ' + s.heading : ''
      })`
  );
  return [
    `Please answer this question about Enrique Enciso by reading his website:`,
    `"${question}"`,
    ``,
    `These pages are recent and probably aren't in your training data or search`,
    `index yet — open and read them directly rather than relying on memory:`,
    `- ${origin}/llms-full.txt  (all of Enrique's content in one file)`,
    ...pages,
    ``,
    `Use only what these pages say and cite the ones you use. If they don't`,
    `answer it, say so rather than guessing.`,
  ].join('\n');
}
