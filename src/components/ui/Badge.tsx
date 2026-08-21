import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type BadgeVariant = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const variantStyles: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-hover text-content-secondary border-border',
  accent: 'bg-surface-muted text-content-primary border-border-strong',
  success: 'bg-surface-hover text-success border-border',
  warning: 'bg-surface-hover text-warning border-border',
  danger: 'bg-surface-hover text-danger border-border',
}

type BadgeProps = {
  variant?: BadgeVariant
  iconStart?: ReactNode
  className?: string
  children: ReactNode
}

export function Badge({ variant = 'neutral', iconStart, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5',
        'text-caption font-medium whitespace-nowrap',
        variantStyles[variant],
        className,
      )}
    >
      {iconStart}
      {children}
    </span>
  )
}
