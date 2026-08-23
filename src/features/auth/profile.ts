import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { generateGuestName } from './guestName'
import { hasGoogleIdentity } from './linkAccount'

export type Profile = {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  /** Generated guest name; NULL for provider users. */
  display_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

/** Used only until a generated name has been assigned. */
export const GUEST_DISPLAY_NAME = 'אורח'

/** Postgres unique-violation, raised when a generated name is already taken. */
const UNIQUE_VIOLATION = '23505'

/** Plenty: the name space is ~362,500 combinations. */
const NAME_ATTEMPTS = 8

/**
 * True for a Supabase anonymous user.
 *
 * Anonymous users are issued a normal session with the `authenticated`
 * Postgres role — `auth.uid()` and every existing RLS policy apply to them
 * exactly as they do to Google users. The only difference is this flag.
 */
export function isGuest(user: User): boolean {
  // A linked user is no longer a guest even if the anonymous flag lingers:
  // the presence of a Google identity is the authoritative signal.
  return user.is_anonymous === true && !hasGoogleIdentity(user)
}

/**
 * Whether to offer the "save my account" upgrade.
 *
 * Keyed on the presence of a Google identity rather than on `is_anonymous`
 * alone, so the offer disappears the moment linking succeeds regardless of how
 * the flag itself settles.
 */
export function canUpgradeAccount(user: User): boolean {
  return isGuest(user)
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
 * Name for the UI. Never returns undefined or an empty string, so a guest can
 * never render as a blank or "undefined" user.
 */
export function displayNameFor(user: User): string {
  if (isGuest(user)) return GUEST_DISPLAY_NAME

  const metadata = (user.user_metadata ?? {}) as GoogleMetadata
  const name = metadata.full_name?.trim() || metadata.name?.trim() || user.email?.trim()
  return name || 'משתמש'
}

/**
 * The provider's picture, when the account is linked and has one. Null means
 * the UI should fall back to the deterministic generated avatar.
 */
export function providerAvatarUrl(user: User): string | null {
  if (isGuest(user)) return null
  const metadata = (user.user_metadata ?? {}) as GoogleMetadata
  // A blank string is "no picture", not a picture — otherwise the <img>
  // renders empty instead of falling back to the generated avatar.
  const url = (metadata.avatar_url ?? metadata.picture ?? '').trim()
  return url || null
}

/**
 * Writes the signed-in user's profile.
 *
 * Uses an upsert keyed on the auth user id, so a returning user updates their
 * existing row instead of creating a duplicate. `updated_at` is maintained by
 * a database trigger, and Row Level Security means this can only ever write
 * the caller's own row.
 *
 * Guests get a row too — the feed's foreign keys require one — but with no
 * email and no provider fields.
 */
export async function upsertProfile(user: User): Promise<string> {
  const guest = isGuest(user)
  const metadata = (user.user_metadata ?? {}) as GoogleMetadata
  const fallback = splitName(metadata.full_name ?? metadata.name ?? '')

  const row = guest
    ? { id: user.id, email: null, first_name: null, last_name: null, avatar_url: null }
    : {
        id: user.id,
        email: user.email ?? null,
        first_name: metadata.given_name ?? fallback.first,
        last_name: metadata.family_name ?? fallback.last,
        avatar_url: metadata.avatar_url ?? metadata.picture ?? null,
      }

  const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'id' })
  if (error) throw error

  if (!guest) {
    // Linked users are known by their provider name. Releasing the generated
    // name also returns it to the pool for other guests.
    const stored = await readDisplayName(user.id)
    if (stored) await releaseDisplayName(user.id)
    return displayNameFor(user)
  }

  return ensureGuestDisplayName(user.id)
}

/** Clears a generated name once the account is no longer a guest. */
async function releaseDisplayName(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: null })
    .eq('id', userId)
  if (error) throw error
}

/**
 * Turns the "column does not exist" failure into something actionable.
 * Without this the app silently falls back to the placeholder name and the
 * only clue is a generic PostgREST error.
 */
function assertMigrated(error: { message?: string; code?: string } | null): void {
  if (!error) return
  const message = error.message ?? ''
  if (/display_name/.test(message) && /column|schema cache/i.test(message)) {
    throw new Error(
      'profiles.display_name is missing — run supabase/2026-08-add-display-name.sql ' +
        `in the Supabase SQL editor. (${message})`,
    )
  }
}

/** The display name stored on this user's own row, if any. */
async function readDisplayName(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .maybeSingle()

  assertMigrated(error)
  if (error) throw error
  return (data as { display_name: string | null } | null)?.display_name ?? null
}

/**
 * Resolves a guest's display name, generating one only the first time.
 *
 * A returning guest keeps the name already stored on their row, so the same
 * guest identity always shows the same name. Uniqueness is enforced by a
 * unique index rather than by looking for clashes first — profiles are private,
 * so the client cannot see whether another user holds a name. A clash comes
 * back as a unique violation and we simply try another combination.
 */
export async function ensureGuestDisplayName(userId: string): Promise<string> {
  const existing = await readDisplayName(userId)
  if (existing) return existing

  for (let attempt = 0; attempt < NAME_ATTEMPTS; attempt += 1) {
    const candidate = generateGuestName()
    const { error: writeError } = await supabase
      .from('profiles')
      .update({ display_name: candidate })
      .eq('id', userId)

    if (!writeError) return candidate
    assertMigrated(writeError)
    if (writeError.code !== UNIQUE_VIOLATION) throw writeError
    // Name taken — loop and pick another combination.
  }

  throw new Error('could not allocate a unique guest name')
}
