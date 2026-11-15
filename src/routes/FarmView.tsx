import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowUpRight,
  CloudRain,
  Droplets,
  Gauge,
  Layers,
  MapPin,
  Plus,
  RefreshCw,
  Sparkles,
  Sprout,
  Sun,
  Thermometer,
  Trash2,
  Wind,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { PlotIllustration } from '@/components/brand/brand'
import { Button, Field, Input, Select, Textarea } from '@/components/ui/controls'
import { Meter, SeverityStamp, Stamp, Stat, Td, Th, ChangeChip } from '@/components/ui/data'
import { EmptyState, InlineAlert, RecalcBanner, Skeleton } from '@/components/ui/feedback'
import { ConfirmDialog } from '@/components/ui/overlays'
import { Divider, Panel, PanelBody, PanelHead, SectionHead } from '@/components/ui/surfaces'
import { AdviceTab, RiskTab } from '@/components/farm/AnalysisTabs'
import { AssistantTab } from '@/components/farm/AssistantTab'
import { FarmerOverview, HumanJudgmentNote } from '@/components/farm/FarmerOverview'
import { PlantsTab } from '@/components/farm/PlantsTab'
import { TeamsTab } from '@/components/farm/TeamsTab'
import { VisualizationsTab } from '@/components/farm/VisualizationsTab'
import { cn } from '@/lib/cn'
import { dayName, formatArea, formatDate, formatNumber, relativeTime } from '@/lib/format'
import { canEditFarm } from '@/lib/permissions'
import { api, ApiError } from '@/mock/api'
import { AREA_UNITS, CLIMATE_ZONES, DISTRICTS, IRRIGATION_TYPES, SOIL_TYPES, districtByName } from '@/mock/catalog'
import type { Farm } from '@/mock/types'
import { useFarm } from '@/store/farm'
import { useSession } from '@/store/session'
import { bumpDataVersion, toast, useUi } from '@/store/ui'

export interface TabDef {
  id: string
  label: string
  count?: number
}

/* ============================================================== tab bar === */

function FarmTabBar({ tabs, active }: { tabs: TabDef[]; active: string }) {
  const navigate = useNavigate()
  const { farmId = '' } = useParams()
  const listRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState<{ left: number; width: number }>({ left: 0, width: 0 })

  // Measure the active tab so the underline slides rather than jumps.
  useEffect(() => {
    const container = listRef.current
    if (!container) return
    const button = container.querySelector<HTMLButtonElement>(`[data-tab="${active}"]`)
    if (!button) return
    setIndicator({ left: button.offsetLeft, width: button.offsetWidth })
  }, [active, tabs])

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const last = tabs.length - 1
    let next: number | null = null
    if (event.key === 'ArrowRight') next = index === last ? 0 : index + 1
    if (event.key === 'ArrowLeft') next = index === 0 ? last : index - 1
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = last
    if (next === null) return
    event.preventDefault()
    const target = tabs[next]
    navigate(`/farms/${farmId}/${target.id}`)
    listRef.current?.querySelector<HTMLButtonElement>(`[data-tab="${target.id}"]`)?.focus()
  }

  return (
    <div className="relative">
      <div ref={listRef} role="tablist" aria-label="Farm sections" className="tabbar">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            role="tab"
            data-tab={tab.id}
            type="button"
            aria-selected={tab.id === active}
            tabIndex={tab.id === active ? 0 : -1}
            onClick={() => navigate(`/farms/${farmId}/${tab.id}`)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className="tabbar-tab"
          >
            {tab.label}
            {tab.count !== undefined && <span className="tabbar-count">{tab.count}</span>}
          </button>
        ))}
      </div>
      <span className="tabbar-indicator" style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }} aria-hidden />
    </div>
  )
}

/* ============================================================== farm view */

const TABS: TabDef[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'assistant', label: 'Assistant' },
  { id: 'plants', label: 'Plants' },
  { id: 'advice', label: 'Advice' },
  { id: 'risk', label: 'Risk' },
  { id: 'visualizations', label: 'Visualizations' },
  { id: 'teams', label: 'Teams' },
  { id: 'settings', label: 'Settings' },
]

