import { useEffect, useLayoutEffect, useRef, useState } from "react"
import type { FormEvent } from "react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/cn"

import { SENTENCE_MAX_LENGTH } from "@/data/sentences"

/** Decorative suffix — never editable, never counted, never submitted. */
const ELLIPSIS = "..."

type SentenceComposerProps = {
  ctaLabel: string
  placeholder: string
  onSubmit: (value: string) => Promise<void>
}

/**
 * Single-row sentence composer. The field mirrors the design system's `lg`
 * control geometry (48px tall, 12px radius) so it and the action button sit on
 * one baseline and read as a single component.
 *
 * The trailing "..." tracks the end of the typed text: a hidden mirror span
 * measures the value's rendered width and the input is sized to match, capped
 * at the space actually available so long values scroll instead of overflowing.
 * The suffix stays outside the input's value and character count.
 */
export function SentenceComposer({
  ctaLabel,
  placeholder,
  onSubmit,
}: SentenceComposerProps) {
  const [value, setValue] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [textWidth, setTextWidth] = useState(0)
  const [availableWidth, setAvailableWidth] = useState(Number.POSITIVE_INFINITY)

  const fieldRef = useRef<HTMLDivElement>(null)
  const mirrorRef = useRef<HTMLSpanElement>(null)
  const suffixRef = useRef<HTMLSpanElement>(null)

  const measureText = () => {
    if (mirrorRef.current) setTextWidth(mirrorRef.current.offsetWidth)
  }

  useLayoutEffect(measureText, [value, placeholder])

  // Re-measure once the web font swaps in, so the suffix doesn't drift.
  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts) return
    document.fonts.ready.then(measureText).catch(() => {})
  }, [])

  // Track how much room the text may occupy inside the field.
  useEffect(() => {
    const field = fieldRef.current
    if (!field || typeof ResizeObserver === "undefined") return

    const update = () => {
      const styles = getComputedStyle(field)
      const padding =
        parseFloat(styles.paddingInlineStart || "0") +
        parseFloat(styles.paddingInlineEnd || "0")
      const suffix = suffixRef.current?.offsetWidth ?? 0
      setAvailableWidth(Math.max(0, field.clientWidth - padding - suffix))
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(field)
    return () => observer.disconnect()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || pending) return

    setPending(true)
    setError(null)
    try {
      await onSubmit(trimmed)
      setValue("")
    } catch {
      setError("לא הצלחנו לשמור את המשפט. נסו שוב.")
    } finally {
      setPending(false)
    }
  }

  const fieldText = "text-card-title"
  const inputWidth = Math.min(textWidth, availableWidth)

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={ctaLabel}
      className="relative flex w-full flex-col items-stretch gap-1 sm:flex-row sm:items-center"
    >
      {/* Field — matches Input's `lg` geometry from the design system.
          `flex-1` is row-only: in the stacked mobile layout it would set a
          zero flex-basis on the vertical axis and collapse `h-12`. */}
      <div
        ref={fieldRef}
        className={cn(
          "relative flex h-12 w-full min-w-0 items-center overflow-hidden rounded-md border",
          "border-border bg-surface ps-4 pe-16 transition-colors duration-150 sm:flex-1",
          "hover:border-border-strong",
          "focus-within:border-focus focus-within:ring-4 focus-within:ring-focus/15",
        )}
      >
        {/* Hidden mirror: measures the rendered width of the text. */}
        <span
          ref={mirrorRef}
          aria-hidden
          className={cn(
            "pointer-events-none invisible absolute whitespace-pre font-normal",
            fieldText,
          )}
        >
          {value || placeholder}
        </span>

        <input
          value={value}
          onChange={(event) =>
            setValue(event.target.value.slice(0, SENTENCE_MAX_LENGTH))
          }
          maxLength={SENTENCE_MAX_LENGTH}
          disabled={pending}
          placeholder={placeholder}
          aria-label={`${placeholder}${ELLIPSIS} (עד ${SENTENCE_MAX_LENGTH} תווים)`}
          style={{
            width: Number.isFinite(inputWidth) ? `${inputWidth}px` : undefined,
          }}
          className={cn(
            "min-w-0 bg-transparent text-content-primary outline-none",
            "placeholder:text-content-muted",
            fieldText,
          )}
        />

        <span
          ref={suffixRef}
          aria-hidden
          className={cn("shrink-0 text-content-muted", fieldText)}
        >
          {ELLIPSIS}
        </span>

        {/* Counter, bottom inline-end of the field. The wrapper stays in the
            field's RTL flow so `end-3` resolves to the left; only the inner
            span is forced LTR so the digits read "0 / 120", not "120 / 0". */}
        <span
          aria-hidden
          className="absolute bottom-0.5 end-3 text-caption text-content-muted"
        >
          <span dir="ltr" className="tabular-nums">
            {value.length} / {SENTENCE_MAX_LENGTH}
          </span>
        </span>
      </div>

      <Button
        variant="primary"
        size="lg"
        type="submit"
        disabled={pending || value.trim().length === 0}
        className="w-full shrink-0 sm:w-auto"
      >
        {pending ? "שומר…" : ctaLabel}
      </Button>

      {error ? (
        <p
          role="alert"
          className="text-caption text-danger sm:absolute sm:-bottom-5"
        >
          {error}
        </p>
      ) : null}
    </form>
  )
}
