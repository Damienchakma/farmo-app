import { Info } from 'lucide-react'
import { ChangeChip } from '@/components/ui/data'

export interface DriverLike {
  field?: string
  label: string
  before: string
  after: string
}

/**
 * The honest trail: which property changes caused the advice and risk on
 * screen to be what they are. Renders nothing when a run had no trigger
 * (for example the very first generation).
 */
export function UpdatedBecause({ drivers, compact }: { drivers: DriverLike[]; compact?: boolean }) {
  if (!drivers.length) return null
  return (
    <div className={compact ? '' : 'rounded-sm border border-marigold-100 bg-marigold-50 px-3.5 py-3'}>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-soil-800">
        <Info size={12} aria-hidden />
        Updated because {drivers.length === 1 ? 'this changed' : `these ${drivers.length} properties changed`}
      </p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {drivers.map((driver, index) => (
          <li key={`${driver.label}-${index}`}>
            <ChangeChip field={driver.label} before={driver.before} after={driver.after} />
          </li>
        ))}
      </ul>
    </div>
  )
}
