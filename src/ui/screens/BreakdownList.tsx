import type { BreakdownRow } from '../../engine';
import { Tag } from '../kit';
import { TIER_TIP } from './hints';

export type BreakdownItem = Omit<BreakdownRow, 'strength' | 'improvement'> & { strength?: string | null; improvement?: string | null };

const TONE = { high: 'good', moderate: 'warn', low: 'bad' } as const;
const LABEL = { high: 'Strong', moderate: 'Partial', low: 'Needs focus' } as const;
const pct = (n: number): string => `${Math.round(n * 100)}%`;

/** Question-by-question view. Display only: tiers and scores come from the engine. Strength/improvement are shown when available (live session only). */
export function BreakdownList({ rows }: { rows: readonly BreakdownItem[] }) {
  if (rows.length === 0) return <p className="ui-note">No questions were asked in this session.</p>;
  return (
    <ol className="ui-breakdown">
      {rows.map((r, i) => (
        <li key={`${r.questionId}-${i}`}>
          <div className="ui-breakdown__head">
            <span className="ui-breakdown__q">{r.questionText || 'Question'}</span>
            {r.skipped ? <Tag>Skipped</Tag> : r.tier ? <Tag tone={TONE[r.tier]} tip={TIER_TIP[r.tier]}>{LABEL[r.tier]}</Tag> : null}
          </div>
          {r.scores ? (
            <p className="ui-meta">Relevance {pct(r.scores.relevance)} · Clarity {pct(r.scores.clarity)} · Confidence {pct(r.scores.confidence)} · Tone {pct(r.scores.professionalism)}</p>
          ) : null}
          {r.strength ? <p className="ui-meta"><b>Went well:</b> {r.strength}</p> : null}
          {r.improvement ? <p className="ui-meta"><b>Try next time:</b> {r.improvement}</p> : null}
        </li>
      ))}
    </ol>
  );
}
