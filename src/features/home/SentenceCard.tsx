import { useEffect, useRef, useState } from "react"
import { Card, CardFooter } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Icon } from "@/components/ui/Icon"
import { CompletionsPreview, CompletionsSheet } from "./CompletionsPreview"
import { assets } from "@/lib/assets"
import type { Sentence } from "@/data/sentences"
import type { LeadingCompletion } from "@/data/completions"

type SentenceCardProps = {
  sentence: Sentence
  completed: boolean
  own: boolean
  authorName: string | null
  currentUserId: string
  /** The completion currently leading by likes (ties → newest), if any. */
  leadingCompletion?: LeadingCompletion | null
  onComplete: (sentence: Sentence) => void
  /** Fires once a like commits inside this card's popover/sheet, so the
   *  feed can refresh which completion leads. */
  onLikeChange?: (sentenceId: string) => void
}

/** Popover on a real desktop pointer; a touch-friendly sheet everywhere else. */
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

/**
 * Hebrew completion-count label, grammatically correct at every count.
 * Never hardcode "3" — the number always comes from the real count.
 */
function completionsLabel(count: number): string {
  if (count === 0) return "0 השלמות"
  if (count === 1) return "השלמה אחת"
  return `${count} השלמות`
}

export function SentenceCard({
  sentence,
  completed,
  own,
  authorName,
  currentUserId,
  leadingCompletion,
  onComplete,
  onLikeChange,
}: SentenceCardProps) {
  const disabled = completed || own
  const label = completed ? "הושלם" : own ? "שלך" : "השלם"

  const hoverCapable = useHoverCapable()
  const cardRef = useRef<HTMLElement>(null)
  const [open, setOpen] = useState(false)

  // The card is a single wide click target; the completions button is a
  // second, distinct one that opens the popover (desktop) or sheet (mobile).
  // Neither can be triggered by merely moving the pointer across the card.
  const openCompletions = () => setOpen(true)
  const closeCompletions = () => setOpen(false)

  return (
    <>
      <Card
        as="article"
        interactive
        ref={cardRef}
        className="flex h-full w-full flex-col"
      >
        {/* The quote mark keeps its place; the indicator sits opposite it and
            is absent on the overwhelming majority of cards. Thresholds live in
            the database (see supabase/2026-08-trending.sql) so "hot" means the
            same thing everywhere. */}
        <div className="flex items-start justify-between gap-3">
          <Icon src={assets.iconQuote} size="lg" className="opacity-70" />
          {sentence.isTrending ? (
            <Badge variant="accent">🔥 חם עכשיו</Badge>
          ) : sentence.isRising ? (
            <Badge variant="neutral">↑ עולה עכשיו</Badge>
          ) : null}
        </div>

        <p
          dir="auto"
          className="mt-3 text-quote font-medium text-content-primary [word-break:break-word]"
        >
          {sentence.text}...
        </p>

        {/* The current leader by likes — plain text, one muted line, no
            count and no label. It previews *what* people are completing this
            with, not a ranking; the popover is where ranking becomes visible. */}
        {leadingCompletion ? (
          <p
            dir="auto"
            className="mt-2 flex-1 text-body text-content-secondary [word-break:break-word] line-clamp-2"
          >
            {leadingCompletion.text}
          </p>
        ) : (
          <div className="flex-1" />
        )}

        {/* Action sits at the inline start (right in RTL): "השלם" is the
            strongest control on the card. The completions button sits at the
            inline end — clearly clickable, clearly lighter, never mistaken
            for the primary CTA. Only an intentional click/tap on it opens
            anything; nothing here reacts to hover. */}
        <CardFooter className="mt-4 border-t border-border-subtle">
          <Button
            variant="primary"
            size="sm"
            disabled={disabled}
            onClick={() => onComplete(sentence)}
          >
            {label}
          </Button>

          <button
            type="button"
            data-completions-trigger
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-label={`צפה ב${completionsLabel(sentence.completionsCount)}`}
            onClick={openCompletions}
            className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-body-sm font-medium text-content-secondary shadow-card transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover hover:text-content-primary active:bg-surface-muted"
          >
            <Icon src={assets.iconPerson} size="xs" />
            {completionsLabel(sentence.completionsCount)}
            <Icon
              src={assets.iconChevronStart}
              size="xs"
              className="opacity-70"
            />
          </button>
        </CardFooter>
      </Card>

      {open && cardRef.current ? (
        hoverCapable ? (
          <CompletionsPreview
            sentence={sentence}
            authorName={authorName}
            currentUserId={currentUserId}
            anchor={cardRef.current}
            onClose={closeCompletions}
            onLikeChange={() => onLikeChange?.(sentence.id)}
          />
        ) : (
          <CompletionsSheet
            sentence={sentence}
            authorName={authorName}
            currentUserId={currentUserId}
            onClose={closeCompletions}
            onLikeChange={() => onLikeChange?.(sentence.id)}
          />
        )
      ) : null}
    </>
  )
}
