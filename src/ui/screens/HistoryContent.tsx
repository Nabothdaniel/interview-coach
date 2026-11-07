'use client';
import { useCallback, useEffect, useState } from 'react';
import type { StoredSession } from '../../adapters/firebase/sessionDoc';
import { BarChart, Button, Loading } from '../kit';
import { BreakdownList } from './BreakdownList';
import { DOMAIN_META } from './domains';

const mean = (xs: number[]): number => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
const pct = (n: number): string => `${Math.round(n * 100)}%`;
const day = (ms: number): string => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const avg = (s: StoredSession, k: 'relevance' | 'clarity' | 'confidence' | 'professionalism'): number => mean(s.scores.map((x) => x[k]));

/** Reads the user's saved sessions on open (one Firestore query) and shows a trend plus a per-session breakdown. */
export function HistoryContent({ load, saveOn }: { load: () => Promise<StoredSession[]>; saveOn: boolean }) {
  const [rows, setRows] = useState<StoredSession[] | null>(null);
  const [failed, setFailed] = useState(false);
  const run = useCallback(() => {
    setRows(null); setFailed(false);
    load().then(setRows).catch(() => setFailed(true));
  }, [load]);
  useEffect(run, [run]);

  if (failed) return <><p className="ui-field__msg ui-field__msg--err" role="alert">I could not load your history. Check your connection and that the database rules are deployed.</p><Button onClick={run}>Try again</Button></>;
  if (rows === null) return <Loading label="Loading your history…" />;
  if (rows.length === 0) {
    return <p className="ui-note">{saveOn ? 'Nothing here yet. Finish a session (say "end" or answer all the questions) and it will appear here.' : 'Nothing is saved because "Save my progress" is off. Turn it on in the dashboard and finished sessions will appear here with their question-by-question breakdown.'}</p>;
  }
  const trend = [...rows].reverse().slice(-8);
  return (
    <div className="ui-history">
      {trend.length >= 2 ? (
        <section>
          <span className="ui-eyebrow">Content relevance, last {trend.length} sessions</span>
          <BarChart bars={trend.map((s) => ({ label: day(s.startedAt), value: avg(s, 'relevance') }))} />
        </section>
      ) : null}
      {rows.map((s) => (
        <details key={s.startedAt} className="ui-history__item">
          <summary>
            <b>{day(s.startedAt)}</b> · {DOMAIN_META[s.domain].label} · {s.scores.length} answered · relevance {pct(avg(s, 'relevance'))}
          </summary>
          <p className="ui-meta">{s.summary}</p>
          <BreakdownList rows={s.breakdown.map((b) => ({ ...b }))} />
        </details>
      ))}
    </div>
  );
}
