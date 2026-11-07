import type { ReactNode } from 'react';
import { Tip } from './Tooltip';

export function Tag({ tone = 'neutral', tip, children }: { tone?: 'neutral' | 'good' | 'warn' | 'bad'; tip?: string; children: ReactNode }) {
  const tag = <span className={`ui-tag${tone === 'neutral' ? '' : ` ui-tag--${tone}`}`}>{children}</span>;
  return tip ? <Tip text={tip}>{tag}</Tip> : tag;
}
