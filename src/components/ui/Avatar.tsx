import { cn } from '@/lib/cn'

export type AvatarSize = 'sm' | 'md' | 'lg'

const sizeStyles: Record<AvatarSize, string> = {
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-12',
}

type AvatarProps = {
  src: string
  /** Accessible name for the person the avatar represents. */
  alt: string
  size?: AvatarSize
  className?: string
}

export function Avatar({ src, alt, size = 'md', className }: AvatarProps) {
  return (
    <span
      className={cn(
        'inline-block shrink-0 overflow-hidden rounded-full border-2 border-border-strong bg-surface-muted',
        sizeStyles[size],
        className,
      )}
    >
      <img src={src} alt={alt} className="size-full object-cover" />
    </span>
  )
}
