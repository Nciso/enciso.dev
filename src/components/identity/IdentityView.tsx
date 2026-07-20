import { useEffect, useMemo, useRef } from 'react';
import { generateIdentity, SITE_SEED, type Identity as IdentityForm } from './identity';
import type { Driver } from './driver';
import { usePrefersReducedMotion } from './useDriver';
import { createSignalRenderer } from './renderers/signal';
import type { RendererFactory } from './renderers/types';

interface IdentityProps {
  /** The behavior driver whose state this instance visualizes. */
  driver: Driver | null;
  /** Seed for the deterministic form. Defaults to the site's canonical seed. */
  seed?: string;
  /** Swap the renderer family. Defaults to the signal (oscilloscope) renderer. */
  renderer?: RendererFactory;
  /** Rendered footprint in px (square-ish). */
  size?: number;
  className?: string;
  /** Accessible label; the glyph itself is decorative/aria-hidden. */
  title?: string;
}

/**
 * Mounts a renderer for the deterministic identity and feeds it the driver's
 * live VisualState. Purely a bridge: it owns no behavior of its own, so the
 * three layers (identity / behavior / rendering) stay fully independent.
 */
export default function Identity({
  driver,
  seed = SITE_SEED,
  renderer = createSignalRenderer,
  size = 26,
  className,
  title = 'Live status',
}: IdentityProps) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const reduced = usePrefersReducedMotion();
  const form: IdentityForm = useMemo(() => generateIdentity(seed), [seed]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !driver) return;

    const r = renderer(host, form, { reducedMotion: reduced });
    const unsubscribe = driver.subscribe((state) => r.render(state));

    return () => {
      unsubscribe();
      r.destroy();
    };
  }, [driver, form, renderer, reduced]);

  return (
    // Decorative: the app exposes status as live text elsewhere, so the glyph is
    // aria-hidden. `title` is a plain hover tooltip, not an ARIA label.
    <span
      ref={hostRef}
      className={`identity${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
      title={title}
      aria-hidden="true"
    />
  );
}
