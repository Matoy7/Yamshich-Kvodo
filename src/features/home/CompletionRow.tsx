import { LikeButton } from "./LikeButton"
import { Icon } from "@/components/ui/Icon"
import { assets } from "@/lib/assets"
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
  /** The completion currently ahead by likes (ties → newest). Gets a small
   *  crown and slightly stronger weight — never a different size, a banner,
   *  or a "winner" label. */
  leading?: boolean
}

/**
 * One of the ways people finished the sentence — the leading one and every
 * other one share this exact row, so the list never reads as "the answer,
 * then some replies".
 *
 * Three fixed tracks — avatar, content, like — so nothing moves horizontally
 * because a completion is short, long, Hebrew or English. The content track is
 * `minmax(0, 1fr)`, which lets it shrink below its intrinsic width so an
 * unbroken string wraps instead of widening the row and shifting the avatar.
 * The like control sits in its own track at the row's inline end, so it
 * always visually belongs to the row it sits in rather than floating free.
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
  leading = false,
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
        <p
          className={cn(
            "flex items-start gap-1.5 text-start text-card-title text-content-primary [overflow-wrap:anywhere]",
            leading ? "font-semibold" : "font-medium",
          )}
        >
          {leading ? (
            <Icon
              src={assets.iconCrown}
              size="xs"
              className="mt-1 shrink-0"
              label="ההשלמה המובילה כרגע"
            />
          ) : null}
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
