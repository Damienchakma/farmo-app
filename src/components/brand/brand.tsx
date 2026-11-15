import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ Wordmark */

/** The Farmo mark: a plot seen in plan, three furrows and a sun. */
export function FarmoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="Farmo"
      focusable="false"
    >
      <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="5.25" fill="var(--color-paper)" stroke="var(--color-line-strong)" />
      <g fill="none" stroke="var(--color-green-600)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.4 25.6 11.6 17.4h8.8l5.2 8.2z" />
        <path d="M13.4 21.6h5.2" />
      </g>
      <circle cx="16" cy="9.6" r="2.7" fill="var(--color-marigold-500)" />
      <path d="M8.6 13.4h14.8" stroke="var(--color-green-600)" strokeWidth="1.4" strokeLinecap="round" opacity="0.35" />
    </svg>
  )
}

export function Wordmark({
  size = 28,
  className,
  showTagline = false,
}: {
  size?: number
  className?: string
  showTagline?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <FarmoMark size={size} />
      <span className="flex flex-col leading-none">
        <span
          className="font-display font-semibold tracking-[-0.02em] text-ink"
          style={{ fontSize: size * 0.78 }}
        >
          Farmo
        </span>
        {showTagline && (
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-ink-3">
            Farm decision support
          </span>
        )}
      </span>
    </span>
  )
}

/* --------------------------------------------------------------- Patterns */

/**
 * Furrow texture for page headers, auth panels and empty states. Tiled at its
 * natural scale — never stretched, or it stops reading as a field surface.
 */
export function FieldPattern({
  className,
  opacity = 1,
  variant = 'furrows',
}: {
  className?: string
  opacity?: number
  variant?: 'furrows' | 'stipple' | 'strata'
}) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0',
        variant === 'furrows' && 'field-furrows',
        variant === 'stipple' && 'field-stipple',
        variant === 'strata' && 'soil-strata',
        className,
      )}
      style={{ opacity }}
      aria-hidden
    />
  )
}

/* ---------------------------------------------------------- Illustrations */

const ILLUSTRATION_STROKE = 'var(--color-soil-300)'

/** Empty ledger / no projects: a plot with stakes and a furrow line. */
export function PlotIllustration({ className }: { className?: string }) {
  return (
    <svg width="168" height="104" viewBox="0 0 168 104" className={className} aria-hidden focusable="false">
      <g fill="none" stroke={ILLUSTRATION_STROKE} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 88h140" />
        <path d="M28 88 40 60h88l12 28z" />
        <path d="M48 74h72" strokeDasharray="4 5" />
        <path d="M60 60V44M108 60V44" />
        <path d="M60 46c6-3 10-3 14-1-4 5-9 6-14 1zM108 46c-6-3-10-3-14-1 4 5 9 6 14 1z" />
        <path d="M132 34c4-5 10-6 15-3" opacity="0.7" />
      </g>
      <circle cx="36" cy="30" r="4.5" fill="none" stroke={ILLUSTRATION_STROKE} strokeWidth="1.4" />
    </svg>
  )
}

/** No plants yet: a seedling breaking a soil line, with sampling marks. */
export function SeedlingIllustration({ className }: { className?: string }) {
  return (
    <svg width="160" height="104" viewBox="0 0 160 104" className={className} aria-hidden focusable="false">
      <g fill="none" stroke={ILLUSTRATION_STROKE} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 72h140" />
        <path d="M36 78c14 0 22 4 30 4s18-5 30-5 24 6 34 6" strokeDasharray="3 6" />
        <path d="M80 72V40" />
        <path d="M80 52c-11-1-18-7-20-17 10-1 18 5 20 17z" />
        <path d="M80 46c9-4 15-11 15-21-9 1-15 9-15 21z" />
        <path d="M28 92h16M56 92h8M102 92h14" opacity="0.8" />
      </g>
    </svg>
  )
}

/** No invitations: an opened envelope on a desk line. */
export function EnvelopeIllustration({ className }: { className?: string }) {
  return (
    <svg width="150" height="96" viewBox="0 0 150 96" className={className} aria-hidden focusable="false">
      <g fill="none" stroke={ILLUSTRATION_STROKE} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 84h126" />
        <path d="M28 84V40l47-24 47 24v44" />
        <path d="M28 40l47 26 47-26" />
        <path d="M40 84V60h20v24" opacity="0.8" />
        <path d="M96 62h16M96 70h16" opacity="0.8" />
      </g>
    </svg>
  )
}

/** Chart empty state: axes with a rising hand-drawn line. */
export function GraphIllustration({ className }: { className?: string }) {
  return (
    <svg width="150" height="96" viewBox="0 0 150 96" className={className} aria-hidden focusable="false">
      <g fill="none" stroke={ILLUSTRATION_STROKE} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12v70h116" />
        <path d="M34 70c14-4 20-16 30-24s18 4 28-10 14-16 22-18" />
        <path d="M34 76h96" strokeDasharray="3 6" opacity="0.7" />
        <path d="M34 26h96" strokeDasharray="3 6" opacity="0.4" />
      </g>
      <circle cx="114" cy="18" r="3.5" fill="none" stroke={ILLUSTRATION_STROKE} strokeWidth="1.4" />
    </svg>
  )
}

/** 404: a lonely marker post at the edge of a field. */
export function OffFieldIllustration({ className }: { className?: string }) {
  return (
    <svg width="200" height="120" viewBox="0 0 200 120" className={className} aria-hidden focusable="false">
      <g fill="none" stroke={ILLUSTRATION_STROKE} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 96h172" />
        <path d="M14 108c26-3 50 3 74 0s56-4 98-1" strokeDasharray="3 7" opacity="0.7" />
        <path d="M100 96V40" />
        <path d="M86 52h28l-6 11H92z" />
        <path d="M100 40c8-6 16-8 24-6" opacity="0.8" />
        <path d="M60 78l10-10M140 78l-10-10" opacity="0.6" />
        <path d="M46 66h12M142 66h12" opacity="0.5" />
      </g>
    </svg>
  )
}
