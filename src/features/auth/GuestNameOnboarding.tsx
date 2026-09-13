import { useState } from "react"
import type { FormEvent } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { assets } from "@/lib/assets"
import { chooseGuestDisplayName, GUEST_NAME_MAX_LENGTH } from "./profile"

type GuestNameOnboardingProps = {
  brandName: string
  userId: string
  onChosen: (name: string) => void
}

/**
 * Shown once, right after a guest's first sign-in, before anything else in
 * the app — the same slot LoginScreen occupies for signed-out visitors.
 * There is deliberately no placeholder, no suggested value, and no way to
 * continue without typing something: the whole point is that this name
 * comes from the person, not from the app.
 */
export function GuestNameOnboarding({ brandName, userId, onChosen }: GuestNameOnboardingProps) {
  const [name, setName] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || pending) return

    setPending(true)
    setError(null)
    try {
      const saved = await chooseGuestDisplayName(userId, trimmed)
      onChosen(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : "לא הצלחנו לשמור את השם. נסו שוב.")
      setPending(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-12">
      <div className="flex w-full max-w-[380px] flex-col items-center gap-8 text-center">
        <img
          src={assets.heroIllustration}
          alt=""
          aria-hidden
          width={160}
          height={160}
          className="size-32 shrink-0 rounded-full bg-surface-secondary object-cover md:size-40"
        />

        <div className="flex flex-col gap-1">
          <h1 className="font-display text-display font-bold text-content-primary">
            ברוכים הבאים ל{brandName}
          </h1>
          <p className="text-body-lg text-content-secondary">איך נקרא לכם?</p>
        </div>

        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
          <Input
            inputSize="lg"
            placeholder="הקלידו את השם שלכם"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, GUEST_NAME_MAX_LENGTH))}
            error={error ?? undefined}
            autoFocus
            aria-label="השם שלכם"
          />

          <Button type="submit" variant="primary" size="lg" fullWidth disabled={!name.trim() || pending}>
            {pending ? "שומר…" : "המשך"}
          </Button>
        </form>

        <p className="text-caption text-content-muted">זה השם שבני המשפחה שלכם יראו.</p>
      </div>
    </main>
  )
}
