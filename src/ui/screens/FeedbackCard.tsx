import type { Feedback } from '../../engine';
import { Card, StatRing, Tag } from '../kit';
import { Icon } from '../icons/Icon';
import { DIM_TIP, TIER_TIP } from './hints';

const TIER_TONE = { high: 'good', moderate: 'warn', low: 'bad' } as const;
const TIER_LABEL = { high: 'Strong match', moderate: 'Partial match', low: 'Needs focus' } as const;

export function FeedbackCard({ fb }: { fb: Feedback }) {
  return (
    <Card eyebrow="Your feedback" title={fb.headline || fb.contentRelevance.text}>
      {fb.understood ? <p className="ui-heard"><b>What I heard</b>{fb.understood}</p> : null}
      <div className="ui-row" style={{ margin: '10px 0' }}>
        <Tag tone={TIER_TONE[fb.contentRelevance.tier]} tip={TIER_TIP[fb.contentRelevance.tier]}>{TIER_LABEL[fb.contentRelevance.tier]}</Tag>
      </div>
      <div className="ui-grid2 ui-fbgrid">
        <StatRing label="Relevance" tip={DIM_TIP.relevance} value={fb.contentRelevance.score} size={56} />
        <StatRing label="Clarity" tip={DIM_TIP.clarity} value={fb.communicationClarity.score} size={56} />
        <StatRing label="Confidence" tip={DIM_TIP.confidence} value={fb.confidenceTone.confidence} size={56} />
        <StatRing label="Tone" tip={DIM_TIP.tone} value={fb.confidenceTone.professionalism} size={56} />
      </div>
      {fb.headline ? <p className="ui-meta ui-fbtext">{fb.contentRelevance.text}</p> : null}
      <p className="ui-meta ui-fbtext">{fb.communicationClarity.text}</p>
      <ul className="ui-list">
        {fb.strengths.map((s) => <li key={s}><Icon name="check" size={14} />{s}</li>)}
        {fb.recommendations.map((s) => <li key={s}><Icon name="bulb" size={14} />{s}</li>)}
        {fb.contentRelevance.missingPoints.map((s) => <li key={s}><Icon name="target" size={14} />Could add: {s}</li>)}
      </ul>
      {fb.hint ? <p className="ui-meta">Hint: {fb.hint}</p> : null}
    </Card>
  );
}
