import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from '../icons/Icon';
import { Spinner } from './Spinner';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'ghost' | 'accent';
  icon?: IconName;
  /** Shows a spinner, disables the button and marks it busy. */
  loading?: boolean;
  children: ReactNode;
}

export function Button({ variant = 'solid', icon, loading = false, children, className, disabled, ...rest }: ButtonProps) {
  const cls = ['ui-btn', variant === 'solid' ? '' : `ui-btn--${variant}`, className ?? ''].filter(Boolean).join(' ');
  return (
    <button type="button" className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Spinner size={14} /> : icon ? <Icon name={icon} size={16} /> : null}
      {children}
    </button>
  );
}
