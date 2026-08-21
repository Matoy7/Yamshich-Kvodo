import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

/** Hard cap on a sentence opener. */
export const SENTENCE_MAX_LENGTH = 120

type SentenceComposerProps = {
  ctaLabel: string
  placeholder: string
  onSubmit?: (value: string) => void
}

/**
 * Single-row composer: field and action share the `lg` control height (48px)
 * from the design system, so they align on one baseline and read as one
 * control. The character counter sits inside the field so the row keeps the
 * exact height of the button it replaces.
 */
export function SentenceComposer({ ctaLabel, placeholder, onSubmit }: SentenceComposerProps) {
  const [value, setValue] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onSubmit?.(trimmed)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center"
      aria-label={ctaLabel}
    >
      <Input
        inputSize="lg"
        value={value}
        onChange={(event) => setValue(event.target.value.slice(0, SENTENCE_MAX_LENGTH))}
        maxLength={SENTENCE_MAX_LENGTH}
        placeholder={placeholder}
        aria-label={`${placeholder} (עד ${SENTENCE_MAX_LENGTH} תווים)`}
        containerClassName="min-w-0 flex-1"
        trailing={
          <span aria-hidden className="text-caption tabular-nums text-content-muted">
            {value.length} / {SENTENCE_MAX_LENGTH}
          </span>
        }
      />

      <Button variant="primary" size="lg" type="submit" className="w-full shrink-0 sm:w-auto">
        {ctaLabel}
      </Button>
    </form>
  )
}
