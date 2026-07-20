import { useCallback, useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import type { Chunk, Source } from './ask/types';
import { retrieve, toSources, warmSearch } from './ask/search';
import { buildHandoffPrompt } from './ask/prompt';
import { Identity, useDriver } from './identity';
import type { Phase } from './identity';
import {
  DEFAULT_MODEL,
  MODELS,
  detectWebGpu,
  generateAnswer,
  loadEngine,
  type Turn,
} from './ask/webllm';

const MODEL_STORAGE_KEY = 'ask:model';

// A pool of grounded starter questions; a random handful is shown each visit.
// Spans bio, projects, and the writing — so a visitor can stumble into any of it.
const EXAMPLE_POOL = [
  // Who / what
  'What is Enrique building?',
  'Tell me about Reley.',
  'What is Jaro?',
  'Where has Enrique worked?',
  'What did he do at AutoCloud?',
  'What technologies does he use?',
  'Has he worked in fintech?',
  'What is he like to work with?',
  'How can I contact you?',
  // Agents & workflow
  'How does he run coding agents solo?',
  'Explain his spec → plan → review workflow.',
  'How do you ship features without touching an editor?',
  // Security & infrastructure
  'How does he present security decisions to non-technical execs?',
  'Can Microsoft 365 and Google Workspace run side by side?',
  'How do you get one login across two office suites?',
  'How does he handle employee offboarding?',
];

const EXAMPLE_COUNT = 4;

/** Fisher–Yates sample of `n` items. */
function sample<T>(arr: T[], n: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

type Ai = 'checking' | 'unsupported' | 'idle' | 'loading' | 'ready' | 'error';
type Status = 'loading-model' | 'thinking' | 'streaming' | 'done';
type Mode = 'ai' | 'search' | 'error';

interface Exchange {
  question: string;
  chunks: Chunk[];
  sources: Source[];
  text: string;
  mode: Mode;
  status: Status;
  loadPct: number;
  error?: string;
}

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message || err.name;
  return String(err);
}

export default function Ask() {
  const [query, setQuery] = useState('');
  const [ex, setEx] = useState<Exchange | null>(null); // only the latest — no visible history
  const [ai, setAi] = useState<Ai>('checking');
  const [copied, setCopied] = useState(false);
  const [hasContext, setHasContext] = useState(false); // a prior turn is remembered
  const [model, setModel] = useState<string>(DEFAULT_MODEL);
  // Deterministic slice for SSR; shuffled on the client after mount.
  const [examples, setExamples] = useState<string[]>(() => EXAMPLE_POOL.slice(0, EXAMPLE_COUNT));
  const taRef = useRef<HTMLTextAreaElement>(null);
  const answerTopRef = useRef<HTMLDivElement>(null);
  const aiRef = useRef<Ai>('checking');
  aiRef.current = ai;
  const modelRef = useRef<string>(DEFAULT_MODEL);
  modelRef.current = model;
  // A few prior turns kept in memory for follow-ups — never rendered as a thread.
  const historyRef = useRef<Turn[]>([]);
  // The living-identity behavior driver. The app only nudges it (phase +
  // impulses); the glyph in the composer visualizes whatever state it settles on.
  const driver = useDriver();

  const busy = ex != null && ex.status !== 'done';

  // Map the app's lifecycle onto the identity's behavior phases. Events don't
  // animate the glyph directly — they just move its resting target.
  useEffect(() => {
    if (!driver) return;
    let phase: Phase;
    if (ai === 'error' || ex?.mode === 'error') phase = 'error';
    else if (ex?.status === 'loading-model') phase = 'loading';
    else if (ex?.status === 'thinking') phase = 'thinking';
    else if (ex?.status === 'streaming') phase = 'streaming';
    else if (ex?.status === 'done') phase = 'complete';
    else if (query.trim()) phase = 'typing';
    else phase = 'idle';
    driver.setPhase(phase);
  }, [driver, ai, ex?.status, ex?.mode, query]);

  useEffect(() => {
    warmSearch();
    detectWebGpu().then((ok) => setAi(ok ? 'idle' : 'unsupported'));
    setExamples(sample(EXAMPLE_POOL, EXAMPLE_COUNT)); // randomize per visit
    // Restore the visitor's previously chosen model.
    try {
      const saved = localStorage.getItem(MODEL_STORAGE_KEY);
      if (saved && MODELS.some((m) => m.id === saved)) setModel(saved);
    } catch {
      /* localStorage may be unavailable */
    }
  }, []);

  const shuffleExamples = useCallback(() => {
    setExamples((prev) => {
      let next = sample(EXAMPLE_POOL, EXAMPLE_COUNT);
      // Re-roll once if we happened to draw the same set.
      if (next.every((q, i) => q === prev[i])) next = sample(EXAMPLE_POOL, EXAMPLE_COUNT);
      return next;
    });
  }, []);

  const changeModel = useCallback((id: string) => {
    setModel(id);
    try {
      localStorage.setItem(MODEL_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
    // Force the next question to (down)load the newly chosen model.
    setAi((prev) => (prev === 'ready' || prev === 'error' ? 'idle' : prev));
  }, []);

  const update = useCallback((next: Partial<Exchange>) => {
    setEx((prev) => (prev ? { ...prev, ...next } : prev));
  }, []);

  const respond = useCallback(
    async (question: string) => {
      // For short follow-ups ("why?", "how does it work?"), fold in the previous
      // question so retrieval stays on topic. A full new question retrieves on
      // its own so switching subjects doesn't drag old context along.
      const prevUser = [...historyRef.current].reverse().find((t) => t.role === 'user');
      const isFollowup =
        question.trim().split(/\s+/).length <= 4 ||
        /^(why|how|what about|and\b|so\b|tell me more|explain|when|where|who|which)/i.test(
          question.trim()
        );
      const retrievalQuery = prevUser && isFollowup ? `${prevUser.content} ${question}` : question;

      const chunks = await retrieve(retrievalQuery, 4);
      const sources = toSources(chunks);
      setCopied(false);
      setEx({ question, chunks, sources, text: '', mode: 'search', status: 'thinking', loadPct: 0 });

      // No WebGPU → search matches only (graceful, expected).
      if (aiRef.current === 'unsupported') {
        update({ mode: 'search', status: 'done' });
        return;
      }

      // Load the model on demand — triggered simply by asking.
      if (aiRef.current !== 'ready') {
        setAi('loading');
        update({ status: 'loading-model', loadPct: 0 });
        try {
          await loadEngine(modelRef.current, (p) => update({ loadPct: Math.round(p.progress * 100) }));
          setAi('ready');
        } catch (err) {
          console.error('Local AI failed to load:', err);
          setAi('error');
          update({ mode: 'error', status: 'done', error: errMsg(err) });
          return;
        }
      }

      // Stream the grounded answer, giving the model the last couple of turns.
      update({ mode: 'ai', status: 'streaming', text: '' });
      try {
        let final = '';
        for await (const partial of generateAnswer(question, chunks, historyRef.current, modelRef.current)) {
          final = partial;
          update({ text: partial });
        }
        update({ status: 'done' });
        // Remember this turn (plain Q + A, no context block) for follow-ups.
        // Keep only the last 2 turns so the small model's context stays lean.
        historyRef.current = [
          ...historyRef.current,
          { role: 'user', content: question },
          { role: 'assistant', content: final },
        ].slice(-4);
        setHasContext(true);
      } catch (err) {
        console.error('Generation failed:', err);
        setAi('error');
        update({ mode: 'error', status: 'done', error: errMsg(err) });
      }
    },
    [update]
  );

  const newTopic = useCallback(() => {
    historyRef.current = [];
    setHasContext(false);
    setEx(null);
    setQuery('');
    setCopied(false);
    taRef.current?.focus();
  }, []);

  const send = useCallback(
    (raw: string) => {
      const question = raw.trim();
      if (!question || busy) return;
      driver?.impulse(0.6); // a firmer pulse on submit
      setQuery('');
      void respond(question);
    },
    [busy, respond, driver]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(query);
    }
  };

  // Auto-grow the composer.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [query]);

  const handoff = useCallback(() => {
    if (!ex) return;
    // Prefer the configured public site URL (so ChatGPT gets the real deployed
    // domain even from a preview/localhost); fall back to the current origin.
    const origin = import.meta.env.PUBLIC_SITE_URL || window.location.origin;
    const prompt = buildHandoffPrompt(ex.question, ex.sources, origin);
    // Prefill (and submit) the prompt in ChatGPT via the ?q= parameter.
    window.open(
      `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`,
      '_blank',
      'noopener,noreferrer'
    );
    setCopied(true);
  }, [ex]);

  const answered = ex != null;

  // Bring a new answer into view — the composer sits below it, so without this
  // a follow-up would stream off-screen above the input.
  useEffect(() => {
    if (ex) answerTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex?.question]);

  const composer = (
    <div className="composer">
      <Identity driver={driver} className="composer__identity" title="Assistant status" />
      <textarea
        ref={taRef}
        className="composer__input"
        rows={1}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          driver?.impulse(0.22); // each keystroke (and deletion) feeds a little energy
        }}
        onKeyDown={onKeyDown}
        placeholder={hasContext ? 'Ask a follow-up…' : 'Ask anything about Enrique…'}
        aria-label="Ask a question"
        autoFocus
      />
      <button
        type="button"
        className="composer__send"
        onClick={() => send(query)}
        disabled={!query.trim() || busy}
        aria-label="Send"
      >
        ↑
      </button>
    </div>
  );

  return (
    <div className={`ask${answered ? ' ask--answered' : ''}`}>
      {answered ? (
        // Answered: answer first, composer at the end (below it).
        <>
          <div ref={answerTopRef} className="ask__answer-anchor" />
          <Answer
            ex={ex}
            driver={driver}
            onHandoff={handoff}
            copied={copied}
            hasContext={hasContext}
            onNewTopic={newTopic}
            model={model}
            onChangeModel={changeModel}
            busy={busy}
          />
          {composer}
        </>
      ) : (
        // Empty state: centered greeting, composer, examples.
        <>
          <div className="ask__intro">
            <Identity driver={driver} className="ask__mark" size={30} title="Enrique Enciso" />
            <h1 className="ask__greeting">Ask about Enrique.</h1>
            <p className="muted ask__tagline">
              Answered by a small AI model running entirely in your browser — no server,
              fully private. It’s tiny, so it can get things wrong; the sources are the truth.
            </p>
          </div>
          {composer}
          <div className="ask__controls">
            <ModelPicker model={model} onChange={changeModel} disabled={busy} />
          </div>
          <ul className="ask__examples" aria-label="Example questions">
            {examples.map((q) => (
              <li key={q}>
                <button type="button" className="chip" onClick={() => send(q)}>
                  {q}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                className="chip chip--icon"
                onClick={shuffleExamples}
                aria-label="Shuffle suggestions"
                title="Shuffle suggestions"
              >
                ↻
              </button>
            </li>
          </ul>
          <p className="ask__note muted">{noteFor(ai)}</p>
        </>
      )}
    </div>
  );
}

function noteFor(ai: Ai): string {
  if (ai === 'unsupported')
    return 'On-device AI needs a WebGPU browser like Chrome or Edge — this browser will show the closest matches instead.';
  return 'Nothing leaves your browser. Your first question downloads the chosen model once, then it’s cached.';
}

function ModelPicker({
  model,
  onChange,
  disabled,
}: {
  model: string;
  onChange: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <label className="modelpicker" title="Pick which model runs locally. Switching downloads it on your next question.">
      <span className="modelpicker__label">Model</span>
      <select
        className="modelpicker__select"
        value={model}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label} · {m.size}
          </option>
        ))}
      </select>
    </label>
  );
}

