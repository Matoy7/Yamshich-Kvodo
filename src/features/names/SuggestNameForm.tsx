import { useState } from "react"
import type { FormEvent } from "react"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/cn"
import { NAME_MAX_LENGTH, type Gender } from "@/data/names"

type SuggestNameFormProps = {
  onSubmit: (text: string, gender: Gender | null, origin: string | null) => Promise<void>
}

const GENDER_OPTIONS: { value: Gender | null; label: string }[] = [
  { value: null, label: "לא צוין" },
  { value: "boy", label: "לבן" },
  { value: "girl", label: "לבת" },
  { value: "unisex", label: "יוניסקס" },
]

/**
 * Same control geometry and tokens as SentenceComposer (48px `lg` field,
 * matching primary button), but a name has no trailing ellipsis to track —
 * the mirror-measurement machinery there doesn't apply here, so this is a
 * plain labelled form rather than a port of that component.
 */
export function SuggestNameForm({ onSubmit }: SuggestNameFormProps) {
  const [text, setText] = useState("")
  const [gender, setGender] = useState<Gender | null>(null)
  const [origin, setOrigin] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || pending) return

    setPending(true)
    setError(null)
    try {
      await onSubmit(trimmed, gender, origin.trim() || null)
      setText("")
      setGender(null)
      setOrigin("")
    } catch {
      setError("לא הצלחנו להוסיף את השם. נסו שוב.")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <Input
        inputSize="lg"
        placeholder="הציעו שם למשפחה"
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, NAME_MAX_LENGTH))}
        containerClassName="flex-1"
        error={error ?? undefined}
        aria-label="שם מוצע"
      />

      <div className="flex gap-1.5" role="radiogroup" aria-label="מין">
        {GENDER_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            type="button"
            role="radio"
            aria-checked={gender === opt.value}
            onClick={() => setGender(opt.value)}
            className={cn(
              "h-10 shrink-0 rounded-md border px-3 text-body-sm font-medium transition-colors duration-150",
              gender === opt.value
                ? "border-border-strong bg-surface-muted text-content-primary"
                : "border-border bg-surface text-content-secondary hover:bg-surface-hover",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <Button type="submit" variant="primary" size="lg" disabled={!text.trim() || pending}>
        {pending ? "מוסיף…" : "הציעו"}
      </Button>
    </form>
  )
}
