import { useEffect, useState } from 'react'
import { fetchCompletions, type Completion } from '@/data/completions'

type Entry = { at: number; data: Completion[] }

/** Module-level so a re-hover reuses the result instead of refetching. */
const cache = new Map<string, Entry>()
const inflight = new Map<string, Promise<Completion[]>>()

/** Cached results older than this are refetched on the next open. */
const STALE_AFTER = 60_000

export function invalidateCompletions(sentenceId?: string): void {
  if (sentenceId) cache.delete(sentenceId)
  else cache.clear()
}

function load(sentenceId: string): Promise<Completion[]> {
  const cached = cache.get(sentenceId)
  if (cached && Date.now() - cached.at < STALE_AFTER) return Promise.resolve(cached.data)

  const existing = inflight.get(sentenceId)
  if (existing) return existing

  const request = fetchCompletions(sentenceId)
    .then((data) => {
      cache.set(sentenceId, { at: Date.now(), data })
      return data
    })
    .finally(() => {
      inflight.delete(sentenceId)
    })

  inflight.set(sentenceId, request)
  return request
}

type State = {
  completions: Completion[] | null
  loading: boolean
  error: boolean
  retry: () => void
}

/**
 * Completions for one sentence, fetched only once the preview actually opens.
 * Passing null keeps it idle, so the feed never fetches on page load.
 */
export function useCompletions(sentenceId: string | null): State {
  const [completions, setCompletions] = useState<Completion[] | null>(() =>
    sentenceId ? (cache.get(sentenceId)?.data ?? null) : null,
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!sentenceId) return

    const cached = cache.get(sentenceId)
    if (cached && Date.now() - cached.at < STALE_AFTER && attempt === 0) {
      setCompletions(cached.data)
      setError(false)
      return
    }

    let active = true
    setLoading(true)
    setError(false)

    load(sentenceId)
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
  }, [sentenceId, attempt])

  return {
    completions,
    loading,
    error,
    retry: () => {
      if (sentenceId) cache.delete(sentenceId)
      setAttempt((value) => value + 1)
    },
  }
}
