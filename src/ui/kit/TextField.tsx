import type { InputHTMLAttributes } from 'react';

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> { label: string; id: string; error?: string | undefined; hint?: string | undefined }

export function TextField({ label, id, error, hint, ...rest }: TextFieldProps) {
  const note = id + '-note';
  return (
    <div className={`ui-field${error ? ' ui-field--err' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="ui-field__box">
        <input id={id} aria-invalid={error ? true : undefined} aria-describedby={error || hint ? note : undefined} {...rest} />
      </div>
      <p id={note} className={error ? 'ui-field__msg ui-field__msg--err' : 'ui-field__msg'} role={error ? 'alert' : undefined}>{error ?? hint ?? ''}</p>
    </div>
  );
}

export function Checkbox({ label, id, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string; id: string }) {
  return (
    <label className="ui-check" htmlFor={id}>
      <input id={id} type="checkbox" {...rest} />
      <span>{label}</span>
    </label>
  );
}
