import { useState } from 'react'
import type { ReactNode } from 'react'
import { Sidebar, type NavItem } from './Sidebar'
import { MobileNav } from './MobileNav'
import { Topbar } from './Topbar'

type DashboardLayoutProps = {
  productName: string
  tagline: string
  navItems: NavItem[]
  activeNavId: string
  pageTitle: string
  hasNotifications?: boolean
  children: ReactNode
}

/**
 * Application shell: fixed sidebar (inline-end, RTL-aware), sticky topbar and
 * a max-width content column. All page content is rendered into `children`.
 */
export function DashboardLayout({
  productName,
  tagline,
  navItems,
  activeNavId,
  pageTitle,
  hasNotifications,
  children,
}: DashboardLayoutProps) {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar
        items={navItems}
        activeId={activeNavId}
        productName={productName}
        tagline={tagline}
      />

      <MobileNav
        open={navOpen}
        onClose={() => setNavOpen(false)}
        items={navItems}
        activeId={activeNavId}
        productName={productName}
        tagline={tagline}
      />

      <div className="lg:ms-[264px]">
        <Topbar
          title={pageTitle}
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
