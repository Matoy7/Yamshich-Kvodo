import { Card } from '@/components/ui/Card'
import { SentenceComposer } from './SentenceComposer'
import { assets } from '@/lib/assets'

type HeroBannerProps = {
  title: string
  subtitle: string
  ctaLabel: string
  composerPlaceholder: string
  onStart?: (value: string) => void
}

/** Primary call-to-action panel at the top of the feed. */
export function HeroBanner({
  title,
  subtitle,
  ctaLabel,
  composerPlaceholder,
  onStart,
}: HeroBannerProps) {
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

        {/* Takes all remaining width so the composer spans the hero. */}
        <div className="flex w-full min-w-0 flex-1 flex-col items-center gap-4 sm:items-start">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-display font-bold text-content-primary">{title}</h2>
            <p className="text-body text-content-secondary">{subtitle}</p>
          </div>

          <SentenceComposer
            ctaLabel={ctaLabel}
            placeholder={composerPlaceholder}
            onSubmit={onStart}
          />
        </div>
      </div>
    </Card>
  )
}
