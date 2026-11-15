import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowRight,
  ChevronRight,
  Coins,
  Layers,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Sprout,
  Trash2,
  TriangleAlert,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { PlotIllustration } from '@/components/brand/brand'
import { Button, Field, Input, Select, Textarea } from '@/components/ui/controls'
import { SeverityStamp, Stamp } from '@/components/ui/data'
import { EmptyState, InlineAlert, Skeleton } from '@/components/ui/feedback'
import {
  ConfirmDialog,
  Dialog,
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from '@/components/ui/overlays'
import { Panel, SectionHead } from '@/components/ui/surfaces'
import { useAsync } from '@/lib/hooks'
import { cn } from '@/lib/cn'
import { formatMoney, formatNumber, relativeTime } from '@/lib/format'
import { api, ApiError } from '@/mock/api'
import { CLIMATE_ZONES, DISTRICTS } from '@/mock/catalog'
import type { Project } from '@/mock/types'
import { useSession } from '@/store/session'
import { bumpDataVersion, toast, useUi } from '@/store/ui'

type ProjectSummary = Awaited<ReturnType<typeof api.listProjects>>[number]

const projectSchema = z.object({
  name: z.string().min(3, 'Give the programme a name of at least 3 characters.').max(70, 'Keep it under 70 characters.'),
  summary: z.string().max(400, 'That is longer than the field allows.').optional().default(''),
  region: z.string().min(2, 'Pick the region the programme works in.'),
  climateZone: z.string().min(1),
  budgetUsd: z.coerce.number().min(0, 'Budget cannot be negative.').max(500000000, 'That budget looks too large.'),
})

const renameSchema = z.object({
  name: z.string().min(3, 'Give the programme a name of at least 3 characters.').max(70, 'Keep it under 70 characters.'),
})

type ProjectValues = z.input<typeof projectSchema>

export function ProjectsRoute() {
  const list = useAsync(() => api.listProjects(), [])
  const { user } = useSession()
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  const [renaming, setRenaming] = useState<ProjectSummary | null>(null)
  const [deleting, setDeleting] = useState<ProjectSummary | null>(null)
  const [busy, setBusy] = useState(false)

  const totals = useMemo(() => {
    const rows = list.data ?? []
    return {
      projects: rows.length,
      farms: rows.reduce((a, r) => a + r.farmCount, 0),
      plants: rows.reduce((a, r) => a + r.plantCount, 0),
      area: rows.reduce((a, r) => a + r.areaAcre, 0),
      budget: rows.reduce((a, r) => a + r.project.budgetUsd, 0),
      risks: rows.reduce((a, r) => a + r.criticalRisks, 0),
      updatedAt: rows
        .map((r) => r.adviceUpdatedAt)
        .filter((v): v is string => Boolean(v))
        .sort()
        .pop() ?? null,
    }
  }, [list.data])

  return (
    <div className="mx-auto max-w-[1240px]">
      <SectionHead
        eyebrow={`${greeting()}, ${user?.name.split(' ')[0] ?? 'grower'}`}
        title="Projects"
        description="A project is a programme of work: the farms in it, the equipment and accommodation behind them, and the decisions they share."
        actions={
          <Button variant="primary" icon={<Plus />} onClick={() => setCreateOpen(true)}>
            New project
          </Button>
        }
      />

      {/* Ledger header rather than a row of cards. */}
      <dl className="mt-6 grid grid-cols-2 gap-y-5 border-y border-line-strong py-4 sm:grid-cols-3 lg:grid-cols-5">
        <LedgerFigure label="Programmes" value={formatNumber(totals.projects)} note={`${totals.farms} farms inside them`} loading={list.loading} />
        <LedgerFigure
          label="Area managed"
          value={formatNumber(totals.area, 2)}
          unit="acres"
          note={`${formatNumber(totals.area * 0.404686, 2)} hectares`}
          loading={list.loading}
        />
        <LedgerFigure label="Plants tracked" value={formatNumber(totals.plants)} note="Soil and stage records" loading={list.loading} />
        <LedgerFigure
          label="Open risks"
          value={formatNumber(totals.risks)}
          unit="high+"
          note={totals.risks > 0 ? 'Need a decision this fortnight' : 'Nothing above moderate'}
          loading={list.loading}
          tone={totals.risks > 0 ? 'clay' : 'green'}
        />
        <LedgerFigure
          label="Committed budget"
          value={formatMoney(totals.budget, { compact: true })}
          note={totals.updatedAt ? `Advice re-run ${relativeTime(totals.updatedAt)}` : 'No advice generated yet'}
          loading={list.loading}
          className="col-span-2 sm:col-span-1"
        />
      </dl>

      <div className="mt-8 space-y-5">
        {list.loading && <ProjectsSkeleton />}

        {list.error && (
          <InlineAlert tone="danger" title="Could not load projects">
            {list.error.message}
          </InlineAlert>
        )}

        {!list.loading && list.data?.length === 0 && (
          <Panel>
            <EmptyState
              illustration={<PlotIllustration />}
              title="No projects yet"
              description="A project groups the farms that share a plan, a budget and a set of equipment. Create the first one and add farms to it."
              actions={
                <Button variant="primary" icon={<Plus />} onClick={() => setCreateOpen(true)}>
                  Create a project
                </Button>
              }
            />
          </Panel>
        )}

        {list.data?.map((row) => (
          <ProjectRow
            key={row.project.id}
            row={row}
            onOpen={() => navigate(`/projects/${row.project.id}`)}
            onRename={() => setRenaming(row)}
            onDelete={() => setDeleting(row)}
          />
        ))}
      </div>

      <p className="mt-6 text-xs text-ink-3">
        Advice and risk are regenerated for every farm whenever a plant, farm or project property changes. Open a farm to
        watch it happen.
      </p>

      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(project) => {
          list.reload()
          bumpDataVersion()
          toast({ tone: 'success', title: `${project.name} created`, body: 'Add the first farm to the programme.' })
          navigate(`/projects/${project.id}`)
        }}
      />

      <RenameProjectDialog
        row={renaming}
        onOpenChange={(open) => !open && setRenaming(null)}
        onRenamed={() => {
          setRenaming(null)
          list.reload()
          bumpDataVersion()
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.project.name ?? 'this project'}?`}
        description={
          <>
            This removes the project, its {deleting?.farmCount ?? 0} farms, their plants, change history and every advice
            and risk version. In this demo the seeded data can be restored from the developer menu.
          </>
        }
        confirmLabel="Delete project"
        tone="danger"
        loading={busy}
        typeToConfirm="delete"
        onConfirm={() => {
          if (!deleting) return
          setBusy(true)
          void api
            .deleteProject(deleting.project.id)
            .then(() => {
              toast({ tone: 'info', title: `${deleting.project.name} deleted` })
              setDeleting(null)
              list.reload()
              bumpDataVersion()
            })
            .catch((error: unknown) => toast({ tone: 'danger', title: 'Could not delete the project', body: String(error) }))
            .finally(() => setBusy(false))
        }}
      />
    </div>
  )
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function LedgerFigure({
  label,
  value,
  unit,
  note,
  loading,
  tone,
  className,
}: {
  label: string
  value: string
  unit?: string
  note: string
  loading?: boolean
  tone?: 'green' | 'clay'
  className?: string
}) {
  return (
    <div className={cn('border-l border-line pl-4 first:border-l-0 first:pl-0', className)}>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1.5">
        {loading ? (
          <Skeleton className="h-[26px] w-[68px]" />
        ) : (
          <span
            className={cn(
              'tnum font-display text-2xl leading-none',
              tone === 'clay' ? 'text-clay-700' : tone === 'green' ? 'text-green-700' : 'text-ink',
            )}
          >
            {value}
            {unit && <span className="ml-1 font-sans text-xs font-medium text-ink-3">{unit}</span>}
          </span>
        )}
      </dd>
      <p className="mt-1.5 text-xs text-ink-3">{note}</p>
    </div>
  )
}

function ProjectRow({
  row,
  onOpen,
  onRename,
  onDelete,
}: {
  row: ProjectSummary
  onOpen: () => void
  onRename: () => void
  onDelete: () => void
}) {
  const zone = CLIMATE_ZONES[row.project.climateZone]
  const user = useSession((s) => s.user)
  const mode = useUi((s) => s.mode)
  const canConfigure = row.project.ownerId === user?.id && mode === 'researcher'
  return (
    <article className="panel">
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1.35fr)_minmax(0,0.9fr)]">
        {/* Identity column */}
        <div className="border-b border-line p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display text-xl leading-snug text-ink">
                <button type="button" onClick={onOpen} className="text-left hover:underline">
                  {row.project.name}
                </button>
              </h3>
              <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-ink-3">
                <span className="inline-flex items-center gap-1">
                  <MapPin size={11} aria-hidden />
                  {row.project.region}
                </span>
                <span aria-hidden>·</span>
                <span>{zone.label.split('—')[0].trim()}</span>
              </p>
            </div>
            <Dropdown>
              <DropdownTrigger asChild>
                <button
                  type="button"
                  className="btn btn-quiet btn-icon btn-sm flex-none"
                  aria-label={`Actions for ${row.project.name}`}
                >
                  <MoreHorizontal aria-hidden />
                </button>
              </DropdownTrigger>
              <DropdownContent>
                <DropdownItem icon={<ArrowRight />} onSelect={onOpen}>
                  Open project
                </DropdownItem>
                {canConfigure && <>
                  <DropdownItem icon={<Pencil />} onSelect={onRename}>
                    Rename project
                  </DropdownItem>
                  <DropdownSeparator />
                  <DropdownItem icon={<Trash2 />} danger onSelect={onDelete}>
                    Delete project
                  </DropdownItem>
                </>}
              </DropdownContent>
            </Dropdown>
          </div>

          <p className="mt-3 line-clamp-3 max-w-[52ch] text-sm leading-relaxed text-ink-2">{row.project.summary}</p>

          <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
            <Stamp tone="plain" className="border-line-strong text-ink-2">
              <Layers size={10} aria-hidden /> {row.farmCount} farms
            </Stamp>
            <Stamp tone="plain" className="border-line-strong text-ink-2">
              <Sprout size={10} aria-hidden /> {row.plantCount} plants
            </Stamp>
            <Stamp tone="plain" className="border-line-strong text-ink-2">
              <Coins size={10} aria-hidden /> <span className="normal-case">{formatMoney(row.project.budgetUsd, { compact: true })}</span>
            </Stamp>
          </div>
        </div>

        {/* Farms column — a compact ledger, not a card grid. */}
        <div className="border-b border-line lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-2 px-4 pb-1.5 pt-3.5 sm:px-5">
            <span className="eyebrow">Farms in this programme</span>
            <Link to={`/projects/${row.project.id}`} className="link text-[11px]">
              Manage
            </Link>
          </div>
          {row.farms.length === 0 && (
            <p className="px-4 pb-4 text-sm text-ink-3 sm:px-5">
              No farms yet. Open the project to add the first block of land.
            </p>
          )}
          <ul className="divide-y divide-line">
            {row.farms.map((farm) => (
              <li key={farm.id}>
                <Link
                  to={`/farms/${farm.id}/overview`}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-100 hover:bg-paper-sunken sm:px-5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{farm.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-ink-3">
                      {farm.district} · {farm.plantCount} plant{farm.plantCount === 1 ? '' : 's'}
                      {farm.headline ? ` · ${farm.headline}` : ''}
                    </span>
                  </span>
                  {farm.worstSeverity ? (
                    <SeverityStamp severity={farm.worstSeverity} />
                  ) : (
                    <Stamp tone="plain" className="border-line text-ink-3">
                      no analysis
                    </Stamp>
                  )}
                  <ChevronRight size={14} className="flex-none text-soil-300" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Figures column */}
        <div className="p-4 sm:p-5">
          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-1 lg:gap-3.5">
            <div>
              <dt className="eyebrow">Area</dt>
              <dd className="tnum mt-0.5 font-display text-lg text-ink">
                {formatNumber(row.areaAcre, 2)} <span className="font-sans text-xs text-ink-3">acres</span>
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Advice updated</dt>
              <dd className="mt-0.5 text-sm text-ink-2">
                {row.adviceUpdatedAt ? relativeTime(row.adviceUpdatedAt) : 'Not generated'}
              </dd>
            </div>
            <div className="col-span-2 lg:col-span-1">
              <dt className="eyebrow">Most serious risk</dt>
              <dd className="mt-1 flex items-start gap-2">
                {row.topRisk ? (
                  <>
                    <TriangleAlert size={13} className="mt-[3px] flex-none text-marigold-700" aria-hidden />
                    <span className="text-xs leading-relaxed text-ink-2">{row.topRisk}</span>
                  </>
                ) : (
                  <span className="text-xs text-ink-3">Nothing above moderate across the farms.</span>
                )}
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex items-center gap-2 border-t border-line pt-3.5">
            <Button size="sm" variant="outline" onClick={onOpen} iconRight={<ArrowRight />}>
              Open project
            </Button>
            <Button size="sm" variant="quiet" icon={<Users />} onClick={onOpen}>
              Team
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}

function ProjectsSkeleton() {
  return (
    <div className="space-y-5">
      {[0, 1].map((i) => (
        <div key={i} className="panel">
          <div className="grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1.35fr)_minmax(0,0.9fr)]">
            <div className="space-y-3 border-b border-line p-5 lg:border-b-0 lg:border-r">
              <Skeleton className="h-6 w-[62%]" />
              <Skeleton className="h-3 w-[38%]" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-[86%]" />
              <div className="flex gap-1.5 pt-1">
                <Skeleton className="h-[19px] w-[78px]" />
                <Skeleton className="h-[19px] w-[72px]" />
                <Skeleton className="h-[19px] w-[96px]" />
              </div>
            </div>
            <div className="space-y-2.5 border-b border-line p-5 lg:border-b-0 lg:border-r">
              <Skeleton className="h-2.5 w-[42%]" />
              {[0, 1, 2].map((r) => (
                <div key={r} className="flex items-center gap-3">
                  <Skeleton className="h-3 flex-1" />
                  <Skeleton className="h-[19px] w-[64px]" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 p-5 lg:grid-cols-1">
              <Skeleton className="h-8 w-[70%]" />
              <Skeleton className="h-4 w-[54%]" />
              <Skeleton className="col-span-2 h-3 w-full lg:col-span-1" />
              <Skeleton className="col-span-2 h-7 w-[64%] lg:col-span-1" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* --------------------------------------------------------- dialogs ------- */

function CreateProjectDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (project: Project) => void
}) {
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProjectValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      summary: '',
      region: 'North County',
      climateZone: 'NW',
      budgetUsd: 500000,
    },
  })

  const submit = async (values: ProjectValues) => {
    setFormError(null)
    try {
      const project = await api.createProject({
        name: values.name,
        summary: values.summary ?? '',
        region: values.region,
        climateZone: values.climateZone as Project['climateZone'],
        budgetUsd: Number(values.budgetUsd),
      })
      reset()
      onOpenChange(false)
      onCreated(project)
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Could not create the project.')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New project"
      description="Projects hold farms. Region and climate zone set the weather model and the planting windows used in advice."
      width="md"
      footer={
        <>
          <Button variant="quiet" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" loading={isSubmitting} onClick={handleSubmit(submit)}>
            Create project
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
        {formError && <InlineAlert tone="danger" title="Could not create">{formError}</InlineAlert>}

        <Field label="Programme name" error={errors.name?.message} hint="How you refer to this group of farms in conversation.">
          {({ id, ...aria }) => (
            <Input id={id} placeholder="Northern Grain Programme" {...aria} {...register('name')} />
          )}
        </Field>

        <Field label="What is the programme for?" error={errors.summary?.message} hint="Two or three sentences. This shows on the dashboard.">
          {({ id, ...aria }) => (
            <Textarea id={id} rows={3} placeholder="Three blocks working a winter-cereal and oilseed rotation with a shared well roster." {...aria} {...register('summary')} />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Region" error={errors.region?.message}>
            {({ id, ...aria }) => (
              <Select
                id={id}
                options={[
                  { value: 'North County', label: 'North County' },
                  { value: 'North Central County', label: 'North Central County' },
                  { value: 'West County', label: 'West County' },
                  { value: 'South County', label: 'South County' },
                  { value: 'East County', label: 'East County' },
                  { value: 'Central County', label: 'Central County' },
                  { value: 'Coastal County', label: 'Coastal County' },
                ]}
                {...aria}
                {...register('region')}
              />
            )}
          </Field>
          <Field label="Climate zone" error={errors.climateZone?.message} hint={CLIMATE_ZONES.NW.note}>
            {({ id, ...aria }) => (
              <Select
                id={id}
                options={Object.values(CLIMATE_ZONES).map((zone) => ({
                  value: zone.code,
                  label: `${zone.code} · ${zone.label.split('—')[1]?.trim() ?? zone.label}`,
                }))}
                {...aria}
                {...register('climateZone')}
              />
            )}
          </Field>
        </div>

        <Field label="Season budget" error={errors.budgetUsd?.message} hint="Inputs, labour and irrigation for the season, in US dollars.">
          {({ id, ...aria }) => (
            <Input id={id} type="number" step={10000} min={0} placeholder="2500000" {...aria} {...register('budgetUsd')} />
          )}
        </Field>

        <p className="text-xs text-ink-3">
          Districts available in the demo: {DISTRICTS.map((d) => d.name).join(', ')}.
        </p>
      </form>
    </Dialog>
  )
}

function RenameProjectDialog({
  row,
  onOpenChange,
  onRenamed,
}: {
  row: ProjectSummary | null
  onOpenChange: (open: boolean) => void
  onRenamed: () => void
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ name: string }>({ resolver: zodResolver(renameSchema), values: { name: row?.project.name ?? '' } })

  return (
    <Dialog
      open={Boolean(row)}
      onOpenChange={onOpenChange}
      title="Rename project"
      description="Only the name changes. Farms, plants and history stay where they are."
      width="sm"
      footer={
        <>
          <Button variant="quiet" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={isSubmitting}
            onClick={handleSubmit(async (values) => {
              if (!row) return
              await api.updateProject(row.project.id, { name: values.name })
              reset()
              toast({ tone: 'success', title: 'Project renamed', body: values.name })
              onRenamed()
            })}
          >
            Save name
          </Button>
        </>
      }
    >
      <Field label="Programme name" error={errors.name?.message}>
        {({ id, ...aria }) => <Input id={id} autoFocus {...aria} {...register('name')} />}
      </Field>
    </Dialog>
  )
}
