import { Card } from '@/components/ui/Card'
import { SentenceComposer } from './SentenceComposer'

type HeroBannerProps = {
  /** Accessible name for the region — not rendered. */
  label: string
  ctaLabel: string
  composerPlaceholder: string
  onStart: (value: string) => Promise<void>
}

/** Hero: the sentence composer, and nothing else. */
export function HeroBanner({ label, ctaLabel, composerPlaceholder, onStart }: HeroBannerProps) {
  return (
    <Card variant="accent" padding="md" as="section" aria-label={label}>
      <SentenceComposer
        ctaLabel={ctaLabel}
        placeholder={composerPlaceholder}
        onSubmit={onStart}
      />
    </Card>
  )
}
