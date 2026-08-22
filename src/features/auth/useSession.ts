import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

type SessionState = {
  session: Session | null
  loading: boolean
}

/**
 * Tracks the Supabase session: reads whatever is already stored, then follows
 * sign-in and sign-out events for the life of the page.
 */
export function useSession(): SessionState {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    let active = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return
        setSession(data.session)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  return { session, loading }
}
