import { useEffect, useId, useRef, useState } from "react"
import { cn } from "@/lib/cn"
import { MORE_FILTER_LABELS } from "./filterOptions"

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

const EMPTY_MORE: MoreFilters = {
  short: false,
  easyInEnglish: false,
  worksInternationally: false,
  initial: undefined,
  endsWith: undefined,
}

export function moreFiltersActiveCount(v: MoreFilters): number {
  return [v.short, v.easyInEnglish, v.worksInternationally, v.initial, v.endsWith].filter(Boolean).length
}

type MoreFiltersDropdownProps = {
  value: MoreFilters
  onChange: (value: MoreFilters) => void
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded border transition-colors duration-150",
        checked ? "border-accent bg-accent text-content-inverse" : "border-border-strong bg-surface",
      )}
    >
      {checked ? (
        <svg viewBox="0 0 10 8" className="size-2.5">
          <path d="M1 4 3.5 6.5 9 1" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </span>
  )
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
                ? "border-accent bg-accent text-content-inverse"
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

/**
 * Same draft + Apply/Clear pattern as MultiFilterDropdown — see its
 * comment. All five options here are backed by real columns on `names`.
 */
export function MoreFiltersDropdown({ value, onChange }: MoreFiltersDropdownProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<MoreFilters>(value)
  const containerRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const activeCount = moreFiltersActiveCount(value)

  useEffect(() => {
    if (!open) setDraft(value)
  }, [open, value])

  function commitAndClose() {
    onChange(draft)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") commitAndClose()
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) commitAndClose()
    }
    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("mousedown", onPointerDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("mousedown", onPointerDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, draft])

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 shrink-0 items-center gap-1.5 rounded-full border bg-surface px-3.5 text-body-sm font-medium",
          "transition-colors duration-150 whitespace-nowrap text-content-secondary hover:bg-surface-hover",
          activeCount > 0 ? "border-accent/40" : "border-border",
        )}
      >
        <svg aria-hidden viewBox="0 0 14 14" className="size-3.5 shrink-0 text-content-muted">
          <path d="M1 3.5h12M3.5 7h7M6 10.5h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span>עוד פילטרים</span>
        {activeCount > 0 ? (
          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-semibold leading-none text-content-inverse">
            {activeCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="עוד פילטרים"
          className={cn(
            "absolute end-0 top-full z-20 mt-2 w-72 overflow-hidden rounded-lg border border-border-subtle",
            "bg-surface shadow-overlay animate-notifications-in",
          )}
        >
          <div className="max-h-80 overflow-y-auto p-3">
            <div className="flex flex-col gap-1">
              {(["short", "easyInEnglish", "worksInternationally"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, [key]: !d[key] }))}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-start text-body-sm transition-colors duration-150 hover:bg-surface-hover"
                >
                  <Checkbox checked={draft[key]} />
                  <span className={draft[key] ? "font-medium text-content-primary" : "text-content-secondary"}>
                    {MORE_FILTER_LABELS[key]}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-col gap-3 border-t border-border-subtle pt-3">
              <LetterPicker label="מתחיל באות" selected={draft.initial} onSelect={(l) => setDraft((d) => ({ ...d, initial: l }))} />
              <LetterPicker label="מסתיים באות" selected={draft.endsWith} onSelect={(l) => setDraft((d) => ({ ...d, endsWith: l }))} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border-subtle px-3 py-2.5">
            <button
              type="button"
              onClick={() => setDraft(EMPTY_MORE)}
              className="text-caption font-medium text-content-muted hover:text-content-secondary"
            >
              ניקוי
            </button>
            <button
              type="button"
              onClick={commitAndClose}
              className="rounded-md bg-accent px-3 py-1.5 text-caption font-semibold text-content-inverse hover:opacity-90"
            >
              החלה
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
