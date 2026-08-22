import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type Profile = {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

/** Google puts the user's details on `user_metadata` under these keys. */
type GoogleMetadata = {
  given_name?: string
  family_name?: string
  full_name?: string
  name?: string
  avatar_url?: string
  picture?: string
}

/** Splits a display name when the provider omits given/family fields. */
function splitName(fullName: string): { first: string | null; last: string | null } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { first: null, last: null }
  if (parts.length === 1) return { first: parts[0], last: null }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

/**
 * Writes the signed-in user's profile.
 *
 * Uses an upsert keyed on the auth user id, so a returning user updates their
 * existing row instead of creating a duplicate. `updated_at` is maintained by
 * a database trigger. Row Level Security means this can only ever write the
 * caller's own row.
 */
export async function upsertProfile(user: User): Promise<void> {
  const metadata = (user.user_metadata ?? {}) as GoogleMetadata
  const fallback = splitName(metadata.full_name ?? metadata.name ?? '')

  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email ?? null,
      first_name: metadata.given_name ?? fallback.first,
      last_name: metadata.family_name ?? fallback.last,
      avatar_url: metadata.avatar_url ?? metadata.picture ?? null,
    },
    { onConflict: 'id' },
  )

  if (error) throw error
}
