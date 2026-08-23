import { useEffect, useRef, useState } from "react"
import { Card, CardFooter } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Icon } from "@/components/ui/Icon"
import { CompletionsPreview, CompletionsSheet } from "./CompletionsPreview"
import { assets } from "@/lib/assets"
import type { Sentence } from "@/data/sentences"

/** Long enough that skimming the feed never fires a request. */
const OPEN_DELAY = 200
/** Grace period so the pointer can travel from card to popover. */
const CLOSE_DELAY = 140

type SentenceCardProps = {
  sentence: Sentence
  completed: boolean
  own: boolean
  authorName: string | null
  currentUserId: string
  onComplete: (sentence: Sentence) => void
}

/** Hover previews only where hovering is real; tap opens a sheet elsewhere. */
function useHoverCapable(): boolean {
  const [capable, setCapable] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia(
        "(min-width: 768px) and (hover: hover) and (pointer: fine)",
      ).matches,
  )

  useEffect(() => {
    const query = window.matchMedia(
      "(min-width: 768px) and (hover: hover) and (pointer: fine)",
    )
    const sync = () => setCapable(query.matches)
    sync()
    query.addEventListener("change", sync)
    return () => query.removeEventListener("change", sync)
  }, [])

  return capable
}

export function SentenceCard({
  sentence,
  completed,
  own,
  authorName,
  currentUserId,
  onComplete,
}: SentenceCardProps) {
  const disabled = completed || own
  const label = completed ? "הושלם" : own ? "שלך" : "השלם"

  const hoverCapable = useHoverCapable()
  const cardRef = useRef<HTMLElement>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const openTimer = useRef<number | null>(null)
  const closeTimer = useRef<number | null>(null)

  const clearTimers = () => {
    if (openTimer.current) window.clearTimeout(openTimer.current)
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    openTimer.current = null
    closeTimer.current = null
  }

  useEffect(() => clearTimers, [])

  // Close the preview if the pointer never returns and the user clicks away.
  useEffect(() => {
    if (!previewOpen) return
    const onDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (cardRef.current?.contains(target)) return
      // The preview is portalled to <body>, so it is not inside the card —
      // without this, clicking "נסה שוב" inside it would close the preview.
      if (target.closest?.("[data-completions-preview]")) return
      setPreviewOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [previewOpen])

  const scheduleOpen = () => {
    if (!hoverCapable) return
    clearTimers()
    openTimer.current = window.setTimeout(
      () => setPreviewOpen(true),
      OPEN_DELAY,
    )
  }

  const scheduleClose = () => {
    if (!hoverCapable) return
    clearTimers()
    closeTimer.current = window.setTimeout(
      () => setPreviewOpen(false),
      CLOSE_DELAY,
    )
  }

  const cancelClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = null
  }

  return (
    <>
      <Card
        as="article"
        interactive
        ref={cardRef}
        className="flex h-full w-full flex-col"
        onPointerEnter={scheduleOpen}
        onPointerLeave={scheduleClose}
        onClick={(event) => {
          // The primary action keeps working untouched; only taps on the card
          // body open the sheet, and only where hover is unavailable.
          if (hoverCapable) return
          if ((event.target as HTMLElement).closest("button")) return
          setSheetOpen(true)
        }}
      >
        <Icon src={assets.iconQuote} size="lg" className="opacity-70" />

        <p
          dir="auto"
          className="mt-3 flex-1 text-quote font-medium text-content-primary [word-break:break-word]"
        >
          {sentence.text}...
        </p>

        {/* Action sits at the inline start (right in RTL); the completions
            count at the inline end. */}
        <CardFooter className="mt-4 border-t border-border-subtle">
          <Button
            variant="primary"
            size="sm"
            disabled={disabled}
            onClick={() => onComplete(sentence)}
          >
            {label}
          </Button>

          <Badge
            variant="neutral"
            iconStart={<Icon src={assets.iconPerson} size="xs" />}
          >
            השלמות {sentence.completionsCount}
          </Badge>
        </CardFooter>
      </Card>

      {previewOpen && cardRef.current ? (
        <CompletionsPreview
          sentence={sentence}
          authorName={authorName}
          currentUserId={currentUserId}
          anchor={cardRef.current}
          onPointerEnter={cancelClose}
          onPointerLeave={scheduleClose}
        />
      ) : null}

      {sheetOpen ? (
        <CompletionsSheet
          sentence={sentence}
          authorName={authorName}
          currentUserId={currentUserId}
          onClose={() => setSheetOpen(false)}
        />
      ) : null}
    </>
  )
}
