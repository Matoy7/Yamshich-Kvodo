import { useEffect, useId, useRef, useState } from "react"
import { cn } from "@/lib/cn"

export type FilterOption<T extends string> = { value: T; label: string }

type FilterDropdownProps<T extends string> = {
  label: string
  options: FilterOption<T>[]
  value: T | undefined
  onChange: (value: T | undefined) => void
  className?: string
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 8"
      className={cn("size-3 shrink-0 transition-transform duration-150", className)}
    >
      <path d="M1 1.5 6 6.5 11 1.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * One pill, one small popover, one choice. The four category filters
 * (Origin / Meaning / Style / Popularity) and "More Filters" are all this
 * same component with a different option list — that repetition is
 * intentional: it's what keeps the row scannable instead of each dropdown
 * inventing its own shape.
 */
export function FilterDropdown<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: FilterDropdownProps<T>) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const active = value !== undefined
  const activeLabel = options.find((o) => o.value === value)?.label

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
        <span>{active ? activeLabel : label}</span>
      </button>

      {open ? (
        <div
          id={panelId}
          role="listbox"
          aria-label={label}
          className={cn(
            "absolute end-0 top-full z-20 mt-2 max-h-72 w-52 overflow-y-auto rounded-lg border border-border-subtle",
            "bg-surface p-1.5 shadow-overlay animate-notifications-in",
          )}
        >
          <button
            type="button"
            role="option"
            aria-selected={!active}
            onClick={() => {
              onChange(undefined)
              setOpen(false)
            }}
            className={cn(
              "flex w-full items-center rounded-md px-2.5 py-2 text-start text-body-sm transition-colors duration-150",
              !active ? "bg-surface-muted font-medium text-content-primary" : "text-content-secondary hover:bg-surface-hover",
            )}
          >
            {label} — הכל
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={value === opt.value}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={cn(
                "flex w-full items-center rounded-md px-2.5 py-2 text-start text-body-sm transition-colors duration-150",
                value === opt.value
                  ? "bg-surface-muted font-medium text-content-primary"
                  : "text-content-secondary hover:bg-surface-hover",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
