import type { AdviceBlock } from '@/mock/types'

/** Renders the advice/risk block types with the agronomic prose styles. */
export function AdviceBlocks({ blocks }: { blocks: AdviceBlock[] }) {
  return (
    <div className="prose-agronomy">
      {blocks.map((block, index) => {
        if (block.kind === 'p') return <p key={index}>{block.text}</p>
        if (block.kind === 'list') {
          return (
            <ul key={index}>
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )
        }
        if (block.kind === 'why') {
          return (
            <div className="why" key={index}>
              <span className="why-label">{block.label}</span>
              {block.text}
            </div>
          )
        }
        return (
          <div key={index} className="rounded-sm border border-line bg-paper-sunken/60">
            <p className="eyebrow border-b border-line px-3 py-2">{block.caption}</p>
            <ul className="divide-y divide-line">
              {block.rows.map((row) => (
                <li key={row.label} className="grid gap-1 px-3 py-2.5 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_auto] sm:items-baseline sm:gap-4">
                  <span className="text-sm font-semibold text-ink">{row.label}</span>
                  <span className="text-sm text-ink-2">{row.detail}</span>
                  <span className="tnum text-xs font-medium text-marigold-700">{row.when}</span>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

/** Driver list shown inside risk items and section footers. */
export function Drivers({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div>
      <p className="eyebrow mb-1.5">{title}</p>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li key={item}>
            <span className="inline-flex items-center rounded-sm border border-line bg-paper-sunken px-1.5 py-0.5 font-mono text-[11px] text-ink-2">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
