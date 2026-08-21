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
      <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:text-start">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <img
            src={assets.heroIllustration}
            alt="איור של אישה כותבת ביומן"
            width={160}
            height={160}
            className="size-[120px] shrink-0 rounded-full bg-bg object-cover md:size-[160px]"
          />

          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="font-display text-display font-bold text-content-primary">{title}</h2>
            <p className="text-body text-content-secondary">{subtitle}</p>
          </div>
        </div>

        <Button variant="primary" size="lg" onClick={onStart} className="shrink-0">
          {ctaLabel}
        </Button>
      </div>
    </Card>
  )
}
