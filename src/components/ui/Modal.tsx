import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { IconButton } from './IconButton'
import { cn } from '@/lib/cn'

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}

/**
 * Centred dialog using the card surface, radius and elevation tokens.
 * Escape and backdrop clicks close it; focus moves inside on open and returns
 * to the trigger on close.
 */
export function Modal({ open, onClose, title, description, children, footer }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    previouslyFocused.current = document.activeElement as HTMLElement | null

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Prefer the first editable field — the close button comes first in the
    // DOM, but a dialog you type into should open with the caret ready.
    const panel = panelRef.current
    const field = panel?.querySelector<HTMLElement>('input, textarea, select')
    const fallback = panel?.querySelector<HTMLElement>(
      'button, [href], [tabindex]:not([tabindex="-1"])',
    )
    ;(field ?? fallback)?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-content-primary/40"
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 flex w-full max-w-[480px] flex-col gap-4',
          'rounded-lg border border-border-subtle bg-surface p-6 shadow-overlay',
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-card-title font-semibold text-content-primary">{title}</h2>
            {description ? (
              <p className="text-body-sm text-content-muted">{description}</p>
            ) : null}
          </div>

          <IconButton label="סגירה" variant="ghost" size="sm" onClick={onClose}>
            <span aria-hidden className="relative block size-4">
              <span className="absolute inset-x-0 top-1/2 block h-0.5 rotate-45 rounded-full bg-content-secondary" />
              <span className="absolute inset-x-0 top-1/2 block h-0.5 -rotate-45 rounded-full bg-content-secondary" />
            </span>
          </IconButton>
        </div>

        {children}

        {footer ? <div className="flex items-center justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  )
}
