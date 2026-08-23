import { useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { upsertProfile } from './profile'

type SessionState = {
  session: Session | null
  /** True until the stored session has been read — render nothing decisive yet. */
  loading: boolean
  /**
   * Resolved from the profile row: a guest's generated name, or the provider
   * name. Null until the profile sync completes; callers fall back to
   * `displayNameFor(session.user)` meanwhile.
   */
  displayName: string | null
}

/**
 * Tracks the Supabase session: reads whatever is already persisted, then
 * follows sign-in and sign-out for the life of the page. Whenever a user
 * appears, their profile row is upserted once.
 */
export function useSession(): SessionState {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
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
      upsertProfile(user)
        .then((name) => {
          if (active) setDisplayName(name)
        })
        .catch((error) => {
          // Non-fatal: the signup trigger has already created the row.
          console.error('profile upsert failed', error)
          syncedUserId.current = null
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
        console.error('getSession failed', error)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    const { data: subscription } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      setLoading(false)

      if (event === 'SIGNED_OUT') {
        syncedUserId.current = null
        setDisplayName(null)
        return
      }
      syncProfile(next)
    })

    return () => {
      active = false
      window.clearTimeout(failSafe)
      subscription.subscription.unsubscribe()
    }
  }, [])

  return { session, loading, displayName }
}
