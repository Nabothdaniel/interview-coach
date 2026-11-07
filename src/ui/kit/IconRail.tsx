import type { ReactNode } from 'react';
import { IconButton } from './IconButton';
import type { IconName } from '../icons/Icon';

export interface RailItem { id: string; icon: IconName; label: string; active?: boolean; onSelect?: () => void }

export function IconRail({ items, footer }: { items: RailItem[]; footer?: ReactNode }) {
  return (
    <nav className="ui-rail" aria-label="Main">
      {items.map((i) => (
        <IconButton key={i.id} icon={i.icon} label={i.label} tipSide="right" aria-pressed={i.active === true} {...(i.onSelect ? { onClick: i.onSelect } : {})} />
      ))}
      <div className="ui-rail__spacer" />
      {footer}
    </nav>
  );
}
