import { SentenceCard } from './SentenceCard'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import type { FeedView, Sentence } from '@/data/sentences'

type SentenceGridProps = {
  sentences: Sentence[]
  completedIds: Set<string>
  authorNames: Map<string, string>
  currentUserId: string
  view: FeedView
  loading: boolean
  error: string | null
  onComplete: (sentence: Sentence) => void
}

const EMPTY_COPY: Record<FeedView, { title: string; description: string }> = {
  home: {
    title: 'אין עדיין משפטים',
    description: 'התחילו את המשפט הראשון ומישהו כבר ישלים אותו.',
  },
  started: {
    title: 'עוד לא התחלתם משפטים',
    description: 'כתבו תחילת משפט בשדה שלמעלה.',
  },
  completed: {
    title: 'עוד לא השלמתם משפטים',
    description: 'בחרו משפט מהעמוד הראשי והשלימו אותו.',
  },
}

const GRID = 'grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'

/** Responsive feed grid: 1 column on mobile, 2 from `md`, 3 from `xl`. */
export function SentenceGrid({
  sentences,
  completedIds,
  authorNames,
  currentUserId,
  view,
  loading,
  error,
  onComplete,
}: SentenceGridProps) {
  if (loading) {
    return (
      <div className={GRID} aria-busy="true" aria-label="טוען משפטים">
        {Array.from({ length: 6 }, (_, index) => (
          <Card key={index} className="h-[196px] w-full animate-pulse" aria-hidden>
            <span className="sr-only">טוען</span>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return <EmptyState title="משהו השתבש" description={error} />
  }

  if (sentences.length === 0) {
    const copy = EMPTY_COPY[view]
    return <EmptyState title={copy.title} description={copy.description} />
  }

  return (
    <ul className={GRID}>
      {sentences.map((sentence) => (
        <li key={sentence.id} className="flex">
          <SentenceCard
            sentence={sentence}
            completed={completedIds.has(sentence.id)}
            own={sentence.authorId === currentUserId}
            authorName={authorNames.get(sentence.authorId) ?? null}
            onComplete={onComplete}
          />
        </li>
      ))}
    </ul>
  )
}
