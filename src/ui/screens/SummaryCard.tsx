import type { SessionSummary } from '../../engine';
import { Card, StatRing } from '../kit';
import { Icon } from '../icons/Icon';
import { BreakdownList } from './BreakdownList';
import { DIM_TIP } from './hints';

export function SummaryCard({ summary }: { summary: SessionSummary }) {
  const a = summary.averages;
  return (
    <Card accent eyebrow="Session summary" title={summary.text}>
      {a ? (
        <div className="ui-grid2" style={{ gridTemplateColumns: 'repeat(4, 1fr)', margin: '12px 0' }}>
          <StatRing label="Relevance" tip={DIM_TIP.relevance} value={a.relevance} size={56} />
          <StatRing label="Clarity" tip={DIM_TIP.clarity} value={a.clarity} size={56} />
          <StatRing label="Confidence" tip={DIM_TIP.confidence} value={a.confidence} size={56} />
          <StatRing label="Tone" tip={DIM_TIP.tone} value={a.professionalism} size={56} />
        </div>
      ) : null}
      {summary.insights.length > 0 ? (
        <>
          <span className="ui-eyebrow">Know yourself</span>
          <ul className="ui-list" style={{ color: 'inherit' }}>
            {summary.insights.map((t) => <li key={t}><Icon name="target" size={14} />{t}</li>)}
          </ul>
        </>
      ) : null}
      {summary.topRecommendations.length > 0 ? (
        <>
          <span className="ui-eyebrow">Work on next</span>
          <ul className="ui-list" style={{ color: 'inherit' }}>
            {summary.topRecommendations.map((r) => <li key={r}><Icon name="bulb" size={14} />{r}</li>)}
          </ul>
        </>
      ) : null}
      <span className="ui-eyebrow">Question by question</span>
      <BreakdownList rows={summary.breakdown} />
    </Card>
  );
}
