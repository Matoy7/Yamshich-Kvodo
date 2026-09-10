import { useCallback, useEffect, useState } from "react"
import {
  fetchNames,
  fetchFamilyRanking,
  type NameFilters,
  type NameEntry,
} from "@/data/names"
import { fetchVotes, setVoted, seedVoteState, lastCommittedVote, type VoteState } from "@/data/votes"
import type { NameCardData } from "./NameCard"
import type { NameGridView } from "./NameGrid"

function fromEntry(n: NameEntry): NameCardData {
  return {
    nameId: n.id,
    text: n.text,
    gender: n.gender,
    origin: n.origin,
    meaningHe: n.meaningHe,
    meaningConfidence: n.meaningConfidence,
    suggestedForFamilyId: n.familyId,
  }
}

type FamilyNamesState = {
  names: NameCardData[]
  votes: Map<string, VoteState>
  loading: boolean
  error: string | null
  reload: () => void
  toggleVote: (nameId: string) => void
}

/**
 * Loads either the browsable catalogue+suggestions or the family's vote
 * ranking, then the vote state for whatever list came back — mirroring
 * useFeed's shape (rows first, decoration after) but scoped throughout to
 * one family, per name_votes' (family_id, name_id, user_id) key.
 */
export function useFamilyNames(
  familyId: string | null,
  userId: string | undefined,
  view: NameGridView,
  filters: NameFilters = {},
): FamilyNamesState {
  const [names, setNames] = useState<NameCardData[]>([])
  const [votes, setVotes] = useState<Map<string, VoteState>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  const filterKey = JSON.stringify(filters)

  useEffect(() => {
    if (!familyId || !userId) return
    let active = true
    setLoading(true)
    setError(null)

    const load =
      view === "ranking"
        ? fetchFamilyRanking(familyId).then((rows) =>
            rows.map((r) => ({
              nameId: r.nameId,
              text: r.text,
              gender: r.gender,
              origin: r.origin,
              meaningHe: r.meaningHe,
              meaningConfidence: r.meaningConfidence,
              suggestedForFamilyId: r.suggestedForFamilyId,
            })),
          )
        : fetchNames(familyId, filters).then((rows) => rows.map(fromEntry))

    load
      .then((rows) => {
        if (!active) return
        setNames(rows)
        return fetchVotes(
          rows.map((r) => r.nameId),
          familyId,
          userId,
        )
      })
      .then((voteMap) => {
        if (!active || !voteMap) return
        setVotes(voteMap)
        for (const [nameId, state] of voteMap) seedVoteState(nameId, familyId, state.votedByMe)
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "שגיאה לא צפויה")
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
    // filterKey stands in for filters, which is a fresh object every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, userId, view, filterKey, nonce])

  const toggleVote = useCallback(
    (nameId: string) => {
      if (!familyId || !userId) return
      const current = votes.get(nameId)
      const wasVoted = current?.votedByMe ?? lastCommittedVote(nameId, familyId) ?? false
      const nextVoted = !wasVoted

      // Optimistic update, mirroring the count and voter list too so the
      // avatar stack and heart move together instead of the count lagging
      // a render behind the toggle.
      setVotes((prev) => {
        const next = new Map(prev)
        const entry = current ?? { count: 0, votedByMe: false, voterIds: [] }
        next.set(nameId, {
          count: entry.count + (nextVoted ? 1 : -1),
          votedByMe: nextVoted,
          voterIds: nextVoted
            ? [...entry.voterIds, userId]
            : entry.voterIds.filter((id) => id !== userId),
        })
        return next
      })

      setVoted(nameId, familyId, userId, nextVoted).catch(() => {
        // Roll back to the queue's own last-committed truth, not a blind
        // inverse — see votes.ts's reasoning on this.
        const committed = lastCommittedVote(nameId, familyId) ?? wasVoted
        setVotes((prev) => {
          const next = new Map(prev)
          const entry = next.get(nameId)
          if (!entry) return prev
          next.set(nameId, { ...entry, votedByMe: committed })
          return next
        })
      })
    },
    [familyId, userId, votes],
  )

  return { names, votes, loading, error, reload, toggleVote }
}
