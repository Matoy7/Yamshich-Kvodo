import { useEffect, useState } from "react"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Icon } from "@/components/ui/Icon"
import { EmptyState } from "@/components/ui/EmptyState"
import { CompletionRow } from "./CompletionRow"
import { CompletionsSheet } from "./CompletionsPreview"
import { joinSentence } from "./CompletionsPanel"
import { useCompletions } from "./useCompletions"
import { useGeneratedAvatars } from "@/lib/avatar"
import { assets } from "@/lib/assets"
import { relativeTime } from "@/lib/time"
import { fetchSentenceById, type Sentence } from "@/data/sentences"
import { fetchAuthors } from "@/data/completions"
import { clearDeepLink } from "@/lib/deepLink"

type SharedCompletionViewProps = {
  sentenceId: string
  completionId: string
  currentUserId: string | null
  onComplete: (sentence: Sentence) => void
  /** Called once the person is done and returns to the ordinary feed. */
  onLeave: () => void
}

/**
 * What a shared link opens onto: the exact sentence and the exact completion
 * someone shared — pinned by id, not "whichever currently leads". If ranking
 * moves on, this keeps showing the same completion the link always pointed
 * to, per the product rule that a shared link never goes stale.
 *
 * Reuses useCompletions rather than a one-off fetch: it already carries the
 * tested optimistic like-toggle behaviour, and the pinned completion is
 * simply picked out of the same ranked list every other view already loads.
 */
export function SharedCompletionView({
  sentenceId,
  completionId,
  currentUserId,
  onComplete,
  onLeave,
}: SharedCompletionViewProps) {
  const [sentence, setSentence] = useState<Sentence | null | undefined>(
    undefined,
  )
  const [sentenceAuthorName, setSentenceAuthorName] = useState<string | null>(
    null,
  )
  const [browseAll, setBrowseAll] = useState(false)

  useEffect(() => {
    let active = true
    fetchSentenceById(sentenceId)
      .then(async (found) => {
        if (!active) return
        setSentence(found)
        if (found) {
          const authors = await fetchAuthors([found.authorId]).catch(
            () => new Map(),
          )
          if (active) {
            const author = authors.get(found.authorId)
            setSentenceAuthorName(
              author?.display_name?.trim() ||
                author?.first_name?.trim() ||
                null,
            )
          }
        }
      })
      .catch(() => {
        if (active) setSentence(null)
      })
    return () => {
      active = false
    }
  }, [sentenceId])

  const {
    completions,
    loading: completionsLoading,
    error: completionsError,
    toggleLike,
    likeError,
  } = useCompletions(sentence ? sentenceId : null, currentUserId)

  const completion = completions?.find((c) => c.id === completionId) ?? null

  const needsAvatar =
    completion && !completion.author.avatarUrl ? [completion.author.id] : []
  const generated = useGeneratedAvatars(needsAvatar)
  const avatar =
    completion?.author.avatarUrl ??
    (completion ? generated[completion.author.id] : undefined) ??
    assets.profileAvatar

  const loading =
    sentence === undefined || (sentence && completionsLoading && !completions)
  const notFound =
    sentence === null ||
    (sentence && completions && !completionsLoading && !completion)

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => {
          clearDeepLink()
          onLeave()
        }}
        className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1.5 text-body-sm font-medium text-content-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-content-primary"
      >
        <Icon
          src={assets.iconChevronStart}
          size="xs"
          className="rotate-180 opacity-70"
        />
        לעמוד הבית
      </button>

      {loading ? (
        <Card className="h-[220px] w-full animate-pulse" aria-busy="true">
          <span className="sr-only">טוען</span>
        </Card>
      ) : notFound || !sentence || !completion ? (
        <EmptyState
          title="התוכן שחיפשת כבר לא קיים"
          description="ייתכן שהמשפט או ההשלמה הוסרו."
        />
      ) : (
        <Card as="article" className="flex w-full flex-col">
          <div className="flex items-start justify-between gap-3">
            <Icon src={assets.iconQuote} size="lg" className="opacity-70" />
          </div>

          <p
            dir="auto"
            className="mt-3 text-quote font-medium text-content-primary [word-break:break-word]"
          >
            {sentence.text}...
          </p>

          {sentenceAuthorName ? (
            <p className="mt-1 text-body-sm text-content-muted">
              נכתב על ידי <bdi>{sentenceAuthorName}</bdi>
            </p>
          ) : null}

          <p className="mt-4 text-start text-label font-medium text-content-muted">
            ההשלמה ששותפה
          </p>
          <ul className="mt-1 divide-y divide-border-subtle border-t border-border-subtle">
            <CompletionRow
              completion={completion}
              fullText={joinSentence(sentence.text, completion.text)}
              avatar={avatar}
              failed={likeError === completion.id}
              onToggleLike={currentUserId ? toggleLike : undefined}
              className="py-4"
            />
          </ul>

          {completionsError ? (
            <p className="mt-2 text-body-sm text-content-secondary">
              לא הצלחנו לטעון את מצב הלייקים העדכני.
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-subtle pt-4">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onComplete(sentence)}
            >
              השלם בעצמך
            </Button>

            <button
              type="button"
              onClick={() => setBrowseAll(true)}
              className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-body-sm font-medium text-content-secondary shadow-card transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover hover:text-content-primary active:bg-surface-muted"
            >
              לצפייה בכל ההשלמות
            </button>
          </div>
        </Card>
      )}

      {browseAll && sentence ? (
        <CompletionsSheet
          sentence={sentence}
          authorName={sentenceAuthorName}
          currentUserId={currentUserId}
          onClose={() => setBrowseAll(false)}
        />
      ) : null}
    </div>
  )
}
