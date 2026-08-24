import { supabase } from "@/lib/supabase"
import { fetchLikes, seedLikeState, type LikeState } from "./likes"

export type CompletionAuthor = {
  id: string
  name: string
  avatarUrl: string | null
}

export type Completion = {
  id: string
  text: string
  createdAt: string
  author: CompletionAuthor
  /**
   * Null when like data could not be read at all — most plausibly because the
   * completion_likes migration has not been run yet. The control is then not
   * rendered, rather than shown with a count of 0 that would be a lie.
   */
  likes: LikeState | null
}

type CompletionRow = {
  id: string
  text: string
  created_at: string
  author_id: string
}
export type AuthorRow = {
  id: string
  display_name: string | null
  first_name: string | null
  avatar_url: string | null
}

/** Guest names live in display_name; provider users have first_name. */
export function authorName(row: AuthorRow | undefined): string {
  return row?.display_name?.trim() || row?.first_name?.trim() || "משתמש"
}

let authorsWarned = false

/**
 * Author cards come from `public_profiles`, a view exposing only id, name and
 * picture. The `profiles` table itself stays private — no email is readable.
 *
 * Attribution is decorative: every caller falls back to a neutral name. So a
 * failure here — most plausibly the view not existing yet — resolves to an
 * empty map rather than rejecting, and never takes down the feed or the
 * completions list that asked for it.
 */
export async function fetchAuthors(
  ids: string[],
): Promise<Map<string, AuthorRow>> {
  const unique = [...new Set(ids)].filter(Boolean)
  if (unique.length === 0) return new Map()

  const { data, error } = await supabase
    .from("public_profiles")
    .select("id, display_name, first_name, avatar_url")
    .in("id", unique)

  if (error) {
    if (!authorsWarned) {
      authorsWarned = true
      console.warn(
        "Author names unavailable; showing the neutral fallback. " +
          "If public.public_profiles is missing, run supabase/2026-08-public-profiles.sql.",
        error,
      )
    }
    return new Map()
  }

  return new Map(((data ?? []) as AuthorRow[]).map((row) => [row.id, row]))
}

let likesWarned = false

/**
 * One completion by id, with its author and current like count — for a
 * shared/deep-link view, which must show the exact completion someone
 * shared regardless of whether it still leads its sentence today.
 *
 * Same field shape as fetchCompletions's per-row mapping, just for a single
 * row, and it seeds this session's like state the same way.
 */
export async function fetchCompletionById(
  id: string,
  userId: string | null,
): Promise<Completion | null> {
  const { data, error } = await supabase
    .from("completions")
    .select("id, text, created_at, author_id")
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row = data as CompletionRow

  const [authors, likes] = await Promise.all([
    fetchAuthors([row.author_id]),
    fetchLikes([row.id], userId).catch(() => null),
  ])

  const author = authors.get(row.author_id)
  const like = likes?.get(row.id) ?? null
  if (like) seedLikeState(row.id, like.likedByMe)

  return {
    id: row.id,
    text: row.text,
    createdAt: row.created_at,
    author: {
      id: row.author_id,
      name: authorName(author),
      avatarUrl: author?.avatar_url?.trim() || null,
    },
    likes: like,
  }
}

/**
 * Ranks completions the way the whole product does: most-liked first, newest
 * first to break a tie. Used wherever a list of completions is shown, so the
 * "leading" completion always means the same thing.
 *
 * `likes` is null when like data could not be read at all (see `Completion`);
 * such completions sort as zero likes rather than being excluded, so the
 * feature degrading never changes which completion is shown, only whether its
 * count is visible.
 */
