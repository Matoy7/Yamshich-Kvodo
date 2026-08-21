import { cn } from '@/lib/cn'

/** Standardised icon sizes — no other values are permitted. */
export const iconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
} as const

export type IconSize = keyof typeof iconSizes

type IconProps = {
  src: string
  size?: IconSize
  /**
   * Accessible name. Omit for decorative icons that sit next to a text label —
   * they are then hidden from assistive technology.
   */
  label?: string
  className?: string
}

/**
 * Renders a project icon asset at one of the four approved sizes and keeps it
 * optically aligned with adjacent text via `shrink-0` + flex centring.
 */
export function Icon({ src, size = 'sm', label, className }: IconProps) {
  const px = iconSizes[size]

  return (
    <img
      src={src}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      width={px}
      height={px}
      style={{ width: px, height: px }}
      className={cn('inline-block shrink-0 object-contain select-none', className)}
    />
  )
}
