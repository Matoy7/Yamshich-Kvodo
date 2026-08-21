import { useEffect } from 'react'
import { SidebarNav, type NavItem } from './Sidebar'
import { cn } from '@/lib/cn'

type MobileNavProps = {
  open: boolean
  onClose: () => void
  items: NavItem[]
  activeId: string
  productName: string
  tagline: string
}

/**
 * Drawer navigation for viewports below `lg`. Mirrors the desktop sidebar's
 * contents rather than introducing a separate mobile information architecture.
 */
export function MobileNav({
  open,
  onClose,
  items,
  activeId,
  productName,
  tagline,
}: MobileNavProps) {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  return (
    <div className={cn('lg:hidden', !open && 'pointer-events-none')} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-content-primary/35 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="ניווט ראשי"
        className={cn(
          'fixed inset-y-0 start-0 z-50 flex w-[280px] max-w-[85vw] flex-col gap-8',
          'bg-surface px-4 py-6 shadow-overlay transition-transform duration-200',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex flex-col gap-1 px-3">
          <span className="text-section-title font-bold text-content-primary font-display">
            {productName}
          </span>
          <span className="text-label text-content-muted">{tagline}</span>
        </div>

        <SidebarNav items={items} activeId={activeId} onSelect={onClose} />
      </div>
    </div>
  )
}
