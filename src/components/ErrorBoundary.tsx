import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

/**
 * Without this, any error thrown during render unmounts the whole tree and
 * leaves a blank page with nothing to go on. Shows the message instead.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled error:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-12">
        <div className="flex w-full max-w-[480px] flex-col gap-4 rounded-lg border border-border-subtle bg-surface p-6 shadow-card">
          <h1 className="text-card-title font-semibold text-content-primary">
            משהו השתבש בטעינת האפליקציה
          </h1>
          <p className="text-body-sm text-content-secondary">
            רעננו את הדף. אם התקלה חוזרת, שלחו את הפרטים הבאים:
          </p>
          <pre
            dir="ltr"
            className="overflow-x-auto rounded-md bg-surface-hover p-3 text-caption text-danger"
          >
            {error.message}
          </pre>
        </div>
      </main>
    )
  }
}
