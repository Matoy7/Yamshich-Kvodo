import { useEffect, useId, useRef, useState } from "react"
import { cn } from "@/lib/cn"

const HEBREW_ALPHABET = [
  "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י", "כ", "ל", "מ", "נ",
  "ס", "ע", "פ", "צ", "ק", "ר", "ש", "ת",
]

export type MoreFilters = {
  short: boolean
  easyInEnglish: boolean
  worksInternationally: boolean
  initial: string | undefined
  endsWith: string | undefined
}

type MoreFiltersDropdownProps = {
  value: MoreFilters
  onChange: (value: MoreFilters) => void
}

function LetterPicker({
  label,
  selected,
  onSelect,
}: {
  label: string
  selected: string | undefined
  onSelect: (letter: string | undefined) => void
}) {
  return (
    <div>
      <p className="px-1 pb-1.5 text-caption font-medium text-content-muted">{label}</p>
      <div className="flex flex-wrap gap-1">
        {HEBREW_ALPHABET.map((letter) => (
          <button
            key={letter}
            type="button"
            onClick={() => onSelect(letter === selected ? undefined : letter)}
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full border text-caption font-medium transition-colors duration-150",
              selected === letter
                ? "border-border-strong bg-surface-muted text-content-primary"
                : "border-border bg-surface text-content-secondary hover:bg-surface-hover",
            )}
          >
            {letter}
          </button>
        ))}
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  checked,
  onToggle,
}: {
  label: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-center justify-between rounded-md border px-2.5 py-2 text-body-sm transition-colors duration-150",
        checked
          ? "border-border-strong bg-surface-muted font-medium text-content-primary"
          : "border-border text-content-secondary hover:bg-surface-hover",
      )}
    >
      <span>{label}</span>
      {checked ? <span aria-hidden>✓</span> : null}
    </button>
  )
}

/** All five options here are backed by real columns on `names` — short, easy_in_english, works_internationally, starts_with, ends_with. */
export function MoreFiltersDropdown({ value, onChange }: MoreFiltersDropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const activeCount = [value.short, value.easyInEnglish, value.worksInternationally, value.initial, value.endsWith].filter(
    Boolean,
  ).length

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("mousedown", onPointerDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("mousedown", onPointerDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-body-sm font-medium",
          "transition-colors duration-150 whitespace-nowrap",
          activeCount > 0
            ? "border-border-strong bg-surface-muted text-content-primary"
            : "border-border bg-surface text-content-secondary hover:bg-surface-hover",
        )}
      >
        <svg aria-hidden viewBox="0 0 14 14" className="size-3.5 shrink-0">
          <path d="M1 3.5h12M3.5 7h7M6 10.5h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span>עוד פילטרים{activeCount > 0 ? ` (${activeCount})` : ""}</span>
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="עוד פילטרים"
          className={cn(
            "absolute end-0 top-full z-20 mt-2 max-h-96 w-72 overflow-y-auto rounded-lg border border-border-subtle",
            "bg-surface p-3 shadow-overlay animate-notifications-in",
          )}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <ToggleRow label="קצר" checked={value.short} onToggle={() => onChange({ ...value, short: !value.short })} />
              <ToggleRow
                label="קל להגייה באנגלית"
                checked={value.easyInEnglish}
                onToggle={() => onChange({ ...value, easyInEnglish: !value.easyInEnglish })}
              />
              <ToggleRow
                label="עובד גם בינלאומית"
                checked={value.worksInternationally}
                onToggle={() => onChange({ ...value, worksInternationally: !value.worksInternationally })}
              />
            </div>

            <LetterPicker
              label="מתחיל באות"
              selected={value.initial}
              onSelect={(letter) => onChange({ ...value, initial: letter })}
            />
            <LetterPicker
              label="מסתיים באות"
              selected={value.endsWith}
              onSelect={(letter) => onChange({ ...value, endsWith: letter })}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
