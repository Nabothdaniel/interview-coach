/** Reusable busy indicators. `Spinner` is the bare ring (decorative); `Loading` pairs it with a polite live-region label. */
export function Spinner({ size = 16 }: { size?: number }) {
  return <span className="ui-spinner" style={{ width: size, height: size }} aria-hidden="true" />;
}

export function Loading({ label, size = 16 }: { label: string; size?: number }) {
  return (
    <span className="ui-loading" role="status">
      <Spinner size={size} />
      <span>{label}</span>
    </span>
  );
}
