import { useCallback, useEffect, useState } from "react"
import { fetchNavCounts, type NavCounts } from "@/data/sentences"

const ZERO: NavCounts = { started: 0, completed: 0 }

/**
 * The "(X)" counts next to "משפטים שהתחלתי" / "משפטים שהשלמתי" in the
 * sidebar. Independent of which feed view is active — it only needs to
 * change when the user actually posts something, not when they switch tabs.
 */
export function useNavCounts(
  userId: string | undefined,
): {
  counts: NavCounts
  refresh: () => void
} {
  const [counts, setCounts] = useState<NavCounts>(ZERO)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!userId) return
    let active = true
    fetchNavCounts(userId).then((next) => {
      if (active) setCounts(next)
    })
    return () => {
      active = false
    }
  }, [userId, nonce])

  return { counts, refresh: useCallback(() => setNonce((n) => n + 1), []) }
}
