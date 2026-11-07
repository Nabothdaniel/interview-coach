import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from '../icons/Icon';
import { Tip } from './Tooltip';

export function Chip({ icon, tip, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: IconName; tip?: string }) {
  const btn = (
    <button type="button" className="ui-chip" {...rest}>
      {icon ? <Icon name={icon} size={14} /> : null}
      {children}
    </button>
  );
  return tip ? <Tip text={tip}>{btn}</Tip> : btn;
}
