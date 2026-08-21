import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/cn'

export type NavItem = {
  id: string
  label: string
  icon: string
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
              <a
                href={`#${item.id}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => onSelect?.(item.id)}
                className={cn(
                  'flex h-10 items-center gap-3 rounded-md px-3 transition-colors duration-150',
                  'text-body font-medium',
                  active
                    ? 'bg-surface-muted text-content-primary shadow-panel'
                    : 'text-content-secondary hover:bg-surface-hover hover:text-content-primary',
                )}
              >
                <Icon src={item.icon} size="md" />
                <span className="truncate">{item.label}</span>
              </a>
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
  productName: string
  tagline: string
}

/** Fixed desktop sidebar. Hidden below the `lg` breakpoint. */
export function Sidebar({ items, activeId, productName, tagline }: SidebarProps) {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 start-0 z-30 hidden w-[264px] shrink-0 lg:flex',
        'flex-col gap-8 border-e border-border bg-surface px-4 py-6',
      )}
    >
      <div className="flex flex-col gap-1 px-3">
        <span className="text-section-title font-bold text-content-primary font-display">
          {productName}
        </span>
        <span className="text-label text-content-muted">{tagline}</span>
      </div>

      <SidebarNav items={items} activeId={activeId} />
    </aside>
  )
}
