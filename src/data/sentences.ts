import { supabase } from "@/lib/supabase"

/** Limits mirror the CHECK constraints in supabase/schema.sql. */
export const SENTENCE_MAX_LENGTH = 120
export const COMPLETION_MAX_LENGTH = 200

export type FeedView = "home" | "started" | "completed"

export type Sentence = {
  id: string
  text: string
  authorId: string
  createdAt: string
  completionsCount: number
  likesCount: number
  participantsCount: number
  /** Enough people, active enough, right now. Rare on purpose. */
  isTrending: boolean
  /** Gaining traction, below the trending bar. */
  isRising: boolean
  /** Created in the last day with nothing on it yet. */
  isNew: boolean
}

/** One row of public.sentence_metrics. */
type MetricsRow = {
  id: string
  text: string
  author_id: string
  created_at: string
  completion_count: number
  like_count: number
  participant_count: number
  is_trending: boolean
  is_rising: boolean
  is_new: boolean
}

const METRICS_SELECT =
  "id, text, author_id, created_at, completion_count, like_count, " +
  "participant_count, is_trending, is_rising, is_new"

/**
 * How many sentences the ranked feed asks for. The ranking, the counts and the
 * exploration mix are all computed in Postgres; the browser never downloads
 * completions or likes to work any of it out.
 */
const FEED_LIMIT = 60

function fromMetrics(row: MetricsRow): Sentence {
  return {
    id: row.id,
    text: row.text,
    authorId: row.author_id,
    createdAt: row.created_at,
    completionsCount: row.completion_count ?? 0,
    likesCount: row.like_count ?? 0,
    participantsCount: row.participant_count ?? 0,
    isTrending: Boolean(row.is_trending),
    isRising: Boolean(row.is_rising),
    isNew: Boolean(row.is_new),
  }
}

/** Shape PostgREST returns for `completions(count)` embedding. */
type SentenceRow = {
  id: string
  text: string
  author_id: string
  created_at: string
  completions: { count: number }[] | null
}

const SENTENCE_SELECT = "id, text, author_id, created_at, completions(count)"

/**
 * Fallback shape, used only if public.sentence_metrics is unavailable — most
 * plausibly because the trending migration has not been run yet. The feed then
 * behaves exactly as it did before this feature existed: newest first, no
 * indicators.
 */
function toSentence(row: SentenceRow): Sentence {
  return {
    id: row.id,
    text: row.text,
    authorId: row.author_id,
    createdAt: row.created_at,
    completionsCount: row.completions?.[0]?.count ?? 0,
    likesCount: 0,
    participantsCount: 0,
    isTrending: false,
    isRising: false,
    isNew: false,
  }
}

let rankingWarned = false

function warnOnce(cause: unknown): void {
  if (rankingWarned) return
  rankingWarned = true
  console.warn(
    "Ranked feed unavailable; falling back to newest-first. If " +
      "public.feed_ranked is missing, run supabase/2026-08-trending.sql.",
    cause,
  )
}

/** Feed for the selected navigation item. */
export async function fetchSentences(
  view: FeedView,
  userId: string,
): Promise<Sentence[]> {
  if (view === "home") return fetchRankedFeed()
  if (view === "completed") return fetchCompletedFeed(userId)
  return fetchStartedFeed(userId)
}

/**
 * The home feed, ordered by Postgres.
 *
 * `feed_ranked` returns the sentences already interleaved: mostly by trending
 * score, with roughly every fourth slot reserved for a recent sentence the
 * score alone would have buried. See supabase/2026-08-trending.sql.
 */
async function fetchRankedFeed(): Promise<Sentence[]> {
  const { data, error } = await supabase.rpc("feed_ranked", {
    p_limit: FEED_LIMIT,
  })

  if (error) {
    // Ranking is an enhancement, never a dependency: without it the feed is
    // still a feed. This is what keeps the app working before the migration
    // has been run.
    warnOnce(error)
    return fetchNewestFeed()
  }

  return ((data ?? []) as MetricsRow[]).map(fromMetrics)
}

