import { useCallback, useEffect, useState } from "react"
import {
  fetchSentences,
  fetchCompletedIds,
  type FeedView,
  type Sentence,
} from "@/data/sentences"
import {
  fetchAuthors,
  fetchLeadingCompletions,
  type LeadingCompletion,
} from "@/data/completions"

type FeedState = {
  sentences: Sentence[]
  completedIds: Set<string>
  /** Author display name per sentence author id, for the preview header. */
  authorNames: Map<string, string>
  /** Current top completion (likes DESC, created_at DESC) per sentence id. */
  leadingCompletions: Map<string, LeadingCompletion>
  loading: boolean
  error: string | null
  reload: () => void
  /** Re-checks one sentence's leading completion, e.g. after a like commits. */
  refreshLeadingCompletion: (sentenceId: string) => void
}

/** Loads the feed for the active navigation item, and reloads on demand. */
export function useFeed(view: FeedView, userId: string | undefined): FeedState {
  const [sentences, setSentences] = useState<Sentence[]>([])
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [authorNames, setAuthorNames] = useState<Map<string, string>>(new Map())
  const [leadingCompletions, setLeadingCompletions] =
    useState<Map<string, LeadingCompletion>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    if (!userId) return

    let active = true
    setLoading(true)
    setError(null)

    Promise.all([fetchSentences(view, userId), fetchCompletedIds(userId)])
      .then(([rows, completed]) => {
        if (!active) return
        setSentences(rows)
        setCompletedIds(completed)

        // Attribution and the leading-completion preview are both decorative
        // and run on their own: one extra query each for the whole page,
        // never one per card, and neither can fail the feed itself.
        const ids = rows.map((row) => row.id)
        void loadAuthorNames(rows.map((row) => row.authorId))
        void loadLeadingCompletions(ids)
      })
      .catch(() => {
        if (active) setError("לא הצלחנו לטעון את המשפטים.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    async function loadAuthorNames(ids: string[]) {
      try {
        const authors = await fetchAuthors(ids)
        if (!active) return
        setAuthorNames(
          new Map(
            [...authors.entries()].map(([id, row]) => [
              id,
              row.display_name?.trim() || row.first_name?.trim() || "משתמש",
            ]),
          ),
        )
      } catch {
        if (active) setAuthorNames(new Map())
      }
    }

    async function loadLeadingCompletions(ids: string[]) {
      try {
        const leading = await fetchLeadingCompletions(ids)
        if (active) setLeadingCompletions(leading)
      } catch {
        if (active) setLeadingCompletions(new Map())
      }
    }

    return () => {
      active = false
    }
  }, [view, userId, nonce])

  const refreshLeadingCompletion = useCallback((sentenceId: string) => {
    fetchLeadingCompletions([sentenceId])
      .then((result) => {
        const leading = result.get(sentenceId)
        setLeadingCompletions((current) => {
          const next = new Map(current)
          if (leading) next.set(sentenceId, leading)
          else next.delete(sentenceId)
          return next
        })
      })
      .catch(() => {})
  }, [])

  return {
    sentences,
    completedIds,
    authorNames,
    leadingCompletions,
    loading,
    error,
    reload,
    refreshLeadingCompletion,
  }
}
