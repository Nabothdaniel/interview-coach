'use client';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from '../icons/Icon';

export interface MenuItem { id: string; label: string; icon: IconName; onSelect: () => void; danger?: boolean }

/** Small popover menu anchored to a round trigger. Closes on Esc, outside click and selection. */
export function Menu({ trigger, header, items }: { trigger: ReactNode; header?: ReactNode; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent): void => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent): void => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div className="ui-menu" ref={root}>
      <button type="button" className="ui-menu__trigger" aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" onClick={() => setOpen((o) => !o)}>{trigger}</button>
      {open ? (
        <div className="ui-menu__panel" role="menu">
          {header ? <div className="ui-menu__head">{header}</div> : null}
          {items.map((i) => (
            <button key={i.id} type="button" role="menuitem" className={`ui-menu__item${i.danger ? ' ui-menu__item--danger' : ''}`} onClick={() => { setOpen(false); i.onSelect(); }}>
              <Icon name={i.icon} size={16} />{i.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
