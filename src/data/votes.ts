import { supabase } from "@/lib/supabase"

/** Postgres unique-violation: the vote already exists. */
const UNIQUE_VIOLATION = "23505"

export type VoteState = {
  count: number
  votedByMe: boolean
  /** Ids of family members who voted, for "who liked this" display. */
  voterIds: string[]
}

/**
 * Vote counts and per-voter ids for a batch of names, scoped to one family.
 *
 * Mirrors fetchLikes: one request for the whole list, count derived by
 * counting rows rather than trusted from a stored column. family_id is
 * always in the filter — this is what keeps the same user's vote in one
 * family from ever being read as their vote in another.
 */
export async function fetchVotes(
  nameIds: string[],
  familyId: string,
  userId: string | null,
): Promise<Map<string, VoteState>> {
  const unique = [...new Set(nameIds)].filter(Boolean)
  const state = new Map<string, VoteState>(
    unique.map((id) => [id, { count: 0, votedByMe: false, voterIds: [] }]),
  )
  if (unique.length === 0) return state

  const { data, error } = await supabase
    .from("name_votes")
    .select("name_id, user_id")
    .eq("family_id", familyId)
    .in("name_id", unique)

  if (error) throw error

  for (const row of (data ?? []) as { name_id: string; user_id: string }[]) {
    const entry = state.get(row.name_id)
    if (!entry) continue
    entry.count += 1
    entry.voterIds.push(row.user_id)
    if (userId && row.user_id === userId) entry.votedByMe = true
  }

  return state
}

async function insertVote(nameId: string, familyId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("name_votes")
    .insert({ name_id: nameId, family_id: familyId, user_id: userId })

  if (error && error.code !== UNIQUE_VIOLATION) throw error
}

async function deleteVote(nameId: string, familyId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("name_votes")
    .delete()
    .eq("name_id", nameId)
    .eq("family_id", familyId)
    .eq("user_id", userId)

  if (error) throw error
}

// ---------------------------------------------------------------------------
// Serialised writes, keyed by `${familyId}:${nameId}` so the same name in two
// different families never shares a queue — see likes.ts for the reasoning.
// ---------------------------------------------------------------------------

const queues = new Map<string, Promise<unknown>>()
const desired = new Map<string, boolean>()
const committed = new Map<string, boolean>()

function key(nameId: string, familyId: string): string {
  return `${familyId}:${nameId}`
}

export function seedVoteState(nameId: string, familyId: string, votedByMe: boolean): void {
  const k = key(nameId, familyId)
  if (!queues.has(k)) committed.set(k, votedByMe)
}

export function setVoted(
  nameId: string,
  familyId: string,
  userId: string,
  voted: boolean,
): Promise<void> {
  const k = key(nameId, familyId)
  desired.set(k, voted)

  const run = async (): Promise<void> => {
    const want = desired.get(k)
    if (want === undefined || want === committed.get(k)) return

    if (want) await insertVote(nameId, familyId, userId)
    else await deleteVote(nameId, familyId, userId)

    committed.set(k, want)
  }

  const previous = queues.get(k) ?? Promise.resolve()
  const next = previous.then(run, run)
  queues.set(
    k,
    next.catch(() => {}),
  )
  return next
}

export function lastCommittedVote(nameId: string, familyId: string): boolean | undefined {
  return committed.get(key(nameId, familyId))
}

/** Test seam: forget all queue state. */
export function resetVoteQueues(): void {
  queues.clear()
  desired.clear()
  committed.clear()
}
