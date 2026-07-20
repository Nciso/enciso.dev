// Shared types for the browser-side ask experience.

/** A retrievable slice of the knowledge base, produced at build time. */
export interface Chunk {
  id: string;
  path: string;
  title: string;
  heading: string;
  url: string;
  text: string;
  tags: string[];
}

/** A deduplicated source shown beneath an answer. */
export interface Source {
  title: string;
  heading: string;
  url: string;
}

/** Coarse capability tiers for the local model. */
export type AiStatus =
  | 'unsupported' // browser can't run WebLLM (no WebGPU) → search-only
  | 'idle' // supported, model not yet loaded
  | 'loading' // model downloading / initializing
  | 'ready' // model loaded and ready to generate
  | 'error'; // load failed → fall back to search

/** Progress reported while the model downloads/initializes. */
export interface LoadProgress {
  text: string;
  progress: number; // 0..1
}
