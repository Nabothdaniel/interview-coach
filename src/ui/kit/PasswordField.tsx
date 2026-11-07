'use client';
import { type InputHTMLAttributes, type KeyboardEvent, useState } from 'react';
import { Icon } from '../icons/Icon';

export interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string; id: string; error?: string | undefined; hint?: string | undefined;
  visible?: boolean; onVisibleChange?: (v: boolean) => void;
}

/** Password input with a real show/hide toggle (keyboard + screen-reader friendly) and a Caps Lock warning. */
export function PasswordField({ label, id, error, hint, visible, onVisibleChange, onKeyUp, ...rest }: PasswordFieldProps) {
  const [own, setOwn] = useState(false);
  const [caps, setCaps] = useState(false);
  const shown = visible ?? own;
  const toggle = (): void => { if (onVisibleChange) onVisibleChange(!shown); else setOwn(!shown); };
  const note = id + '-note';
  const check = (e: KeyboardEvent<HTMLInputElement>): void => { setCaps(e.getModifierState('CapsLock')); onKeyUp?.(e); };
  return (
    <div className={`ui-field${error ? ' ui-field--err' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="ui-field__box">
        <input id={id} type={shown ? 'text' : 'password'} aria-invalid={error ? true : undefined} aria-describedby={error || hint || caps ? note : undefined}
          autoCapitalize="none" autoCorrect="off" spellCheck={false} onKeyUp={check} onBlur={() => setCaps(false)} {...rest} />
        <button type="button" className="ui-field__eye" onClick={toggle} aria-pressed={shown} aria-label={shown ? 'Hide password' : 'Show password'}>
          <Icon name={shown ? 'eyeoff' : 'eye'} size={18} />
        </button>
      </div>
      <p id={note} className={error ? 'ui-field__msg ui-field__msg--err' : 'ui-field__msg'} role={error ? 'alert' : undefined}>
        {error ?? (caps ? 'Caps Lock is on.' : hint ?? '')}
      </p>
    </div>
  );
}
