import { Tip } from './Tooltip';

export interface StatRingProps { label: string; value: number; size?: number; color?: string; tip?: string }

/** Pure display of a 0..1 value the engine produced. No thresholds or judgement here. */
export function StatRing({ label, value, size = 64, color = 'var(--ink)', tip }: StatRingProps) {
  const v = Math.max(0, Math.min(1, value));
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ring = (
    <div className="ui-stat" role="img" aria-label={`${label}: ${Math.round(v * 100)} percent`}>
      <div className="ui-ring" style={{ width: size, height: size }}>
        <svg width={size} height={size} aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${c * v} ${c}`} />
        </svg>
        <span className="ui-ring__v">{Math.round(v * 100)}</span>
      </div>
      {label}
    </div>
  );
  return tip ? <Tip text={tip} block>{ring}</Tip> : ring;
}
