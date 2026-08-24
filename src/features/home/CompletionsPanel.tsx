import { useState } from "react"
import { Icon } from "@/components/ui/Icon"
import { IconButton } from "@/components/ui/IconButton"
import { Button } from "@/components/ui/Button"
import { CompletionRow } from "./CompletionRow"
import { useGeneratedAvatars } from "@/lib/avatar"
import { relativeTime } from "@/lib/time"
import { assets } from "@/lib/assets"
import type { Completion } from "@/data/completions"
import type { Sentence } from "@/data/sentences"

type PanelProps = {
  sentence: Sentence
  authorName: string | null
  completions: Completion[] | null
  loading: boolean
  error: boolean
  onRetry: () => void
  /** Completion id whose last like write failed, if any. */
  likeError?: string | null
  /** Omitted when there is no signed-in user to attribute a like to. */
  onToggleLike?: (completionId: string) => void
  onClose: () => void
}

/** How many of the remaining completions are shown before "view all". */
const SECONDARY_LIMIT = 3

/** Single-letter Hebrew particles that attach directly to the next word. */
const ATTACHING_PREFIXES = new Set(["ו", "ב", "כ", "ל", "מ", "ש", "ה"])

/**
 * Joins an opener to its ending so the two read as one sentence.
 *
 * An opener ending in a lone particle — "זה ניסיון ל" — runs straight into its
 * ending, giving "זה ניסיון לנסח". Anything else takes a space, so
 * "בא לי לאכול היום" + "מה שאמא מבשלת" does not collide into one word.
 */
export function joinSentence(opener: string, ending: string): string {
  const head = opener.trim()
  const tail = ending.trim()
  if (!head) return tail
  if (!tail) return head

  const lastWord = head.split(/\s+/).pop() ?? ""
  const glue = ATTACHING_PREFIXES.has(lastWord) ? "" : " "
  return `${head}${glue}${tail}`
}

function Skeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      aria-busy="true"
      aria-label="טוען השלמות"
    >
      <div className="h-10 w-4/5 animate-pulse rounded-lg bg-surface-hover" />
      <div className="h-10 w-3/5 animate-pulse rounded-lg bg-surface-hover" />
      <div className="flex gap-3">
        <div className="size-8 shrink-0 animate-pulse rounded-full bg-surface-hover" />
        <div className="h-4 w-32 animate-pulse rounded-full bg-surface-hover" />
      </div>
    </div>
  )
}

/** Matches Modal's close glyph, so every dismiss control in the app looks the same. */
function CloseGlyph() {
  return (
    <span aria-hidden className="relative block size-4">
      <span className="absolute inset-x-0 top-1/2 block h-0.5 rotate-45 rounded-full bg-content-secondary" />
      <span className="absolute inset-x-0 top-1/2 block h-0.5 -rotate-45 rounded-full bg-content-secondary" />
    </span>
  )
}

/**
 * Shared content for both presentations: the desktop popover and the mobile
 * sheet render exactly the same thing.
 *
 * The shape is deliberately not a comment thread: "איך השלימו אותו?" frames
 * every completion below it — including the leading one — as one of several
 * answers to the same sentence, all in the same row shape and the same
 * typography. The leading completion is distinguished only by a small crown
 * and a touch more weight, never by a different size, a card of its own, or
 * a "winner" label.
 */
export function CompletionsPanel({
  sentence,
  authorName,
  completions,
  loading,
  error,
  onRetry,
  likeError,
  onToggleLike,
  onClose,
}: PanelProps) {
  const [expanded, setExpanded] = useState(false)

  const needsAvatar = (completions ?? [])
    .filter((completion) => !completion.author.avatarUrl)
    .map((completion) => completion.author.id)
  const generated = useGeneratedAvatars(needsAvatar)

  const avatarFor = (completion: Completion) =>
    completion.author.avatarUrl ??
    generated[completion.author.id] ??
    assets.profileAvatar

  const count = completions?.length ?? sentence.completionsCount

  // The list arrives ranked likes DESC, created_at DESC (see
  // data/completions.ts → rankCompletions); the leading completion is
  // therefore always first.
  const [leading, ...rest] = completions ?? []
  const visibleRest = expanded ? rest : rest.slice(0, SECONDARY_LIMIT)
  const hiddenCount = rest.length - visibleRest.length

  return (
    <div className="flex max-h-full min-h-0 flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border-subtle pb-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-start text-section-title font-semibold text-content-primary">
            <bdi>{sentence.text}</bdi>...
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-content-muted">
            {authorName ? (
              <span>
                נכתב על ידי <bdi>{authorName}</bdi>
              </span>
            ) : null}
            <span aria-hidden>•</span>
            <span>{relativeTime(sentence.createdAt)}</span>
          </div>
          <span className="mt-0.5 inline-flex items-center gap-1.5 text-body-sm text-content-muted">
            <Icon src={assets.iconPerson} size="xs" />
            {count} השלמות
          </span>
        </div>

        <IconButton
          label="סגירה"
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="-me-1 -mt-1 shrink-0"
        >
          <CloseGlyph />
        </IconButton>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && !completions ? (
          <div className="py-5">
            <Skeleton />
          </div>
        ) : error ? (
          <div className="flex flex-col items-start gap-2 py-5">
            <p className="text-body-sm text-content-secondary">
              לא הצלחנו לטעון את ההשלמות
            </p>
            <Button variant="ghost" size="sm" onClick={onRetry}>
              נסה שוב
            </Button>
          </div>
        ) : !leading ? (
          <div className="flex flex-col gap-1 py-6">
            <p className="text-card-title font-medium text-content-primary">
              עדיין אין השלמות
            </p>
            <p className="text-body text-content-muted">
              היה הראשון להשלים את המשפט
            </p>
          </div>
        ) : (
          <>
            {/* "How did they complete it?" — not "comments", not "replies":
                every row beneath this is a different answer to the sentence
                above, the leading one included. */}
            <p className="pb-2 pt-4 text-start text-label font-medium text-content-muted">
              איך השלימו אותו?
            </p>

            <ul className="divide-y divide-border-subtle">
              <CompletionRow
                key={leading.id}
                completion={leading}
                fullText={joinSentence(sentence.text, leading.text)}
                avatar={avatarFor(leading)}
                failed={likeError === leading.id}
                onToggleLike={onToggleLike}
                leading
                className="py-4"
              />
              {visibleRest.map((completion) => (
                <CompletionRow
                  key={completion.id}
                  completion={completion}
                  fullText={joinSentence(sentence.text, completion.text)}
                  avatar={avatarFor(completion)}
                  failed={likeError === completion.id}
                  onToggleLike={onToggleLike}
                  className="py-4"
                />
              ))}
            </ul>
          </>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      {hiddenCount > 0 ? (
        <div className="shrink-0 border-t border-border-subtle pt-3">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              setExpanded(true)
            }}
            className="-mx-2 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md px-2 text-body-sm font-medium text-accent transition-colors duration-150 hover:bg-surface-muted"
          >
            הצג את כל ההשלמות
            <Icon
              src={assets.iconChevronStart}
              size="sm"
              className="opacity-70"
            />
          </button>
        </div>
      ) : null}
    </div>
  )
}
