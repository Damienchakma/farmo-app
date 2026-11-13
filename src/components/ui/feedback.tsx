import { AlertTriangle, CheckCircle2, Info, Loader2, Sparkles, X, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import { useUi, type ToastTone } from '@/store/ui'

/* ---------------------------------------------------------------- Skeleton */

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn('skel', className)} style={style} aria-hidden />
}

/** Prose-shaped placeholder: lines of varying width, never one long bar. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  const widths = ['100%', '94%', '88%', '96%', '72%', '90%']
  return (
    <div className={cn('space-y-2.5', className)} role="status" aria-label="Loading content">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-[13px]" style={{ width: widths[i % widths.length] }} />
      ))}
    </div>
  )
}

export function Spinner({ className, size = 16 }: { className?: string; size?: number }) {
  return <Loader2 size={size} className={cn('animate-spin text-ink-3', className)} aria-hidden />
}

export function LoadingBlock({ label, className }: { label: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5 text-sm text-ink-3', className)} role="status">
      <Spinner size={15} />
      {label}
    </div>
  )
}

/* -------------------------------------------------------------- EmptyState */

export interface EmptyStateProps {
  illustration?: ReactNode
  title: string
  description: ReactNode
  actions?: ReactNode
  className?: string
  compact?: boolean
}

export function EmptyState({ illustration, title, description, actions, className, compact }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'px-4 py-8' : 'px-6 py-14',
        className,
      )}
    >
      {illustration && <div className="mb-4 text-soil-300">{illustration}</div>}
      <h3 className="font-display text-lg text-ink">{title}</h3>
      <div className="mt-1.5 max-w-[46ch] text-sm text-ink-2">{description}</div>
      {actions && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{actions}</div>}
    </div>
  )
}

/* ---------------------------------------------------------------- InlineAlert */

const ALERT_ICONS: Record<string, ReactNode> = {
  info: <Info size={15} aria-hidden />,
  warning: <AlertTriangle size={15} aria-hidden />,
  danger: <XCircle size={15} aria-hidden />,
  success: <CheckCircle2 size={15} aria-hidden />,
}

export function InlineAlert({
  tone = 'info',
  title,
  children,
  actions,
  className,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success'
  title?: ReactNode
  children?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  const tones = {
    info: 'border-line-strong bg-paper-sunken text-ink-2',
    warning: 'border-marigold-100 bg-marigold-50 text-soil-800',
    danger: 'border-clay-100 bg-clay-50 text-clay-700',
    success: 'border-green-100 bg-green-50 text-green-700',
  }[tone]
  return (
    <div className={cn('flex items-start gap-2.5 rounded-sm border px-3 py-2.5 text-sm', tones, className)} role="alert">
      <span className="mt-[2px] flex-none">{ALERT_ICONS[tone]}</span>
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'leading-relaxed')}>{children}</div>}
      </div>
      {actions && <div className="flex flex-none items-center gap-1.5">{actions}</div>}
    </div>
  )
}

/* ----------------------------------------------------------- RecalcBanner */

/**
 * The visible recalculation state. Announces itself to screen readers and
 * reports which property operations triggered the run when it finishes.
 */
export function RecalcBanner({
  active,
  origin,
  operations,
  className,
}: {
  active: boolean
  origin: 'auto' | 'manual'
  operations: Array<{ fieldLabel: string; before: string; after: string }>
  className?: string
}) {
  if (!active) return null
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-sm border border-marigold-100 bg-marigold-50 px-3.5 py-2.5',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Spinner size={16} className="text-marigold-700" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-soil-800">
          {origin === 'manual' ? 'Regenerating advice and risk…' : 'Recalculating advice and risk…'}
        </p>
        <p className="mt-0.5 text-xs text-soil-700">
          {operations.length
            ? `Applying ${operations.map((op) => op.fieldLabel.toLowerCase()).join(', ')} and re-scoring every section.`
            : 'Re-running the rule engine over the current property record.'}
        </p>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------- Recency */

/** "Updated 4 minutes ago" that keeps ticking while the page is open. */
export function Recency({ at, prefix = 'Updated' }: { at: string; prefix?: string }) {
  const [, force] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 30000)
    return () => window.clearInterval(id)
  }, [])
  const diff = Math.round((Date.now() - new Date(at).getTime()) / 60000)
  const label = diff < 1 ? 'just now' : diff < 60 ? `${diff} min ago` : `${Math.round(diff / 60)} h ago`
  return (
    <span className="text-xs text-ink-3">
      {prefix} {label}
    </span>
  )
}

/* ------------------------------------------------------------------ Toaster */

const TOAST_ICONS: Record<ToastTone, ReactNode> = {
  info: <Info size={16} aria-hidden />,
  success: <CheckCircle2 size={16} aria-hidden />,
  warning: <AlertTriangle size={16} aria-hidden />,
  danger: <XCircle size={16} aria-hidden />,
  code: <Sparkles size={16} aria-hidden />,
}

const TOAST_TONES: Record<ToastTone, { bar: string; icon: string }> = {
  info: { bar: 'bg-soil-300', icon: 'text-ink-2' },
  success: { bar: 'bg-green-600', icon: 'text-green-700' },
  warning: { bar: 'bg-marigold-500', icon: 'text-marigold-700' },
  danger: { bar: 'bg-clay-600', icon: 'text-clay-700' },
  code: { bar: 'bg-ink', icon: 'text-ink' },
}

export function Toaster() {
  const toasts = useUi((s) => s.toasts)
  const dismiss = useUi((s) => s.dismissToast)
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-start gap-2 p-3 sm:inset-x-auto sm:left-4 sm:bottom-4 sm:w-[380px]"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex w-full items-stretch overflow-hidden rounded-sm border border-line-strong bg-paper-raised shadow-[var(--shadow-pop)] fade-up"
        >
          <span className={cn('w-[3px] flex-none', TOAST_TONES[t.tone].bar)} aria-hidden />
          <div className="flex min-w-0 flex-1 items-start gap-2.5 px-3 py-2.5">
            <span className={cn('mt-[2px] flex-none', TOAST_TONES[t.tone].icon)}>{TOAST_ICONS[t.tone]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{t.title}</p>
              {t.body && <p className="mt-0.5 text-xs leading-relaxed text-ink-2">{t.body}</p>}
              {t.code && (
                <p className="mt-1.5 flex items-center gap-2">
                  <span className="font-mono text-[15px] font-semibold tracking-[0.3em] text-ink">{t.code}</span>
                  <button
                    type="button"
                    className="link text-[11px]"
                    onClick={() => {
                      void navigator.clipboard?.writeText(t.code ?? '')
                    }}
                  >
                    copy
                  </button>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="-mr-1 -mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-sm text-ink-3 hover:bg-paper-sunken hover:text-ink"
              aria-label="Dismiss notification"
            >
              <X size={13} aria-hidden />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
