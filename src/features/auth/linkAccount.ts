import type { User } from "@supabase/supabase-js"
import { supabase, authRedirectUrl } from "@/lib/supabase"
import { clearOAuthError, readOAuthError } from "./oauthError"

/**
 * Upgrading a guest to a Google account.
 *
 * `linkIdentity` attaches a Google identity to the user who is *already*
 * signed in, so `auth.uid()` is unchanged and every sentence and completion
 * stays attached to the same row. Nothing is copied, migrated or deleted.
 *
 * It is a redirect flow, exactly like sign-in: the browser leaves for Google
 * and comes back. A flag in local storage lets the app recognise the return
 * trip and report the outcome.
 */
const PENDING_KEY = "ymk.pending-account-link"

export type LinkOutcome = "linked" | "conflict" | "failed" | "cancelled"

export type LinkResult = {
  outcome: LinkOutcome
  /** Raw provider message, for display in small print only. */
  detail?: string | null
}

/** True once a Google identity is attached to this user. */
export function hasGoogleIdentity(user: User | null | undefined): boolean {
  return Boolean(
    user?.identities?.some((identity) => identity.provider === "google"),
  )
}

function readFlag(): boolean {
  try {
    return localStorage.getItem(PENDING_KEY) === "1"
  } catch {
    return false
  }
}

function writeFlag(value: boolean): void {
  try {
    if (value) localStorage.setItem(PENDING_KEY, "1")
    else localStorage.removeItem(PENDING_KEY)
  } catch {
    /* private mode — the flow still works, only the confirmation is skipped */
  }
}

/**
 * Starts the link. On success the browser navigates away, so this only
 * returns when something went wrong before the redirect.
 */
export async function beginAccountLink(): Promise<string | null> {
  writeFlag(true)

  const { error } = await supabase.auth.linkIdentity({
    provider: "google",
    options: { redirectTo: authRedirectUrl() },
  })

  if (!error) return null

  writeFlag(false)

  // Manual linking is a project-level setting; without it the API refuses.
  if (/manual linking|not enabled|disabled/i.test(error.message)) {
    return "שמירת החשבון אינה מופעלת בפרויקט. יש להפעיל Manual Linking בהגדרות Supabase."
  }
  return "לא הצלחנו להתחיל את שמירת החשבון. נסו שוב."
}

/** Classifies the failure Google/Supabase handed back on the URL. */
function classify(
  code: string | null,
  description: string | null,
): LinkOutcome {
  const haystack = `${code ?? ""} ${description ?? ""}`.toLowerCase()
  if (/already|exists|linked|taken|duplicate/.test(haystack)) return "conflict"
  if (/access_denied|cancel/.test(haystack)) return "cancelled"
  return "failed"
}

/**
 * Reads the result of a link attempt after the redirect, once.
 *
 * Returns null when this page load is not the tail of a link attempt.
 * The guest session is never touched here: a cancelled or failed link simply
 * leaves the user signed in exactly as they were.
 */
export async function consumeAccountLinkOutcome(): Promise<LinkResult | null> {
  if (!readFlag()) return null
  writeFlag(false)

  const failure = readOAuthError()
  if (failure) {
    clearOAuthError()
    return {
      outcome: classify(failure.code, failure.description),
      detail: failure.description,
    }
  }

  // No error on the URL — confirm the identity actually attached rather than
  // assuming it did. A refresh pulls the updated identity list.
  try {
    const { data } = await supabase.auth.refreshSession()
    const user = data.user ?? (await supabase.auth.getUser()).data.user
    if (hasGoogleIdentity(user)) return { outcome: "linked" }
  } catch {
    /* fall through — treated as an incomplete attempt, session untouched */
  }

  return { outcome: "cancelled" }
}
