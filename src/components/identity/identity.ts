// The Identity: a deterministic visual structure derived purely from a seed.
//
// This layer knows nothing about the browser, about state, or about how it will
// be drawn. It only describes an abstract, renderer-agnostic form — a handful of
// weighted nodes in unit space, plus a few edges and some global rhythm. A
// signal renderer reads the nodes as strokes; a constellation renderer could
// read the same nodes as points and the edges as links. Same seed ⇒ same form,
// forever.

import { makeRng, type Rng } from './seed';

/** One element of the form. Positions live in a centered unit space [-1, 1]. */
export interface IdentityNode {
  /** Horizontal resting position, -1 (left) … 1 (right). */
  x: number;
  /** Vertical resting position, -1 (bottom) … 1 (top). */
  y: number;
  /** Resting magnitude 0…1 — a signal renderer reads this as stroke height. */
  rest: number;
  /** Phase offset in radians — makes each element breathe out of step. */
  phase: number;
  /** Per-node drift multiplier for incoherent motion. */
  drift: number;
  /** Visual weight 0…1 — thickness / brightness bias. */
  weight: number;
}

export interface Identity {
  /** The seed this form was generated from (useful for debugging / labels). */
  seed: string;
  /** Ordered nodes, left → right. Odd count keeps the form asymmetric-but-balanced. */
  nodes: IdentityNode[];
  /** Index pairs describing latent connections (for link-based renderers). */
  edges: [number, number][];
  /** Baseline oscillation speed multiplier. */
  speed: number;
  /** Global asymmetry 0…1 — how lopsided the resting pose leans. */
  asymmetry: number;
}

/**
 * Generate the deterministic identity for a seed.
 *
 * The seed influences element count, spacing, resting pose, phase offsets,
 * asymmetry and rhythm — but nothing here ever depends on `Math.random` or the
 * clock. Call it once and cache the result.
 */
export function generateIdentity(seed: string): Identity {
  const rng: Rng = makeRng(seed);

  // Odd count in [5, 7] so there's a true center and the form is never a
  // mirror-symmetric "equalizer".
  const count = rng.int(5, 7) | 1;
  const asymmetry = rng.range(0.15, 0.55);
  const lean = rng.sign(); // which way the resting pose tilts

  const nodes: IdentityNode[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1); // 0…1 across the row
    const x = t * 2 - 1; // -1…1
    // Resting height: a seeded per-node base, tilted by the global lean so the
    // silhouette is recognizably lopsided rather than a neat hump.
    const base = rng.range(0.28, 1);
    const tilt = lean * asymmetry * (x * 0.5); // taller toward the lean side
    const rest = clamp01(base + tilt);
    nodes.push({
      x,
      // A gentle seeded vertical offset so link-based renderers get real 2-D
      // structure; signal renderers simply ignore y.
      y: rng.range(-0.5, 0.5) * asymmetry,
      rest,
      phase: rng.range(0, Math.PI * 2),
      drift: rng.range(0.6, 1.4),
      weight: rng.range(0.5, 1),
    });
  }

  // A sparse set of edges between nearby-ish nodes — latent topology that only
  // some renderers use.
  const edges: [number, number][] = [];
  const edgeCount = rng.int(count - 1, count);
  for (let e = 0; e < edgeCount; e++) {
    const a = rng.int(0, count - 1);
    let b = rng.int(0, count - 1);
    if (b === a) b = (a + 1) % count;
    const key: [number, number] = a < b ? [a, b] : [b, a];
    if (!edges.some(([p, q]) => p === key[0] && q === key[1])) edges.push(key);
  }

  return {
    seed,
    nodes,
    edges,
    speed: rng.range(0.7, 1.15),
    asymmetry,
  };
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/**
 * The site's canonical seed. Kept stable so the signature never shifts — this
 * is what people gradually come to recognize.
 */
export const SITE_SEED = 'Enrique Enciso · enciso.dev';
