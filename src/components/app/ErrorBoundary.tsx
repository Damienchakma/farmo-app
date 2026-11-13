import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/controls'
import { OffFieldIllustration } from '@/components/brand/brand'

interface Props {
  children: ReactNode
  /** Optional label so a crashed panel can say where it broke. */
  scope?: string
}

interface State {
  error: Error | null
  info: string | null
}

/** Route- and panel-level boundary so one bad render never blanks the app. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, info: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ info: info.componentStack ?? null })
    // Surface it in the console too — the screenshot script fails loudly on these.
    console.error(`[Farmo] ${this.props.scope ?? 'screen'} crashed`, error, info.componentStack)
  }

  override render(): ReactNode {
    const { error, info } = this.state
    if (!error) return this.props.children
    return (
      <div className="mx-auto max-w-[560px] py-10 text-center">
        <div className="mb-4 flex justify-center text-soil-300">
          <OffFieldIllustration />
        </div>
        <h1 className="font-display text-2xl text-ink">This {this.props.scope ?? 'screen'} stopped rendering</h1>
        <p className="mx-auto mt-2 max-w-[52ch] text-sm text-ink-2">
          Something in the property record produced a value the view could not draw. Your data is untouched — the mock
          layer keeps it in local storage.
        </p>
        <div className="mx-auto mt-4 max-w-[520px] rounded-sm border border-clay-100 bg-clay-50 p-3 text-left">
          <p className="font-mono text-xs text-clay-700">{error.message}</p>
          {info && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-medium text-clay-700">Component stack</summary>
              <pre className="mt-2 max-h-[180px] overflow-auto whitespace-pre-wrap font-mono text-[11px] text-clay-700">
                {info}
              </pre>
            </details>
          )}
        </div>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Button variant="primary" onClick={() => this.setState({ error: null, info: null })}>
            Try again
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reload the demo
          </Button>
        </div>
      </div>
    )
  }
}
