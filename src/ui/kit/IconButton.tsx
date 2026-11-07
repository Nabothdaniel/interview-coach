import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from '../icons/Icon';
import { Tip, type TipAlign, type TipSide } from './Tooltip';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName;
  label: string;
  solid?: boolean;
  large?: boolean;
  /** Where the label tooltip appears. */
  tipSide?: TipSide;
  tipAlign?: TipAlign;
}

export function IconButton({ icon, label, solid = false, large = false, tipSide = 'top', tipAlign = 'center', className, ...rest }: IconButtonProps) {
  const cls = ['ui-ib', solid ? 'ui-ib--solid' : '', large ? 'ui-ib--lg' : '', className ?? ''].filter(Boolean).join(' ');
  return (
    <Tip text={label} side={tipSide} align={tipAlign}>
      <button type="button" className={cls} aria-label={label} {...rest}>
        <Icon name={icon} size={large ? 22 : 20} />
      </button>
    </Tip>
  );
}
