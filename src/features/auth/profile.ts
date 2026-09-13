import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { hasGoogleIdentity } from "./linkAccount"

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

/** Shown only for the brief moment before a guest has chosen their own name — never stored. */
export const GUEST_DISPLAY_NAME = "אורח"

/** Postgres unique-violation — kept only for a friendly message if an old, not-yet-migrated database still enforces uniqueness. */
const UNIQUE_VIOLATION = "23505"

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
function splitName(
  fullName: string,
): {
  first: string | null
  last: string | null
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { first: null, last: null }
  if (parts.length === 1) return { first: parts[0], last: null }
  return { first: parts[0], last: parts.slice(1).join(" ") }
}

/**
 * Name for the UI. Never returns undefined or an empty string, so a guest can
 * never render as a blank or "undefined" user.
 */
export function displayNameFor(user: User): string {
  if (isGuest(user)) return GUEST_DISPLAY_NAME

  const metadata = (user.user_metadata ?? {}) as GoogleMetadata
  const name =
    metadata.full_name?.trim() || metadata.name?.trim() || user.email?.trim()
  return name || "משתמש"
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
  const url = (metadata.avatar_url ?? metadata.picture ?? "").trim()
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
 * email and no provider fields. Nothing here ever sets display_name for a
 * guest: the omitted key in the upsert payload leaves an existing value
 * untouched, and a brand-new guest simply has none yet, resolved by the
 * caller returning null so the app can ask them to choose one.
 */
export async function upsertProfile(user: User): Promise<string | null> {
  const guest = isGuest(user)
  const metadata = (user.user_metadata ?? {}) as GoogleMetadata
  const fallback = splitName(metadata.full_name ?? metadata.name ?? "")

  const row = guest
    ? {
        id: user.id,
        email: null,
        first_name: null,
        last_name: null,
        avatar_url: null,
      }
    : {
        id: user.id,
        email: user.email ?? null,
        first_name: metadata.given_name ?? fallback.first,
        last_name: metadata.family_name ?? fallback.last,
        avatar_url: metadata.avatar_url ?? metadata.picture ?? null,
      }

  const { error } = await supabase
    .from("profiles")
    .upsert(row, { onConflict: "id" })
  if (error) throw error

  if (!guest) {
    // Linked users are known by their provider name. Releasing a
    // guest-chosen name also frees it up — there is no uniqueness
    // constraint to free it from, but there is no reason to keep a stale
    // guest-era name sitting on a now-identified account either.
    const stored = await readDisplayName(user.id)
    if (stored) await releaseDisplayName(user.id)
    return displayNameFor(user)
  }

  return readDisplayName(user.id)
}

/** Clears a guest-chosen name once the account is no longer a guest. */
async function releaseDisplayName(userId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: null })
    .eq("id", userId)
  if (error) throw error
}

/**
 * Turns the "column does not exist" failure into something actionable.
 * Without this the app silently falls back to the placeholder name and the
 * only clue is a generic PostgREST error.
 */
function assertMigrated(
  error: {
    message?: string
    code?: string
  } | null,
): void {
  if (!error) return
  const message = error.message ?? ""
  if (/display_name/.test(message) && /column|schema cache/i.test(message)) {
    throw new Error(
      "profiles.display_name is missing — run supabase/2026-08-add-display-name.sql " +
        `in the Supabase SQL editor. (${message})`,
    )
  }
}

/** The display name stored on this user's own row, if any. */
async function readDisplayName(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle()

  assertMigrated(error)
  if (error) throw error
  return (data as { display_name: string | null } | null)?.display_name ?? null
}

export const GUEST_NAME_MAX_LENGTH = 40

/**
 * Saves the name a guest chose for themselves during onboarding — never
 * generated, never suggested, never defaulted. The only validation is
 * "not blank" and a sane length cap; anything the person actually typed is
 * accepted as-is.
 */
export async function chooseGuestDisplayName(userId: string, name: string): Promise<string> {
  const trimmed = name.trim().slice(0, GUEST_NAME_MAX_LENGTH)
  if (!trimmed) throw new Error("שם לא יכול להיות ריק")

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: trimmed })
    .eq("id", userId)

  if (error) {
    assertMigrated(error)
    if (error.code === UNIQUE_VIOLATION) {
      throw new Error("השם הזה כבר בשימוש. נסו שם אחר, או הוסיפו לו משהו קטן.")
    }
    throw error
  }

  return trimmed
}
