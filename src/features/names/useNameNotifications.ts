import { useCallback, useEffect, useState } from "react"
import {
  fetchNameNotifications,
  fetchUnreadNameNotificationCount,
  markAllNameNotificationsRead,
  markNameNotificationRead,
  type NameNotification,
} from "@/data/nameNotifications"

type State = {
  unreadCount: number
  notifications: NameNotification[] | null
  loading: boolean
  error: boolean
  load: () => void
  markAllRead: () => void
  markRead: (id: string) => void
}

/** Same shape as the retired features/notifications/useNotifications — one type, one table, otherwise identical. */
export function useNameNotifications(userId: string | undefined): State {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<NameNotification[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [loadNonce, setLoadNonce] = useState(0)

  useEffect(() => {
    if (!userId) return
    let active = true
    fetchUnreadNameNotificationCount(userId)
      .then((count) => {
        if (active) setUnreadCount(count)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [userId])

  useEffect(() => {
    if (!userId || loadNonce === 0) return
    let active = true
    setLoading(true)
    setError(false)
    fetchNameNotifications(userId)
      .then((rows) => {
        if (active) setNotifications(rows)
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [userId, loadNonce])

  const load = useCallback(() => setLoadNonce((n) => n + 1), [])

  const markAllRead = useCallback(() => {
    if (!userId) return
    setNotifications((list) => (list ? list.map((n) => ({ ...n, read: true })) : list))
    setUnreadCount(0)
    markAllNameNotificationsRead(userId).catch(() => {})
  }, [userId])

  const markRead = useCallback((id: string) => {
    let wasUnread = false
    setNotifications((list) => {
      if (!list) return list
      const target = list.find((n) => n.id === id)
      if (!target || target.read) return list
      wasUnread = true
      return list.map((n) => (n.id === id ? { ...n, read: true } : n))
    })
    if (wasUnread) {
      setUnreadCount((count) => Math.max(0, count - 1))
      markNameNotificationRead(id).catch(() => {})
    }
  }, [])

  return { unreadCount, notifications, loading, error, load, markAllRead, markRead }
}
