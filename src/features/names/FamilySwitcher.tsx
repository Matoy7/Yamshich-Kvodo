import { useState } from "react"
import type { FormEvent } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { Icon } from "@/components/ui/Icon"
import { assets } from "@/lib/assets"
import { cn } from "@/lib/cn"
import type { Family } from "@/data/families"

type FamilySwitcherProps = {
  families: Family[]
  activeFamilyId: string | null
  onSelect: (id: string) => void
  onCreate: (name: string) => Promise<void>
  onJoin: (token: string) => Promise<void>
}

/**
 * A user may belong to several families, and each vote they cast only ever
 * counts inside the one that's active — so switching here is a real context
 * change, not cosmetic. Kept as a compact control on the browse/ranking
 * screens rather than a full page, since it's something people reach for
 * often but rarely stay on.
 */
export function FamilySwitcher({ families, activeFamilyId, onSelect, onCreate, onJoin }: FamilySwitcherProps) {
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [joinToken, setJoinToken] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed || pending) return
    setPending(true)
    setError(null)
    try {
      await onCreate(trimmed)
      setNewName("")
      setOpen(false)
    } catch {
      setError("לא הצלחנו ליצור את המשפחה. נסו שוב.")
    } finally {
      setPending(false)
    }
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = joinToken.trim()
    if (!trimmed || pending) return
    setPending(true)
    setError(null)
    try {
      await onJoin(trimmed)
      setJoinToken("")
      setOpen(false)
    } catch {
      setError("קוד ההזמנה לא תקין, פג תוקף, או בוטל.")
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {families.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onSelect(f.id)}
            className={cn(
              "h-9 shrink-0 rounded-full border px-3 text-body-sm font-medium transition-colors duration-150",
              f.id === activeFamilyId
                ? "border-border-strong bg-surface-muted text-content-primary"
                : "border-border bg-surface text-content-secondary hover:bg-surface-hover",
            )}
          >
            {f.name}
          </button>
        ))}
        <Button variant="ghost" size="sm" iconStart={<Icon src={assets.iconLink} size="xs" />} onClick={() => setOpen(true)}>
          משפחה חדשה / הצטרפות
        </Button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="משפחה חדשה או הצטרפות">
        <div className="flex flex-col gap-6">
          <form onSubmit={handleCreate} className="flex flex-col gap-2">
            <p className="text-label font-medium text-content-secondary">התחילו משפחה חדשה</p>
            <div className="flex gap-2">
              <Input
                inputSize="md"
                placeholder="למשל: משפחת כהן"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                containerClassName="flex-1"
              />
              <Button type="submit" variant="primary" disabled={!newName.trim() || pending}>
                יצירה
              </Button>
            </div>
          </form>

          <form onSubmit={handleJoin} className="flex flex-col gap-2">
            <p className="text-label font-medium text-content-secondary">הצטרפות עם קוד הזמנה</p>
            <div className="flex gap-2">
              <Input
                inputSize="md"
                placeholder="הדביקו כאן את קוד ההזמנה"
                value={joinToken}
                onChange={(e) => setJoinToken(e.target.value)}
                containerClassName="flex-1"
                dir="ltr"
              />
              <Button type="submit" variant="secondary" disabled={!joinToken.trim() || pending}>
                הצטרפות
              </Button>
            </div>
          </form>

          {error ? <p className="text-caption text-danger">{error}</p> : null}
        </div>
      </Modal>
    </>
  )
}
