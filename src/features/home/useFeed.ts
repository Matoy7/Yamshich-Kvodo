import { useCallback, useEffect, useState } from 'react'
import {
  fetchSentences,
  fetchCompletedIds,
  type FeedView,
  type Sentence,
} from '@/data/sentences'
import { fetchAuthors } from '@/data/completions'

type FeedState = {
  sentences: Sentence[]
  completedIds: Set<string>
  /** Author display name per sentence author id, for the preview header. */
  authorNames: Map<string, string>
  loading: boolean
  error: string | null
  reload: () => void
}

/** Loads the feed for the active navigation item, and reloads on demand. */
export function useFeed(view: FeedView, userId: string | undefined): FeedState {
  const [sentences, setSentences] = useState<Sentence[]>([])
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [authorNames, setAuthorNames] = useState<Map<string, string>>(new Map())
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

        // Attribution is decorative and runs on its own: one extra query for
        // the whole page, never one per card, and never able to fail the feed.
        void loadAuthorNames(rows.map((row) => row.authorId))
      })
      .catch(() => {
        if (active) setError('לא הצלחנו לטעון את המשפטים.')
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
              row.display_name?.trim() || row.first_name?.trim() || 'משתמש',
            ]),
          ),
        )
      } catch {
        if (active) setAuthorNames(new Map())
      }
    }

    return () => {
      active = false
    }
  }, [view, userId, nonce])

  return { sentences, completedIds, authorNames, loading, error, reload }
}
