import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface CardProps { eyebrow?: string; title?: string; accent?: boolean; children?: ReactNode }

function Inner({ eyebrow, title, children }: CardProps) {
  return (
    <>
      {eyebrow ? <span className="ui-eyebrow">{eyebrow}</span> : null}
      {title ? <h3 className="ui-card__title">{title}</h3> : null}
      {children}
    </>
  );
}

const cls = (accent?: boolean): string => `ui-card${accent ? ' ui-card--accent' : ''}`;

export function Card(props: CardProps) {
  return <div className={cls(props.accent)}><Inner {...props} /></div>;
}

/** A Card that is a real button (keyboard + screen-reader friendly). */
export function CardButton({ accent, eyebrow, title, children, className, ...btn }: CardProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`${cls(accent)} ui-card--button ${className ?? ''}`} {...btn}>
      <Inner {...{ ...(eyebrow ? { eyebrow } : {}), ...(title ? { title } : {}), ...(children ? { children } : {}) }} />
    </button>
  );
}