export function rankCompletions(completions: Completion[]): Completion[] {
  return [...completions].sort((a, b) => {
    const likesA = a.likes?.count ?? 0
    const likesB = b.likes?.count ?? 0
    if (likesA !== likesB) return likesB - likesA
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

/**
 * Completions for one sentence, ranked most-liked first (ties broken by
 * newest), with authors and like state resolved.
 *
 * Three requests for the whole list regardless of how many completions come
 * back — the rows, one batched author lookup, one batched like lookup. Authors
 * and likes are fetched together rather than in sequence, and neither can fail
 * the list: attribution falls back to a neutral name, and unreadable like data
 * hides the control instead of breaking the panel.
 */
export async function fetchCompletions(
  sentenceId: string,
  userId: string | null,
): Promise<Completion[]> {
  const { data, error } = await supabase
    .from("completions")
    .select("id, text, created_at, author_id")
    .eq("sentence_id", sentenceId)
    .order("created_at", { ascending: false })

  if (error) throw error

  const rows = (data ?? []) as CompletionRow[]

  const [authors, likes] = await Promise.all([
    fetchAuthors(rows.map((row) => row.author_id)),
    fetchLikes(
      rows.map((row) => row.id),
      userId,
    ).catch((cause) => {
      if (!likesWarned) {
        likesWarned = true
        console.warn(
          "Like data unavailable; the like control is hidden. If public.completion_likes " +
            "is missing, run supabase/2026-08-completion-likes.sql.",
          cause,
        )
      }
      return null
    }),
  ])

  const mapped = rows.map((row) => {
    const author = authors.get(row.author_id)
    const like = likes?.get(row.id) ?? null
    if (like) seedLikeState(row.id, like.likedByMe)

    return {
      id: row.id,
      text: row.text,
      createdAt: row.created_at,
      author: {
        id: row.author_id,
        name: authorName(author),
        avatarUrl: author?.avatar_url?.trim() || null,
      },
      likes: like,
    }
  })

  return rankCompletions(mapped)
}

/** The single most-liked completion for a batch of sentences (ties → newest). */
export type LeadingCompletion = {
  id: string
  text: string
  authorId: string
  authorName: string
  createdAt: string
}

/**
 * One completion per sentence — whichever currently leads by
 * `likes DESC, created_at DESC` — for the feed's card preview.
 *
 * One batched query for every sentence's completions, plus one batched author
 * lookup and one batched like lookup, regardless of how many cards are on
 * screen. Decorative like everything else attribution-shaped here: any
 * failure resolves to an empty map so the feed still renders, just without
 * previews.
 */
export async function fetchLeadingCompletions(
  sentenceIds: string[],
): Promise<Map<string, LeadingCompletion>> {
  const unique = [...new Set(sentenceIds)].filter(Boolean)
  const result = new Map<string, LeadingCompletion>()
  if (unique.length === 0) return result

  const { data, error } = await supabase
    .from("completions")
    .select("id, text, created_at, author_id, sentence_id")
    .in("sentence_id", unique)

  if (error) return result

  type Row = {
    id: string
    text: string
    created_at: string
    author_id: string
    sentence_id: string
  }
  const rows = (data ?? []) as Row[]
  if (rows.length === 0) return result

  const [authors, likes] = await Promise.all([
    fetchAuthors(rows.map((row) => row.author_id)),
    fetchLikes(
      rows.map((row) => row.id),
      null,
    ).catch(() => null),
  ])

  const bySentence = new Map<string, Row[]>()
  for (const row of rows) {
    const list = bySentence.get(row.sentence_id)
    if (list) list.push(row)
    else bySentence.set(row.sentence_id, [row])
  }

  for (const [sentenceId, list] of bySentence) {
    const [top] = [...list].sort((a, b) => {
      const likesA = likes?.get(a.id)?.count ?? 0
      const likesB = likes?.get(b.id)?.count ?? 0
      if (likesA !== likesB) return likesB - likesA
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    if (top) {
      result.set(sentenceId, {
        id: top.id,
        text: top.text,
        authorId: top.author_id,
        authorName: authorName(authors.get(top.author_id)),
        createdAt: top.created_at,
      })
    }
  }

  return result
}
