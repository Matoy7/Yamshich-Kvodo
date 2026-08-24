import { Icon } from "@/components/ui/Icon"
import { assets } from "@/lib/assets"
import { cn } from "@/lib/cn"
import { relativeTime } from "@/lib/time"
import type { Notification } from "@/data/notifications"

type NotificationRowProps = {
  notification: Notification
  onOpen: (notification: Notification) => void
}

/**
 * Copy is deliberately noun-phrased rather than "X liked your completion":
 * profiles carry no gender, so a verb conjugated to agree with the actor
 * ("אהב" vs "אהבה") would be wrong for roughly half of them. The one
 * genuinely plural case — a grouped like — uses Hebrew's ungendered plural
 * past tense ("אהבו"), which needs no such choice.
 */
function primaryLine(n: Notification): string {
  if (n.type === "completion_liked") {
    return n.groupCount > 1
      ? `${n.actorName} ועוד ${n.groupCount - 1} אנשים אהבו את ההשלמה שלך`
      : `לייק חדש להשלמה שלך מאת ${n.actorName}`
  }
  if (n.type === "sentence_completed") {
    return `השלמה חדשה למשפט שלך מאת ${n.actorName}`
  }
  return "ההשלמה שלך מובילה עכשיו"
}

function RowIcon({ type }: { type: Notification["type"] }) {
  if (type === "completion_leading") {
    return <Icon src={assets.iconCrown} size="sm" />
  }
  if (type === "sentence_completed") {
    return <Icon src={assets.iconChat} size="sm" className="opacity-70" />
  }
  return <Icon src={assets.iconHeartFilled} size="sm" />
}

export function NotificationRow({
  notification,
  onOpen,
}: NotificationRowProps) {
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
          <RowIcon type={n.type} />
        </span>

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-body-sm text-content-primary [overflow-wrap:anywhere]",
              !n.read && "font-medium",
            )}
          >
            <bdi>{primaryLine(n)}</bdi>
          </p>

          {n.type === "sentence_completed" ? (
            <div className="mt-1 flex flex-col gap-0.5 text-caption text-content-muted">
              <p className="truncate">
                <bdi>"{n.sentenceText}"</bdi>
              </p>
              <p className="truncate">
                <bdi>"{n.completionText}"</bdi>
              </p>
            </div>
          ) : (
            <p className="mt-1 truncate text-caption text-content-muted">
              <bdi>"{n.completionText}"</bdi>
            </p>
          )}

          <p className="mt-1 text-caption text-content-muted">
            {n.type === "completion_leading" ? (
              <>
                {n.likeCount} לייקים <span aria-hidden>·</span>{" "}
              </>
            ) : null}
            {relativeTime(n.createdAt)}
          </p>
        </div>

        {!n.read ? (
          <span
            aria-hidden
            className="mt-2 size-1.5 shrink-0 rounded-full bg-accent"
          />
        ) : null}
      </button>
    </li>
  )
}
