import { type ReactNode, useId } from 'react';
import { Icon } from '../icons/Icon';

export type TipSide = 'top' | 'bottom' | 'right';
export type TipAlign = 'center' | 'start' | 'end';

export interface TipProps { text: string; side?: TipSide; align?: TipAlign; block?: boolean; children: ReactNode }

/**
 * CSS-driven tooltip: appears on hover (short delay) and on keyboard focus of anything inside. Plain text only (never HTML).
 * The bubble is real DOM with role="tooltip", so assistive tech reads it right after the control.
 */
export function Tip({ text, side = 'top', align = 'center', block = false, children }: TipProps) {
  return (
    <span className={`ui-tip ui-tip--${side} ui-tip--${align}${block ? ' ui-tip--block' : ''}`}>
      {children}
      <span role="tooltip" className="ui-tip__b">{text}</span>
    </span>
  );
}

/** A small "i" button that explains what a part of the screen means. Focusable, so it works without a mouse. */
export function InfoTip({ text, side = 'bottom', align = 'end' }: { text: string; side?: TipSide; align?: TipAlign }) {
  const id = useId();
  return (
    <span className={`ui-tip ui-tip--${side} ui-tip--${align}`}>
      <button type="button" className="ui-info" aria-label="What is this?" aria-describedby={id}><Icon name="info" size={13} /></button>
      <span role="tooltip" id={id} className="ui-tip__b">{text}</span>
    </span>
  );
}
