import { useEffect, useState } from "react"
import { searchSentences } from "@/data/search"
import type { Sentence } from "@/data/sentences"

type SearchState = {
  /** The currently active, submitted query — "" when search is inactive. */
  query: string
  active: boolean
  /** null while inactive; the matching subset of `sentences` once active. */
  results: Sentence[] | null
  loading: boolean
  error: boolean
  /** Submits a query and runs the search. An empty/whitespace query clears it. */
  search: (query: string) => void
  clear: () => void
}

/**
 * Filters the already-loaded feed by sentence + completion text.
 *
 * Runs only on explicit submission (Enter or the search button), never on
 * every keystroke, and never fetches a separate results page — it narrows
 * `sentences`, the same list the grid already renders. Re-runs automatically
 * if the underlying feed changes while a search is active (e.g. a reload
 * after posting), so results don't go stale silently.
 */
export function useSentenceSearch(sentences: Sentence[]): SearchState {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Sentence[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!query) {
      setResults(null)
      setError(false)
      return
    }

    let active = true
    setLoading(true)
    setError(false)

    searchSentences(query, sentences)
      .then((matched) => {
        if (active) setResults(matched)
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
  }, [query, sentences])

  return {
    query,
    active: query.length > 0,
    results,
    loading,
    error,
    search: (next) => setQuery(next.trim()),
    clear: () => setQuery(""),
  }
}
