/** Reusable busy indicators. `Spinner` is the bare ring (decorative); `Loading` pairs it with a polite live-region label. */
export function Spinner({ size = 16 }: { size?: number }) {
  return <span className="ui-spinner" style={{ width: size, height: size, borderWidth: Math.max(2, Math.round(size / 12)) }} aria-hidden="true" />;
}

export function Loading({ label, size = 16 }: { label: string; size?: number }) {
  return (
    <span className="ui-loading" role="status">
      <Spinner size={size} />
      <span>{label}</span>
    </span>
  );
}

/** Full-screen, centred start-up screen: a large spinner with a short label. */
export function Splash({ label }: { label: string }) {
  return (
    <div className="ui-splash" role="status" aria-live="polite">
      <Spinner size={72} />
      <p className="ui-splash__label">{label}</p>
    </div>
  );
}
