import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ Panel */

export interface PanelProps {
  children: ReactNode
  className?: string
  /** Anchor target for in-page links (advice sections). */
  id?: string
  /** Panels with a coloured top rule carry meaning: they are attention surfaces. */
  accent?: 'none' | 'green' | 'marigold' | 'clay'
}

export function Panel({ children, className, id, accent = 'none' }: PanelProps) {
  return (
    <section
      id={id}
      className={cn(
        'panel overflow-hidden',
        accent === 'green' && 'border-t-2 border-t-green-600',
        accent === 'marigold' && 'border-t-2 border-t-marigold-500',
        accent === 'clay' && 'border-t-2 border-t-clay-600',
        className,
      )}
    >
      {children}
    </section>
  )
}

export interface PanelHeadProps {
  title: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  /** Renders the title in the display face — for panels that open a section. */
  display?: boolean
  className?: string
}

export function PanelHead({ title, meta, actions, display, className }: PanelHeadProps) {
  return (
    <header className={cn('panel-head', className)}>
      <div className="min-w-0">
        <h2
          className={cn(
            'truncate',
            display ? 'font-display text-lg text-ink' : 'text-sm font-semibold text-ink',
          )}
        >
          {title}
        </h2>
        {meta && <p className="mt-0.5 text-xs text-ink-3">{meta}</p>}
      </div>
      {actions && <div className="flex flex-none items-center gap-1.5">{actions}</div>}
    </header>
  )
}

export function PanelBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('panel-body', className)}>{children}</div>
}

export function PanelFoot({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <footer className={cn('flex items-center justify-between gap-3 border-t border-line bg-paper-sunken px-4 py-2.5', className)}>
      {children}
    </footer>
  )
}

/* -------------------------------------------------------------------- Well */

export function Well({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-sm border border-line bg-paper-sunken px-3.5 py-3', className)}>{children}</div>
  )
}

/* ------------------------------------------------------- Section heading */

export interface SectionHeadProps {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  id?: string
}

export function SectionHead({ eyebrow, title, description, actions, id }: SectionHeadProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 max-w-[62ch]">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h2 id={id} className="font-display text-xl text-ink">
          {title}
        </h2>
        {description && <p className="mt-1.5 text-sm text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-none items-center gap-2">{actions}</div>}
    </div>
  )
}

/* ------------------------------------------------------------- Hand rule */

/** A slightly irregular rule — the hand-ruled line of a paper ledger. */
export function HandRule({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-[6px] w-full text-line-strong', className)}
      viewBox="0 0 400 6"
      preserveAspectRatio="none"
      aria-hidden
      focusable="false"
    >
      <path
        d="M0 3.2C40 2.1 78 4.4 120 3.1s74-2.6 116-1.3 66 2.8 108 1.6 42-1.4 56-1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  )
}

/* --------------------------------------------------------------- Divider */

export function Divider({ className, label }: { className?: string; label?: string }) {
  if (!label) return <hr className={cn('divider my-4', className)} />
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <hr className="divider flex-1" />
      <span className="eyebrow">{label}</span>
      <hr className="divider flex-1" />
    </div>
  )
}
