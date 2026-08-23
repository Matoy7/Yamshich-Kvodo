import { LikeButton } from "./LikeButton"
import { cn } from "@/lib/cn"
import { relativeTime } from "@/lib/time"
import type { Completion } from "@/data/completions"

type CompletionRowProps = {
  completion: Completion
  /** Opener spliced onto the ending, so each row reads as a whole sentence. */
  fullText: string
  avatar: string
  /** Separator and spacing supplied by the list that owns the rhythm. */
  className?: string
  /** True when this row's last like write failed. */
  failed: boolean
  onToggleLike?: (completionId: string) => void
}

/**
 * One of the other ways people finished the sentence.
 *
 * Three fixed tracks — avatar, content, like — so nothing moves horizontally
 * because a completion is short, long, Hebrew or English. The content track is
 * `minmax(0, 1fr)`, which lets it shrink below its intrinsic width so an
 * unbroken string wraps instead of widening the row and shifting the avatar.
 *
 * The finished sentence leads and the attribution sits under it: these are
 * different endings to one sentence, not replies to a post.
 *
 * No `dir="auto"` anywhere. That attribute resolves direction from the first
 * strong character, which flipped Latin completions like "bbb" to LTR and
 * pushed them to the left edge. Direction is inherited from the RTL document,
 * and only the characters are isolated, with <bdi>.
 */
export function CompletionRow({
  completion,
  fullText,
  avatar,
  className,
  failed,
  onToggleLike,
}: CompletionRowProps) {
  return (
    <li
      className={cn(
        "grid grid-cols-[2rem_minmax(0,1fr)_auto] items-start gap-x-3",
        className,
      )}
    >
      <img
        src={avatar}
        alt=""
        aria-hidden
        width={32}
        height={32}
        className="size-8 rounded-full bg-surface-secondary object-cover"
      />

      <div className="min-w-0">
        <p className="text-start text-card-title font-medium text-content-primary [overflow-wrap:anywhere]">
          <bdi>{fullText}</bdi>
        </p>

        <div className="mt-1 flex min-w-0 items-baseline gap-1.5 text-body-sm text-content-muted">
          <span className="truncate">
            <bdi>{completion.author.name}</bdi>
          </span>
          <span aria-hidden className="shrink-0">
            •
          </span>
          <span className="shrink-0">{relativeTime(completion.createdAt)}</span>
        </div>
      </div>

      {/* Absent entirely when like data could not be read, rather than shown
          as a control that cannot work. */}
      {completion.likes && onToggleLike ? (
        <div className="flex shrink-0 items-center gap-2">
          {failed ? (
            <span role="status" className="text-caption text-danger">
              לא נשמר
            </span>
          ) : null}
          <LikeButton
            liked={completion.likes.likedByMe}
            count={completion.likes.count}
            onToggle={() => onToggleLike(completion.id)}
          />
        </div>
      ) : null}
    </li>
  )
}
