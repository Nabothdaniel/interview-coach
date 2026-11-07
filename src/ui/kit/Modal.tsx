'use client';
import { type ReactNode, useEffect, useId, useRef } from 'react';
import { IconButton } from './IconButton';

export interface ModalProps { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' }

const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input:not([disabled]),select,[tabindex]:not([tabindex="-1"])';

/** Accessible dialog: Esc and backdrop close, focus moves in and is restored, Tab is trapped, page scroll locked. */
export function Modal({ open, title, onClose, children, footer, size = 'md' }: ModalProps) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = box.current?.querySelector<HTMLElement>('[data-autofocus]') ?? box.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key !== 'Tab' || !box.current) return;
      const f = [...box.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const a = f[0]; const z = f[f.length - 1];
      if (!a || !z) return;
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; prev?.focus(); };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="ui-modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`ui-dialog ui-dialog--${size}`} role="dialog" aria-modal="true" aria-labelledby={id} ref={box}>
        <header className="ui-dialog__head">
          <h2 id={id}>{title}</h2>
          <IconButton icon="close" label="Close" tipSide="bottom" tipAlign="end" onClick={onClose} />
        </header>
        <div className="ui-dialog__body">{children}</div>
        {footer ? <footer className="ui-dialog__foot">{footer}</footer> : null}
      </div>
    </div>
  );
}
