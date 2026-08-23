import { useState } from 'react'
import type { ReactNode } from 'react'
import { Sidebar, type NavItem } from './Sidebar'
import { MobileNav } from './MobileNav'
import { Topbar } from './Topbar'

type DashboardLayoutProps = {
  brandName: string
  brandTagline: string
  navItems: NavItem[]
  activeNavId: string
  searchPlaceholder: string
  userName: string
  avatarUrl: string
  canUpgrade?: boolean
  hasNotifications?: boolean
  onSelectNav: (id: string) => void
  onUpgrade?: () => void
  onSignOut: () => void
  children: ReactNode
}

/**
 * Application shell: fixed sidebar (inline-start, RTL-aware) holding search,
 * navigation and sign-out; a sticky topbar carrying the brand and account
 * controls; and a max-width content column.
 */
export function DashboardLayout({
  brandName,
  brandTagline,
  navItems,
  activeNavId,
  searchPlaceholder,
  userName,
  avatarUrl,
  canUpgrade,
  hasNotifications,
  onSelectNav,
  onUpgrade,
  onSignOut,
  children,
}: DashboardLayoutProps) {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar
        items={navItems}
        activeId={activeNavId}
        searchPlaceholder={searchPlaceholder}
        userName={userName}
        canUpgrade={canUpgrade}
        onSelect={onSelectNav}
        onUpgrade={onUpgrade}
        onSignOut={onSignOut}
      />

      <MobileNav
        open={navOpen}
        onClose={() => setNavOpen(false)}
        items={navItems}
        activeId={activeNavId}
        searchPlaceholder={searchPlaceholder}
        userName={userName}
        canUpgrade={canUpgrade}
        onSelect={onSelectNav}
        onUpgrade={onUpgrade}
        onSignOut={onSignOut}
      />

      <div className="lg:ms-[264px]">
        <Topbar
          brandName={brandName}
          brandTagline={brandTagline}
          avatarUrl={avatarUrl}
          displayName={userName}
          isGuest={Boolean(canUpgrade)}
          onLinkGoogle={() => onUpgrade?.()}
          onSignOut={onSignOut}
          hasNotifications={hasNotifications}
          onOpenNav={() => setNavOpen(true)}
        />

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-6 md:py-8 lg:px-8">
          <div className="flex flex-col gap-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
