'use client';
import { useState } from 'react';
import { DOMAINS, type Domain } from '../../engine';
import { Button } from '../kit';
import { DOMAIN_META } from './domains';

const isDomain = (d: string | null): d is Domain => d !== null && (DOMAINS as readonly string[]).includes(d);

/** Dropdown of every practice domain plus a Start button. Display and event wiring only; the engine validates the choice. */
export function DomainPicker({ initial, disabled, onPick }: { initial: string | null; disabled: boolean; onPick: (d: Domain) => void }) {
  const [value, setValue] = useState<string>(isDomain(initial) ? initial : '');
  const chosen = isDomain(value) ? value : null;
  return (
    <div className="ui-picker">
      <label className="ui-picker__label" htmlFor="domain-select">Practice domain</label>
      <div className="ui-row ui-picker__row">
        <select id="domain-select" className="ui-select" value={value} disabled={disabled} onChange={(e) => setValue(e.target.value)}>
          <option value="" disabled>Choose a domain…</option>
          {DOMAINS.map((d) => <option key={d} value={d}>{DOMAIN_META[d].label}</option>)}
        </select>
        <Button icon="check" disabled={disabled || chosen === null} onClick={() => { if (chosen) onPick(chosen); }}>Start</Button>
      </div>
      <p className="ui-note ui-picker__blurb" aria-live="polite">{chosen ? DOMAIN_META[chosen].blurb : 'You can also type one, for example “law” or “IT, networking”.'}</p>
    </div>
  );
}
