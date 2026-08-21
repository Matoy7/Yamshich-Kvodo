import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { assets } from '@/lib/assets'

type TopbarProps = {
  title: string
  hasNotifications?: boolean
  onOpenNav: () => void
}

/** Sticky application bar: page context on one side, account controls on the other. */
export function Topbar({ title, hasNotifications = false, onOpenNav }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <IconButton
            label="פתיחת תפריט"
            variant="ghost"
            size="md"
            onClick={onOpenNav}
            className="lg:hidden"
          >
            <span aria-hidden className="flex flex-col gap-1">
              <span className="block h-0.5 w-4 rounded-full bg-content-primary" />
              <span className="block h-0.5 w-4 rounded-full bg-content-primary" />
              <span className="block h-0.5 w-4 rounded-full bg-content-primary" />
            </span>
          </IconButton>

          <h1 className="truncate text-page-title font-bold text-content-primary">{title}</h1>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <IconButton
            label={hasNotifications ? 'התראות, יש התראות חדשות' : 'התראות'}
            variant="secondary"
            size="md"
          >
            <Icon src={assets.iconBell} size="md" />
            {hasNotifications ? (
              <span className="absolute -top-0.5 -start-0.5 size-3 rounded-full border-2 border-surface bg-primary" />
            ) : null}
          </IconButton>

          <Avatar src={assets.profileAvatar} alt="תמונת פרופיל" size="md" />
        </div>
      </div>
    </header>
  )
}
