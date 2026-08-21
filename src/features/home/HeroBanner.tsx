import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { assets } from '@/lib/assets'

type HeroBannerProps = {
  title: string
  subtitle: string
  ctaLabel: string
  onStart?: () => void
}

/** Primary call-to-action panel at the top of the feed. */
export function HeroBanner({ title, subtitle, ctaLabel, onStart }: HeroBannerProps) {
  return (
    <Card variant="accent" padding="lg" as="section" aria-label={title}>
      <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-start">
        <img
          src={assets.heroIllustration}
          alt="איור של אישה כותבת ביומן"
          width={128}
          height={128}
          className="size-24 shrink-0 rounded-full bg-bg object-cover md:size-32"
        />

        {/* Title, subtitle and primary action read as one block, aligned to
            the inline start (right in RTL) alongside the illustration. */}
        <div className="flex flex-col items-center gap-4 sm:items-start">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-display font-bold text-content-primary">{title}</h2>
            <p className="text-body text-content-secondary">{subtitle}</p>
          </div>

          <Button variant="primary" size="lg" onClick={onStart} className="shrink-0">
            {ctaLabel}
          </Button>
        </div>
      </div>
    </Card>
  )
}
