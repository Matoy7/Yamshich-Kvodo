import { useEffect, useId, useRef, useState } from "react"
import { cn } from "@/lib/cn"

export type FilterOption<T extends string> = { value: T; label: string }

type MultiFilterDropdownProps<T extends string> = {
  label: string
  options: FilterOption<T>[]
  values: T[]
  onChange: (values: T[]) => void
  className?: string
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 12 8" className={cn("size-3 shrink-0 transition-transform duration-150", className)}>
      <path d="M1 1.5 6 6.5 11 1.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * A category dropdown: pill trigger with a chevron (never filled solid,
 * even when active — an active filter here is a thin border + a small
 * count badge, never a background change alone; the active-filter chip row
 * elsewhere is what actually signals "this is on"). Selections are staged
 * in a local draft and only committed to the parent on Apply, so opening a
 * dropdown and closing it without deciding never silently changes results.
 * Clicking outside or Escape still applies the draft — the common "didn't
 * click Apply but clearly made a choice" case shouldn't discard it.
 */
export function MultiFilterDropdown<T extends string>({
  label,
  options,
  values,
  onChange,
  className,
}: MultiFilterDropdownProps<T>) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<T[]>(values)
  const containerRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const active = values.length > 0

  useEffect(() => {
    if (!open) setDraft(values)
  }, [open, values])

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

  function toggle(value: T) {
    setDraft((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))
  }

  return (
    <div ref={containerRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 shrink-0 items-center gap-1.5 rounded-full border bg-surface px-3.5 text-body-sm font-medium",
          "transition-colors duration-150 whitespace-nowrap text-content-secondary hover:bg-surface-hover",
          active ? "border-accent/40" : "border-border",
        )}
      >
        <span>{label}</span>
        {active ? (
          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-semibold leading-none text-content-inverse">
            {values.length}
          </span>
        ) : null}
        <ChevronDown className={cn("text-content-muted", open ? "-scale-y-100" : undefined)} />
      </button>

      {open ? (
        <div
          id={panelId}
          role="listbox"
          aria-multiselectable="true"
          aria-label={label}
          className={cn(
            "absolute end-0 top-full z-20 mt-2 w-60 overflow-hidden rounded-lg border border-border-subtle",
            "bg-surface shadow-overlay animate-notifications-in",
          )}
        >
          <p className="px-3 pt-3 pb-1 text-caption font-semibold text-content-muted">{label}</p>
          <div className="max-h-64 overflow-y-auto px-1.5 pb-1.5">
            {options.map((opt) => {
              const checked = draft.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={checked}
                  onClick={() => toggle(opt.value)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-start text-body-sm transition-colors duration-150",
                    "hover:bg-surface-hover",
                  )}
                >
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
                  <span className={checked ? "font-medium text-content-primary" : "text-content-secondary"}>{opt.label}</span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border-subtle px-3 py-2.5">
            <button
              type="button"
              onClick={() => setDraft([])}
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