export function FarmViewRoute() {
  const { farmId = '', tab = 'overview' } = useParams()
  const navigate = useNavigate()
  const bundle = useFarm((s) => s.bundle)
  const loading = useFarm((s) => s.loading)
  const error = useFarm((s) => s.error)
  const loadFarm = useFarm((s) => s.loadFarm)
  const recalc = useFarm((s) => s.recalc)
  const regenerate = useFarm((s) => s.regenerate)
  const mode = useUi((s) => s.mode)
  const user = useSession((s) => s.user)
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    if (farmId) void loadFarm(farmId)
  }, [farmId, loadFarm])

  const canEdit = bundle ? canEditFarm(bundle, user) : false

  const visibleTabs = useMemo(
    () => (mode === 'farmer' ? TABS.filter((t) => t.id !== 'visualizations' && t.id !== 'teams') : TABS),
    [mode],
  )
  const activeTab = visibleTabs.some((t) => t.id === tab) ? tab : 'overview'

  if (error) {
    return (
      <div className="mx-auto max-w-[680px] py-8">
        <Panel>
          <EmptyState
            illustration={<PlotIllustration />}
            title="That farm could not be loaded"
            description={error.message}
            actions={
              <Button variant="primary" onClick={() => navigate('/projects')}>
                Back to projects
              </Button>
            }
          />
        </Panel>
      </div>
    )
  }

  const tabs = useMemo<TabDef[]>(
    () =>
      visibleTabs.map((t) => {
        if (!bundle) return t
        if (t.id === 'plants') return { ...t, count: bundle.plants.length }
        if (t.id === 'risk') return { ...t, count: bundle.analysis.risk?.items.length }
        if (t.id === 'advice') return { ...t, count: bundle.analysis.advice?.sections.length }
        if (t.id === 'teams') return { ...t, count: bundle.memberships.filter((m) => m.status === 'accepted').length }
        return t
      }),
    [bundle, visibleTabs],
  )

  return (
    <div className="mx-auto max-w-[1240px]">
      {!bundle && (loading || !farmId) ? (
        <FarmSkeleton />
      ) : bundle ? (
        <>
          <FarmHeader
            canEdit={canEdit}
            onAddPlant={() => {
              setAddOpen(true)
              if (activeTab !== 'plants') navigate(`/farms/${farmId}/plants`)
            }}
            onRegenerate={() =>
              void regenerate(bundle.farm.id).then(() =>
                toast({ tone: 'success', title: 'Advice and risk regenerated', body: `Ran over ${bundle.plants.length} plant records.` }),
              )
            }
            regenerating={recalc.active}
          />

          {!canEdit && (
            <InlineAlert tone="info" className="mt-5">
              You have read-only access to this farm. Ask the project owner for an editor role to add crops or change
              properties.
            </InlineAlert>
          )}

          <div className="mt-5">
            <FarmTabBar tabs={tabs} active={activeTab} />
          </div>

          <div className="mt-5">
            <RecalcBanner
              active={recalc.active}
              origin={recalc.origin}
              operations={recalc.operations.map((op) => ({ fieldLabel: op.fieldLabel, before: op.before, after: op.after }))}
            />

            <div className={cn(recalc.active && 'mt-5')} key={activeTab}>
              <div className="fade-up">
                {activeTab === 'overview' &&
                  (mode === 'farmer' ? <FarmerOverview onAddPlant={() => setAddOpen(true)} /> : <OverviewTab onAddPlant={() => setAddOpen(true)} />)}
                {activeTab === 'assistant' && <AssistantTab />}
                {activeTab === 'plants' && <PlantsTab />}
                {activeTab === 'advice' && <AdviceTab />}
                {activeTab === 'risk' && <RiskTab />}
                {activeTab === 'visualizations' && <VisualizationsTab />}
                {activeTab === 'teams' && <TeamsTab />}
                {activeTab === 'settings' && <SettingsTab />}
              </div>
            </div>
          </div>

          <AddPlantShortcut open={addOpen} onOpenChange={setAddOpen} />
        </>
      ) : null}
    </div>
  )
}

