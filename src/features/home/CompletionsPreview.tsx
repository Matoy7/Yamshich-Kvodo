import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/Button"
import { CompletionsPanel } from "./CompletionsPanel"
import { useCompletions } from "./useCompletions"
import { cn } from "@/lib/cn"
import type { Sentence } from "@/data/sentences"

const WIDTH = 560
const MAX_HEIGHT = 660
const MARGIN = 12

type Placement = {
  top: number
  left: number
  above: boolean
}

/** Prefers above the card, flips below, and clamps inside the viewport. */
function place(anchor: DOMRect, height: number): Placement {
  const roomAbove = anchor.top - MARGIN * 2
  const roomBelow = window.innerHeight - anchor.bottom - MARGIN * 2
  const above =
    roomAbove >= Math.min(height, MAX_HEIGHT) || roomAbove >= roomBelow

  const top = above
    ? Math.max(MARGIN, anchor.top - height - MARGIN)
    : Math.min(window.innerHeight - height - MARGIN, anchor.bottom + MARGIN)

  // Centre on the card, then pull back inside whichever edge it would cross.
  const centred = anchor.left + anchor.width / 2 - WIDTH / 2
  const left = Math.min(
    Math.max(MARGIN, centred),
    window.innerWidth - WIDTH - MARGIN,
  )

  return { top: Math.max(MARGIN, top), left, above }
}

type PreviewProps = {
  sentence: Sentence
  authorName: string | null
  currentUserId: string | null
  anchor: HTMLElement
  onPointerEnter: () => void
  onPointerLeave: () => void
}

/**
 * Desktop hover preview: a floating, non-modal popover. The feed stays visible
 * and interactive behind it — no overlay, no scroll lock.
 */
export function CompletionsPreview({
  sentence,
  authorName,
  currentUserId,
  anchor,
  onPointerEnter,
  onPointerLeave,
}: PreviewProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState<Placement | null>(null)
  const { completions, loading, error, retry, likeError, toggleLike } =
    useCompletions(sentence.id, currentUserId)

  useLayoutEffect(() => {
    const reposition = () => {
      const height = Math.min(panelRef.current?.offsetHeight ?? 320, MAX_HEIGHT)
      setPlacement(place(anchor.getBoundingClientRect(), height))
    }

    reposition()
    window.addEventListener("scroll", reposition, true)
    window.addEventListener("resize", reposition)
    return () => {
      window.removeEventListener("scroll", reposition, true)
      window.removeEventListener("resize", reposition)
    }
  }, [anchor, completions, loading, error])

  useEffect(() => {
    // Re-measure once content lands so the flip decision uses the real height.
    const id = window.setTimeout(() => {
      const height = Math.min(panelRef.current?.offsetHeight ?? 320, MAX_HEIGHT)
      setPlacement(place(anchor.getBoundingClientRect(), height))
    }, 0)
    return () => window.clearTimeout(id)
  }, [anchor, completions])

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`השלמות עבור: ${sentence.text}`}
      data-completions-preview
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      style={{
        width: WIDTH,
        maxHeight: MAX_HEIGHT,
        top: placement?.top ?? -9999,
        left: placement?.left ?? -9999,
      }}
      className={cn(
        "fixed z-40 flex flex-col rounded-lg border border-border-subtle bg-surface px-6 py-5",
        "shadow-overlay transition-[opacity,transform] duration-150 ease-out",
        placement
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 scale-[0.98]",
        placement && !placement.above && "-translate-y-0.5",
      )}
    >
      {/* Invisible bridge across the gap, so the pointer can travel from the
          card into the popover without passing through dead space. */}
      <span
        aria-hidden
        className="absolute inset-x-0 h-3"
        style={placement?.above ? { bottom: -12 } : { top: -12 }}
      />

      <CompletionsPanel
        sentence={sentence}
        authorName={authorName}
        completions={completions}
        loading={loading}
        error={error}
        onRetry={retry}
        likeError={likeError}
        onToggleLike={currentUserId ? toggleLike : undefined}
      />
    </div>,
    document.body,
  )
}

type SheetProps = {
  sentence: Sentence
  authorName: string | null
  currentUserId: string | null
  onClose: () => void
}

/** Mobile bottom sheet: same content, tap-driven, swipe-down to dismiss. */
export function CompletionsSheet({
  sentence,
  authorName,
  currentUserId,
  onClose,
}: SheetProps) {
  const { completions, loading, error, retry, likeError, toggleLike } =
    useCompletions(sentence.id, currentUserId)
  const dragStart = useRef<number | null>(null)
  const [dragY, setDragY] = useState(0)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  return createPortal(
    <div>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-content-primary/35"
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`השלמות עבור: ${sentence.text}`}
        dir="rtl"
        style={{ transform: `translateY(${dragY}px)`, maxHeight: "85vh" }}
        onTouchStart={(event) => {
          dragStart.current = event.touches[0].clientY
        }}
        onTouchMove={(event) => {
          if (dragStart.current === null) return
          setDragY(Math.max(0, event.touches[0].clientY - dragStart.current))
        }}
        onTouchEnd={() => {
          if (dragY > 90) onClose()
          setDragY(0)
          dragStart.current = null
        }}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-lg border border-border-subtle",
          "bg-surface px-4 pb-6 pt-2 shadow-overlay",
        )}
      >
        <span
          aria-hidden
          className="mx-auto mb-3 block h-1 w-10 shrink-0 rounded-full bg-border-strong/50"
        />

        <CompletionsPanel
          sentence={sentence}
          authorName={authorName}
          completions={completions}
          loading={loading}
          error={error}
          onRetry={retry}
          likeError={likeError}
          onToggleLike={currentUserId ? toggleLike : undefined}
          footerExtra={
            <Button variant="secondary" size="md" fullWidth onClick={onClose}>
              סגור
            </Button>
          }
        />
      </div>
    </div>,
    document.body,
  )
}
