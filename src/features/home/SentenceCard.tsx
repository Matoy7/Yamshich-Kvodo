import { Card, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { assets } from '@/lib/assets'
import type { Sentence } from '@/data/sentences'

type SentenceCardProps = {
  sentence: Sentence
  /** True when the signed-in user already completed this sentence. */
  completed: boolean
  /** True when the signed-in user wrote this sentence. */
  own: boolean
  onComplete: (sentence: Sentence) => void
}

export function SentenceCard({ sentence, completed, own, onComplete }: SentenceCardProps) {
  const disabled = completed || own
  const label = completed ? 'הושלם' : own ? 'שלך' : 'השלם'

  return (
    <Card as="article" interactive className="flex h-full w-full flex-col">
      <Icon src={assets.iconQuote} size="lg" className="opacity-70" />

      <p
        dir="auto"
        className="mt-3 flex-1 text-quote font-medium text-content-primary [word-break:break-word]"
      >
        {sentence.text}...
      </p>

      {/* Action sits at the inline start (right in RTL); the completions
          count at the inline end. */}
      <CardFooter className="mt-4 border-t border-border-subtle">
        <Button
          variant="primary"
          size="sm"
          disabled={disabled}
          onClick={() => onComplete(sentence)}
        >
          {label}
        </Button>

        <Badge variant="neutral" iconStart={<Icon src={assets.iconPerson} size="xs" />}>
          השלמות {sentence.completionsCount}
        </Badge>
      </CardFooter>
    </Card>
  )
}
