import type { ReactNode } from 'react';

export function Stage({ children }: { children: ReactNode }) {
  return <div className="ui-stage">{children}</div>;
}

export function Shell({ children }: { children: ReactNode }) {
  return <div className="ui-shell">{children}</div>;
}

export interface PaneProps {
  title?: ReactNode;
  action?: ReactNode;
  variant?: 'list' | 'main' | 'aside';
  label: string;
  children: ReactNode;
}

/** One column of the shell. `body: false`-style panes (chat) manage their own scrolling via children. */
export function Pane({ title, action, variant = 'main', label, children }: PaneProps) {
  return (
    <section className={`ui-pane ui-pane--${variant}`} aria-label={label}>
      {title !== undefined || action !== undefined ? (
        <header className="ui-pane__head">
          <h2 className="ui-pane__title">{title}</h2>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function PaneBody({ children }: { children: ReactNode }) {
  return <div className="ui-pane__body">{children}</div>;
}
