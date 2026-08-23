import { useState } from "react"
import { Icon } from "@/components/ui/Icon"
import { Button } from "@/components/ui/Button"
import { CompletionRow } from "./CompletionRow"
import { LikeButton } from "./LikeButton"
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
  /** Rendered as the sheet's dismiss control; omitted on the desktop popover. */
  footerExtra?: React.ReactNode
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

/**
 * Shared content for both presentations: the desktop popover and the mobile
 * sheet render exactly the same thing.
 *
 * The shape is deliberately not a comment thread. One completion is promoted
 * and shown spliced onto the opener as a single continuous sentence in one
 * colour and one weight, so the first thing read is the finished thought
 * rather than a list of replies. The rest follow underneath as clearly
 * subordinate entries.
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
  footerExtra,
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

  // The list arrives newest first; the newest ending is the one promoted.
  const [main, ...rest] = completions ?? []
  const visibleRest = expanded ? rest : rest.slice(0, SECONDARY_LIMIT)
  const hiddenCount = rest.length - visibleRest.length

  return (
    <div className="flex max-h-full min-h-0 flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 flex-col gap-1.5 border-b border-border-subtle pb-4">
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

      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
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
        ) : !main ? (
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
            {/* ── The completed sentence ───────────────────────────────── */}
            <div className="py-5 sm:py-6">
              {/* One colour, one weight, one sentence. Nothing here marks
                  where the opener stops and the ending begins — that seam is
                  exactly what would turn this back into a reply. */}
              <p className="text-start text-quote font-semibold text-content-primary sm:text-hero-quote [overflow-wrap:anywhere]">
                <bdi>{joinSentence(sentence.text, main.text)}</bdi>
              </p>

              <div className="mt-5 flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <img
                    src={avatarFor(main)}
                    alt=""
                    aria-hidden
                    width={32}
                    height={32}
                    className="size-8 shrink-0 rounded-full bg-surface-secondary object-cover"
                  />
                  <div className="flex min-w-0 items-center gap-1.5 text-body-sm">
                    <span className="truncate font-medium text-content-secondary">
                      <bdi>{main.author.name}</bdi>
                    </span>
                    <span aria-hidden className="shrink-0 text-content-muted">
                      •
                    </span>
                    <span className="shrink-0 text-content-muted">
                      {relativeTime(main.createdAt)}
                    </span>
                  </div>
                </div>

                {main.likes && onToggleLike ? (
                  <div className="flex shrink-0 items-center gap-2">
                    {likeError === main.id ? (
                      <span role="status" className="text-caption text-danger">
                        לא נשמר
                      </span>
                    ) : null}
                    <LikeButton
                      liked={main.likes.likedByMe}
                      count={main.likes.count}
                      onToggle={() => onToggleLike(main.id)}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            {/* ── The other ways people finished it ────────────────────── */}
            {/* No section heading: the reference runs straight from the
                promoted sentence into the alternatives, separated only by
                hairlines. A heading here would reintroduce the "main post,
                then replies" reading the redesign is meant to remove. */}
            {rest.length > 0 ? (
              <ul className="flex flex-col">
                {visibleRest.map((completion) => (
                  <CompletionRow
                    key={completion.id}
                    completion={completion}
                    fullText={joinSentence(sentence.text, completion.text)}
                    avatar={avatarFor(completion)}
                    failed={likeError === completion.id}
                    onToggleLike={onToggleLike}
                    className="border-t border-border-subtle py-5"
                  />
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      {hiddenCount > 0 || footerExtra ? (
        <div className="flex shrink-0 flex-col gap-2 border-t border-border-subtle pt-3">
          {hiddenCount > 0 ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setExpanded(true)
              }}
              className="-mx-2 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-2 text-body-sm font-medium text-accent transition-colors duration-150 hover:bg-surface-muted"
            >
              צפה בכל {count} ההשלמות
              <Icon
                src={assets.iconChevronStart}
                size="sm"
                className="opacity-70"
              />
            </button>
          ) : null}
          {footerExtra}
        </div>
      ) : null}
    </div>
  )
}
