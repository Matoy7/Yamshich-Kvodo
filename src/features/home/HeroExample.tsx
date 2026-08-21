import { Icon } from '@/components/ui/Icon'
import { assets } from '@/lib/assets'
import { cn } from '@/lib/cn'

/** Small white badge carrying the product's quote glyph. */
function QuoteBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'absolute flex size-7 items-center justify-center rounded-md bg-surface shadow-card',
        className,
      )}
    >
      <Icon src={assets.iconQuote} size="sm" />
    </span>
  )
}

type HeroExampleProps = {
  prompt: string
  reply: string
}

/**
 * Worked example shown on the end side of the hero: a prompt bubble answered
 * by a reply bubble, linked by a curved arrow. Desktop only — it is
 * supplementary to the hero's title, subtitle and primary action.
 */
export function HeroExample({ prompt, reply }: HeroExampleProps) {
  return (
    <div className="relative hidden w-[292px] shrink-0 flex-col gap-6 xl:flex xl:me-8">
      {/* Prompt — sits toward the inline start (right in RTL). */}
      <div className="relative self-start rounded-lg bg-surface-accent px-5 py-3">
        <QuoteBadge className="-top-3.5 -start-3.5" />
        <p dir="auto" className="text-body-sm font-medium text-content-primary">
          {prompt}
        </p>
      </div>

      {/* Reply — offset toward the inline end (left in RTL). */}
      <div className="relative self-end rounded-lg bg-surface px-5 py-3 shadow-card">
        <QuoteBadge className="-top-3.5 -end-3.5" />
        <p dir="auto" className="text-body-sm font-medium text-content-primary">
          {reply}
        </p>
      </div>

      {/* Curved connector from the prompt down to the reply. */}
      <svg
        aria-hidden
        viewBox="0 0 44 48"
        className="absolute start-5 top-11 h-12 w-11 text-border-strong"
        fill="none"
      >
        <path
          d="M30 3C35 17 32 31 14 37"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M21 31L13.5 37.5L21 42"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
