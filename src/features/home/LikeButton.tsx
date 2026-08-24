import { useEffect, useRef, useState } from "react"
import { Icon } from "@/components/ui/Icon"
import { cn } from "@/lib/cn"
import { assets } from "@/lib/assets"

type LikeButtonProps = {
  liked: boolean
  count: number
  disabled?: boolean
  onToggle: () => void
}

/**
 * Secondary metadata, not a call to action: it reads as part of the row's
 * caption line and only gains weight once it is active.
 *
 * The two hearts are stacked and cross-faded because project icons render as
 * <img> with their colour baked in, so a single element cannot go from muted
 * outline to accent fill.
 */
export function LikeButton({
  liked,
  count,
  disabled = false,
  onToggle,
}: LikeButtonProps) {
  const [pop, setPop] = useState(false)
  const previous = useRef(liked)

  useEffect(() => {
    // Only celebrate the like, never the un-like, and never the initial paint.
    if (liked && !previous.current) {
      setPop(true)
      const id = window.setTimeout(() => setPop(false), 240)
      previous.current = liked
      return () => window.clearTimeout(id)
    }
    previous.current = liked
  }, [liked])

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={liked}
      aria-label={liked ? "הסר לייק מההשלמה" : "אהבתי את ההשלמה"}
      onClick={(event) => {
        // The control lives inside a hover popover and a tap-dismissed sheet;
        // neither may close because a like was registered.
        event.preventDefault()
        event.stopPropagation()
        onToggle()
      }}
      className={cn(
        // Negative margin keeps the generous touch target from disturbing the
        // caption line it sits on: comfortably past 44px tall, visually compact.
        "group -my-2 -ms-2 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 py-2",
        "text-label transition-colors duration-150 select-none",
        liked ? "text-accent" : "text-content-muted",
        // Scoped to real hover devices only — never fires on touch, so a tap
        // never leaves the row looking "stuck" in a hover state. The liked
        // state is already at full accent strength, so the icon scale below
        // (shared with both states) is its only extra hover emphasis.
        !liked &&
          "[@media(hover:hover)_and_(pointer:fine)]:hover:text-content-secondary",
        "disabled:pointer-events-none disabled:opacity-45",
      )}
    >
      {/* Count first in the DOM so that, in RTL, it renders to the right of
          the heart — the heart sitting at the far inline end, as in the
          reference. A zero reads as a verdict on the completion, so it stays
          unwritten until someone has actually liked it; the slot keeps its
          width so the row does not shift when the first like arrives. */}
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
            liked ? "scale-90 opacity-0" : "scale-100 opacity-100",
          )}
        />
        <Icon
          src={assets.iconHeartFilled}
          size="sm"
          className={cn(
            "absolute transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
            liked ? "scale-100 opacity-100" : "scale-50 opacity-0",
          )}
        />
      </span>
    </button>
  )
}
