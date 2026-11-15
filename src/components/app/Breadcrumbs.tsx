import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export interface Crumb {
  label: string
  to?: string
}

/** Breadcrumbs: the last crumb is the current page and is not a link. */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  if (!crumbs.length) return null
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-xs">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1
          return (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {index > 0 && <ChevronRight size={12} className="flex-none text-soil-300" aria-hidden />}
              {crumb.to && !last ? (
                <Link to={crumb.to} className="truncate text-ink-3 hover:text-ink hover:underline">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className="truncate font-medium text-ink">
                  {crumb.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
