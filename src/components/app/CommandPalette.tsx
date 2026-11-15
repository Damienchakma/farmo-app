import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ArrowRight, Command, CornerDownLeft, MapPin, RefreshCw, Search, Sprout, Terminal, TriangleAlert, UserCog } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { api } from '@/mock/api'
import { useAsync } from '@/lib/hooks'
import { useFarm } from '@/store/farm'
import { useSession } from '@/store/session'
import { useUi, toast } from '@/store/ui'

interface PaletteAction {
  id: string
  group: 'Navigate' | 'Farms' | 'Plants' | 'Actions' | 'Demo'
  label: string
  hint?: string
  icon: React.ReactNode
  run: () => void
  keywords?: string
}

export function CommandPalette() {
  const open = useUi((s) => s.paletteOpen)
  const setOpen = useUi((s) => s.setPaletteOpen)
  const navigate = useNavigate()
  const { users, switchUser, user } = useSession()
  const bundle = useFarm((s) => s.bundle)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const projects = useAsync(() => (open ? api.listProjects() : Promise.resolve([])), [open])

  // Global ⌘K / Ctrl+K, plus "/" when not typing in a field.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
      if ((event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen(!open)
        return
      }
      if (event.key === '/' && !typing && !open) {
        event.preventDefault()
        setOpen(true)
      }
      if (event.key === 'Escape' && open) setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, setOpen])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setActive(0)
    }
  }, [open])

  const actions = useMemo<PaletteAction[]>(() => {
    const list: PaletteAction[] = [
      {
        id: 'nav-projects',
        group: 'Navigate',
        label: 'Projects overview',
        icon: <Search />,
        run: () => navigate('/projects'),
        keywords: 'dashboard home',
      },
      {
        id: 'nav-developers',
        group: 'Navigate',
        label: 'Developer API',
        icon: <Terminal />,
        run: () => navigate('/developers'),
        keywords: 'keys curl rest endpoints',
      },
      { id: 'nav-account', group: 'Navigate', label: 'Account settings', icon: <UserCog />, run: () => navigate('/account') },
    ]

    for (const { project } of projects.data ?? []) {
      list.push({
        id: `project-${project.id}`,
        group: 'Navigate',
        label: project.name,
        hint: `${project.farmIds.length} farms · ${project.region}`,
        icon: <MapPin />,
        run: () => navigate(`/projects/${project.id}`),
        keywords: project.region,
      })
      for (const farmId of project.farmIds) {
        list.push({
          id: `farm-${farmId}`,
          group: 'Farms',
          label: farmId.replace('farm-', '').replace(/-/g, ' '),
          hint: project.name,
          icon: <Sprout />,
          run: () => navigate(`/farms/${farmId}/overview`),
        })
      }
    }

    if (bundle) {
      for (const plant of bundle.plants) {
        list.push({
          id: `plant-${plant.id}`,
          group: 'Plants',
          label: `${plant.variety}`,
          hint: `${bundle.farm.name} · planted ${plant.plantedAt}`,
          icon: <Sprout />,
          run: () => navigate(`/farms/${bundle.farm.id}/plants?plant=${plant.id}`),
          keywords: plant.speciesId,
        })
      }
      list.push(
        {
          id: 'action-advice',
          group: 'Actions',
          label: 'Open advice for this farm',
          icon: <ArrowRight />,
          run: () => navigate(`/farms/${bundle.farm.id}/advice`),
        },
        {
          id: 'action-risk',
          group: 'Actions',
          label: 'Open risk register',
          icon: <TriangleAlert />,
          run: () => navigate(`/farms/${bundle.farm.id}/risk`),
        },
        {
          id: 'action-viz',
          group: 'Actions',
          label: 'Open visualisations',
          icon: <ArrowRight />,
          run: () => navigate(`/farms/${bundle.farm.id}/visualizations`),
        },
        {
          id: 'action-regen',
          group: 'Actions',
          label: 'Regenerate advice and risk',
          hint: bundle.farm.name,
          icon: <RefreshCw />,
          run: () => {
            void useFarm
              .getState()
              .regenerate(bundle.farm.id)
              .then(() => toast({ tone: 'success', title: 'Advice and risk regenerated', body: `Model ${bundle.analysis.advice.modelVersion}` }))
          },
        },
      )
    }

    list.push(
      {
        id: 'demo-switch',
        group: 'Demo',
        label: 'Switch demo user',
        hint: users.map((u) => u.name.split(' ')[0]).join(' · '),
        icon: <UserCog />,
        run: () => {
          const next = users.find((u) => u.id !== user?.id)
          if (!next) return
          void switchUser(next.id).then(() => toast({ tone: 'info', title: `Now signed in as ${next.name}` }))
        },
      },
      {
        id: 'demo-reset',
        group: 'Demo',
        label: 'Reset demo data',
        hint: 'Restores seeded projects, plants and history',
        icon: <RefreshCw />,
        run: () => {
          void api.resetDemoData().then(() => window.location.assign('/projects'))
        },
      },
    )

    return list
  }, [bundle, navigate, projects.data, switchUser, user?.id, users])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return actions
    return actions.filter((action) =>
      `${action.label} ${action.hint ?? ''} ${action.keywords ?? ''} ${action.group}`.toLowerCase().includes(q),
    )
  }, [actions, query])

  const grouped = useMemo(() => {
    const map = new Map<string, PaletteAction[]>()
    for (const action of filtered) {
      const list = map.get(action.group) ?? []
      list.push(action)
      map.set(action.group, list)
    }
    return Array.from(map.entries())
  }, [filtered])

  const flat = useMemo(() => grouped.flatMap(([, items]) => items), [grouped])

  useEffect(() => {
    setActive(0)
  }, [query])

  const runActive = (index: number) => {
    const action = flat[index]
    if (!action) return
    setOpen(false)
    // Let the dialog close before navigating so focus lands correctly.
    window.setTimeout(action.run, 10)
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[75] bg-soil-800/30" />
        <DialogPrimitive.Content
          aria-label="Command palette"
          className="fixed left-1/2 top-[10vh] z-[76] w-[calc(100vw-24px)] max-w-[620px] -translate-x-1/2 overflow-hidden rounded-sm border border-line-strong bg-paper-raised shadow-[var(--shadow-pop)] sm:top-[14vh]"
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setActive((a) => Math.min(a + 1, flat.length - 1))
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActive((a) => Math.max(a - 1, 0))
            }
            if (event.key === 'Enter') {
              event.preventDefault()
              runActive(active)
            }
          }}
        >
          <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>
          <div className="flex items-center gap-2.5 border-b border-line px-3.5 py-3">
            <Search size={16} className="flex-none text-ink-3" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Jump to a farm, plant or action…"
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
              aria-label="Search commands"
              role="combobox"
              aria-expanded
              aria-controls="palette-results"
              aria-activedescendant={flat[active]?.id}
            />
            <span className="kbd">esc</span>
          </div>

          <div id="palette-results" role="listbox" aria-label="Results" ref={listRef} className="max-h-[52vh] overflow-y-auto py-1.5">
            {!flat.length && (
              <p className="px-3.5 py-6 text-center text-sm text-ink-3">
                Nothing matches “{query}”. Try a farm name, a crop, or “reset”.
              </p>
            )}
            {grouped.map(([group, items]) => (
              <div key={group} className="pb-1">
                <p className="eyebrow px-3.5 pb-1 pt-2">{group}</p>
                {items.map((action) => {
                  const index = flat.indexOf(action)
                  const isActive = index === active
                  return (
                    <div
                      key={action.id}
                      id={action.id}
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => runActive(index)}
                      className={cn(
                        'mx-1.5 flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1.5',
                        isActive ? 'bg-paper-sunken text-ink' : 'text-ink-2',
                      )}
                    >
                      <span className="flex-none text-ink-3 [&>svg]:h-[15px] [&>svg]:w-[15px]">{action.icon}</span>
                      <span className="min-w-0 flex-1 truncate text-sm">{action.label}</span>
                      {action.hint && <span className="hidden flex-none truncate text-xs text-ink-3 sm:block sm:max-w-[220px]">{action.hint}</span>}
                      {isActive && <CornerDownLeft size={13} className="flex-none text-ink-3" aria-hidden />}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 border-t border-line bg-paper-sunken px-3.5 py-2 text-[11px] text-ink-3">
            <span className="inline-flex items-center gap-1.5">
              <Command size={11} aria-hidden />
              shortcuts work anywhere
            </span>
            <span className="ml-auto inline-flex items-center gap-1.5">
              <span className="kbd">↑</span>
              <span className="kbd">↓</span>
              to move
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="kbd">↵</span>
              to open
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
