import { useEffect, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Icon } from "@/components/ui/Icon"
import { assets } from "@/lib/assets"
import { cn } from "@/lib/cn"

export type NavItem = {
  id: string
  label: string
  icon: string
  /** Shown as a small "(N)" after the label — omit for items with no count. */
  count?: number
}

type SidebarFooterProps = {
  userName: string
  onSignOut: () => void
}

/** Account block pinned to the bottom of the sidebar. */
export function SidebarFooter({ userName, onSignOut }: SidebarFooterProps) {
  return (
    <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
      <p className="truncate px-3 text-label text-content-muted">{userName}</p>

      <Button
        variant="ghost"
        size="md"
        fullWidth
        onClick={onSignOut}
        className="justify-start px-3"
      >
        התנתקות
      </Button>
    </div>
  )
}

type SidebarSearchProps = {
  placeholder: string
  /** The currently active, submitted query — "" when search is inactive. */
  query: string
  onSearch: (query: string) => void
  onClear: () => void
}

/**
 * Search field occupying the sidebar's top slot. The 48px wrapper keeps the
 * navigation below it at the same vertical position regardless of the
 * control's own height.
 *
 * The field itself is uncontrolled draft text: search only actually runs on
 * Enter or the search button, never on every keystroke. `query` is the
 * active/submitted value, so the field stays in sync if the search is
 * cleared from elsewhere (e.g. switching feed tabs).
 */
export function SidebarSearch({
  placeholder,
  query,
  onSearch,
  onClear,
}: SidebarSearchProps) {
  const [draft, setDraft] = useState(query)

  useEffect(() => setDraft(query), [query])

  const submit = () => {
    const trimmed = draft.trim()
    if (trimmed) onSearch(trimmed)
    else onClear()
  }

  return (
    <div className="flex h-12 items-center">
      <div className="relative flex w-full items-center">
        <button
          type="button"
          aria-label="חיפוש"
          onClick={submit}
          className="absolute start-0 z-10 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-content-muted transition-colors duration-150 hover:text-content-primary"
        >
          <Icon src={assets.iconSearch} size="sm" />
        </button>

        <input
          type="text"
          inputMode="search"
          enterKeyHint="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              submit()
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          className={cn(
            "h-10 w-full min-w-0 rounded-md border border-border bg-surface text-body",
            "text-content-primary placeholder:text-content-muted transition-colors duration-150",
            "ps-9 pe-9 hover:border-border-strong focus-visible:border-focus",
          )}
        />

        {draft ? (
          <button
            type="button"
            aria-label="ניקוי חיפוש"
            onClick={() => {
              setDraft("")
              onClear()
            }}
            className="absolute end-0 z-10 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-content-muted transition-colors duration-150 hover:text-content-primary"
          >
            <span aria-hidden className="relative block size-3">
              <span className="absolute inset-x-0 top-1/2 block h-0.5 -translate-y-1/2 rotate-45 rounded-full bg-current" />
              <span className="absolute inset-x-0 top-1/2 block h-0.5 -translate-y-1/2 -rotate-45 rounded-full bg-current" />
            </span>
          </button>
        ) : null}
      </div>
    </div>
  )
}

type SidebarNavProps = {
  items: NavItem[]
  activeId: string
  onSelect?: (id: string) => void
}

/** Navigation list — shared by the desktop sidebar and the mobile drawer. */
export function SidebarNav({ items, activeId, onSelect }: SidebarNavProps) {
  return (
    <nav aria-label="ניווט ראשי">
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const active = item.id === activeId
          return (
            <li key={item.id}>
              <button
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => onSelect?.(item.id)}
                className={cn(
                  "flex h-10 w-full items-center gap-3 rounded-md px-3 transition-colors duration-150",
                  "text-body font-medium",
                  active
                    ? "bg-surface-muted text-content-primary shadow-panel"
                    : "text-content-secondary hover:bg-surface-hover hover:text-content-primary",
                )}
              >
                <Icon src={item.icon} size="md" />
                <span className="flex min-w-0 items-baseline gap-1">
                  <span className="truncate">{item.label}</span>
                  {typeof item.count === "number" ? (
                    <span className="shrink-0 text-body-sm font-normal text-content-muted">
                      ({item.count})
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

type SidebarProps = {
  items: NavItem[]
  activeId: string
  searchPlaceholder: string
  searchQuery: string
  onSearch: (query: string) => void
  onClearSearch: () => void
  userName: string
  canUpgrade?: boolean
  onSelect: (id: string) => void
  onUpgrade?: () => void
  onSignOut: () => void
}

/** Fixed desktop sidebar. Hidden below the `lg` breakpoint. */
export function Sidebar({
  items,
  activeId,
  searchPlaceholder,
  searchQuery,
  onSearch,
  onClearSearch,
  userName,
  canUpgrade,
  onSelect,
  onUpgrade,
  onSignOut,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 start-0 z-30 hidden w-[264px] shrink-0 lg:flex",
        "flex-col gap-8 border-e border-border bg-surface px-4 py-6",
      )}
    >
      <SidebarSearch
        placeholder={searchPlaceholder}
        query={searchQuery}
        onSearch={onSearch}
        onClear={onClearSearch}
      />
      <SidebarNav items={items} activeId={activeId} onSelect={onSelect} />
      <SidebarFooter userName={userName} onSignOut={onSignOut} />
    </aside>
  )
}
