// The renderer contract. Anything that can draw an Identity given a live
// VisualState satisfies this — the driver and the identity never know which
// renderer is mounted, so swapping in a new family (constellation, field, …) is
// a matter of writing one factory and pointing <Identity renderer={…}> at it.

import type { Identity } from '../identity';
import type { VisualState } from '../driver';

export interface RenderOptions {
  /** Draw a settled, non-animated pose (still reflects state). */
  reducedMotion?: boolean;
}

export interface Renderer {
  /** Draw one frame for the given state. Called per-rAF, or once when settled. */
  render(state: VisualState): void;
  /** Tear down DOM / listeners. */
  destroy(): void;
}

/** A factory mounts a renderer into `root` for a given identity. */
export type RendererFactory = (
  root: HTMLElement,
  identity: Identity,
  opts: RenderOptions
) => Renderer;
