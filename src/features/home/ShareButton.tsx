import { useEffect, useRef, useState } from "react"
import { Icon } from "@/components/ui/Icon"
import { assets } from "@/lib/assets"
import { buildEdgeShareUrl } from "@/lib/deepLink"
import { cn } from "@/lib/cn"

type ShareButtonProps = {
  sentenceText: string
  sentenceId: string
  /** The completion currently shown as the card's leading completion — the
   *  one the shared link must point to. */
  completionId: string
  completionText: string
}

const canNativeShare = typeof navigator !== "undefined" && "share" in navigator

/**
 * "שתף" on the main feed card only — never inside the completions
 * popover/sheet or on an individual completion row. Sharing is a
 * sentence-card-level action; liking and browsing completions happen there.
 */
export function ShareButton({
  sentenceText,
  sentenceId,
  completionId,
  completionText,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("mousedown", onPointerDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("mousedown", onPointerDown)
    }
  }, [open])

  const handleShareClick = async () => {
    const url = buildEdgeShareUrl(sentenceId, completionId)

    if (canNativeShare) {
      try {
        await navigator.share({
          title: `${sentenceText}... | המשלים שלי`,
          text: completionText,
          url,
        })
      } catch {
        // AbortError when the person cancels the native sheet — not a
        // failure worth surfacing.
      }
      return
    }

    setOpen((value) => !value)
  }

  const copyLink = async () => {
    const url = buildEdgeShareUrl(sentenceId, completionId)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable (e.g. a non-secure context) — the popover
      // still shows the raw link below, so it can be copied by hand.
    }
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    `${sentenceText}... ${completionText}\n${buildEdgeShareUrl(sentenceId, completionId)}`,
  )}`

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup={canNativeShare ? undefined : "dialog"}
        aria-expanded={canNativeShare ? undefined : open}
        aria-label="שתף את המשפט וההשלמה"
        onClick={() => void handleShareClick()}
        className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-body-sm font-medium text-content-secondary shadow-card transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover hover:text-content-primary active:bg-surface-muted"
      >
        <Icon src={assets.iconShare} size="xs" />
        שתף
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="שיתוף"
          className={cn(
            "absolute bottom-full z-40 mb-2 w-[240px] max-w-[calc(100vw-2rem)]",
            "flex flex-col gap-1 rounded-lg border border-border-subtle bg-surface p-2 shadow-overlay",
            "animate-notifications-in",
          )}
        >
          <button
            type="button"
            onClick={() => void copyLink()}
            className="flex h-10 w-full items-center gap-2.5 rounded-md px-2 text-body-sm text-content-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-content-primary"
          >
            <Icon src={assets.iconLink} size="xs" className="opacity-70" />
            {copied ? "הקישור הועתק" : "העתק קישור"}
          </button>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex h-10 w-full items-center gap-2.5 rounded-md px-2 text-body-sm text-content-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-content-primary"
          >
            <Icon src={assets.iconChat} size="xs" className="opacity-70" />
            WhatsApp
          </a>
        </div>
      ) : null}
    </div>
  )
}
