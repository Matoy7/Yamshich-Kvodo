import { useCallback, useEffect, useRef, useState } from "react"
import { fetchCompletions, type Completion } from "@/data/completions"
import { lastCommittedLike, setLiked } from "@/data/likes"

type Entry = {
  at: number
  data: Completion[]
}

/** Module-level so a re-hover reuses the result instead of refetching. */
const cache = new Map<string, Entry>()
const inflight = new Map<string, Promise<Completion[]>>()

/** Cached results older than this are refetched on the next open. */
const STALE_AFTER = 60_000

/** Like state is per-viewer, so it must never be shared across sessions. */
function keyFor(sentenceId: string, userId: string | null): string {
  return `${sentenceId}::${userId ?? "anon"}`
}

export function invalidateCompletions(sentenceId?: string): void {
  if (!sentenceId) {
    cache.clear()
    return
  }
  for (const key of cache.keys()) {
    if (key.startsWith(`${sentenceId}::`)) cache.delete(key)
  }
}

function load(
  sentenceId: string,
  userId: string | null,
): Promise<Completion[]> {
  const key = keyFor(sentenceId, userId)
  const cached = cache.get(key)
  if (cached && Date.now() - cached.at < STALE_AFTER)
    return Promise.resolve(cached.data)

  const existing = inflight.get(key)
  if (existing) return existing

  const request = fetchCompletions(sentenceId, userId)
    .then((data) => {
      cache.set(key, { at: Date.now(), data })
      return data
    })
    .finally(() => {
      inflight.delete(key)
    })

  inflight.set(key, request)
  return request
}

/** Applies a like toggle to one completion in a list, leaving the rest as-is. */
function withLike(
  list: Completion[],
  completionId: string,
  liked: boolean,
): Completion[] {
  return list.map((completion) => {
    if (completion.id !== completionId || !completion.likes) return completion
    const delta = liked ? 1 : -1
    return {
      ...completion,
      likes: {
        likedByMe: liked,
        count: Math.max(0, completion.likes.count + delta),
      },
    }
  })
}

type State = {
  completions: Completion[] | null
  loading: boolean
  error: boolean
  retry: () => void
  /** Completion id whose last like write failed, for subtle inline feedback. */
  likeError: string | null
  toggleLike: (completionId: string) => void
}

/**
 * Completions for one sentence, fetched only once the preview actually opens.
 * Passing null keeps it idle, so the feed never fetches on page load.
 */
export function useCompletions(
  sentenceId: string | null,
  userId: string | null,
): State {
  const [completions, setCompletions] = useState<Completion[] | null>(() =>
    sentenceId ? (cache.get(keyFor(sentenceId, userId))?.data ?? null) : null,
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [likeError, setLikeError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!sentenceId) return

    const cached = cache.get(keyFor(sentenceId, userId))
    if (cached && Date.now() - cached.at < STALE_AFTER && attempt === 0) {
      setCompletions(cached.data)
      setError(false)
      return
    }

    let active = true
    setLoading(true)
    setError(false)

    load(sentenceId, userId)
      .then((data) => {
        if (active) setCompletions(data)
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [sentenceId, userId, attempt])

  // Mirrors the rendered list so a burst of clicks in a single tick reads what
  // the previous click just decided, not the state React has yet to flush.
  const latest = useRef<Completion[] | null>(completions)
  latest.current = completions

  /**
   * Optimistic like toggle.
   *
   * The UI flips first and the request follows. Writes are serialised per
   * completion inside `setLiked`, so rapid clicking settles on whatever the
   * user last chose rather than on whichever response happens to land last.
   */
  const toggleLike = useCallback(
    (completionId: string) => {
      if (!sentenceId || !userId) return

      const current = latest.current?.find(
        (completion) => completion.id === completionId,
      )
      if (!current?.likes) return
      const next = !current.likes.likedByMe

      const apply = (liked: boolean) => {
        const update = (list: Completion[]) =>
          withLike(list, completionId, liked)
        latest.current = latest.current
          ? update(latest.current)
          : latest.current
        setCompletions((list) => (list ? update(list) : list))
        // Keep the cache in step, so re-opening the popup shows the same state.
        const key = keyFor(sentenceId, userId)
        const entry = cache.get(key)
        if (entry) cache.set(key, { ...entry, data: update(entry.data) })
      }

      setLikeError(null)
      apply(next)

      setLiked(completionId, userId, next).catch(() => {
        // Reconcile to what the server is known to hold. Inverting `next` would
        // be wrong when the user has since clicked again.
        apply(lastCommittedLike(completionId) ?? !next)
        setLikeError(completionId)
      })
    },
    [sentenceId, userId],
  )

  return {
    completions,
    loading,
    error,
    likeError,
    toggleLike,
    retry: () => {
      if (sentenceId) cache.delete(keyFor(sentenceId, userId))
      setAttempt((value) => value + 1)
    },
  }
}
