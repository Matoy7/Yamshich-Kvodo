import { LikeButton } from "./LikeButton"
import { relativeTime } from "@/lib/time"
import type { Completion } from "@/data/completions"

type CompletionRowProps = {
  completion: Completion
  avatar: string
  /** True when this row's last like write failed. */
  failed: boolean
  onToggleLike?: (completionId: string) => void
}

/**
 * The single layout every completion uses, in the popover and the sheet alike.
 *
 * Two things keep the rows on one grid no matter what they contain:
 *
 * 1. A fixed two-column grid — a 32px avatar track and a `minmax(0, 1fr)`
 *    content track. The content track can shrink below its intrinsic width, so
 *    an unbroken string wraps instead of widening the row and shifting the
 *    avatar.
 *
 * 2. No `dir="auto"` anywhere. That attribute resolves a paragraph's direction
 *    from its first strong character, which flipped Latin completions like
 *    "bbb" to LTR and pushed them to the left edge. Direction is inherited from
 *    the RTL document instead, and only the *characters* are isolated, with
 *    <bdi>, so mixed Hebrew/English still orders correctly without any power to
 *    move the row.
 */
export function CompletionRow({
  completion,
  avatar,
  failed,
  onToggleLike,
}: CompletionRowProps) {
  return (
    <li className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-3">
      <img
        src={avatar}
        alt=""
        aria-hidden
        width={32}
        height={32}
        className="size-8 rounded-full bg-surface-secondary object-cover"
      />

      <div className="min-w-0">
        {/* Metadata: always one line. The name gives way first, so the
            timestamp never wraps or shifts. */}
        <div className="flex min-w-0 items-baseline gap-1.5 text-label">
          <span className="truncate font-medium text-content-secondary">
            <bdi>{completion.author.name}</bdi>
          </span>
          <span aria-hidden className="shrink-0 text-content-muted">
            ·
          </span>
          <span className="shrink-0 text-caption text-content-muted">
            {relativeTime(completion.createdAt)}
          </span>
        </div>

        <p className="mt-2 text-start text-body text-content-primary [overflow-wrap:anywhere]">
          <bdi>{completion.text}</bdi>
        </p>

        {/* Absent entirely when like data could not be read, rather than shown
            as a control that cannot work. */}
        {completion.likes && onToggleLike ? (
          <div className="mt-2 flex items-center gap-2">
            <LikeButton
              liked={completion.likes.likedByMe}
              count={completion.likes.count}
              onToggle={() => onToggleLike(completion.id)}
            />
            {failed ? (
              <span role="status" className="text-caption text-danger">
                לא נשמר
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  )
}