/** Pre-trending behaviour, kept as the fallback path. */
async function fetchNewestFeed(): Promise<Sentence[]> {
  const { data, error } = await supabase
    .from("sentences")
    .select(SENTENCE_SELECT)
    .order("created_at", { ascending: false })
    .limit(FEED_LIMIT)

  if (error) throw error
  return ((data ?? []) as unknown as SentenceRow[]).map(toSentence)
}

/** Sentences this user opened, newest first. */
async function fetchStartedFeed(userId: string): Promise<Sentence[]> {
  const { data, error } = await supabase
    .from("sentence_metrics")
    .select(METRICS_SELECT)
    .eq("author_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    warnOnce(error)
    const fallback = await supabase
      .from("sentences")
      .select(SENTENCE_SELECT)
      .eq("author_id", userId)
      .order("created_at", { ascending: false })
    if (fallback.error) throw fallback.error
    return ((fallback.data ?? []) as unknown as SentenceRow[]).map(toSentence)
  }

  return ((data ?? []) as unknown as MetricsRow[]).map(fromMetrics)
}

/**
 * Sentences this user completed, most recently completed first.
 *
 * Two bounded queries rather than an embedded join, because `sentence_metrics`
 * is a view and PostgREST cannot infer a foreign key through it.
 */
async function fetchCompletedFeed(userId: string): Promise<Sentence[]> {
  const { data, error } = await supabase
    .from("completions")
    .select("sentence_id, created_at")
    .eq("author_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error

  const ordered = ((data ?? []) as { sentence_id: string }[]).map(
    (row) => row.sentence_id,
  )
  const ids = [...new Set(ordered)]
  if (ids.length === 0) return []

  const metrics = await supabase
    .from("sentence_metrics")
    .select(METRICS_SELECT)
    .in("id", ids)

  if (metrics.error) {
    warnOnce(metrics.error)
    const fallback = await supabase
      .from("sentences")
      .select(SENTENCE_SELECT)
      .in("id", ids)
    if (fallback.error) throw fallback.error
    const byId = new Map(
      ((fallback.data ?? []) as unknown as SentenceRow[]).map((row) => [
        row.id,
        toSentence(row),
      ]),
    )
    return ids
      .map((id) => byId.get(id))
      .filter((s): s is Sentence => Boolean(s))
  }

  // Restore completion order, which the `in` filter does not preserve.
  const byId = new Map(
    ((metrics.data ?? []) as unknown as MetricsRow[]).map((row) => [
      row.id,
      fromMetrics(row),
    ]),
  )
  return ids
    .map((id) => byId.get(id))
    .filter((row): row is Sentence => Boolean(row))
}

/** Ids of sentences this user has already completed. */
export async function fetchCompletedIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("completions")
    .select("sentence_id")
    .eq("author_id", userId)

  if (error) throw error
  return new Set(
    ((data ?? []) as { sentence_id: string }[]).map((row) => row.sentence_id),
  )
}

export async function createSentence(
  text: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("sentences")
    .insert({ text: text.trim(), author_id: userId })

  if (error) throw error
}

export async function createCompletion(
  sentenceId: string,
  text: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("completions")
    .insert({ sentence_id: sentenceId, text: text.trim(), author_id: userId })

  if (error) throw error
}

/** How many sentences and completions this user has authored, for the
 *  navigation labels ("משפטים שהתחלתי (X)" / "משפטים שהשלמתי (X)"). */
export type NavCounts = {
  started: number
  completed: number
}

/**
 * Two row-count queries — `head: true` asks Postgres for the count only, no
 * rows transferred. Applies to the current user, guest or authenticated
 * alike: both are real `auth.uid()` values, so the same `eq` works for
 * either. A failure resolves to 0 for that count rather than throwing —
 * these numbers are secondary to the label they sit inside.
 */
export async function fetchNavCounts(userId: string): Promise<NavCounts> {
  const [started, completed] = await Promise.all([
    supabase
      .from("sentences")
      .select("id", { count: "exact", head: true })
      .eq("author_id", userId),
    supabase
      .from("completions")
      .select("id", { count: "exact", head: true })
      .eq("author_id", userId),
  ])

  return {
    started: started.error ? 0 : (started.count ?? 0),
    completed: completed.error ? 0 : (completed.count ?? 0),
  }
}
