import type { ReactNode } from "react"
import { cn } from "@/lib/cn"

type SectionProps = {
  title?: string
  description?: string
  actions?: ReactNode
  className?: string
  children: ReactNode
}

/**
 * A page section: optional heading row plus content, separated by the
 * standard 16px rhythm. Sections are stacked by the page at 32px.
 */
export function Section({
  title,
  description,
  actions,
  className,
  children,
}: SectionProps) {
  const labelled = Boolean(title)

  return (
    <section
      aria-label={labelled ? title : undefined}
      className={cn("flex flex-col gap-4", className)}
    >
      {labelled ? (
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-section-title font-semibold text-content-primary">
              {title}
            </h2>
            {description ? (
              <p className="text-body-sm text-content-muted">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          ) : null}
        </div>
      ) : null}

      {children}
    </section>
  )
}
