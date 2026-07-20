// Living Identity System — a small procedural signature that reflects the state
// of the interface. Three independent layers:
//
//   identity  (generation)  seed → deterministic form.           identity.ts
//   behavior  (driver)      events → smoothed VisualState.       driver.ts
//   renderer  (drawing)     form + state → DOM.                  renderers/*
//
// Swap or add a renderer by writing a RendererFactory and passing it to
// <Identity renderer={…}>. The other two layers never need to change.

export { default as Identity } from './IdentityView';
export { generateIdentity, SITE_SEED, type Identity as IdentityForm } from './identity';
export { createDriver, type Driver, type VisualState, type Phase } from './driver';
export { useDriver, usePrefersReducedMotion } from './useDriver';
export { createSignalRenderer } from './renderers/signal';
export type { Renderer, RendererFactory, RenderOptions } from './renderers/types';
