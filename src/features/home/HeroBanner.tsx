import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { assets } from '@/lib/assets'

type HeroBannerProps = {
  title: string
  subtitle: string
  ctaLabel: string
  /** Sample prompt shown inside the hero so the concept reads at a glance. */
  examplePrompt: string
  exampleInvitation: string
  onStart?: () => void
}

/** Primary call-to-action panel at the top of the feed. */
export function HeroBanner({
  title,
  subtitle,
  ctaLabel,
  examplePrompt,
  exampleInvitation,
  onStart,
}: HeroBannerProps) {
  return (
    <Card variant="accent" padding="lg" as="section" aria-label={title}>
      <div className="flex flex-col items-center gap-6 text-center lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:text-start">
        {/* Identity + primary action */}
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6 lg:shrink-0">
          <img
            src={assets.heroIllustration}
            alt="איור של אישה כותבת ביומן"
            width={128}
            height={128}
            className="size-24 shrink-0 rounded-full bg-bg object-cover md:size-32"
          />

          <div className="flex flex-col items-center gap-4 sm:items-start">
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-display font-bold text-content-primary">
                {title}
              </h2>
              <p className="text-body text-content-secondary">{subtitle}</p>
            </div>

            <Button variant="primary" size="lg" onClick={onStart} className="shrink-0">
              {ctaLabel}
            </Button>
          </div>
        </div>

        {/* Worked example — communicates the concept without becoming a card. */}
        <figure className="flex w-full min-w-0 max-w-[360px] flex-col gap-2 rounded-md border-s-2 border-border-strong bg-surface/70 px-4 py-3 text-start">
          <Icon src={assets.iconQuote} size="sm" className="opacity-60" />
          <blockquote
            dir="auto"
            className="text-card-title font-medium text-content-primary [word-break:break-word]"
          >
            {examplePrompt}
          </blockquote>
          <figcaption className="text-body-sm text-content-muted">{exampleInvitation}</figcaption>
        </figure>
      </div>
    </Card>
  )
}
