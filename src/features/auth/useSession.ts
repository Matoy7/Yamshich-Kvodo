import { useEffect, useRef, useState } from "react"
import type { Session } from "@supabase/supabase-js"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { upsertProfile } from "./profile"

type SessionState = {
  session: Session | null
  /** True until the stored session has been read — render nothing decisive yet. */
  loading: boolean
  /**
   * True while the profile row for the current session is being
   * upserted/read. A guest with displayName still null while this is true
   * simply hasn't finished loading — it does NOT yet mean "no name chosen".
   */
  profileLoading: boolean
  /**
   * Resolved from the profile row: a guest's chosen name (null until they've
   * picked one — check profileLoading first), or the provider name. Callers
   * fall back to `displayNameFor(session.user)` only as a transient loading
   * label — never as a value written back to the profile.
   */
  displayName: string | null
  /** Updates the in-memory name immediately after a guest chooses one, without waiting for a re-fetch. */
  setDisplayName: (name: string) => void
}

/**
 * Tracks the Supabase session: reads whatever is already persisted, then
 * follows sign-in and sign-out for the life of the page. Whenever a user
 * appears, their profile row is upserted once.
 */
export function useSession(): SessionState {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const syncedUserId = useRef<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    let active = true

    // Never leave the app stuck on the loading screen: if the session check
    // has not settled in a few seconds, fall through to the signed-out view.
    const failSafe = window.setTimeout(() => {
      if (active) setLoading(false)
    }, 8000)

    /** Upsert once per signed-in user, and never block rendering on it. */
    const syncProfile = (next: Session | null) => {
      const user = next?.user
      if (!user || syncedUserId.current === user.id) return
      syncedUserId.current = user.id
      setProfileLoading(true)
      upsertProfile(user)
        .then((name) => {
          if (active) setDisplayName(name)
        })
        .catch((error) => {
          // Non-fatal: the signup trigger has already created the row.
          console.error("profile upsert failed", error)
          syncedUserId.current = null
        })
        .finally(() => {
          if (active) setProfileLoading(false)
        })
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return
        setSession(data.session)
        syncProfile(data.session)
      })
      .catch((error) => {
        console.error("getSession failed", error)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, next) => {
        setSession(next)
        setLoading(false)

        if (event === "SIGNED_OUT") {
          syncedUserId.current = null
          setDisplayName(null)
          return
        }
        syncProfile(next)
      },
    )

    return () => {
      active = false
      window.clearTimeout(failSafe)
      subscription.subscription.unsubscribe()
    }
  }, [])

  return { session, loading, profileLoading, displayName, setDisplayName }
}
