import { useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"
import type { ReactNode } from "react"
import { GoogleIcon } from "./ProviderIcons"
import { SignOutIcon } from "./MenuIcons"
import { cn } from "@/lib/cn"

type AccountMenuProps = {
  displayName: string
  avatarUrl: string
  /** Guests get the "אורח" label and the Google upgrade action. */
  isGuest: boolean
  onLinkGoogle: () => void
  onSignOut: () => void
}

type ItemProps = {
  icon: ReactNode
  children: ReactNode
  onClick: () => void
  emphasis?: boolean
}

function MenuItem({ icon, children, onClick, emphasis }: ItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 text-start transition-colors duration-150",
        emphasis ? "h-11 text-body font-medium" : "h-10 text-body",
        emphasis
          ? "border border-border bg-surface text-content-primary shadow-card hover:bg-surface-hover hover:border-border-strong"
          : "text-content-secondary hover:bg-surface-hover hover:text-content-primary",
      )}
    >
      <span className="flex size-5 shrink-0 items-center justify-center">
        {icon}
      </span>
      <span className="truncate">{children}</span>
    </button>
  )
}

/**
 * Account control in the header: a compact avatar + name trigger that opens a
 * dropdown on desktop and a bottom sheet on mobile.
 */
export function AccountMenu({
  displayName,
  avatarUrl,
  isGuest,
  onLinkGoogle,
  onSignOut,
}: AccountMenuProps) {
  const [open, setOpen] = useState(false)
  // The header uses `backdrop-blur`, which makes it the containing block for
  // `position: fixed` descendants — a bottom sheet rendered inside it would be
  // pinned to the header instead of the viewport. The sheet is therefore
  // portalled to <body>; the desktop dropdown is absolutely positioned against
  // the trigger and stays put.
  const [isCompact, setIsCompact] = useState(
    () =>
      typeof window !== "undefined" &&
      !window.matchMedia("(min-width: 640px)").matches,
  )
  const containerRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    const query = window.matchMedia("(min-width: 640px)")
    const sync = () => setIsCompact(!query.matches)
    sync()
    query.addEventListener("change", sync)
    return () => query.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) return
      // The portalled sheet lives outside the container.
      if ((target as HTMLElement).closest?.("[data-account-menu]")) return
      setOpen(false)
    }

    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("mousedown", onPointerDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("mousedown", onPointerDown)
    }
  }, [open])

  const run = (action?: () => void) => () => {
    setOpen(false)
    action?.()
  }

  const identity = (
    <div className="flex items-center gap-3">
      <img
        src={avatarUrl}
        alt=""
        aria-hidden
        width={40}
        height={40}
        className="size-10 shrink-0 rounded-full bg-surface-secondary object-cover"
      />
      <div className="flex min-w-0 flex-col">
        <span className="text-body font-medium leading-snug text-content-primary [overflow-wrap:anywhere]">
          {displayName}
        </span>
        {isGuest ? (
          <span className="text-caption text-content-muted">אורח</span>
        ) : null}
      </div>
    </div>
  )

  const panel = (
    <>
      <div className="px-1 pb-1 sm:px-2 sm:pt-1">{identity}</div>
      <div className="h-px bg-border" aria-hidden />

      {isGuest ? (
        <>
          <div className="flex flex-col gap-1">
            <MenuItem
              icon={<GoogleIcon />}
              emphasis
              onClick={run(onLinkGoogle)}
            >
              כניסה עם Google
            </MenuItem>
          </div>
          <div className="h-px bg-border" aria-hidden />
        </>
      ) : null}

      <MenuItem icon={<SignOutIcon />} onClick={run(onSignOut)}>
        יציאה
      </MenuItem>
    </>
  )

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex items-center gap-2 rounded-full p-1 transition-colors duration-150 sm:pe-3",
          "hover:bg-surface-hover",
          open && "bg-surface-hover",
        )}
      >
        <img
          src={avatarUrl}
          alt={`חשבון: ${displayName}`}
          width={40}
          height={40}
          className="size-10 shrink-0 rounded-full border-2 border-border-strong bg-surface-secondary object-cover"
        />
        <span className="hidden max-w-[170px] truncate text-body-sm font-medium text-content-primary sm:block">
          {displayName}
        </span>
      </button>

      {open && !isCompact ? (
        <div
          id={menuId}
          role="menu"
          aria-label="תפריט חשבון"
          data-account-menu
          className={cn(
            "absolute end-0 top-full z-50 mt-2 flex w-[288px] max-w-[calc(100vw-2rem)]",
            "flex-col gap-2 rounded-lg border border-border-subtle bg-surface p-2 shadow-overlay",
          )}
        >
          {panel}
        </div>
      ) : null}

      {open && isCompact
        ? createPortal(
            <div data-account-menu>
              <div
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-40 bg-content-primary/35"
                aria-hidden
              />
              <div
                id={menuId}
                role="menu"
                aria-label="תפריט חשבון"
                dir="rtl"
                className={cn(
                  "fixed inset-x-0 bottom-0 z-50 flex flex-col gap-2 rounded-t-lg",
                  "border border-border-subtle bg-surface p-4 pb-6 shadow-overlay",
                )}
              >
                {panel}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
