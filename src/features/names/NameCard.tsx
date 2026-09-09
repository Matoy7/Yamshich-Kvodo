import { Card, CardFooter } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
import { VoteButton } from "./VoteButton"
import { useGeneratedAvatars } from "@/lib/avatar"
import type { VoteState } from "@/data/votes"

/** Shared shape both the catalogue view (NameEntry) and the ranked view (RankedName) reduce to. */
export type NameCardData = {
  nameId: string
  text: string
  gender: "boy" | "girl" | "unisex" | null
  origin: string | null
  /** Non-null when this row is one family's private suggestion. */
  suggestedForFamilyId: string | null
}

const GENDER_LABEL: Record<"boy" | "girl" | "unisex", string> = {
  boy: "לבן",
  girl: "לבת",
  unisex: "יוניסקס",
}

const GENDER_VARIANT: Record<"boy" | "girl" | "unisex", "accent" | "neutral"> = {
  boy: "accent",
  girl: "accent",
  unisex: "neutral",
}

type NameCardProps = {
  name: NameCardData
  vote: VoteState | undefined
  disabled?: boolean
  onToggleVote: (nameId: string) => void
}

/**
 * Adapted from SentenceCard: same Card shell, same footer rhythm, same
 * disabled/active affordance — but a name has no completions to browse into,
 * so the popover/sheet machinery is gone entirely. What replaces it is who
 * voted: up to four generated avatars, matching the deterministic-avatar
 * pattern already used for authors elsewhere in the app.
 */
export function NameCard({ name, vote, disabled = false, onToggleVote }: NameCardProps) {
  const voterIds = vote?.voterIds ?? []
  const shown = voterIds.slice(0, 4)
  const overflow = voterIds.length - shown.length
  const avatars = useGeneratedAvatars(shown)

  return (
    <Card as="article" interactive className="flex h-full w-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <p dir="auto" className="text-quote font-semibold text-content-primary [word-break:break-word]">
          {name.text}
        </p>
        {name.gender ? (
          <Badge variant={GENDER_VARIANT[name.gender]}>{GENDER_LABEL[name.gender]}</Badge>
        ) : null}
      </div>

      {name.origin ? (
        <p className="mt-1 text-body-sm text-content-muted">{name.origin}</p>
      ) : null}

      {name.suggestedForFamilyId ? (
        <div className="mt-2">
          <Badge variant="neutral">הצעה של המשפחה</Badge>
        </div>
      ) : null}

      <div className="flex-1" />

      <CardFooter className="mt-4 border-t border-border-subtle">
        <div className="flex min-w-0 items-center -space-x-2 rtl:space-x-reverse">
          {shown.map((id) =>
            avatars[id] ? (
              <Avatar key={id} src={avatars[id]} alt="" size="sm" className="ring-2 ring-surface" />
            ) : null,
          )}
          {overflow > 0 ? (
            <span className="ms-1 text-caption text-content-muted">+{overflow}</span>
          ) : null}
        </div>

        <VoteButton
          voted={vote?.votedByMe ?? false}
          count={vote?.count ?? 0}
          disabled={disabled}
          onToggle={() => onToggleVote(name.nameId)}
        />
      </CardFooter>
    </Card>
  )
}
