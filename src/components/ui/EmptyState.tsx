import type { ReactNode } from 'react'
import { Card } from './Card'

type EmptyStateProps = {
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card padding="lg">
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <h3 className="text-card-title font-semibold text-content-primary">{title}</h3>
        {description ? (
          <p className="max-w-[420px] text-body-sm text-content-muted">{description}</p>
        ) : null}
        {action ? <div className="pt-1">{action}</div> : null}
      </div>
    </Card>
  )
}
