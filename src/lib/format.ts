import { AREA_UNIT_BY_ID, KG_PER_TONNE } from '@/mock/catalog/geography'
import type { Area, AreaUnit, Severity } from '@/mock/types'

/* ------------------------------------------------------------------ numbers */

/** Money in US dollars; compact form for headline figures. */
export function formatMoney(amount: number, options: { compact?: boolean; decimals?: number } = {}): string {
  if (options.compact) {
    if (Math.abs(amount) >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`
    if (Math.abs(amount) >= 10000) return `$${(amount / 1000).toFixed(0)}k`
  }
  return `$${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: options.decimals ?? 0,
    minimumFractionDigits: options.decimals ?? 0,
  }).format(amount)}`
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value)
}

export function formatPercent(value: number, decimals = 0): string {
  return `${formatNumber(value, decimals)} %`
}

export function formatArea(area: Area): string {
  const info = AREA_UNIT_BY_ID.get(area.unit)
  const plural = area.value === 1 ? (info?.label ?? area.unit) : (info?.plural ?? area.unit)
  const value = Number.isInteger(area.value) ? area.value : Number(area.value.toFixed(2))
  return `${value} ${plural}`
}

export function areaIn(area: Area, unit: AreaUnit): number {
  const from = AREA_UNIT_BY_ID.get(area.unit)?.toAcre ?? 1
  const to = AREA_UNIT_BY_ID.get(unit)?.toAcre ?? 1
  return (area.value * from) / to
}

export function tonnesToKg(tonnes: number): number {
  return tonnes * KG_PER_TONNE
}

/* --------------------------------------------------------------------- dates */

export function formatDate(input: string | Date, style: 'short' | 'medium' | 'long' | 'dayMonth' = 'medium'): string {
  const date = typeof input === 'string' ? new Date(input.length <= 10 ? `${input}T00:00:00` : input) : input
  if (Number.isNaN(date.getTime())) return '—'
  switch (style) {
    case 'short':
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    case 'dayMonth':
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    case 'long':
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    default:
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }
}

export function formatDateTime(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(date.getTime())) return '—'
  return `${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

export function relativeTime(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(date.getTime())) return '—'
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.round(diffMs / 60000)
  if (Math.abs(minutes) < 1) return 'just now'
  if (Math.abs(minutes) < 60) return minutes > 0 ? `${minutes} min ago` : `in ${Math.abs(minutes)} min`
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return hours > 0 ? `${hours} h ago` : `in ${Math.abs(hours)} h`
  const days = Math.round(hours / 24)
  if (Math.abs(days) < 30) return days > 0 ? `${days} d ago` : `in ${Math.abs(days)} d`
  return formatDate(date)
}

export function dayName(input: string): string {
  const date = new Date(`${input}T00:00:00`)
  return date.toLocaleDateString('en-GB', { weekday: 'short' })
}

/* ------------------------------------------------------------------- labels */

export const SEVERITY_LABELS: Record<Severity, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  critical: 'Critical',
}

export function severityTone(s: Severity): 'green' | 'marigold' | 'clay' | 'critical' {
  return s === 'low' ? 'green' : s === 'moderate' ? 'marigold' : s === 'high' ? 'clay' : 'critical'
}

/** "sandy-loam" → "Sandy loam" without touching acronyms. */
export function titleCase(input: string): string {
  return input.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}

export function humanise(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/-/g, ' ')
    .replace(/^./, (m) => m.toUpperCase())
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
