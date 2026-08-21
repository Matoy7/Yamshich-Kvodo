import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type CardVariant = 'default' | 'accent'
export type CardPadding = 'md' | 'lg'

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-surface border-border-subtle shadow-card',
  accent: 'bg-surface-secondary border-transparent shadow-panel',
}

const paddingStyles: Record<CardPadding, string> = {
  md: 'p-4',
  lg: 'p-6',
}

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant
  padding?: CardPadding
  interactive?: boolean
  as?: 'div' | 'article' | 'section'
  children: ReactNode
}

/**
 * The single card specification for the product. Radius, border, background,
 * shadow and padding all come from tokens — never restyle a card inline.
 */
export function Card({
  variant = 'default',
  padding = 'lg',
  interactive = false,
  as: Tag = 'div',
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-lg border',
        variantStyles[variant],
        paddingStyles[padding],
        interactive && 'transition-shadow duration-150 hover:shadow-card-hover',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/** Card header: title block plus optional trailing actions. */
export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="flex flex-col gap-1">
        <h3 className="text-card-title font-semibold text-content-primary">{title}</h3>
        {description ? (
          <p className="text-body-sm text-content-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}

/** Card footer: separated from body by the standard 16px rhythm. */
export function CardFooter({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('flex items-center justify-between gap-4 pt-4', className)}>
      {children}
    </div>
  )
}
