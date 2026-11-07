/** Thin ring with a big time readout, like the reference's timer tile. Display only. */
export function ClockFace({ top, bottom, ratio = 0 }: { top: string; bottom: string; ratio?: number }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, ratio));
  return (
    <div className="ui-clock">
      <div className="ui-clock__face" role="timer" aria-label={`${top}:${bottom}`}>
        <svg viewBox="0 0 88 88" aria-hidden="true">
          <circle cx="44" cy="44" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="2" />
          <circle cx="44" cy="44" r={r} fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={`${c * v} ${c}`} transform="rotate(-90 44 44)" />
        </svg>
        <span>{top}<br />{bottom}</span>
      </div>
    </div>
  );
}
