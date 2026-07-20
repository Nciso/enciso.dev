// The Signal renderer — an oscilloscope-style trace.
//
// It reads the identity's nodes as a row of thin, center-origin strokes. The
// seed fixes each stroke's resting height and phase, giving the form a unique
// idle *rhythm* rather than a recognizable silhouette. The VisualState then
// bends that rhythm:
//
//   energy     → oscillation amplitude
//   activity   → how fast the trace advances
//   coherence  → blend between a shared traveling wave (ordered) and per-stroke
//                jitter (scattered)
//   attention  → overall brightness + scale (how awake it looks)
//   direction  → whether the traveling wave converges inward (gathering) or
//                radiates outward from the center (emitting)
//
// Everything is CSS transforms on a handful of <span>s — no canvas, no assets,
// composited on the GPU.

import type { Identity } from '../identity';
import type { VisualState } from '../driver';
import type { Renderer, RenderOptions } from './types';

const now = () => (typeof performance !== 'undefined' ? performance.now() : 0);

export function createSignalRenderer(
  root: HTMLElement,
  identity: Identity,
  opts: RenderOptions = {}
): Renderer {
  const reduced = opts.reducedMotion ?? false;
  const n = identity.nodes.length;
  const center = (n - 1) / 2;

  root.classList.add('idsig');

  // Build the strokes once. Thickness follows each node's weight.
  const bars: HTMLSpanElement[] = identity.nodes.map((node) => {
    const bar = document.createElement('span');
    bar.className = 'idsig__bar';
    bar.style.setProperty('--w', (0.7 + node.weight * 0.6).toFixed(3));
    root.appendChild(bar);
    return bar;
  });

  // Internal clock. In animated mode it advances with real time (scaled by
  // activity); when settled it stays frozen at the identity's resting phase so
  // the pose depends only on state, not on when render() happened to be called.
  let clock = 0;
  let last = now();

  function render(state: VisualState): void {
    if (!reduced) {
      const t = now();
      const dt = Math.min((t - last) / 16.667, 3);
      last = t;
      // Advance the phase faster when there's more computational activity.
      clock += (0.6 + state.activity * 2.6) * identity.speed * 0.06 * dt;
    }

    const amp = 0.12 + state.energy * 0.55;
    const dir = state.direction; // -1 inward … +1 outward
    const wake = 0.35 + state.attention * 0.65;

    for (let i = 0; i < n; i++) {
      const node = identity.nodes[i];
      const bar = bars[i];

      // Distance from center, -1 … 1 across the row. A traveling wave whose
      // phase gradient follows `dir` makes the motion converge on, or radiate
      // from, the center bar.
      const fromCenter = center === 0 ? 0 : (i - center) / center;
      const phase = reduced ? node.phase : clock;
      const coherent = Math.sin(phase - fromCenter * dir * 2.2 + node.phase * 0.15);
      const scattered = Math.sin(phase * (1.05 + node.drift * 0.6) + node.phase);
      const wave = lerp(scattered, coherent, state.coherence);

      // Resting height, scaled by wakefulness, plus the oscillation.
      let h = node.rest * wake + wave * amp;
      // Low coherence (e.g. error) lets a couple of strokes collapse, so the
      // structure reads as interrupted rather than merely quiet.
      if (state.coherence < 0.3) h *= 0.55 + 0.45 * Math.abs(scattered);
      h = clamp(h, 0.06, 1);

      bar.style.transform = `scaleY(${h.toFixed(3)})`;
      // Center strokes sit slightly brighter; attention lifts the whole set.
      const bright = (0.45 + node.weight * 0.35) * (0.5 + state.attention * 0.5);
      bar.style.opacity = bright.toFixed(3);
    }

    // The whole glyph breathes a touch of scale and opacity with attention.
    root.style.setProperty('--wake', wake.toFixed(3));
  }

  return {
    render,
    destroy() {
      for (const bar of bars) bar.remove();
      root.classList.remove('idsig');
      root.style.removeProperty('--wake');
    },
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}
