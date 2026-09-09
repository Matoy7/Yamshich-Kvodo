import { Icon } from "@/components/ui/Icon"
import { assets } from "@/lib/assets"
import { cn } from "@/lib/cn"
import { relativeTime } from "@/lib/time"
import type { NameNotification } from "@/data/nameNotifications"

type NameNotificationRowProps = {
  notification: NameNotification
  onOpen: (notification: NameNotification) => void
}

/** Noun-phrased for the same reason the original did this: profiles carry no gender. */
function primaryLine(n: NameNotification): string {
  return n.groupCount > 1
    ? `${n.actorName} ועוד ${n.groupCount - 1} הצביעו לשם שהצעת`
    : `${n.actorName} הצביע/ה לשם שהצעת`
}

export function NameNotificationRow({ notification, onOpen }: NameNotificationRowProps) {
  const n = notification

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(n)}
        className={cn(
          "flex w-full items-start gap-3 rounded-md px-3 py-3 text-start transition-colors duration-150",
          "hover:bg-surface-hover",
          !n.read && "bg-surface-muted",
        )}
      >
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-secondary">
          <Icon src={assets.iconHeartFilled} size="sm" />
        </span>

        <div className="min-w-0 flex-1">
          <p className={cn("text-body-sm text-content-primary [overflow-wrap:anywhere]", !n.read && "font-medium")}>
            <bdi>{primaryLine(n)}</bdi>
          </p>
          <p className="mt-1 truncate text-caption text-content-muted">
            <bdi>"{n.nameText}"</bdi>
          </p>
          <p className="mt-1 text-caption text-content-muted">{relativeTime(n.createdAt)}</p>
        </div>

        {!n.read ? <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" /> : null}
      </button>
    </li>
  )
}
