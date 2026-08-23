import { Icon } from "@/components/ui/Icon"
import { IconButton } from "@/components/ui/IconButton"
import { AccountMenu } from "@/features/auth/AccountMenu"
import { assets } from "@/lib/assets"

type TopbarProps = {
  brandName: string
  brandTagline: string
  /** Provider avatar, or the deterministic generated one. */
  avatarUrl: string
  displayName: string
  isGuest: boolean
  hasNotifications?: boolean
  onOpenNav: () => void
  onLinkGoogle: () => void
  onSignOut: () => void
}

/**
 * Sticky application bar: brand lockup at the inline start, account controls
 * pushed to the inline end (the dashboard's left side in RTL).
 */
export function Topbar({
  brandName,
  brandTagline,
  avatarUrl,
  displayName,
  isGuest,
  hasNotifications = false,
  onOpenNav,
  onLinkGoogle,
  onSignOut,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur-sm">
      <div className="flex items-center gap-3 px-4 py-3 sm:gap-4 md:gap-5 md:px-6 lg:px-8">
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

        <img
          src={assets.heroIllustration}
          alt="איור של אישה כותבת ביומן"
          width={96}
          height={96}
          className="size-12 shrink-0 rounded-full bg-surface-secondary object-cover sm:size-20 md:size-24"
        />

        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="truncate font-display text-page-title font-bold text-content-primary sm:text-display">
            {brandName}
          </h1>
          {/* Wraps rather than truncates: the tagline is the product's one
              line of explanation, so a clipped half of it is worse than a
              second line on narrow screens. */}
          <p className="text-balance text-body-sm text-content-muted sm:truncate sm:text-body-lg">
            {brandTagline}
          </p>
        </div>

        {/* Account controls — `ms-auto` pushes them to the inline end. */}
        <div className="ms-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <IconButton
            label={hasNotifications ? "התראות, יש התראות חדשות" : "התראות"}
            variant="secondary"
            size="md"
          >
            <Icon src={assets.iconBell} size="md" />
            {hasNotifications ? (
              <span className="absolute -top-0.5 -start-0.5 size-3 rounded-full border-2 border-surface bg-primary" />
            ) : null}
          </IconButton>

          <AccountMenu
            displayName={displayName}
            avatarUrl={avatarUrl}
            isGuest={isGuest}
            onLinkGoogle={onLinkGoogle}
            onSignOut={onSignOut}
          />
        </div>
      </div>
    </header>
  )
}
