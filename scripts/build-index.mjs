// Build-time index generation.
//
// Reads every Markdown file in src/content, splits each document by heading,
// and emits:
//   - public/search-index.json  → chunks consumed by MiniSearch in the browser
//   - public/llms.txt           → compact map of the knowledge base for agents
//   - public/llms-full.txt      → full concatenated content for agents
//
// This runs before every build (see the "prebuild" npm script) and during dev
// (see the "dev" script). No network, no runtime cost — pure static generation.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import GithubSlugger from 'github-slugger';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CONTENT_DIR = join(ROOT, 'src', 'content');
const PUBLIC_DIR = join(ROOT, 'public');
// Configurable via env (set in the host/CI); defaults to the production domain.
const SITE = process.env.PUBLIC_SITE_URL || 'https://enciso.dev';

/** Recursively collect every .md file under a directory. */
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (name.endsWith('.md')) out.push(full);
  }
  return out;
}

/** Turn "src/content/projects/reley.md" into the route slug "projects/reley". */
function toSlug(file) {
  return relative(CONTENT_DIR, file).replace(/\.md$/, '').split(sep).join('/');
}

/**
 * Split a Markdown body into heading-delimited sections.
 * Each section carries the heading text (or the doc title for pre-heading
 * intro text) and the prose beneath it, up to the next heading.
 */
function splitByHeadings(body, docTitle) {
  const lines = body.split('\n');
  const sections = [];
  let current = { heading: docTitle, lines: [] };

  for (const line of lines) {
    const m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (m) {
      if (current.lines.join('').trim()) sections.push(current);
      current = { heading: m[2].trim(), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.join('').trim()) sections.push(current);
  return sections;
}

/** Collapse Markdown prose into clean, searchable plain text. */
function toPlainText(md) {
  return md
    .replace(/```[\s\S]*?```/g, ' ')      // fenced code
    .replace(/`([^`]+)`/g, '$1')          // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links → text
    .replace(/[*_>#-]/g, ' ')             // markdown punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

const files = walk(CONTENT_DIR).sort();
const chunks = [];
const docs = [];

for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  const { data, content } = matter(raw);
  const slug = toSlug(file);
  const url = `/${slug}`;
  const title = data.title ?? slug;
  const slugger = new GithubSlugger();

  docs.push({ slug, url, title, description: data.description ?? '', content, order: data.order ?? 99 });

  for (const section of splitByHeadings(content, title)) {
    const text = toPlainText(section.lines.join('\n'));
    if (!text) continue;
    // Anchor only for real sub-headings; the intro section links to the page top.
    const isIntro = section.heading === title;
    const anchor = isIntro ? '' : `#${slugger.slug(section.heading)}`;
    chunks.push({
      id: `${slug}::${chunks.length}`,
      path: slug,
      title,
      heading: section.heading,
      url: `${url}${anchor}`,
      text,
      tags: Array.isArray(data.tags) ? data.tags : [],
    });
  }
}

mkdirSync(PUBLIC_DIR, { recursive: true });

// 1. Search index for MiniSearch.
writeFileSync(join(PUBLIC_DIR, 'search-index.json'), JSON.stringify({ chunks }, null, 0));

// 2. llms.txt — a compact, link-first map for external AI systems.
docs.sort((a, b) => a.order - b.order);
const llms = [
  '# Enrique Enciso',
  '',
  '> Personal knowledge base. Answers are grounded in the pages below.',
  '',
  '## Pages',
  '',
  ...docs.map((d) => `- [${d.title}](${SITE}${d.url}): ${d.description}`),
  '',
].join('\n');
writeFileSync(join(PUBLIC_DIR, 'llms.txt'), llms);

// 3. llms-full.txt — the entire corpus inlined for agents that want everything.
const llmsFull = docs
  .map((d) => `# ${d.title}\n\nSource: ${SITE}${d.url}\n\n${d.content.trim()}`)
  .join('\n\n---\n\n');
writeFileSync(join(PUBLIC_DIR, 'llms-full.txt'), llmsFull + '\n');

console.log(
  `[build-index] ${docs.length} docs → ${chunks.length} chunks, plus llms.txt / llms-full.txt`
);
