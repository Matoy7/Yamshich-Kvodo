import { Card } from '@/components/ui/Card'
import { HeroExample } from './HeroExample'
import { SentenceComposer } from './SentenceComposer'
import { assets } from '@/lib/assets'

type HeroBannerProps = {
  title: string
  subtitle: string
  ctaLabel: string
  composerPlaceholder: string
  /** Desktop-only worked example rendered on the end side of the hero. */
  examplePrompt: string
  exampleReply: string
  onStart?: (value: string) => void
}

/** Primary call-to-action panel at the top of the feed. */
export function HeroBanner({
  title,
  subtitle,
  ctaLabel,
  composerPlaceholder,
  examplePrompt,
  exampleReply,
  onStart,
}: HeroBannerProps) {
  return (
    <Card variant="accent" padding="lg" as="section" aria-label={title}>
      <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-start lg:justify-between lg:gap-8">
        {/* Identity + composer */}
        <div className="flex w-full flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6 lg:w-auto lg:shrink-0">
          <img
            src={assets.heroIllustration}
            alt="איור של אישה כותבת ביומן"
            width={128}
            height={128}
            className="size-24 shrink-0 rounded-full bg-bg object-cover md:size-32"
          />

          <div className="flex w-full min-w-0 flex-col items-center gap-4 sm:items-start">
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-display font-bold text-content-primary">
                {title}
              </h2>
              <p className="text-body text-content-secondary">{subtitle}</p>
            </div>

            <SentenceComposer
              ctaLabel={ctaLabel}
              placeholder={composerPlaceholder}
              onSubmit={onStart}
            />
          </div>
        </div>

        <HeroExample prompt={examplePrompt} reply={exampleReply} />
      </div>
    </Card>
  )
}