function Answer({
  ex,
  driver,
  onHandoff,
  copied,
  hasContext,
  onNewTopic,
  model,
  onChangeModel,
  busy,
}: {
  ex: Exchange;
  driver: ReturnType<typeof useDriver>;
  onHandoff: () => void;
  copied: boolean;
  hasContext: boolean;
  onNewTopic: () => void;
  model: string;
  onChangeModel: (id: string) => void;
  busy: boolean;
}) {
  return (
    <div className="answer" aria-live="polite">
      <p className="answer__q">
        <Identity driver={driver} className="answer__q-mark" size={22} />
        <span>{ex.question}</span>
      </p>

      {ex.status === 'loading-model' ? (
        <div>
          <p className="answer__status">
            <Identity driver={driver} className="answer__mark" size={22} /> Preparing the
            on-device model… {ex.loadPct}%
          </p>
          <button type="button" className="answer__handoff answer__handoff--inline" onClick={onHandoff}>
            While it loads, ask ChatGPT instead
            <span aria-hidden="true"> ↗</span>
          </button>
        </div>
      ) : ex.status === 'thinking' ? (
        <p className="answer__status">
          <Identity driver={driver} className="answer__mark" size={22} /> Searching the knowledge
          base…
        </p>
      ) : ex.mode === 'ai' ? (
        <>
          <div className="answer__text answer__md">
            <Markdown>{ex.text}</Markdown>
            {ex.status === 'streaming' && <span className="caret" aria-hidden="true" />}
          </div>
          {ex.status === 'done' && (
            <p className="answer__disclaimer">
              Generated on-device by a small model — it can be inaccurate. Check the sources.
            </p>
          )}
        </>
      ) : ex.mode === 'error' ? (
        <div>
          <p className="answer__text muted">
            Couldn’t run the on-device model in this browser. Showing the closest matches instead:
          </p>
          {ex.error && (
            <details className="answer__err">
              <summary>Details</summary>
              <code>{ex.error}</code>
            </details>
          )}
        </div>
      ) : (
        <p className="answer__text muted">Here are the closest matches from the site:</p>
      )}

      {ex.status === 'done' && ex.sources.length > 0 && (
        <div className="answer__sources">
          <span className="answer__sources-label">Sources</span>
          <ul>
            {ex.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url}>
                  {s.title}
                  {s.heading && s.heading !== s.title && <span className="muted"> · {s.heading}</span>}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {ex.status === 'done' && ex.sources.length === 0 && (
        <p className="muted answer__empty">
          Nothing on the site covers that yet — try Reley, Jaro, experience, or contact.
        </p>
      )}

      {ex.status === 'done' && (
        <div className="answer__actions">
          <button
            type="button"
            className="answer__handoff"
            onClick={onHandoff}
            title="Opens ChatGPT with the question prefilled, asking it to read the source pages."
          >
            {copied ? 'Opening ChatGPT…' : 'Continue in ChatGPT'}
            <span aria-hidden="true"> ↗</span>
          </button>
          {hasContext && (
            <button type="button" className="answer__newtopic" onClick={onNewTopic} title="Clear the remembered context and start fresh.">
              New topic
            </button>
          )}
          <span className="answer__actions-spacer" />
          <ModelPicker model={model} onChange={onChangeModel} disabled={busy} />
        </div>
      )}
    </div>
  );
}

