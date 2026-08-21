import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
export type ButtonSize = 'sm' | 'md' | 'lg'

/** Shared across every variant: geometry, typography, states. */
const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium ' +
  'transition-colors duration-150 select-none ' +
  'disabled:pointer-events-none disabled:opacity-45'

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-content-inverse shadow-primary hover:bg-primary-hover active:bg-primary-active',
  secondary:
    'bg-surface text-content-primary border border-border shadow-card ' +
    'hover:bg-surface-hover hover:border-border-strong active:bg-surface-muted',
  ghost:
    'bg-transparent text-content-secondary hover:bg-surface-muted hover:text-content-primary ' +
    'active:bg-surface-secondary',
  destructive:
    'bg-danger text-content-inverse hover:bg-danger-hover active:bg-danger-hover',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-body-sm',
  md: 'h-10 px-4 text-body',
  lg: 'h-12 px-6 text-card-title',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  iconStart?: ReactNode
  iconEnd?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  iconStart,
  iconEnd,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        base,
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {iconStart}
      {children}
      {iconEnd}
    </button>
  )
}
