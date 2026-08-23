import { supabase } from "@/lib/supabase"

/** Postgres unique-violation: the like already exists. */
const UNIQUE_VIOLATION = "23505"

export type LikeState = {
  count: number
  likedByMe: boolean
}

/**
 * Like counts and the caller's own like state for a batch of completions.
 *
 * One request for the whole list — never one per completion. The count is
 * derived by counting rows, never read from a stored column, so it cannot
 * drift from the truth.
 *
 * Only ids are transferred: no profile is joined, so reading likes reveals
 * nothing about who anyone is.
 */
export async function fetchLikes(
  completionIds: string[],
  userId: string | null,
): Promise<Map<string, LikeState>> {
  const unique = [...new Set(completionIds)].filter(Boolean)
  const state = new Map<string, LikeState>(
    unique.map((id) => [id, { count: 0, likedByMe: false }]),
  )
  if (unique.length === 0) return state

  const { data, error } = await supabase
    .from("completion_likes")
    .select("completion_id, user_id")
    .in("completion_id", unique)

  if (error) throw error

  for (const row of (data ?? []) as {
    completion_id: string
    user_id: string
  }[]) {
    const entry = state.get(row.completion_id)
    if (!entry) continue
    entry.count += 1
    if (userId && row.user_id === userId) entry.likedByMe = true
  }

  return state
}

/**
 * Writes one like.
 *
 * `user_id` is sent explicitly and also defaults to auth.uid() in the database;
 * either way the RLS policy is what decides, so a wrong value here is rejected
 * rather than trusted. An existing like is treated as success — the request
 * and the world already agree.
 */
async function insertLike(completionId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("completion_likes")
    .insert({ completion_id: completionId, user_id: userId })

  if (error && error.code !== UNIQUE_VIOLATION) throw error
}

/** Removes the caller's like. RLS confines the match to their own row. */
async function deleteLike(completionId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("completion_likes")
    .delete()
    .eq("completion_id", completionId)
    .eq("user_id", userId)

  if (error) throw error
}

// ---------------------------------------------------------------------------
// Serialised writes
//
// Rapid like/unlike/like/unlike must settle on the state the user last chose,
// and must not race two requests against each other. Each completion gets its
// own queue: writes for one completion run strictly in order, writes for
// different completions still run concurrently.
//
// Each queued step re-reads the *latest* desired value at the moment it runs
// and compares it with what was last committed, so a burst of clicks collapses
// into at most one request per actual change of mind, and intermediate states
// are skipped entirely rather than replayed.
// ---------------------------------------------------------------------------

const queues = new Map<string, Promise<unknown>>()
const desired = new Map<string, boolean>()
const committed = new Map<string, boolean>()

/** Seeds what the server is known to hold, so the first toggle is a no-op-free. */
export function seedLikeState(completionId: string, likedByMe: boolean): void {
  if (!queues.has(completionId)) committed.set(completionId, likedByMe)
}

/**
 * Drives the server towards `liked` for this completion.
 *
 * Resolves once the queue has settled. Rejects only if the write that was
 * still needed actually failed, which is the caller's cue to roll back.
 */
export function setLiked(
  completionId: string,
  userId: string,
  liked: boolean,
): Promise<void> {
  desired.set(completionId, liked)

  const run = async (): Promise<void> => {
    const want = desired.get(completionId)
    // Someone changed their mind again while we waited; that later step owns it.
    if (want === undefined || want === committed.get(completionId)) return

    if (want) await insertLike(completionId, userId)
    else await deleteLike(completionId, userId)

    committed.set(completionId, want)
  }

  // Chain onto the tail whether or not the previous step failed, so one error
  // cannot wedge the queue for the rest of the session.
  const previous = queues.get(completionId) ?? Promise.resolve()
  const next = previous.then(run, run)
  queues.set(
    completionId,
    next.catch(() => {}),
  )
  return next
}

/**
 * The value the server is last known to hold for this completion, or undefined
 * if nothing has been written or seeded yet.
 *
 * Rollback reconciles to this rather than simply inverting the optimistic
 * change: during a burst of clicks the inverse of one failed write is not
 * necessarily the truth.
 */
export function lastCommittedLike(completionId: string): boolean | undefined {
  return committed.get(completionId)
}

/** Test seam: forget all queue state. */
export function resetLikeQueues(): void {
  queues.clear()
  desired.clear()
  committed.clear()
}
