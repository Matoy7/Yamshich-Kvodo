import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/cn'

export type NavItem = {
  id: string
  label: string
  icon: string
}

type SidebarFooterProps = {
  userName: string
  /** Guests only: offers to attach a Google account to this same user. */
  canUpgrade?: boolean
  onUpgrade?: () => void
  onSignOut: () => void
}

/** Account block pinned to the bottom of the sidebar. */
export function SidebarFooter({
  userName,
  canUpgrade = false,
  onUpgrade,
  onSignOut,
}: SidebarFooterProps) {
  return (
    <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
      <p className="truncate px-3 text-label text-content-muted">{userName}</p>

      {canUpgrade ? (
        <div className="flex flex-col gap-1 pb-1">
          <Button variant="secondary" size="md" fullWidth onClick={onUpgrade}>
            שמור את החשבון
          </Button>
          <p className="px-3 text-caption text-content-muted">
            שמור את המשפטים וההשלמות שלך
          </p>
        </div>
      ) : null}

      <Button variant="ghost" size="md" fullWidth onClick={onSignOut} className="justify-start px-3">
        התנתקות
      </Button>
    </div>
  )
}

/**
 * Search field occupying the sidebar's top slot. The 48px wrapper keeps the
 * navigation below it at the same vertical position regardless of the
 * control's own height.
 */
export function SidebarSearch({ placeholder }: { placeholder: string }) {
  return (
    <div className="flex h-12 items-center">
      <Input
        type="search"
        inputSize="md"
        placeholder={placeholder}
        aria-label={placeholder}
        containerClassName="w-full"
      />
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
                aria-current={active ? 'page' : undefined}
                onClick={() => onSelect?.(item.id)}
                className={cn(
                  'flex h-10 w-full items-center gap-3 rounded-md px-3 transition-colors duration-150',
                  'text-body font-medium',
                  active
                    ? 'bg-surface-muted text-content-primary shadow-panel'
                    : 'text-content-secondary hover:bg-surface-hover hover:text-content-primary',
                )}
              >
                <Icon src={item.icon} size="md" />
                <span className="truncate">{item.label}</span>
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
  userName,
  canUpgrade,
  onSelect,
  onUpgrade,
  onSignOut,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 start-0 z-30 hidden w-[264px] shrink-0 lg:flex',
        'flex-col gap-8 border-e border-border bg-surface px-4 py-6',
      )}
    >
      <SidebarSearch placeholder={searchPlaceholder} />
      <SidebarNav items={items} activeId={activeId} onSelect={onSelect} />
      <SidebarFooter
        userName={userName}
        canUpgrade={canUpgrade}
        onUpgrade={onUpgrade}
        onSignOut={onSignOut}
      />
    </aside>
  )
}
