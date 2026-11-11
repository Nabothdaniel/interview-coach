'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AI_DISCLOSURE, AI_NOTICE_SHORT, type Domain, type EngineOutput, type Feedback, InterviewEngine, type MessageKind, type SessionProgress, type SessionStatus, type SessionSummary } from '../engine';
import type { RuntimeState } from './runtime';

export interface ChatItem {
  id: number;
  from: 'coach' | 'me';
  kind: MessageKind | 'user';
  text: string;
  feedback?: Feedback;
  summary?: SessionSummary;
}

type Ready = Extract<RuntimeState, { kind: 'ready' }>;
const makeEngine = (r: Ready): InterviewEngine =>
  new InterviewEngine({ llm: r.llm, store: r.store, clock: r.clock, getProfile: () => r.progress.profile() });

/** Event wiring only: forwards user events to the engine and mirrors its output. No decisions are made here. */
export function useInterview(runtime: RuntimeState | null) {
  const engine = useRef<InterviewEngine | null>(null);
  const seq = useRef(0);
  const lastSent = useRef<string | null>(null);
  const [status, setStatus] = useState<SessionStatus>('IDLE');
  const [items, setItems] = useState<ChatItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<Feedback | null>(null);
  const [domain, setDomain] = useState<Domain | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOn, setSaveOn] = useState(false);
  const [progress, setProgress] = useState<SessionProgress | null>(null);
  const [lastDomain, setLastDomain] = useState<Domain | null>(null);
  const [failedAnswer, setFailedAnswer] = useState<string | null>(null);

  const apply = useCallback((out: EngineOutput): void => {
    setStatus(out.status);
    setProgress(out.progress);
    if (out.progress.domain) setDomain(out.progress.domain);
    setFailedAnswer(out.code === 'evaluation_failed' ? lastSent.current : null);
    const messages = out.truncated ? [...out.messages, { kind: 'info' as const, text: 'Your answer was long, so I only read the first part of it.' }] : out.messages;
    if (out.feedback) setLastFeedback(out.feedback);
    if (out.question) setDomain(out.question.domain);
    setItems((prev) => [
      ...prev,
      ...messages.map((m): ChatItem => ({
        id: seq.current++, from: 'coach', kind: m.kind, text: m.text,
        ...(m.kind === 'feedback' && out.feedback ? { feedback: out.feedback } : {}),
        ...(m.kind === 'summary' && out.summary ? { summary: out.summary } : {}),
      })),
    ]);
  }, []);

  useEffect(() => {
    if (runtime?.kind !== 'ready' || engine.current !== null) return;
    const e = makeEngine(runtime);
    engine.current = e;
    setSaveOn(runtime.progress.isOn());
    setLastDomain(runtime.progress.lastDomain());
    const snap = runtime.progress.loadSnapshot();
    if (snap === null) { apply(e.start({ disclosureAcknowledged: runtime.progress.disclosureAcked() })); return; }
    // Resume (opt-in only). The AI disclosure is shown again; a failed or stale restore falls back to a fresh start.
    void e.restore(snap).then((out) => {
      if (out === null) { runtime.progress.saveSnapshot(null); apply(e.start({ disclosureAcknowledged: runtime.progress.disclosureAcked() })); return; }
      setItems((prev) => [...prev, { id: seq.current++, from: 'coach', kind: runtime.progress.disclosureAcked() ? 'info' : 'disclosure', text: runtime.progress.disclosureAcked() ? AI_NOTICE_SHORT : AI_DISCLOSURE }]);
      apply(out);
    });
  }, [runtime, apply]);

  useEffect(() => {
    if (runtime?.kind === 'ready' && (status === 'ASKING' || status === 'AWAITING_ANSWER')) runtime.warmLlm();
  }, [status, runtime]);

  useEffect(() => {
    if (domain === null || runtime?.kind !== 'ready') return;
    runtime.progress.setLastDomain(domain);
    setLastDomain(domain);
  }, [domain, runtime]);

  /** Throws away the current session and begins a fresh one (works from any state, including SUMMARY and CLOSED). */
  const newSession = useCallback((): void => {
    if (runtime?.kind !== 'ready' || busy) return;
    runtime.progress.saveSnapshot(null);
    const e = makeEngine(runtime);
    engine.current = e;
    setItems([]); setLastFeedback(null); setDomain(null); setProgress(null); setFailedAnswer(null); lastSent.current = null;
    apply(e.start({ disclosureAcknowledged: runtime.progress.disclosureAcked() }));
  }, [runtime, busy, apply]);

  const persist = useCallback((e: InterviewEngine): void => {
    if (runtime?.kind !== 'ready') return;
    const s = e.snapshot();
    if (s !== null) runtime.progress.saveSnapshot(s);
    else if (e.getStatus() === 'SUMMARY' || e.getStatus() === 'CLOSED') runtime.progress.saveSnapshot(null);
  }, [runtime]);

  const run = useCallback(async (fn: (e: InterviewEngine) => Promise<EngineOutput> | EngineOutput): Promise<void> => {
    const e = engine.current;
    if (e === null) return;
    setBusy(true);
    try {
      apply(await fn(e));
      persist(e);
    } catch {
      // Never leave the chat silent: say what happened and let the user carry on.
      setItems((prev) => [...prev, { id: seq.current++, from: 'coach', kind: 'info', text: 'Something went wrong on my side. Please try that again.' }]);
    } finally { setBusy(false); }
  }, [apply, persist]);

  const acknowledge = useCallback(() => {
    if (runtime?.kind === 'ready') runtime.progress.ackDisclosure();
    return run((e) => e.acknowledgeDisclosure());
  }, [run, runtime]);
  const chooseDomain = useCallback((d: string) => run((e) => e.selectDomain(d)), [run]);
  const send = useCallback((text: string) => {
    setItems((prev) => [...prev, { id: seq.current++, from: 'me', kind: 'user', text }]);
    lastSent.current = text;
    return run((e) => e.submit(text));
  }, [run]);

  const setSaveProgress = useCallback(async (on: boolean): Promise<void> => {
    if (runtime?.kind !== 'ready') return;
    setSaving(true); setSaveError(null);
    try {
      await runtime.progress.setOn(on);
      setSaveOn(on);
      if (on && engine.current) persist(engine.current);
    } catch {
      setSaveError('Could not change this setting. Check your connection and that the database rules are deployed, then try again.');
    } finally { setSaving(false); }
  }, [runtime, persist]);

  const retry = useCallback(() => { if (failedAnswer !== null) void send(failedAnswer); }, [failedAnswer, send]);

  return { status, items, busy, newSession, progress, lastDomain, failedAnswer, retry, lastFeedback, domain, acknowledge, chooseDomain, send, saveOn, saving, saveError, setSaveProgress };
}
