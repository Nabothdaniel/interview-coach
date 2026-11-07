import type { ReactNode } from 'react';
import { Icon } from '../icons/Icon';

export interface BubbleProps { from: 'coach' | 'me'; variant?: 'plain' | 'question' | 'distress'; children: ReactNode }

/** Renders children as React nodes only (never innerHTML), so model/user text cannot inject markup. */
export function Bubble({ from, variant = 'plain', children }: BubbleProps) {
  const me = from === 'me';
  return (
    <div className={`ui-bubble-row${me ? ' ui-bubble-row--me' : ''}`}>
      {me ? null : <span className="ui-avatar"><Icon name="coach" size={16} /></span>}
      <div className={`ui-bubble${me ? ' ui-bubble--me' : ''}${variant === 'plain' ? '' : ` ui-bubble--${variant}`}`}>{children}</div>
    </div>
  );
}
