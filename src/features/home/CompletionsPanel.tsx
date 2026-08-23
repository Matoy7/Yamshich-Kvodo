import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { useGeneratedAvatars } from '@/lib/avatar'
import { relativeTime } from '@/lib/time'
import { assets } from '@/lib/assets'
import type { Completion } from '@/data/completions'
import type { Sentence } from '@/data/sentences'

type PanelProps = {
  sentence: Sentence
  authorName: string | null
  completions: Completion[] | null
  loading: boolean
  error: boolean
  onRetry: () => void
  /** Rendered as the sheet's dismiss control; omitted on the desktop popover. */
  footerExtra?: React.ReactNode
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="טוען השלמות">
      {[0, 1].map((row) => (
        <div key={row} className="flex gap-3">
          <div className="size-8 shrink-0 animate-pulse rounded-full bg-surface-hover" />
          <div className="flex flex-1 flex-col gap-2 pt-1">
            <div className="h-3 w-24 animate-pulse rounded-full bg-surface-hover" />
            <div className="h-3 w-full animate-pulse rounded-full bg-surface-hover" />
          </div>
        </div>
      ))}
    </div>
  )
}

function CompletionRow({ completion, avatar }: { completion: Completion; avatar: string }) {
  return (
    <li className="flex gap-3">
      <img
        src={avatar}
        alt=""
        aria-hidden
        width={32}
        height={32}
        className="size-8 shrink-0 rounded-full bg-surface-secondary object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-label font-medium text-content-secondary">
            {completion.author.name}
          </span>
          <span className="shrink-0 text-caption text-content-muted">
            {relativeTime(completion.createdAt)}
          </span>
        </div>
        <p dir="auto" className="text-body text-content-primary [overflow-wrap:anywhere]">
          {completion.text}
        </p>
      </div>
    </li>
  )
}

/**
 * Shared content for both presentations: the desktop popover and the mobile
 * sheet render exactly the same header, list and states.
 */
export function CompletionsPanel({
  sentence,
  authorName,
  completions,
  loading,
  error,
  onRetry,
  footerExtra,
}: PanelProps) {
  const needsAvatar = (completions ?? [])
    .filter((completion) => !completion.author.avatarUrl)
    .map((completion) => completion.author.id)
  const generated = useGeneratedAvatars(needsAvatar)

  const count = completions?.length ?? sentence.completionsCount

  return (
    <div className="flex max-h-full min-h-0 flex-col">
      {/* Header stays put while the list scrolls. */}
      <div className="flex shrink-0 flex-col gap-2 border-b border-border-subtle pb-3">
        <p dir="auto" className="text-card-title font-medium text-content-primary">
          {sentence.text}...
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-content-muted">
          {authorName ? <span>נכתב על ידי {authorName}</span> : null}
          <span aria-hidden>·</span>
          <span>{relativeTime(sentence.createdAt)}</span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-label font-medium text-content-secondary">
          <Icon src={assets.iconPerson} size="xs" />
          {count} השלמות
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-3">
        {loading && !completions ? (
          <Skeleton />
        ) : error ? (
          <div className="flex flex-col items-start gap-2 py-2">
            <p className="text-body-sm text-content-secondary">לא הצלחנו לטעון את ההשלמות</p>
            <Button variant="ghost" size="sm" onClick={onRetry}>
              נסה שוב
            </Button>
          </div>
        ) : (completions?.length ?? 0) === 0 ? (
          <div className="flex flex-col gap-1 py-3">
            <p className="text-body font-medium text-content-primary">עדיין אין השלמות</p>
            <p className="text-body-sm text-content-muted">היה הראשון להשלים את המשפט</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {completions?.map((completion) => (
              <CompletionRow
                key={completion.id}
                completion={completion}
                avatar={
                  completion.author.avatarUrl ??
                  generated[completion.author.id] ??
                  assets.profileAvatar
                }
              />
            ))}
          </ul>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-border-subtle pt-3">
        {/* No full completions route exists yet, so this is present but inert
            rather than inventing routing. */}
        <Button variant="ghost" size="sm" fullWidth disabled>
          צפה בכל ההשלמות
        </Button>
        {footerExtra}
      </div>
    </div>
  )
}
