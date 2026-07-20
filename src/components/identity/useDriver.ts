import { useEffect, useRef, useState } from 'react';
import { createDriver, type Driver } from './driver';

/** Read the user's reduced-motion preference, reactively. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/**
 * Own a single behavior Driver for the lifetime of the component. The app calls
 * `driver.setPhase(...)` / `driver.impulse()`; the renderer subscribes to it.
 * Recreated only if the reduced-motion preference flips.
 */
export function useDriver(): Driver | null {
  const reduced = usePrefersReducedMotion();
  const [driver, setDriver] = useState<Driver | null>(null);
  const ref = useRef<Driver | null>(null);

  useEffect(() => {
    const d = createDriver({ reducedMotion: reduced });
    ref.current = d;
    setDriver(d);
    return () => {
      d.destroy();
      ref.current = null;
    };
  }, [reduced]);

  return driver;
}
