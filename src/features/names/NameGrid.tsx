import { Card } from "@/components/ui/Card"
import { EmptyState } from "@/components/ui/EmptyState"
import { NameCard, type NameCardData } from "./NameCard"
import type { VoteState } from "@/data/votes"

export type NameGridView = "browse" | "ranking"

type NameGridProps = {
  names: NameCardData[]
  votes: Map<string, VoteState>
  view: NameGridView
  loading: boolean
  error: string | null
  searchQuery?: string
  onToggleVote: (nameId: string) => void
}

const EMPTY_COPY: Record<NameGridView, { title: string; description: string }> = {
  browse: {
    title: "לא מצאנו שמות",
    description: "נסו לשנות את הסינון או להציע שם חדש למשפחה.",
  },
  ranking: {
    title: "אין עדיין הצבעות",
    description: "הצביעו על שמות שאהבתם כדי לראות את הדירוג של המשפחה.",
  },
}

const GRID = "grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"

/** Responsive name grid — identical geometry to SentenceGrid on purpose. */
export function NameGrid({
  names,
  votes,
  view,
  loading,
  error,
  searchQuery,
  onToggleVote,
}: NameGridProps) {
  if (loading) {
    return (
      <div className={GRID} aria-busy="true" aria-label={searchQuery ? "מחפש" : "טוען שמות"}>
        {Array.from({ length: 6 }, (_, index) => (
          <Card key={index} className="h-[164px] w-full animate-pulse" aria-hidden>
            <span className="sr-only">טוען</span>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return <EmptyState title="משהו השתבש" description={error} />
  }

  if (names.length === 0) {
    const copy = searchQuery
      ? { title: "לא מצאנו שמות מתאימים", description: "נסו לחפש מילה אחרת" }
      : EMPTY_COPY[view]
    return <EmptyState title={copy.title} description={copy.description} />
  }

  return (
    <ul className={GRID}>
      {names.map((name) => (
        <li key={name.nameId} className="flex">
          <NameCard name={name} vote={votes.get(name.nameId)} onToggleVote={onToggleVote} />
        </li>
      ))}
    </ul>
  )
}
