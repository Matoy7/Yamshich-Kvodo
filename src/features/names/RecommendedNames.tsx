import { useCallback, useEffect, useState } from "react"
import { Section } from "@/components/layout/Section"
import { fetchRecommendations } from "@/data/names"
import { fetchVotes, setVoted, lastCommittedVote, type VoteState } from "@/data/votes"
import { NameGrid } from "./NameGrid"
import type { NameCardData } from "./NameCard"

type RecommendedNamesProps = {
  familyId: string
  userId: string
  /** Bumped by the parent to force a refresh after a vote changes the family's lean. */
  refreshKey: number
}

/**
 * "Because your family voted for X" — only renders once there's a real
 * voting history to derive from; an empty recommendation set is simply
 * absent rather than shown as an empty state, since "no recommendations
 * yet" isn't something worth a whole section explaining.
 *
 * Keeps its own vote state rather than sharing the main grid's: the same
 * name can appear in both the browse grid and here, and each needs its own
 * optimistic toggle against the same underlying (family, name, user) row.
 */
export function RecommendedNames({ familyId, userId, refreshKey }: RecommendedNamesProps) {
  const [names, setNames] = useState<NameCardData[]>([])
  const [votes, setVotes] = useState<Map<string, VoteState>>(new Map())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let active = true
    fetchRecommendations(familyId)
      .then((rows) => {
        if (!active) return
        const cards = rows.map((n) => ({
          nameId: n.id,
          text: n.text,
          gender: n.gender,
          origin: n.origin,
          meaningHe: n.meaningHe,
          meaningConfidence: n.meaningConfidence,
          suggestedForFamilyId: n.familyId,
        }))
        setNames(cards)
        return fetchVotes(cards.map((c) => c.nameId), familyId, userId)
      })
      .then((voteMap) => {
        if (active && voteMap) setVotes(voteMap)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoaded(true)
      })
    return () => {
      active = false
    }
  }, [familyId, userId, refreshKey])

  const toggleVote = useCallback(
    (nameId: string) => {
      const current = votes.get(nameId)
      const wasVoted = current?.votedByMe ?? lastCommittedVote(nameId, familyId) ?? false
      const nextVoted = !wasVoted

      setVotes((prev) => {
        const next = new Map(prev)
        const entry = current ?? { count: 0, votedByMe: false, voterIds: [] }
        next.set(nameId, {
          count: entry.count + (nextVoted ? 1 : -1),
          votedByMe: nextVoted,
          voterIds: nextVoted ? [...entry.voterIds, userId] : entry.voterIds.filter((id) => id !== userId),
        })
        return next
      })

      setVoted(nameId, familyId, userId, nextVoted).catch(() => {
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

  if (!loaded || names.length === 0) return null

  return (
    <Section title="מומלץ בשבילכם" description="בהתבסס על השמות שהמשפחה שלכם כבר הצביעה עבורם.">
      <NameGrid names={names} votes={votes} view="browse" loading={false} error={null} onToggleVote={toggleVote} />
    </Section>
  )
}
