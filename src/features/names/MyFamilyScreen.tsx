import { useCallback, useEffect, useState } from "react"
import { Card, CardHeader } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
import { Input } from "@/components/ui/Input"
import { EmptyState } from "@/components/ui/EmptyState"
import { Section } from "@/components/layout/Section"
import { useGeneratedAvatars } from "@/lib/avatar"
import { relativeTime } from "@/lib/time"
import {
  fetchFamilyRoster,
  fetchFamilyInvitations,
  createInvitation,
  revokeInvitation,
  removeFamilyMember,
  renameFamily,
  type Family,
  type FamilyMemberProfile,
  type Invitation,
} from "@/data/families"

type MyFamilyScreenProps = {
  family: Family
  currentUserId: string
  onRenamed?: () => void
}

export function MyFamilyScreen({ family, currentUserId, onRenamed }: MyFamilyScreenProps) {
  const [roster, setRoster] = useState<FamilyMemberProfile[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [freshLink, setFreshLink] = useState<string | null>(null)
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [nonce, setNonce] = useState(0)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(family.name)
  const [renaming, setRenaming] = useState(false)

  const isOwner = family.role === "owner"
  const avatars = useGeneratedAvatars(roster.map((m) => m.userId))

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    setFreshLink(null)

    Promise.all([
      fetchFamilyRoster(family.id),
      isOwner ? fetchFamilyInvitations(family.id) : Promise.resolve([]),
    ])
      .then(([members, invites]) => {
        if (!active) return
        setRoster(members)
        setInvitations(invites)
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "שגיאה לא צפויה")
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [family.id, isOwner, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  async function handleCreateInvite() {
    setCreatingInvite(true)
    try {
      const token = await createInvitation(family.id)
      setFreshLink(token)
      reload()
    } catch {
      setError("לא הצלחנו ליצור הזמנה. נסו שוב.")
    } finally {
      setCreatingInvite(false)
    }
  }

  async function handleRevoke(id: string) {
    await revokeInvitation(id).catch(() => {})
    reload()
  }

  async function handleRename() {
    const trimmed = nameDraft.trim()
    if (!trimmed || trimmed === family.name) {
      setEditingName(false)
      return
    }
    setRenaming(true)
    try {
      await renameFamily(family.id, trimmed)
      onRenamed?.()
      setEditingName(false)
    } catch {
      setError("לא הצלחנו לשנות את השם. נסו שוב.")
    } finally {
      setRenaming(false)
    }
  }

  async function handleRemove(userId: string) {
    await removeFamilyMember(family.id, userId).catch(() => {})
    reload()
  }

  if (loading) {
    return (
      <Card className="h-40 w-full animate-pulse" aria-hidden>
        <span className="sr-only">טוען</span>
      </Card>
    )
  }

  if (error) {
    return <EmptyState title="משהו השתבש" description={error} />
  }

  return (
    <div className="flex flex-col gap-8">
      {isOwner ? (
        <Section title="שם המשפחה">
          <Card padding="md">
            {editingName ? (
              <div className="flex items-center gap-2">
                <Input
                  inputSize="md"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  containerClassName="flex-1"
                  autoFocus
                />
                <Button variant="primary" size="sm" onClick={handleRename} disabled={renaming || !nameDraft.trim()}>
                  {renaming ? "שומר…" : "שמירה"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setNameDraft(family.name)
                    setEditingName(false)
                  }}
                >
                  ביטול
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-card-title font-semibold text-content-primary">{family.name}</p>
                <Button variant="ghost" size="sm" onClick={() => setEditingName(true)}>
                  שינוי שם
                </Button>
              </div>
            )}
          </Card>
        </Section>
      ) : null}

      <Section title="בני המשפחה" description={`${roster.length} חברים ב${family.name}`}>
        <Card padding="md">
          <ul className="flex flex-col divide-y divide-border-subtle">
            {roster.map((m) => (
              <li key={m.userId} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  {avatars[m.userId] ? (
                    <Avatar src={avatars[m.userId]} alt="" size="sm" />
                  ) : (
                    <span className="size-8 shrink-0 rounded-full bg-surface-muted" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-body font-medium text-content-primary">
                      <bdi>{m.displayName || m.firstName || "משתמש"}</bdi>
                      {m.userId === currentUserId ? " (את/ה)" : ""}
                    </p>
                    <p className="text-caption text-content-muted">הצטרף/ה {relativeTime(m.joinedAt)}</p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={m.role === "owner" ? "accent" : "neutral"}>
                    {m.role === "owner" ? "בעל/ת המשפחה" : "חבר/ה"}
                  </Badge>
                  {isOwner && m.userId !== currentUserId ? (
                    <Button variant="ghost" size="sm" onClick={() => handleRemove(m.userId)}>
                      הסרה
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </Section>

      {isOwner ? (
        <Section title="הזמנות" description="קישור הזמנה תקף שבוע מרגע היצירה, ואפשר לבטל אותו בכל שלב.">
          <Card padding="md">
            <CardHeader
              title="הזמינו בן משפחה"
              actions={
                <Button variant="primary" size="sm" onClick={handleCreateInvite} disabled={creatingInvite}>
                  {creatingInvite ? "יוצר…" : "יצירת קישור הזמנה"}
                </Button>
              }
            />

            {freshLink ? (
              <div className="mt-4 flex flex-col gap-2 rounded-md border border-border bg-surface-hover p-3">
                <p className="text-caption text-content-muted">
                  שמרו את הקוד הזה — הוא מוצג רק פעם אחת:
                </p>
                <div className="flex items-center gap-2">
                  <code dir="ltr" className="flex-1 truncate rounded bg-surface px-2 py-1.5 text-body-sm">
                    {freshLink}
                  </code>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigator.clipboard?.writeText(freshLink).catch(() => {})}
                  >
                    העתקה
                  </Button>
                </div>
              </div>
            ) : null}

            {invitations.length > 0 ? (
              <ul className="mt-4 flex flex-col divide-y divide-border-subtle">
                {invitations.map((inv) => {
                  const revoked = Boolean(inv.revokedAt)
                  const expired = !revoked && new Date(inv.expiresAt) < new Date()
                  return (
                    <li key={inv.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-body-sm text-content-secondary">
                          נוצרה {relativeTime(inv.createdAt)}
                        </p>
                        <p className="text-caption text-content-muted">
                          {revoked ? "בוטלה" : expired ? "פגה" : `בתוקף עד ${new Date(inv.expiresAt).toLocaleDateString("he-IL")}`}
                        </p>
                      </div>
                      {!revoked && !expired ? (
                        <Button variant="ghost" size="sm" onClick={() => handleRevoke(inv.id)}>
                          ביטול
                        </Button>
                      ) : (
                        <Badge variant="neutral">{revoked ? "בוטלה" : "פגה"}</Badge>
                      )}
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </Card>
        </Section>
      ) : null}
    </div>
  )
}
