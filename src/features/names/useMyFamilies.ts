import { useCallback, useEffect, useState } from "react"
import { createFamily, fetchMyFamilies, type Family } from "@/data/families"

const ACTIVE_FAMILY_KEY = "shem-tov:active-family-id"

type MyFamiliesState = {
  families: Family[]
  activeFamilyId: string | null
  activeFamily: Family | null
  loading: boolean
  error: string | null
  reload: () => void
  setActiveFamilyId: (id: string) => void
  create: (name: string) => Promise<Family>
}

/**
 * Loads every family the caller belongs to. The active one is remembered
 * per-browser (not per-account — there is no server concept of "which
 * family is open right now", and there doesn't need to be one) so switching
 * families and refreshing the page doesn't silently reset you back to the
 * first one.
 */
export function useMyFamilies(userId: string | undefined): MyFamiliesState {
  const [families, setFamilies] = useState<Family[]>([])
  const [activeFamilyId, setActiveFamilyIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ACTIVE_FAMILY_KEY)
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    if (!userId) return
    let active = true
    setLoading(true)
    setError(null)

    fetchMyFamilies(userId)
      .then((rows) => {
        if (!active) return
        setFamilies(rows)
        setActiveFamilyIdState((current) => {
          if (current && rows.some((f) => f.id === current)) return current
          return rows[0]?.id ?? null
        })
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "שגיאה לא צפויה")
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [userId, nonce])

  const setActiveFamilyId = useCallback((id: string) => {
    setActiveFamilyIdState(id)
    try {
      localStorage.setItem(ACTIVE_FAMILY_KEY, id)
    } catch {
      // Best-effort only — an unavailable localStorage just means the choice
      // doesn't survive a refresh, not a broken app.
    }
  }, [])

  const create = useCallback(
    async (name: string) => {
      const family = await createFamily(name)
      reload()
      setActiveFamilyId(family.id)
      return family
    },
    [reload, setActiveFamilyId],
  )

  const activeFamily = families.find((f) => f.id === activeFamilyId) ?? null

  return { families, activeFamilyId, activeFamily, loading, error, reload, setActiveFamilyId, create }
}
