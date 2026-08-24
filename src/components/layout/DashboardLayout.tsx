import { useState } from "react"
import type { ReactNode } from "react"
import { Sidebar, type NavItem } from "./Sidebar"
import { MobileNav } from "./MobileNav"
import { Topbar } from "./Topbar"

type DashboardLayoutProps = {
  brandName: string
  brandTagline: string
  navItems: NavItem[]
  activeNavId: string
  searchPlaceholder: string
  searchQuery: string
  onSearch: (query: string) => void
  onClearSearch: () => void
  userName: string
  avatarUrl: string
  canUpgrade?: boolean
  userId: string | undefined
  onSelectNav: (id: string) => void
  onUpgrade?: () => void
  onSignOut: () => void
  /** Opens the relevant sentence's completions context from a notification. */
  onOpenNotification: (sentenceId: string) => void
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
  searchQuery,
  onSearch,
  onClearSearch,
  userName,
  avatarUrl,
  canUpgrade,
  userId,
  onSelectNav,
  onUpgrade,
  onSignOut,
  onOpenNotification,
  children,
}: DashboardLayoutProps) {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar
        items={navItems}
        activeId={activeNavId}
        searchPlaceholder={searchPlaceholder}
        searchQuery={searchQuery}
        onSearch={onSearch}
        onClearSearch={onClearSearch}
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
        searchQuery={searchQuery}
        onSearch={onSearch}
        onClearSearch={onClearSearch}
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
          userId={userId}
          onLinkGoogle={() => onUpgrade?.()}
          onSignOut={onSignOut}
          onOpenNav={() => setNavOpen(true)}
          onOpenNotification={onOpenNotification}
        />

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-6 md:py-8 lg:px-8">
          <div className="flex flex-col gap-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
