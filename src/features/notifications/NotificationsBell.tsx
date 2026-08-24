import { useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Icon } from "@/components/ui/Icon"
import { assets } from "@/lib/assets"
import { cn } from "@/lib/cn"
import { NotificationRow } from "./NotificationRow"
import { useNotifications } from "./useNotifications"
import type { Notification } from "@/data/notifications"

type NotificationsBellProps = {
  userId: string | undefined
  /** Opens the relevant sentence's completions context and closes the bell. */
  onOpenSentence: (sentenceId: string) => void
}

/** Never grows the badge for a big number — caps the label, not the count. */
function badgeLabel(count: number): string {
  return count > 9 ? "9+" : String(count)
}

/**
 * Bell control in the header: a small proportional unread badge, opening a
 * dropdown on desktop and a bottom sheet on mobile — the same responsive
 * shell as AccountMenu, so the two header controls behave identically.
 */
export function NotificationsBell({
  userId,
  onOpenSentence,
}: NotificationsBellProps) {
  const [open, setOpen] = useState(false)
  const [isCompact, setIsCompact] = useState(
    () =>
      typeof window !== "undefined" &&
      !window.matchMedia("(min-width: 640px)").matches,
  )
  const containerRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const {
    unreadCount,
    notifications,
    loading,
    error,
    load,
    markAllRead,
    markRead,
  } = useNotifications(userId)

  useEffect(() => {
    const query = window.matchMedia("(min-width: 640px)")
    const sync = () => setIsCompact(!query.matches)
    sync()
    query.addEventListener("change", sync)
    return () => query.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) return
      // The portalled mobile sheet lives outside the container.
      if ((target as HTMLElement).closest?.("[data-notifications-bell]")) return
      setOpen(false)
    }

    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("mousedown", onPointerDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("mousedown", onPointerDown)
    }
  }, [open])

  const openBell = () => {
    setOpen((value) => {
      const next = !value
      if (next) load()
      return next
    })
  }

  const openNotification = (notification: Notification) => {
    markRead(notification.id)
    setOpen(false)
    onOpenSentence(notification.sentenceId)
  }

  const panel = (
    <>
      <div className="flex shrink-0 items-center justify-between gap-3 px-1 pb-2 sm:px-2 sm:pt-1">
        <p className="text-body font-semibold text-content-primary">התראות</p>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={markAllRead}
            className="rounded-md px-1.5 py-1 text-caption font-medium text-accent transition-colors duration-150 hover:bg-surface-muted"
          >
            סמן הכל כנקרא
          </button>
        ) : null}
      </div>
      <div className="h-px bg-border" aria-hidden />

      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {loading && !notifications ? (
          <div
            className="flex flex-col gap-3 px-3 py-4"
            aria-busy="true"
            aria-label="טוען התראות"
          >
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="size-8 shrink-0 animate-pulse rounded-full bg-surface-hover" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <div className="h-3.5 w-4/5 animate-pulse rounded-full bg-surface-hover" />
                  <div className="h-3 w-3/5 animate-pulse rounded-full bg-surface-hover" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="px-3 py-4 text-body-sm text-content-secondary">
            לא הצלחנו לטעון את ההתראות
          </p>
        ) : notifications && notifications.length > 0 ? (
          <ul className="flex flex-col gap-0.5">
            {notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onOpen={openNotification}
              />
            ))}
          </ul>
        ) : (
          <p className="px-3 py-6 text-center text-body-sm text-content-muted">
            אין עדיין התראות
          </p>
        )}
      </div>
    </>
  )

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={
          unreadCount > 0
            ? `פתח התראות, ${badgeLabel(unreadCount)} התראות שלא נקראו`
            : "פתח התראות"
        }
        onClick={openBell}
        className={cn(
          "relative inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-colors duration-150",
          "bg-surface-muted text-content-primary shadow-panel hover:bg-surface-secondary",
        )}
      >
        <Icon src={assets.iconBell} size="lg" />

        {/* Proportional to the 24px bell: a 16px circle, not a floating
            badge of its own. Never grows past "9+" — the label caps, the
            circle doesn't. */}
        {unreadCount > 0 ? (
          <span
            aria-hidden
            className="absolute -end-1 -top-1 flex size-4 items-center justify-center rounded-full border-2 border-surface-muted bg-accent"
          >
            <span className="text-[10px] font-semibold leading-none text-content-inverse">
              {badgeLabel(unreadCount)}
            </span>
          </span>
        ) : null}
      </button>

      {open && !isCompact ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="התראות"
          data-notifications-bell
          className={cn(
            "absolute end-0 top-full z-50 mt-2 flex max-h-[70vh] w-[340px] max-w-[calc(100vw-2rem)]",
            "flex-col rounded-lg border border-border-subtle bg-surface p-2 shadow-overlay",
            "animate-notifications-in",
          )}
        >
          {panel}
        </div>
      ) : null}

      {open && isCompact
        ? createPortal(
            <div data-notifications-bell>
              <div
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-40 bg-content-primary/35"
                aria-hidden
              />
              <div
                id={panelId}
                role="dialog"
                aria-label="התראות"
                dir="rtl"
                className={cn(
                  "fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] flex-col rounded-t-lg",
                  "border border-border-subtle bg-surface p-4 pb-6 shadow-overlay",
                )}
              >
                <span
                  aria-hidden
                  className="mx-auto mb-3 block h-1 w-10 shrink-0 rounded-full bg-border-strong/50"
                />
                {panel}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
