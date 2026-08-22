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
  hasNotifications?: boolean
  children: ReactNode
}

/**
 * Application shell: fixed sidebar (inline-start, RTL-aware) holding search and
 * navigation, a sticky topbar carrying the brand and account controls, and a
 * max-width content column.
 */
export function DashboardLayout({
  brandName,
  brandTagline,
  navItems,
  activeNavId,
  searchPlaceholder,
  hasNotifications,
  children,
}: DashboardLayoutProps) {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar items={navItems} activeId={activeNavId} searchPlaceholder={searchPlaceholder} />

      <MobileNav
        open={navOpen}
        onClose={() => setNavOpen(false)}
        items={navItems}
        activeId={activeNavId}
        searchPlaceholder={searchPlaceholder}
      />

      <div className="lg:ms-[264px]">
        <Topbar
          brandName={brandName}
          brandTagline={brandTagline}
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
