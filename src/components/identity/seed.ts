// Deterministic pseudo-randomness. Given the same string, these always produce
// the same stream — the whole identity is a pure function of the seed, never of
// runtime randomness. Standard xmur3 (hash) + mulberry32 (PRNG); tiny and fast.

/** Hash a string into a 32-bit seed. */
export function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/** A seeded PRNG returning floats in [0, 1). */
export function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A small bundle of deterministic sampling helpers bound to one seed string. */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Float in [min, max). */
  range(min: number, max: number): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Either -1 or +1. */
  sign(): number;
}

export function makeRng(seed: string): Rng {
  const rand = mulberry32(xmur3(seed)());
  return {
    next: rand,
    range: (min, max) => min + rand() * (max - min),
    int: (min, max) => min + Math.floor(rand() * (max - min + 1)),
    sign: () => (rand() < 0.5 ? -1 : 1),
  };
}
