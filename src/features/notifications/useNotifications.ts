import { useCallback, useEffect, useState } from "react"
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from "@/data/notifications"

type State = {
  /** Unread count for the bell badge — loaded as soon as there is a user,
   *  independent of whether the popover has ever been opened. */
  unreadCount: number
  /** Null until the popover has been opened at least once. */
  notifications: Notification[] | null
  loading: boolean
  error: boolean
  /** Call once when the popover opens, to fetch the list on demand. */
  load: () => void
  markAllRead: () => void
  /** Marks one notification read, both on the server and in local state —
   *  e.g. once the user opens it. */
  markRead: (id: string) => void
}

export function useNotifications(userId: string | undefined): State {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[] | null>(
    null,
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [loadNonce, setLoadNonce] = useState(0)

  // The badge count is cheap (a HEAD count query) and loaded independent of
  // whether the popover has ever been opened.
  useEffect(() => {
    if (!userId) return
    let active = true
    fetchUnreadNotificationCount(userId)
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
    fetchNotifications(userId)
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
    setNotifications((list) =>
      list ? list.map((n) => ({ ...n, read: true })) : list,
    )
    setUnreadCount(0)
    markAllNotificationsRead(userId).catch(() => {})
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
      markNotificationRead(id).catch(() => {})
    }
  }, [])

  return {
    unreadCount,
    notifications,
    loading,
    error,
    load,
    markAllRead,
    markRead,
  }
}