function FarmHeader({
  canEdit,
  onAddPlant,
  onRegenerate,
  regenerating,
}: {
  canEdit: boolean
  onAddPlant: () => void
  onRegenerate: () => void
  regenerating: boolean
}) {
  const bundle = useFarm((s) => s.bundle)!
  const { farm, project, analysis } = bundle
  const { conditions } = analysis
  const district = districtByName(farm.district)
  const zone = CLIMATE_ZONES[project.climateZone]
  const navigate = useNavigate()

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
      <div className="min-w-0">
        <nav aria-label="Project" className="mb-2">
          <Link to={`/projects/${project.id}`} className="link inline-flex items-center gap-1.5 text-xs">
            <Layers size={11} aria-hidden />
            {project.name}
          </Link>
        </nav>
        <SectionHead
          eyebrow={`${farm.district} · ${farm.locality} · ${zone.label.split('—')[0].trim()}`}
          title={farm.name}
          description={farm.notes}
        />
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          <Stamp tone="plain" className="border-line-strong">
            <MapPin size={10} aria-hidden /> {formatArea(farm.area)}
          </Stamp>
          <Stamp tone="plain" className="border-line-strong">
            {farm.landType} land
          </Stamp>
          <Stamp tone="plain" className="border-line-strong">
            {SOIL_TYPES.find((s) => s.id === farm.soilType)?.label}
          </Stamp>
          <Stamp tone="plain" className="border-line-strong">
            <Droplets size={10} aria-hidden /> {IRRIGATION_TYPES.find((i) => i.id === farm.irrigationType)?.label}
          </Stamp>
          <Stamp tone="plain" className="border-line-strong">
            <Sprout size={10} aria-hidden /> {bundle.plants.length} plants
          </Stamp>
          {bundle.analysis.risk && bundle.analysis.risk.items.length > 0 && (
            <Stamp tone="plain" className="border-line-strong">
              worst risk <SeverityStamp severity={bundle.analysis.risk.overall} className="ml-1" />
            </Stamp>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Button variant="outline" icon={<Sparkles />} onClick={() => navigate(`/farms/${farm.id}/assistant`)}>
            Ask assistant
          </Button>
          {canEdit && (
            <Button variant="primary" icon={<Plus />} onClick={onAddPlant}>
              Add plant
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" icon={<RefreshCw />} loading={regenerating} onClick={onRegenerate}>
              Regenerate
            </Button>
          )}
        </div>
        <dl className="grid grid-cols-3 gap-3 rounded-sm border border-line bg-paper-raised px-3.5 py-3">
          <div>
            <dt className="eyebrow">Fertility index</dt>
            <dd className="tnum mt-1 font-display text-lg leading-none text-ink">
              {conditions.fertilityIndex}
              <span className="ml-0.5 font-sans text-[11px] text-ink-3">/100</span>
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Soil moisture</dt>
            <dd className="tnum mt-1 font-display text-lg leading-none text-ink">
              {conditions.soilMoisture}
              <span className="ml-0.5 font-sans text-[11px] text-ink-3">%</span>
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Average pH</dt>
            <dd className="tnum mt-1 font-display text-lg leading-none text-ink">{conditions.averagePh.toFixed(2)}</dd>
          </div>
          <div className="col-span-3 border-t border-line pt-2.5">
            <dt className="sr-only">Weather summary</dt>
            <dd className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-3">
              <span className="inline-flex items-center gap-1">
                <CloudRain size={11} aria-hidden /> {conditions.rainfall7dMm} mm last 7 d
              </span>
              <span className="inline-flex items-center gap-1">
                <Wind size={11} aria-hidden /> {conditions.rainfallNext7dMm} mm next 7 d
              </span>
              <span className="inline-flex items-center gap-1">
                <Sun size={11} aria-hidden /> {conditions.heatStressDays} hot days
              </span>
            </dd>
          </div>
        </dl>
        <p className="text-[11px] leading-relaxed text-ink-3">
          {district.note} Advice for this farm is written against the {zone.code} zone window.
        </p>
      </div>
    </div>
  )
}

/* ============================================================== overview */

function OverviewTab({ onAddPlant }: { onAddPlant: () => void }) {
  const bundle = useFarm((s) => s.bundle)!
  const { analysis, farm } = bundle
  const { conditions, charts } = analysis
  const navigate = useNavigate()
  const user = useSession((s) => s.user)
  const canEdit = canEditFarm(bundle, user)
  const weather = conditions.weather
  const observed = weather.filter((d) => d.kind === 'observed').slice(-7)
  const forecast = weather.filter((d) => d.kind === 'forecast').slice(0, 7)

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHead
            title="Key conditions"
            meta={`Computed ${relativeTime(bundle.analysis.computedAt)}`}
            actions={
              <Button size="sm" variant="quiet" onClick={() => navigate(`/farms/${farm.id}/visualizations`)}>
                Open charts
              </Button>
            }
          />
          <PanelBody className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
            <Stat
              label="Fertility index"
              value={conditions.fertilityIndex}
              unit="/100"
              note={
                conditions.fertilityIndex >= 70
                  ? 'Nutrients and reaction within range'
                  : conditions.fertilityIndex >= 50
                    ? 'One or two properties below optimum'
                    : 'Several properties limit yield'
              }
              delta={{ direction: conditions.fertilityIndex >= 60 ? 'up' : 'down', text: 'vs 60 target', good: conditions.fertilityIndex >= 60 }}
            />
            <Stat label="Soil moisture" value={conditions.soilMoisture} unit="%" note="Root-zone average" />
            <Stat label="Average pH" value={conditions.averagePh.toFixed(2)} note="Across plots" />
            <Stat label="Rain, last 7 d" value={formatNumber(conditions.rainfall7dMm, 1)} unit="mm" note="Observed" />
            <Stat label="Rain, next 7 d" value={formatNumber(conditions.rainfallNext7dMm, 1)} unit="mm" note="Forecast" />
            <Stat
              label="Hot days ahead"
              value={conditions.heatStressDays}
              unit="days"
              note={conditions.heatStressDays > 0 ? 'Above 30 °C' : 'No heat stress expected'}
              delta={conditions.heatStressDays > 0 ? { direction: 'up', text: 'watch flowering plots', good: false } : undefined}
            />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHead
            title="Weather strip"
            meta="Seven days observed, seven days forecast"
            actions={<Stamp tone="plain" className="border-line-strong text-ink-3">mm and °C</Stamp>}
          />
          <PanelBody className="pt-3">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[440px] border-collapse text-xs">
                <caption className="sr-only">Daily weather, observed and forecast</caption>
                <thead>
                  <tr>
                    <Th className="!px-1.5">Day</Th>
                    <Th className="!px-1.5">Sky</Th>
                    <Th numeric className="!px-1.5">Rain</Th>
                    <Th numeric className="!px-1.5">Max</Th>
                    <Th numeric className="!px-1.5">Min</Th>
                    <Th numeric className="!px-1.5">RH</Th>
                  </tr>
                </thead>
                <tbody>
                  {[...observed, ...forecast].map((day) => {
                    const isForecast = day.kind === 'forecast'
                    const rain = day.rainfallMm
                    return (
                      <tr key={day.date} className={cn(isForecast && 'bg-paper-sunken/40')}>
                        <Td label="Day" className="!px-1.5 whitespace-nowrap">
                          <span className="font-medium text-ink">{dayName(day.date)}</span>
                          <span className="ml-1.5 text-[10px] text-ink-3">{formatDate(day.date, 'dayMonth')}</span>
                          {isForecast && <span className="ml-1.5 text-[10px] uppercase tracking-wide text-marigold-700">fc</span>}
                        </Td>
                        <Td className="!px-1.5">
                          <span
                            className="inline-block h-[10px] w-[26px] align-middle"
                            style={{
                              backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
                                `<svg xmlns='http://www.w3.org/2000/svg' width='26' height='10'><rect width='26' height='10' fill='#efe6d4'/><rect width='${Math.min(26, rain * 2.6)}' height='10' fill='#de9a1e'/></svg>`,
                              )}")`,
                            }}
                            aria-hidden
                          />
                          <span className="ml-2 text-[11px] text-ink-3">
                            {rain === 0 ? 'dry' : rain < 2 ? 'drizzle' : rain < 8 ? 'showers' : 'heavy'}
                          </span>
                        </Td>
                        <Td numeric label="Rain" className="!px-1.5">
                          {rain.toFixed(1)}
                        </Td>
                        <Td numeric label="Max" className="!px-1.5">
                          {day.tMax.toFixed(1)}
                        </Td>
                        <Td numeric label="Min" className="!px-1.5">
                          <span className={cn(day.tMin <= 0 && 'font-semibold text-clay-700')}>{day.tMin.toFixed(1)}</span>
                        </Td>
                        <Td numeric label="RH" className="!px-1.5">
                          {day.humidity}
                        </Td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-3">
              <Thermometer size={11} aria-hidden />
              Frost nights are marked in clay. Rainfall drives the drought and flood scoring; humidity drives the disease
              window.
            </p>
          </PanelBody>
        </Panel>
      </div>

      <Panel>
        <PanelHead
          title="Current crop stages"
          meta="Derived from the planting date against each species stage table"
          actions={
            <Button size="sm" variant="quiet" icon={<ArrowUpRight />} onClick={() => navigate(`/farms/${farm.id}/plants`)}>
              Open plants
            </Button>
          }
        />
        {bundle.plants.length === 0 ? (
          <EmptyState
            compact
            illustration={<PlotIllustration className="w-[120px]" />}
            title="No plants on this farm yet"
            description="Add the first crop to see stages, water demand and advice."
            actions={
              canEdit ? (
                <Button variant="primary" icon={<Plus />} onClick={onAddPlant}>
                  Add a plant
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {conditions.perPlant.map((row) => {
              const growth = charts.growth.find((g) => g.plantId === row.plantId)
              return (
                <li key={row.plantId} className="grid gap-3 px-4 py-3.5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{row.label}</p>
                    <p className="mt-0.5 text-xs text-ink-3">
                      {row.speciesLabel} · day {row.daysSincePlanting}
                      {row.daysToHarvest !== null ? ` · ${row.daysToHarvest} days to harvest` : ' · past harvest window'}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-ink-2">{row.stage}</span>
                      <span className="tnum text-[11px] text-ink-3">{Math.round(row.stageProgress * 100)} %</span>
                    </div>
                    <Meter className="mt-1.5" value={row.stageProgress * 100} tone={row.stageProgress > 0.66 ? 'warn' : 'green'} />
                  </div>
                  <div className="flex items-center gap-4 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p className="eyebrow">Health</p>
                      <p className="tnum mt-0.5 text-sm text-ink">{row.healthIndex}/100</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="eyebrow">Harvest</p>
                      <p className="mt-0.5 text-xs text-ink-2">{formatWindow(growth?.harvestWindow)}</p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHead title="Recent changes" meta="Property operations on this farm" display />
          {bundle.operations.length === 0 ? (
            <PanelBody>
              <p className="text-sm text-ink-3">No property changes recorded yet. Edit a plant property to start the log.</p>
            </PanelBody>
          ) : (
            <ul className="divide-y divide-line">
              {bundle.operations.slice(0, 6).map((op) => (
                <li key={op.id} className="px-4 py-2.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="text-sm text-ink">
                      <span className="font-medium">{op.entityLabel}</span>{' '}
                      <span className="text-ink-3">· {op.fieldLabel}</span>
                    </p>
                    <span className="text-[11px] text-ink-3">
                      {op.actorName} · {relativeTime(op.at)}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <ChangeChip field={op.fieldLabel} before={op.before} after={op.after} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHead title="What the engine is reading" meta="Inputs behind today's advice" display />
          <PanelBody>
            <dl className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="border-t border-line pt-2.5">
                <dt className="eyebrow">Land &amp; soil</dt>
                <dd className="mt-1 text-sm text-ink">
                  {farm.landType} land · {farm.soilType.replace(/-/g, ' ')}
                </dd>
                <dd className="mt-0.5 text-xs text-ink-3">{farm.waterSource}</dd>
              </div>
              <div className="border-t border-line pt-2.5">
                <dt className="eyebrow">Irrigation</dt>
                <dd className="mt-1 text-sm text-ink">{farm.irrigationType.replace(/-/g, ' ')}</dd>
                <dd className="mt-0.5 text-xs text-ink-3">
                  {bundle.project.accommodations.filter((a) => a.available).length} accommodations available on the project
                </dd>
              </div>
              <div className="border-t border-line pt-2.5">
                <dt className="eyebrow">Rotation history</dt>
                <dd className="mt-1 text-sm text-ink">
                  {bundle.plants.filter((p) => p.previousCropId !== 'fallow' && p.previousCropId === p.speciesId).length} plots repeating
                  the previous crop
                </dd>
                <dd className="mt-0.5 text-xs text-ink-3">{bundle.plants.length} plot records in total</dd>
              </div>
              <div className="border-t border-line pt-2.5">
                <dt className="eyebrow">Team</dt>
                <dd className="mt-1 text-sm text-ink">
                  {bundle.memberships.filter((m) => m.status === 'accepted').length} with access
                </dd>
                <dd className="mt-0.5 text-xs text-ink-3">
                  {bundle.memberships.filter((m) => m.status === 'pending').length} invite(s) awaiting a response
                </dd>
              </div>
            </dl>
            <Divider className="my-4" />
            <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-3">
              <Gauge size={13} className="mt-[2px] flex-none" aria-hidden />
              Model versions in use: {bundle.analysis.advice?.modelVersion ?? '—'} for advice and {bundle.analysis.risk?.modelVersion ?? '—'} for
              risk. In production these are the trained regression models; here they are a deterministic rule engine over the
              same properties.
            </p>
          </PanelBody>
        </Panel>
      </div>
    </div>
  )
}

/* ============================================================== settings */

const farmSchema = z.object({
  name: z.string().min(3, 'Give the farm a name of at least 3 characters.').max(60, 'Keep it under 60 characters.'),
  district: z.string().min(1),
  locality: z.string().min(2, 'Which locality is the land in?'),
  areaValue: z.coerce.number().gt(0, 'Area must be greater than zero.').max(20000, 'That area looks too large.'),
  areaUnit: z.enum(['acre', 'hectare', 'sqm']),
  soilType: z.string().min(1),
  landType: z.enum(['high', 'medium', 'low']),
  irrigationType: z.string().min(1),
  waterSource: z.string().min(2, 'Describe where irrigation water comes from.'),
  establishedYear: z.coerce.number().min(1900).max(new Date().getFullYear()),
  notes: z.string().max(400).optional().default(''),
  latitude: z.union([z.literal(''), z.coerce.number().min(-90, 'Latitude is between -90 and 90.').max(90, 'Latitude is between -90 and 90.')]),
  longitude: z.union([z.literal(''), z.coerce.number().min(-180, 'Longitude is between -180 and 180.').max(180, 'Longitude is between -180 and 180.')]),
  farmerPriority: z.string().max(200, 'Keep it under 200 characters.').optional().default(''),
  waterAvailability: z.string().max(200, 'Keep it under 200 characters.').optional().default(''),
  equipmentLimitation: z.string().max(200, 'Keep it under 200 characters.').optional().default(''),
  marketPreference: z.string().max(200, 'Keep it under 200 characters.').optional().default(''),
})

type FarmForm = z.input<typeof farmSchema>
type FarmPayload = z.output<typeof farmSchema>

function SettingsTab() {
  const bundle = useFarm((s) => s.bundle)!
  const patchFarm = useFarm((s) => s.patchFarm)
  const mode = useUi((s) => s.mode)
  const user = useSession((s) => s.user)
  const canEdit = canEditFarm(bundle, user)
  const navigate = useNavigate()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const { farm } = bundle

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FarmForm, unknown, FarmPayload>({
    resolver: zodResolver(farmSchema),
    values: {
      name: farm.name,
      district: farm.district,
      locality: farm.locality,
      areaValue: farm.area.value,
      areaUnit: farm.area.unit,
      soilType: farm.soilType,
      landType: farm.landType,
      irrigationType: farm.irrigationType,
      waterSource: farm.waterSource,
      establishedYear: farm.establishedYear,
      notes: farm.notes,
      latitude: farm.latitude ?? '',
      longitude: farm.longitude ?? '',
      farmerPriority: farm.farmerPriority ?? '',
      waterAvailability: farm.waterAvailability ?? '',
      equipmentLimitation: farm.equipmentLimitation ?? '',
      marketPreference: farm.marketPreference ?? '',
    },
  })

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast({ tone: 'warning', title: 'Location unavailable', body: 'This browser does not expose geolocation. Enter the coordinates manually.' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue('latitude', Number(position.coords.latitude.toFixed(6)), { shouldDirty: true })
        setValue('longitude', Number(position.coords.longitude.toFixed(6)), { shouldDirty: true })
        toast({ tone: 'success', title: 'Location filled in', body: 'Check the pin is on your land, then save.' })
      },
      () => toast({ tone: 'warning', title: 'Could not read your location', body: 'Allow location access and try again, or enter the coordinates manually.' }),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const submit = async (values: FarmPayload) => {
    setFormError(null)
    const patch: Partial<Farm> = {}
    if (values.name !== farm.name) patch.name = values.name
    if (values.district !== farm.district) patch.district = values.district
    if (values.locality !== farm.locality) patch.locality = values.locality
    if (values.areaValue !== farm.area.value || values.areaUnit !== farm.area.unit)
      patch.area = { value: values.areaValue, unit: values.areaUnit }
    if (values.soilType !== farm.soilType) patch.soilType = values.soilType as Farm['soilType']
    if (values.landType !== farm.landType) patch.landType = values.landType
    if (values.irrigationType !== farm.irrigationType) patch.irrigationType = values.irrigationType as Farm['irrigationType']
    if (values.waterSource !== farm.waterSource) patch.waterSource = values.waterSource
    if (values.establishedYear !== farm.establishedYear) patch.establishedYear = values.establishedYear
    if ((values.notes ?? '') !== farm.notes) patch.notes = values.notes ?? ''
    const latitude = values.latitude === '' ? null : values.latitude
    const longitude = values.longitude === '' ? null : values.longitude
    if (latitude !== (farm.latitude ?? null)) patch.latitude = latitude
    if (longitude !== (farm.longitude ?? null)) patch.longitude = longitude
    if ((values.farmerPriority ?? '') !== (farm.farmerPriority ?? '')) patch.farmerPriority = values.farmerPriority ?? ''
    if ((values.waterAvailability ?? '') !== (farm.waterAvailability ?? '')) patch.waterAvailability = values.waterAvailability ?? ''
    if ((values.equipmentLimitation ?? '') !== (farm.equipmentLimitation ?? '')) patch.equipmentLimitation = values.equipmentLimitation ?? ''
    if ((values.marketPreference ?? '') !== (farm.marketPreference ?? '')) patch.marketPreference = values.marketPreference ?? ''

    if (!Object.keys(patch).length) {
      toast({ tone: 'info', title: 'Nothing changed', body: 'Edit at least one property to trigger a recalculation.' })
      return
    }
    try {
      await patchFarm(farm.id, patch)
      toast({
        tone: 'success',
        title: 'Farm updated',
        body: `Advice and risk recalculated from ${Object.keys(patch).length} change${Object.keys(patch).length === 1 ? '' : 's'}.`,
      })
      navigate(`/farms/${farm.id}/advice`)
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Could not save the farm.')
    }
  }

  const district = districtByName(farm.district)

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Panel>
        <PanelHead title="Farm details" meta="The land, soil and water record behind every recommendation" display />
        <PanelBody>
          <form onSubmit={handleSubmit(submit)} noValidate>
            <fieldset disabled={!canEdit} className="min-w-0 space-y-4">
            {formError && <InlineAlert tone="danger" title="Could not save">{formError}</InlineAlert>}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Farm name" error={errors.name?.message}>
                {({ id, ...aria }) => <Input id={id} {...aria} {...register('name')} />}
              </Field>
              <Field label="Locality" error={errors.locality?.message} hint={`Common here: ${district.localities.slice(0, 3).join(', ')}`}>
                {({ id, ...aria }) => <Input id={id} {...aria} {...register('locality')} />}
              </Field>
            </div>

            <div className={cn('grid gap-4', mode === 'researcher' ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
              {mode === 'researcher' && (
                <Field label="District" error={errors.district?.message}>
                  {({ id, ...aria }) => (
                    <Select id={id} options={DISTRICTS.map((d) => ({ value: d.name, label: `${d.name} (${d.zone})` }))} {...aria} {...register('district')} />
                  )}
                </Field>
              )}
              <Field label="Area" error={errors.areaValue?.message}>
                {({ id, ...aria }) => <Input id={id} type="number" step="0.1" {...aria} {...register('areaValue')} />}
              </Field>
              <Field label="Unit" error={errors.areaUnit?.message}>
                {({ id, ...aria }) => (
                  <Select id={id} options={AREA_UNITS.map((u) => ({ value: u.id, label: u.plural }))} {...aria} {...register('areaUnit')} />
                )}
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Soil type" error={errors.soilType?.message}>
                {({ id, ...aria }) => (
                  <Select id={id} options={SOIL_TYPES.map((s) => ({ value: s.id, label: s.label }))} {...aria} {...register('soilType')} />
                )}
              </Field>
              <Field label="Land type" error={errors.landType?.message} hint="Sets flood exposure in the risk model.">
                {({ id, ...aria }) => (
                  <Select
                    id={id}
                    options={[
                      { value: 'high', label: 'High land — drains first' },
                      { value: 'medium', label: 'Medium land — seasonal floodplain' },
                      { value: 'low', label: 'Low land — water stands' },
                    ]}
                    {...aria}
                    {...register('landType')}
                  />
                )}
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Irrigation" error={errors.irrigationType?.message}>
                {({ id, ...aria }) => (
                  <Select id={id} options={IRRIGATION_TYPES.map((t) => ({ value: t.id, label: t.label }))} {...aria} {...register('irrigationType')} />
                )}
              </Field>
              <Field label="Water source" error={errors.waterSource?.message}>
                {({ id, ...aria }) => <Input id={id} {...aria} {...register('waterSource')} />}
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
              <Field label="In cultivation since" error={errors.establishedYear?.message}>
                {({ id, ...aria }) => <Input id={id} type="number" {...aria} {...register('establishedYear')} />}
              </Field>
              <Field label="Notes" error={errors.notes?.message}>
                {({ id, ...aria }) => <Textarea id={id} rows={2} {...aria} {...register('notes')} />}
              </Field>
            </div>

            <div className="space-y-4 border-t border-line pt-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
                <Field label="Latitude" error={errors.latitude?.message} hint="Decimal degrees, e.g. 23.8103">
                  {({ id, ...aria }) => <Input id={id} type="number" step="any" placeholder="23.8103" {...aria} {...register('latitude')} />}
                </Field>
                <Field label="Longitude" error={errors.longitude?.message} hint="Decimal degrees, e.g. 90.4125">
                  {({ id, ...aria }) => <Input id={id} type="number" step="any" placeholder="90.4125" {...aria} {...register('longitude')} />}
                </Field>
                <div className="flex items-end">
                  <Button type="button" variant="outline" icon={<MapPin />} onClick={useMyLocation}>
                    Use my location
                  </Button>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-ink-3">
                Coordinates work like a Google Maps pin: they let SMAP soil-moisture and GPM rainfall satellite data
                pinpoint this farm instead of guessing from the district.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Your priority" error={errors.farmerPriority?.message} hint="What matters most this season, in your words.">
                  {({ id, ...aria }) => <Input id={id} placeholder="e.g. Save irrigation water" {...aria} {...register('farmerPriority')} />}
                </Field>
                <Field label="Water availability" error={errors.waterAvailability?.message} hint="How much water you can actually call on.">
                  {({ id, ...aria }) => <Input id={id} placeholder="e.g. One shallow tubewell, shared" {...aria} {...register('waterAvailability')} />}
                </Field>
                <Field label="Equipment limits" error={errors.equipmentLimitation?.message} hint="Machinery you have — or do not have.">
                  {({ id, ...aria }) => <Input id={id} placeholder="e.g. Knapsack sprayer only" {...aria} {...register('equipmentLimitation')} />}
                </Field>
                <Field label="Market preference" error={errors.marketPreference?.message} hint="Who you grow for and what they pay for.">
                  {({ id, ...aria }) => <Input id={id} placeholder="e.g. Local mill, prefers hard grain" {...aria} {...register('marketPreference')} />}
                </Field>
              </div>

              <HumanJudgmentNote />
            </div>

            <div className="flex items-center gap-3 border-t border-line pt-4">
              <Button type="submit" variant="primary" icon={<RefreshCw />} loading={isSubmitting} disabled={!isDirty}>
                Save and recalculate
              </Button>
              <span className="text-xs text-ink-3">
                Saving records an operation and re-runs advice, risk and the charts.
              </span>
            </div>
            </fieldset>
          </form>
        </PanelBody>
      </Panel>

      <div className="space-y-5">
        <Panel>
          <PanelHead title="Record" display />
          <PanelBody className="space-y-2.5 text-sm">
            <Row label="Project" value={bundle.project.name} />
            <Divider className="my-2" />
            <Row label="Created" value={formatDate(farm.createdAt)} />
            <Divider className="my-2" />
            <Row label="Last changed" value={relativeTime(farm.updatedAt)} />
            <Divider className="my-2" />
            <Row label="Plots" value={`${bundle.plants.length}`} />
            <Divider className="my-2" />
            <Row label="Advice versions" value={`${bundle.adviceHistory.length}`} />
            <Divider className="my-2" />
            <Row label="Risk versions" value={`${bundle.riskHistory.length}`} />
          </PanelBody>
        </Panel>

        {canEdit && mode === 'researcher' && (
          <Panel accent="clay">
            <PanelHead title="Danger zone" meta="Irreversible within the demo session" display />
            <PanelBody>
              <p className="text-sm leading-relaxed text-ink-2">
                Deleting the farm removes its plants, change log, team invitations and every advice and risk version. Seeded
                demo data can be restored from the developer menu in the header.
              </p>
              <Button variant="danger" icon={<Trash2 />} className="mt-3" onClick={() => setDeleteOpen(true)}>
                Delete this farm
              </Button>
            </PanelBody>
          </Panel>
        )}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${farm.name}?`}
        description="This cannot be undone from here. The project itself stays, and other farms are untouched."
        confirmLabel="Delete farm"
        tone="danger"
        loading={busy}
        typeToConfirm="delete"
        onConfirm={() => {
          setBusy(true)
          void api
            .deleteFarm(farm.id)
            .then(() => {
              toast({ tone: 'info', title: `${farm.name} deleted` })
              bumpDataVersion()
              navigate(`/projects/${bundle.project.id}`)
            })
            .finally(() => setBusy(false))
        }}
      />
    </div>
  )
}

/** ISO range from the engine, rendered as two short dates. */
function formatWindow(range?: string): string {
  if (!range) return '—'
  const [from, to] = range.split(' – ')
  if (!from || !to) return range
  return `${formatDate(from, 'dayMonth')} – ${formatDate(to, 'dayMonth')}`
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-3">{label}</span>
      <span className="text-right text-ink-2">{value}</span>
    </div>
  )
}

/* ============================================================== helpers */

function FarmSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          <Skeleton className="h-3 w-[30%]" />
          <Skeleton className="h-8 w-[56%]" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[70%]" />
          <div className="flex gap-2 pt-1">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[20px] w-[92px]" />
            ))}
          </div>
        </div>
        <Skeleton className="h-[132px] w-full" />
      </div>
      <Skeleton className="h-[34px] w-full" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-[240px] w-full" />
        <Skeleton className="h-[240px] w-full" />
      </div>
    </div>
  )
}

/** Opens the plants tab with the add dialog primed, from the header action. */
function AddPlantShortcut({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const bundle = useFarm((s) => s.bundle)
  const addPlant = useFarm((s) => s.addPlant)
  const { farmId = '' } = useParams()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open && bundle && bundle.plants.length > 0) {
      // Jump into the plants tab with the add dialog primed; the ledger there
      // carries the full detail form, so a second (or third) plot can be added.
      onOpenChange(false)
      navigate(`/farms/${farmId}/plants?add=1`)
    }
  }, [open, bundle, farmId, navigate, onOpenChange])

  // For a farm with no plants at all, offer the fastest useful default.
  if (!open || !bundle || bundle.plants.length > 0) return null

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Start the first plot record"
      description="This adds a winter cereal plot with the farm's irrigation type and a neutral soil test, ready for you to correct on the Plants tab."
      confirmLabel="Add draft plot"
      loading={busy}
      onConfirm={() => {
        setBusy(true)
        void addPlant(farmId, {
          speciesId: 'winter-wheat',
          variety: 'Bread wheat, mid-season',
          plantedAt: new Date().toISOString().slice(0, 10),
          area: { value: 2, unit: 'acre' },
          soilPh: 6.4,
          soilMoisture: 55,
          nitrogen: 34,
          phosphorus: 14,
          potassium: 50,
          organicMatter: 1.4,
          irrigationType: bundle.farm.irrigationType,
          previousCropId: 'fallow',
          spacingCm: 18,
          seedRateKgPerAcre: 75,
          stageOverride: null,
          notes: '',
        })
          .then(() => {
            toast({ tone: 'success', title: 'Draft plot added', body: 'Correct the soil values on the Plants tab.' })
            onOpenChange(false)
            navigate(`/farms/${farmId}/plants`)
          })
          .finally(() => setBusy(false))
      }}
    />
  )
}

