import { useEffect, useRef, useState } from "react"
import { Icon } from "@/components/ui/Icon"
import { cn } from "@/lib/cn"
import { assets } from "@/lib/assets"

type VoteButtonProps = {
  voted: boolean
  count: number
  disabled?: boolean
  onToggle: () => void
}

/**
 * Adapted from features/home/LikeButton.tsx unchanged in visual language —
 * same stacked/cross-faded hearts, same pop animation, same 44px+ touch
 * target. Only the vocabulary changed: a "vote" here is scoped to whichever
 * family is currently active, decided by the caller (see votes.ts) — this
 * component itself only knows liked vs. not, exactly as before.
 */
export function VoteButton({
  voted,
  count,
  disabled = false,
  onToggle,
}: VoteButtonProps) {
  const [pop, setPop] = useState(false)
  const previous = useRef(voted)

  useEffect(() => {
    if (voted && !previous.current) {
      setPop(true)
      const id = window.setTimeout(() => setPop(false), 240)
      previous.current = voted
      return () => window.clearTimeout(id)
    }
    previous.current = voted
  }, [voted])

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={voted}
      aria-label={voted ? "הסר הצבעה מהשם" : "הצביעו לשם הזה"}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onToggle()
      }}
      className={cn(
        "group -my-2 -ms-2 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 py-2",
        "text-label transition-colors duration-150 select-none",
        voted ? "text-accent" : "text-content-muted",
        !voted &&
          "[@media(hover:hover)_and_(pointer:fine)]:hover:text-content-secondary",
        "disabled:pointer-events-none disabled:opacity-45",
      )}
    >
      <span
        className="min-w-2 text-start tabular-nums"
        aria-hidden={count === 0}
      >
        {count > 0 ? count : ""}
      </span>

      <span
        className={cn(
          "relative inline-flex size-4 shrink-0 items-center justify-center transition-transform duration-200 ease-out",
          "[@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-110",
          pop && "animate-like-pop",
        )}
      >
        <Icon
          src={assets.iconHeart}
          size="sm"
          className={cn(
            "absolute transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
            voted ? "scale-90 opacity-0" : "scale-100 opacity-100",
          )}
        />
        <Icon
          src={assets.iconHeartFilled}
          size="sm"
          className={cn(
            "absolute transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
            voted ? "scale-100 opacity-100" : "scale-50 opacity-0",
          )}
        />
      </span>
    </button>
  )
}
