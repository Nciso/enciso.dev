// WebLLM integration — runs a small instruction-tuned model entirely in the
// browser via WebGPU. The model is only downloaded after the visitor explicitly
// opts in, and is cached (IndexedDB / Cache API) for near-instant repeat visits.

import type { MLCEngine } from '@mlc-ai/web-llm';
import type { Chunk, LoadProgress } from './types';
import { SYSTEM_PROMPT, buildUserMessage } from './prompt';

/** A model the visitor can pick. Sizes are the approximate first download. */
export interface ModelOption {
  id: string;
  label: string;
  size: string;
}

// A short menu spanning the tradeoff from "tiny + fast, less accurate" to
// "bigger + slower, more faithful". All are cached per-model after first load.
export const MODELS: ModelOption[] = [
  { id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', label: 'Qwen2.5 0.5B', size: '~0.4 GB' },
  { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', label: 'Qwen2.5 1.5B', size: '~1.1 GB' },
  { id: 'Llama-3.2-1B-Instruct-q4f32_1-MLC', label: 'Llama 3.2 1B', size: '~1.1 GB' },
  { id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC', label: 'Qwen2.5 3B', size: '~1.7 GB' },
  { id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC', label: 'Llama 3.2 3B', size: '~1.8 GB' },
];

// Default: small enough to keep the "runs in your browser" demo snappy.
export const DEFAULT_MODEL = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';

let engine: MLCEngine | null = null;
let loadedModel: string | null = null;
let enginePromise: Promise<MLCEngine> | null = null;

/** Quick, synchronous check: does the browser expose the WebGPU API at all? */
export function isWebGpuAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

/**
 * Definitive check: WebGPU is present AND an adapter is actually obtainable.
 * `navigator.gpu` can exist while `requestAdapter()` returns null (no usable
 * GPU / disabled), so this is what we gate the model on.
 */
export async function detectWebGpu(): Promise<boolean> {
  try {
    if (!isWebGpuAvailable()) return false;
    const adapter = await (navigator as unknown as { gpu: GPU }).gpu.requestAdapter();
    return adapter != null;
  } catch {
    return false;
  }
}

/** The model id currently loaded in the browser, if any. */
export function currentModel(): string | null {
  return loadedModel;
}

/**
 * Load (or reuse) the local engine for `modelId`, reporting download/init
 * progress. If a different model is already loaded, it's unloaded first so the
 * visitor can switch models freely.
 */
export async function loadEngine(
  modelId: string,
  onProgress?: (p: LoadProgress) => void
): Promise<MLCEngine> {
  if (engine && loadedModel === modelId) return engine;

  // Switching models: tear down the current engine before loading the new one.
  if (engine && loadedModel !== modelId) {
    try {
      await engine.unload();
    } catch {
      /* ignore */
    }
    engine = null;
    loadedModel = null;
    enginePromise = null;
  }

  if (!enginePromise) {
    enginePromise = (async () => {
      const { CreateMLCEngine } = await import('@mlc-ai/web-llm');
      const e = await CreateMLCEngine(modelId, {
        initProgressCallback: (report) =>
          onProgress?.({ text: report.text, progress: report.progress }),
      });
      engine = e;
      loadedModel = modelId;
      return e;
    })().catch((err) => {
      enginePromise = null; // allow retry
      throw err;
    });
  }
  return enginePromise;
}

/** A prior turn kept only in memory for follow-up context (never displayed). */
export interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Stream a grounded answer token-by-token. Yields the accumulated text so the
 * UI can render as it generates. `history` carries a few prior turns so the
 * model can resolve follow-up references ("it", "why", …) — the current turn is
 * still grounded in freshly retrieved context.
 */
export async function* generateAnswer(
  question: string,
  chunks: Chunk[],
  history: Turn[] = [],
  modelId: string = DEFAULT_MODEL
): AsyncGenerator<string, void, unknown> {
  const e = await loadEngine(modelId);
  const stream = await e.chat.completions.create({
    stream: true,
    temperature: 0.4,
    max_tokens: 384,
    // Small models loop badly at low temperature; these penalties curb the
    // "You have experience… You have experience…" degeneration.
    frequency_penalty: 0.6,
    presence_penalty: 0.4,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: buildUserMessage(question, chunks) },
    ],
  });

  let acc = '';
  for await (const part of stream) {
    const delta = part.choices[0]?.delta?.content ?? '';
    if (delta) {
      acc += delta;
      yield acc;
    }
  }
}
