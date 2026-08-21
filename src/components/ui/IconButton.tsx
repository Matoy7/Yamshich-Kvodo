import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type IconButtonVariant = 'secondary' | 'ghost'
export type IconButtonSize = 'sm' | 'md' | 'lg'

const base =
  'relative inline-flex items-center justify-center rounded-full transition-colors duration-150 ' +
  'select-none disabled:pointer-events-none disabled:opacity-45'

const variantStyles: Record<IconButtonVariant, string> = {
  secondary:
    'bg-surface-muted text-content-primary border border-border-strong shadow-panel ' +
    'hover:bg-surface-secondary',
  ghost: 'bg-transparent text-content-secondary hover:bg-surface-muted',
}

const sizeStyles: Record<IconButtonSize, string> = {
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-12',
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Required — an icon-only control must expose an accessible name. */
  label: string
  variant?: IconButtonVariant
  size?: IconButtonSize
  children: ReactNode
}

export function IconButton({
  label,
  variant = 'ghost',
  size = 'md',
  className,
  children,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(base, variantStyles[variant], sizeStyles[size], className)}
      {...rest}
    >
      {children}
    </button>
  )
}
