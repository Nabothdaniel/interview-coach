'use client';
import { useId, useMemo, useRef, useState } from 'react';
import { DOMAINS, type Domain } from '../../engine';
import { Icon } from '../icons/Icon';
import { Button } from '../kit';
import { DOMAIN_META } from './domains';

const isDomain = (d: string | null): d is Domain => d !== null && (DOMAINS as readonly string[]).includes(d);
const mono = (label: string): string => label.split(/[\s,&/]+/).filter((w) => /^[A-Za-z]/.test(w) && w.toLowerCase() !== 'and').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

/** Searchable domain list (each with a one-line description) plus a full-width Start button. Display and event wiring only; the engine validates the choice. */
export function DomainPicker({ initial, disabled, onPick }: { initial: string | null; disabled: boolean; onPick: (d: Domain) => void }) {
  const [chosen, setChosen] = useState<Domain | null>(isDomain(initial) ? initial : null);
  const [open, setOpen] = useState(!isDomain(initial));
  const [q, setQ] = useState('');
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return DOMAINS.filter((d) => n === '' || `${DOMAIN_META[d].label} ${DOMAIN_META[d].blurb}`.toLowerCase().includes(n));
  }, [q]);

  const select = (d: Domain): void => { setChosen(d); setOpen(false); setQ(''); trigger.current?.focus(); };
  const onKey = (e: React.KeyboardEvent): void => { if (e.key === 'Escape' && open && chosen) { setOpen(false); trigger.current?.focus(); } };

  return (
    <div className="ui-dp" onKeyDown={onKey}>
      <span className="ui-dp__label" id={`${id}-l`}>Practice domain</span>
      <button ref={trigger} type="button" className="ui-dp__trigger" aria-expanded={open} aria-controls={`${id}-p`} aria-labelledby={`${id}-l`} disabled={disabled} onClick={() => setOpen((v) => !v)}>
        <span className="ui-dp__mono" aria-hidden="true">{chosen ? mono(DOMAIN_META[chosen].label) : '?'}</span>
        <span className="ui-dp__txt"><b>{chosen ? DOMAIN_META[chosen].label : 'Choose a domain'}</b><span>{chosen ? DOMAIN_META[chosen].blurb : `${DOMAINS.length} to pick from`}</span></span>
        <Icon name="chevron" size={18} className="ui-dp__chev" />
      </button>
      {open ? (
        <div className="ui-dp__panel" id={`${id}-p`}>
          <input className="ui-dp__search" type="search" inputMode="search" placeholder="Search, e.g. law, nursing, banking" aria-label="Search domains" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="ui-dp__list" role="listbox" aria-label="Practice domains">
            {shown.map((d) => (
              <button key={d} type="button" role="option" aria-selected={d === chosen} className="ui-dp__opt" onClick={() => select(d)}>
                <span className="ui-dp__mono" aria-hidden="true">{mono(DOMAIN_META[d].label)}</span>
                <span className="ui-dp__txt"><b>{DOMAIN_META[d].label}</b><span>{DOMAIN_META[d].blurb}</span></span>
              </button>
            ))}
            {shown.length === 0 ? <p className="ui-dp__none">No domain matches “{q}”.</p> : null}
          </div>
        </div>
      ) : null}
      <Button className="ui-dp__start" icon="check" disabled={disabled || chosen === null} onClick={() => { if (chosen) onPick(chosen); }}>
        {chosen ? `Start ${DOMAIN_META[chosen].label}` : 'Start'}
      </Button>
      <p className="ui-note" style={{ margin: 0 }}>You can also type one in the box below, for example “law” or “IT, networking”.</p>
    </div>
  );
}
