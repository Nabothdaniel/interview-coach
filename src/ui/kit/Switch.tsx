export interface SwitchProps { id: string; label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }

/** Accessible on/off switch (a real checkbox with role="switch"). */
export function Switch({ id, label, checked, onChange, disabled = false }: SwitchProps) {
  return (
    <label className="ui-switch" htmlFor={id}>
      <input id={id} type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="ui-switch__track" aria-hidden="true"><span className="ui-switch__thumb" /></span>
      <span>{label}</span>
    </label>
  );
}
