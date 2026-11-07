import type { ReactNode } from 'react';
import { InfoTip } from './Tooltip';

export interface WidgetProps { title: string; sub?: string | undefined; /** Explains what this tile means (tooltip). */ hint?: string; action?: ReactNode; tone?: 'plain' | 'orange'; wide?: boolean; children: ReactNode }

/** Small dashboard tile from the reference's right-hand grid. */
export function Widget({ title, sub, hint, action, tone = 'plain', wide = false, children }: WidgetProps) {
  return (
    <section className={`ui-widget${tone === 'orange' ? ' ui-widget--orange' : ''}${wide ? ' ui-widget--wide' : ''}`}>
      <header className="ui-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span className="ui-widget__t">{title}{sub ? <small>{sub}</small> : null}</span>
        {hint ? <InfoTip text={hint} /> : null}
        {action}
      </header>
      {children}
    </section>
  );
}
