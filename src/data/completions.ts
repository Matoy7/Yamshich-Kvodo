import { supabase } from '@/lib/supabase'

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
}

type CompletionRow = { id: string; text: string; created_at: string; author_id: string }
type AuthorRow = {
  id: string
  display_name: string | null
  first_name: string | null
  avatar_url: string | null
}

/** Guest names live in display_name; provider users have first_name. */
function authorName(row: AuthorRow | undefined): string {
  return row?.display_name?.trim() || row?.first_name?.trim() || 'משתמש'
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
export async function fetchAuthors(ids: string[]): Promise<Map<string, AuthorRow>> {
  const unique = [...new Set(ids)].filter(Boolean)
  if (unique.length === 0) return new Map()

  const { data, error } = await supabase
    .from('public_profiles')
    .select('id, display_name, first_name, avatar_url')
    .in('id', unique)

  if (error) {
    if (!authorsWarned) {
      authorsWarned = true
      console.warn(
        'Author names unavailable; showing the neutral fallback. ' +
          'If public.public_profiles is missing, run supabase/2026-08-public-profiles.sql.',
        error,
      )
    }
    return new Map()
  }

  return new Map(((data ?? []) as AuthorRow[]).map((row) => [row.id, row]))
}

/** Completions for one sentence, newest first, with their authors resolved. */
export async function fetchCompletions(sentenceId: string): Promise<Completion[]> {
  const { data, error } = await supabase
    .from('completions')
    .select('id, text, created_at, author_id')
    .eq('sentence_id', sentenceId)
    .order('created_at', { ascending: false })

  if (error) throw error

  const rows = (data ?? []) as CompletionRow[]
  const authors = await fetchAuthors(rows.map((row) => row.author_id))

  return rows.map((row) => {
    const author = authors.get(row.author_id)
    return {
      id: row.id,
      text: row.text,
      createdAt: row.created_at,
      author: {
        id: row.author_id,
        name: authorName(author),
        avatarUrl: author?.avatar_url?.trim() || null,
      },
    }
  })
}
