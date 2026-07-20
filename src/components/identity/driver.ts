// The Behavior layer: turns discrete application/interaction events into a small,
// continuously-evolving VisualState. It is entirely independent of both the
// identity (what the form *is*) and the renderer (how the form is *drawn*).
//
// The contract the brief asks for: events never trigger animations directly.
// They nudge internal targets and inject energy. Every frame the live state
// eases toward those targets and injected energy decays. The result has inertia
// — it always feels like the same organism becoming calmer or more awake, never
// a playlist of one-off animations.

/** The normalized state a renderer consumes. All 0…1 except `direction`. */
export interface VisualState {
  /** Movement amplitude. */
  energy: number;
  /** How much computational work is happening (oscillation speed). */
  activity: number;
  /** How ordered the form feels, 0 (scattered) … 1 (aligned). */
  coherence: number;
  /** How awake it is, 0 (dormant) … 1 (fully present) — drives brightness/scale. */
  attention: number;
  /** Motion bias, -1 (inward / gathering) … +1 (outward / emitting). */
  direction: number;
}

/** The lifecycle phases the app can put the identity into. */
export type Phase =
  | 'idle'
  | 'typing'
  | 'loading'
  | 'thinking'
  | 'streaming'
  | 'complete'
  | 'error'
  | 'dormant'; // page hidden / blurred

/** The resting target each phase pulls the state toward. */
const PROFILES: Record<Phase, VisualState> = {
  //         energy activity coherence attention direction
  idle: { energy: 0.14, activity: 0.06, coherence: 0.9, attention: 0.4, direction: 0 },
  typing: { energy: 0.34, activity: 0.22, coherence: 0.82, attention: 0.85, direction: 0.15 },
  loading: { energy: 0.4, activity: 0.6, coherence: 0.5, attention: 0.7, direction: -0.35 },
  thinking: { energy: 0.5, activity: 0.62, coherence: 0.42, attention: 0.95, direction: -0.6 },
  streaming: { energy: 0.6, activity: 0.82, coherence: 0.72, attention: 1, direction: 0.7 },
  complete: { energy: 0.22, activity: 0.12, coherence: 1, attention: 0.7, direction: 0.1 },
  error: { energy: 0.16, activity: 0.1, coherence: 0.14, attention: 0.5, direction: -0.1 },
  dormant: { energy: 0.06, activity: 0.02, coherence: 0.95, attention: 0.12, direction: 0 },
};

const IDLE_STATE = PROFILES.idle;

export interface DriverOptions {
  /** Skip continuous animation; snap to targets and notify once per change. */
  reducedMotion?: boolean;
  /** Easing per frame at 60fps (0…1). Lower = more inertia. */
  stiffness?: number;
}

export interface Driver {
  /** Move the resting target to a new phase. Cheap; call as often as you like. */
  setPhase(phase: Phase): void;
  /** The phase currently targeted. */
  readonly phase: Phase;
  /** Inject a burst of energy (a keystroke, a completed answer, a submit). */
  impulse(amount?: number): void;
  /** Subscribe to per-frame state. Returns an unsubscribe fn. */
  subscribe(fn: (s: VisualState) => void): () => void;
  /** Whether it is animating continuously (false under reduced motion). */
  readonly animating: boolean;
  /** Stop the loop and release listeners. */
  destroy(): void;
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : 0);

/**
 * Create a behavior driver. It owns a single rAF loop (paused automatically when
 * the document is hidden) and pushes a fresh VisualState to subscribers each
 * frame. Under reduced motion it emits a settled state on each change instead.
 */
export function createDriver(opts: DriverOptions = {}): Driver {
  const stiffness = opts.stiffness ?? 0.08;
  const reduced = opts.reducedMotion ?? false;

  let phase: Phase = 'idle';
  let target: VisualState = { ...IDLE_STATE };
  // Live, smoothed values — start at the resting pose so the first paint is calm.
  const value: VisualState = { ...IDLE_STATE };
  // Transient energy injected by impulses, on top of the phase target. Decays.
  let charge = 0;

  const listeners = new Set<(s: VisualState) => void>();
  let raf = 0;
  let last = now();
  let running = false;

  function emit(): void {
    // Snapshot so listeners can't mutate the internal state.
    const snap: VisualState = {
      energy: clamp01(value.energy + charge),
      activity: clamp01(value.activity + charge * 0.6),
      coherence: clamp01(value.coherence),
      attention: clamp01(value.attention),
      direction: clamp(value.direction, -1, 1),
    };
    for (const fn of listeners) fn(snap);
  }

  function settle(): void {
    // Reduced-motion path: jump straight to the target and notify once.
    value.energy = target.energy;
    value.activity = target.activity;
    value.coherence = target.coherence;
    value.attention = target.attention;
    value.direction = target.direction;
    charge = 0;
    emit();
  }

  function step(): void {
    const t = now();
    // Normalize easing to ~60fps so inertia feels the same on any refresh rate.
    const dt = Math.min((t - last) / 16.667, 3);
    last = t;
    const k = 1 - Math.pow(1 - stiffness, dt);

    value.energy += (target.energy - value.energy) * k;
    value.activity += (target.activity - value.activity) * k;
    value.coherence += (target.coherence - value.coherence) * k;
    value.attention += (target.attention - value.attention) * k;
    value.direction += (target.direction - value.direction) * k;

    // Impulse energy bleeds off with its own, quicker time constant.
    charge *= Math.pow(0.9, dt);
    if (charge < 0.001) charge = 0;

    emit();
    raf = requestAnimationFrame(step);
  }

  function start(): void {
    if (running || reduced) return;
    running = true;
    last = now();
    raf = requestAnimationFrame(step);
  }

  function stop(): void {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  // Pause the loop when the tab is hidden (and mark the form dormant). Resume on
  // return. This keeps cost at zero off-screen, per the accessibility brief.
  let prevPhase: Phase | null = null;
  function onVisibility(): void {
    if (document.visibilityState === 'hidden') {
      if (phase !== 'dormant') {
        prevPhase = phase;
        setPhase('dormant');
      }
      stop();
      if (reduced) settle();
    } else {
      if (prevPhase) {
        setPhase(prevPhase);
        prevPhase = null;
      }
      reduced ? settle() : start();
    }
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibility);
  }

  function setPhase(next: Phase): void {
    phase = next;
    target = { ...PROFILES[next] };
    // A phase that emits a finishing pulse (complete) gets a one-shot impulse.
    if (next === 'complete') charge = Math.max(charge, 0.5);
    if (reduced) settle();
  }

  function impulse(amount = 0.3): void {
    if (reduced) return; // no transient motion under reduced-motion
    charge = Math.min(charge + amount, 1);
  }

  // Kick things off.
  if (reduced) settle();
  else start();

  return {
    setPhase,
    get phase() {
      return phase;
    },
    impulse,
    subscribe(fn) {
      listeners.add(fn);
      // Push the current value immediately so a new renderer isn't blank.
      fn({
        energy: clamp01(value.energy + charge),
        activity: clamp01(value.activity + charge * 0.6),
        coherence: clamp01(value.coherence),
        attention: clamp01(value.attention),
        direction: clamp(value.direction, -1, 1),
      });
      return () => listeners.delete(fn);
    },
    get animating() {
      return running;
    },
    destroy() {
      stop();
      listeners.clear();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    },
  };
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}
function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}
