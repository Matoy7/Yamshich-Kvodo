import { Card, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { assets } from '@/lib/assets'
import type { Sentence } from '@/data/sentences'

type SentenceCardProps = Pick<Sentence, 'text' | 'completions'> & {
  onComplete?: () => void
}

export function SentenceCard({ text, completions, onComplete }: SentenceCardProps) {
  return (
    <Card as="article" interactive className="flex h-full w-full flex-col">
      <Icon src={assets.iconQuote} size="lg" className="opacity-70" />

      <p
        dir="auto"
        className="mt-3 flex-1 text-quote font-medium text-content-primary [word-break:break-word]"
      >
        {text}
      </p>

      <CardFooter className="mt-4 border-t border-border-subtle">
        <Badge variant="neutral" iconStart={<Icon src={assets.iconPerson} size="xs" />}>
          השלמות {completions}
        </Badge>

        <Button variant="primary" size="sm" onClick={onComplete}>
          השלם
        </Button>
      </CardFooter>
    </Card>
  )
}
