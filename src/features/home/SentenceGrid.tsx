import { SentenceCard } from './SentenceCard'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Sentence } from '@/data/sentences'

type SentenceGridProps = {
  sentences: Sentence[]
}

/** Responsive feed grid: 1 column on mobile, 2 from `md`, 3 from `xl`. */
export function SentenceGrid({ sentences }: SentenceGridProps) {
  if (sentences.length === 0) {
    return <EmptyState title="אין משפטים להצגה" description="משפטים חדשים יופיעו כאן." />
  }

  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sentences.map((sentence) => (
        <li key={sentence.id} className="flex">
          <SentenceCard text={sentence.text} completions={sentence.completions} />
        </li>
      ))}
    </ul>
  )
}
