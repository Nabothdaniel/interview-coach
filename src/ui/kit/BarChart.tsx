export interface Bar { label: string; value: number }

/** Black rounded bars (the reference's waveform tile). Pure display of 0..1 values. */
export function BarChart({ bars }: { bars: Bar[] }) {
  return (
    <div className="ui-bars" role="img" aria-label={bars.map((b) => `${b.label} ${Math.round(b.value * 100)} percent`).join(', ')}>
      {bars.map((b) => (
        <div key={b.label}>
          <i style={{ height: `${Math.max(6, Math.round(Math.max(0, Math.min(1, b.value)) * 100))}%` }} />
          <span>{b.label}</span>
        </div>
      ))}
    </div>
  );
}
