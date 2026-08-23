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

function toSentence(row: SentenceRow): Sentence {
  return {
    id: row.id,
    text: row.text,
    authorId: row.author_id,
    createdAt: row.created_at,
    completionsCount: row.completions?.[0]?.count ?? 0,
  }
}

/** Feed for the selected navigation item. */
export async function fetchSentences(
  view: FeedView,
  userId: string,
): Promise<Sentence[]> {
  if (view === "completed") {
    const { data, error } = await supabase
      .from("completions")
      .select(`created_at, sentence:sentences(${SENTENCE_SELECT})`)
      .eq("author_id", userId)
      .order("created_at", { ascending: false })

    if (error) throw error

    return ((data ?? []) as unknown as { sentence: SentenceRow | null }[])
      .map((row) => row.sentence)
      .filter((row): row is SentenceRow => Boolean(row))
      .map(toSentence)
  }

  let query = supabase
    .from("sentences")
    .select(SENTENCE_SELECT)
    .order("created_at", { ascending: false })

  if (view === "started") query = query.eq("author_id", userId)

  const { data, error } = await query
  if (error) throw error

  return ((data ?? []) as unknown as SentenceRow[]).map(toSentence)
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
