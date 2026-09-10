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
 * Checkboxes, not radios: picking more than one option inside this dropdown
 * is "or" — Biblical + Hebrew means either, not both at once on the same
 * name. What ANDs everything together is which dropdown a choice lives in,
 * not anything inside this component.
 */
export function MultiFilterDropdown<T extends string>({
  label,
  options,
  values,
  onChange,
  className,
}: MultiFilterDropdownProps<T>) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const active = values.length > 0

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

  function toggle(value: T) {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value])
  }

  const triggerLabel =
    values.length === 0
      ? label
      : values.length === 1
        ? (options.find((o) => o.value === values[0])?.label ?? label)
        : `${label} (${values.length})`

  return (
    <div ref={containerRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-body-sm font-medium",
          "transition-colors duration-150 whitespace-nowrap",
          active
            ? "border-border-strong bg-surface-muted text-content-primary"
            : "border-border bg-surface text-content-secondary hover:bg-surface-hover",
        )}
      >
        <ChevronDown className={open ? "-scale-y-100" : undefined} />
        <span>{triggerLabel}</span>
      </button>

      {open ? (
        <div
          id={panelId}
          role="listbox"
          aria-multiselectable="true"
          aria-label={label}
          className={cn(
            "absolute end-0 top-full z-20 mt-2 max-h-72 w-56 overflow-y-auto rounded-lg border border-border-subtle",
            "bg-surface p-1.5 shadow-overlay animate-notifications-in",
          )}
        >
          {active ? (
            <button
              type="button"
              onClick={() => {
                onChange([])
                setOpen(false)
              }}
              className="mb-1 flex w-full items-center rounded-md px-2.5 py-1.5 text-start text-caption font-medium text-accent hover:bg-surface-hover"
            >
              ניקוי בחירה
            </button>
          ) : null}
          {options.map((opt) => {
            const checked = values.includes(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={checked}
                onClick={() => toggle(opt.value)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-start text-body-sm transition-colors duration-150",
                  checked ? "bg-surface-muted font-medium text-content-primary" : "text-content-secondary hover:bg-surface-hover",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border",
                    checked ? "border-accent bg-accent text-content-inverse" : "border-border-strong bg-surface",
                  )}
                >
                  {checked ? (
                    <svg viewBox="0 0 10 8" className="size-2.5">
                      <path d="M1 4 3.5 6.5 9 1" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </span>
                {opt.label}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
