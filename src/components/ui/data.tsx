import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from 'lucide-react'
import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { SEVERITY_LABELS } from '@/lib/format'
import type { Severity } from '@/mock/types'

/* ------------------------------------------------------------------- Stamps */

export type StampTone = 'neutral' | 'green' | 'marigold' | 'clay' | 'critical' | 'ink' | 'plain'

export function Stamp({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: StampTone
  className?: string
}) {
  return (
    <span
      className={cn(
        'stamp',
        tone === 'green' && 'stamp-green',
        tone === 'marigold' && 'stamp-marigold',
        tone === 'clay' && 'stamp-clay',
        tone === 'critical' && 'stamp-critical',
        tone === 'ink' && 'stamp-ink',
        tone === 'plain' && 'stamp-plain',
        className,
      )}
    >
      {children}
    </span>
  )
}

const SEVERITY_TONES: Record<Severity, StampTone> = {
  low: 'green',
  moderate: 'marigold',
  high: 'clay',
  critical: 'critical',
}

/** Severity is always spelled out — colour is a second signal, never the only one. */
export function SeverityStamp({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <Stamp tone={SEVERITY_TONES[severity]} className={className}>
      {SEVERITY_LABELS[severity]}
    </Stamp>
  )
}

export function ModelStamp({ model, confidence }: { model: string; confidence?: number }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] text-ink-3">
      <span>{model}</span>
      {confidence !== undefined && <span className="text-soil-500">conf. {(confidence * 100).toFixed(0)} %</span>}
    </span>
  )
}

/* --------------------------------------------------------------------- Stat */

export interface StatProps {
  label: string
  value: ReactNode
  unit?: string
  /** Short qualifier under the figure. */
  note?: ReactNode
  delta?: { direction: 'up' | 'down' | 'flat'; text: string; good?: boolean }
  size?: 'md' | 'lg'
  className?: string
}

export function Stat({ label, value, unit, note, delta, size = 'md', className }: StatProps) {
  const DeltaIcon = delta?.direction === 'up' ? ArrowUpRight : delta?.direction === 'down' ? ArrowDownRight : Minus
  const deltaTone =
    delta && delta.direction !== 'flat'
      ? delta.good === false
        ? 'text-clay-700'
        : 'text-green-700'
      : 'text-ink-3'
  return (
    <div className={cn('min-w-0', className)}>
      <p className="eyebrow">{label}</p>
      <p
        className={cn(
          'tnum mt-1.5 font-display leading-none text-ink',
          size === 'lg' ? 'text-3xl' : 'text-2xl',
        )}
      >
        {value}
        {unit && <span className="ml-1 font-sans text-xs font-medium text-ink-3">{unit}</span>}
      </p>
      {(note || delta) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {delta && (
            <span className={cn('inline-flex items-center gap-0.5 font-medium', deltaTone)}>
              <DeltaIcon size={12} aria-hidden />
              {delta.text}
            </span>
          )}
          {note && <span className="text-ink-3">{note}</span>}
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------- Meter */

export function Meter({
  value,
  max = 100,
  tone = 'green',
  label,
  valueLabel,
  className,
}: {
  value: number
  max?: number
  tone?: 'green' | 'warn' | 'danger'
  label?: string
  valueLabel?: string
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className={cn('min-w-0', className)}>
      {(label || valueLabel) && (
        <div className="mb-1 flex items-baseline justify-between gap-3">
          {label && <span className="text-xs font-medium text-ink-2">{label}</span>}
          {valueLabel && <span className="tnum text-xs text-ink-3">{valueLabel}</span>}
        </div>
      )}
      <div
        className={cn('meter', tone === 'warn' && 'meter-warn', tone === 'danger' && 'meter-danger')}
        role="meter"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label ?? 'value'}
      >
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------- Ledger */

export function Ledger({
  children,
  className,
  responsive = true,
  caption,
}: {
  children: ReactNode
  className?: string
  responsive?: boolean
  caption?: ReactNode
}) {
  return (
    <table className={cn('ledger', responsive && 'ledger-responsive', className)}>
      {caption && <caption>{caption}</caption>}
      {children}
    </table>
  )
}

export function Th({ children, className, numeric, ...rest }: ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th scope="col" className={cn(numeric && 'num', className)} {...rest}>
      {children}
    </th>
  )
}

export function Td({
  children,
  className,
  numeric,
  label,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean; label?: string }) {
  return (
    <td className={cn(numeric && 'num', className)} data-label={label} {...rest}>
      {children}
    </td>
  )
}

/* ----------------------------------------------------------------- KeyValue */

export function KeyValue({
  items,
  className,
  columns = 2,
}: {
  items: Array<{ label: string; value: ReactNode; hint?: string }>
  className?: string
  columns?: 1 | 2 | 3
}) {
  return (
    <dl
      className={cn(
        'grid gap-x-6 gap-y-3.5',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0 border-t border-line pt-2.5">
          <dt className="eyebrow">{item.label}</dt>
          <dd className="mt-1 text-sm text-ink">{item.value}</dd>
          {item.hint && <dd className="mt-0.5 text-xs text-ink-3">{item.hint}</dd>}
        </div>
      ))}
    </dl>
  )
}

/* --------------------------------------------------------------- ChangeChip */

export function ChangeChip({
  field,
  before,
  after,
  className,
}: {
  field: string
  before: string
  after: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-1.5 rounded-sm border border-marigold-100 bg-marigold-50 px-1.5 py-0.5 text-xs',
        className,
      )}
    >
      <span className="font-medium text-ink-2">{field}</span>
      <span className="tnum text-ink-3 line-through decoration-clay-500/60">{before}</span>
      <ArrowRight size={11} className="self-center text-marigold-700" aria-hidden />
      <span className="tnum font-semibold text-ink">{after}</span>
    </span>
  )
}

/* ------------------------------------------------------------ InlineLabel */

/** Dense "label: value" pair used in card headers and chart legends. */
export function MetaPair({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-baseline gap-1.5 text-xs', className)}>
      <span className="text-ink-3">{label}</span>
      <span className="tnum font-medium text-ink-2">{value}</span>
    </span>
  )
}
