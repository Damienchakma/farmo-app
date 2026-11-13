import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarDays, ChevronDown, MoreHorizontal, Pencil, Plus, Sprout, Trash2 } from 'lucide-react'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { SeedlingIllustration } from '@/components/brand/brand'
import { Button, Field, Input, Select, Textarea } from '@/components/ui/controls'
import { Ledger, Stamp, Td, Th, MetaPair } from '@/components/ui/data'
import { EmptyState, InlineAlert, Skeleton } from '@/components/ui/feedback'
import { ConfirmDialog, Dialog, Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from '@/components/ui/overlays'
import { Panel, PanelHead } from '@/components/ui/surfaces'
import { formatArea, formatDate, relativeTime, titleCase } from '@/lib/format'
import { cn } from '@/lib/cn'
import { AREA_UNITS, IRRIGATION_TYPES, PREVIOUS_CROP_OPTIONS, SPECIES, getSpecies, seasonLength, stageForDay, stageById } from '@/mock/catalog'
import { addDays, daysBetween, isoDate } from '@/mock/util'
import type { GrowthStageId, Plant } from '@/mock/types'
import { useFarm } from '@/store/farm'
import { toast } from '@/store/ui'

const plantSchema = z.object({
  speciesId: z.string().min(1, 'Choose the crop.'),
  variety: z.string().min(1, 'Choose the variety.'),
  plantedAt: z.string().min(1, 'When did the crop go in?'),
  areaValue: z.coerce.number().gt(0, 'Area must be greater than zero.').max(10000, 'That area looks too large.'),
  areaUnit: z.enum(['acre', 'hectare', 'sqm']),
  soilPh: z.coerce.number().min(3.5, 'pH cannot be below 3.5.').max(9.5, 'pH cannot be above 9.5.'),
  soilMoisture: z.coerce.number().min(0, 'Moisture is a percentage.').max(100, 'Moisture is a percentage.'),
  nitrogen: z.coerce.number().min(0).max(400, 'Available N above 400 kg/ha is not plausible.'),
  phosphorus: z.coerce.number().min(0).max(300, 'Available P above 300 kg/ha is not plausible.'),
  potassium: z.coerce.number().min(0).max(600, 'Exchangeable K above 600 kg/ha is not plausible.'),
  organicMatter: z.coerce.number().min(0, 'Organic matter is a percentage.').max(12, 'Organic matter above 12 % is not plausible.'),
  irrigationType: z.string().min(1),
  previousCropId: z.string().min(1),
  spacingCm: z.coerce.number().min(5, 'Spacing below 5 cm is not usable.').max(300, 'Spacing above 3 m is unusual.'),
  seedRateKgPerAcre: z.coerce.number().min(0).max(2000),
  stageOverride: z.string(),
  notes: z.string().max(400, 'Keep the note under 400 characters.').optional().default(''),
})

type PlantForm = z.input<typeof plantSchema>
type PlantPayload = z.output<typeof plantSchema>


const TODAY = () => isoDate(new Date())

export function PlantsTab() {
  const bundle = useFarm((s) => s.bundle)
  const patchPlant = useFarm((s) => s.patchPlant)
  const addPlant = useFarm((s) => s.addPlant)
  const deletePlant = useFarm((s) => s.deletePlant)
  const recalc = useFarm((s) => s.recalc)
  const [params, setParams] = useSearchParams()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Plant | null>(null)
  const [deleting, setDeleting] = useState<Plant | null>(null)
  const [expanded, setExpanded] = useState<string | null>(params.get('plant'))
  const [busy, setBusy] = useState(false)

  const plants = bundle?.plants ?? []

  useEffect(() => {
    const fromUrl = params.get('plant')
    if (fromUrl && plants.some((p) => p.id === fromUrl)) setExpanded(fromUrl)
  }, [params, plants])

  if (!bundle) return null

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-[62ch]">
          <p className="eyebrow mb-1.5">Plot records</p>
          <h2 className="font-display text-xl text-ink">Crop records</h2>
          <p className="mt-1.5 text-sm text-ink-2">
            Every property here is an input to the engine. Edit any value and the change is logged as an operation, then
            advice, risk and the charts are recalculated from it.
          </p>
        </div>
      </div>

      {plants.length === 0 ? (
        <Panel>
          <EmptyState
            illustration={<SeedlingIllustration />}
            title="No plants recorded"
            description="Add the first crop with its planting date and the last soil test values. Advice, risk and every chart are derived from these properties."
            actions={
              <Button variant="primary" icon={<Plus />} onClick={() => setAdding(true)}>
                Add a plant
              </Button>
            }
          />
        </Panel>
      ) : (
        <Panel>
          <PanelHead
            title="Plant ledger"
            meta={`${plants.length} plot record${plants.length === 1 ? '' : 's'} · total ${formatArea({ value: plants.reduce((a, p) => a + (p.area.unit === 'acre' ? p.area.value : p.area.value * 0.404686), 0), unit: 'acre' })}`}
            actions={
              <span className="hidden items-center gap-3 sm:flex">
                <MetaPair label="Stage source" value="planting date" />
              </span>
            }
          />
          <div className="overflow-x-auto">
            <Ledger>
              <caption className="sr-only">Plants with current stage, area and soil test values</caption>
              <thead>
                <tr>
                  <Th>Crop &amp; variety</Th>
                  <Th numeric>Area</Th>
                  <Th>Planted</Th>
                  <Th>Stage</Th>
                  <Th numeric>pH</Th>
                  <Th numeric>Moisture</Th>
                  <Th numeric>N</Th>
                  <Th numeric>P</Th>
                  <Th numeric>K</Th>
                  <Th className="col-actions">
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {plants.map((plant) => {
                  const species = getSpecies(plant.speciesId)
                  const days = daysBetween(plant.plantedAt, TODAY())
                  const stage = stageForDay(species, days)
                  const isExpanded = expanded === plant.id
                  return (
                    <Fragment key={plant.id}>
                      <tr>
                        <Td label="Crop" className="strong">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 text-left hover:underline"
                            aria-expanded={isExpanded}
                            onClick={() => {
                              const next = isExpanded ? null : plant.id
                              setExpanded(next)
                              setParams(next ? { plant: next } : {}, { replace: true })
                            }}
                          >
                            <ChevronDown size={13} className={cn('text-soil-300 transition-transform', isExpanded && 'rotate-180')} aria-hidden />
                            {species.name}
                          </button>
                          <span className="mt-0.5 block text-[11px] text-ink-3">{plant.variety}</span>
                        </Td>
                        <Td numeric label="Area">
                          {formatArea(plant.area)}
                        </Td>
                        <Td label="Planted">
                          {formatDate(plant.plantedAt)}
                          <span className="mt-0.5 block text-[11px] text-ink-3">day {days}</span>
                        </Td>
                        <Td label="Stage">
                          <Stamp tone={stage.waterCritical ? 'marigold' : 'neutral'}>{stage.label}</Stamp>
                        </Td>
                        <Td numeric label="pH">
                          <span className={cn(plant.soilPh < 5.9 || plant.soilPh > 7.6 ? 'font-semibold text-clay-700' : 'text-ink-2')}>
                            {plant.soilPh.toFixed(2)}
                          </span>
                        </Td>
                        <Td numeric label="Moisture">
                          {plant.soilMoisture} %
                        </Td>
                        <Td numeric label="N">
                          {plant.nitrogen}
                        </Td>
                        <Td numeric label="P">
                          {plant.phosphorus}
                        </Td>
                        <Td numeric label="K">
                          {plant.potassium}
                        </Td>
                        <Td className="col-actions">
                          <span className="actions-inner">
                            <Button size="sm" variant="quiet" icon={<Pencil />} aria-label={`Edit ${plant.variety}`} onClick={() => setEditing(plant)} />
                            <Dropdown>
                              <DropdownTrigger asChild>
                                <button type="button" className="btn btn-sm btn-quiet btn-icon" aria-label={`More actions for ${plant.variety}`}>
                                  <MoreHorizontal aria-hidden />
                                </button>
                              </DropdownTrigger>
                              <DropdownContent>
                                <DropdownItem icon={<Pencil />} onSelect={() => setEditing(plant)}>
                                  Edit properties
                                </DropdownItem>
                                <DropdownItem
                                  icon={<CalendarDays />}
                                  onSelect={() =>
                                    setExpanded(isExpanded ? null : plant.id)
                                  }
                                >
                                  Stage &amp; calendar
                                </DropdownItem>
                                <DropdownSeparator />
                                <DropdownItem icon={<Trash2 />} danger onSelect={() => setDeleting(plant)}>
                                  Remove plant
                                </DropdownItem>
                              </DropdownContent>
                            </Dropdown>
                          </span>
                        </Td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${plant.id}-detail`}>
                          <td colSpan={10} className="!bg-paper-sunken/60 !p-0">
                            <PlantDetail plant={plant} onEdit={() => setEditing(plant)} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </Ledger>
          </div>
        </Panel>
      )}

      <ChangeLog />

      <PlantDialog
        mode="add"
        open={adding}
        onOpenChange={setAdding}
        onSubmit={async (values) => {
          setBusy(true)
          try {
            await addPlant(bundle.farm.id, {
              speciesId: values.speciesId,
              variety: values.variety,
              plantedAt: values.plantedAt,
              area: { value: values.areaValue, unit: values.areaUnit },
              soilPh: values.soilPh,
              soilMoisture: values.soilMoisture,
              nitrogen: values.nitrogen,
              phosphorus: values.phosphorus,
              potassium: values.potassium,
              organicMatter: values.organicMatter,
              irrigationType: values.irrigationType as Plant['irrigationType'],
              previousCropId: values.previousCropId,
              spacingCm: values.spacingCm,
              seedRateKgPerAcre: values.seedRateKgPerAcre,
              stageOverride: (values.stageOverride || null) as GrowthStageId | null,
              notes: values.notes ?? '',
            })
            toast({ tone: 'success', title: 'Plant added', body: 'Advice and risk recalculated for the farm.' })
            setAdding(false)
          } catch (error) {
            toast({ tone: 'danger', title: 'Could not add the plant', body: error instanceof Error ? error.message : 'Unknown error' })
          } finally {
            setBusy(false)
          }
        }}
        busy={busy}
      />

      {editing && (
        <PlantDialog
          mode="edit"
          plant={editing}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          onSubmit={async (values) => {
            setBusy(true)
            try {
              const patch: Partial<Plant> = {}
              if (values.variety !== editing.variety) patch.variety = values.variety
              if (values.plantedAt !== editing.plantedAt) patch.plantedAt = values.plantedAt
              if (values.areaValue !== editing.area.value || values.areaUnit !== editing.area.unit)
                patch.area = { value: values.areaValue, unit: values.areaUnit }
              if (values.soilPh !== editing.soilPh) patch.soilPh = values.soilPh
              if (values.soilMoisture !== editing.soilMoisture) patch.soilMoisture = values.soilMoisture
              if (values.nitrogen !== editing.nitrogen) patch.nitrogen = values.nitrogen
              if (values.phosphorus !== editing.phosphorus) patch.phosphorus = values.phosphorus
              if (values.potassium !== editing.potassium) patch.potassium = values.potassium
              if (values.organicMatter !== editing.organicMatter) patch.organicMatter = values.organicMatter
              if (values.irrigationType !== editing.irrigationType) patch.irrigationType = values.irrigationType as Plant['irrigationType']
              if (values.previousCropId !== editing.previousCropId) patch.previousCropId = values.previousCropId
              if (values.spacingCm !== editing.spacingCm) patch.spacingCm = values.spacingCm
              if (values.seedRateKgPerAcre !== editing.seedRateKgPerAcre) patch.seedRateKgPerAcre = values.seedRateKgPerAcre
              if ((values.stageOverride || null) !== editing.stageOverride) patch.stageOverride = (values.stageOverride || null) as GrowthStageId | null
              if ((values.notes ?? '') !== editing.notes) patch.notes = values.notes ?? ''
              if (!Object.keys(patch).length) {
                toast({ tone: 'info', title: 'Nothing changed', body: 'Edit at least one property to trigger a recalculation.' })
                setEditing(null)
                return
              }
              await patchPlant(editing.id, patch)
              toast({
                tone: 'success',
                title: 'Property updated',
                body: `Advice and risk recalculated from ${Object.keys(patch).length} change${Object.keys(patch).length === 1 ? '' : 's'}.`,
              })
              setEditing(null)
            } catch (error) {
              toast({ tone: 'danger', title: 'Could not save the change', body: error instanceof Error ? error.message : 'Unknown error' })
            } finally {
              setBusy(false)
            }
          }}
          busy={busy}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Remove ${deleting?.variety ?? 'this plant'}?`}
        description="The plot record and its soil test values are removed, and advice is recalculated without it. The change log keeps the removal."
        confirmLabel="Remove plant"
        tone="danger"
        onConfirm={() => {
          if (!deleting) return
          void deletePlant(deleting.id).then(() => {
            toast({ tone: 'info', title: 'Plant removed' })
            setDeleting(null)
          })
        }}
      />

      {recalc.active && (
        <p className="text-xs text-ink-3" role="status">
          Recalculation in progress — the ledger keeps the previous values until the new version lands.
        </p>
      )}
    </div>
  )
}

function PlantDetail({ plant, onEdit }: { plant: Plant; onEdit: () => void }) {
  const species = getSpecies(plant.speciesId)
  const days = daysBetween(plant.plantedAt, TODAY())
  const stage = stageForDay(species, days)
  const season = seasonLength(species, plant.variety)
  const harvestFrom = addDays(plant.plantedAt, season - 5)
  const harvestTo = addDays(plant.plantedAt, season + 7)
  const stageIndex = species.stages.findIndex((s) => s.id === stage.id)

  return (
    <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div>
        <p className="eyebrow">Stage timeline</p>
        <ol className="mt-3 space-y-0">
          {species.stages.slice(0, -1).map((s, index) => {
            const done = index < stageIndex
            const current = index === stageIndex
            return (
              <li key={s.id} className="relative flex gap-3 pb-4 last:pb-0">
                <span className="relative flex w-4 flex-none justify-center">
                  <span
                    className={cn(
                      'z-10 mt-1 h-[9px] w-[9px] flex-none rounded-full border',
                      current ? 'border-marigold-600 bg-marigold-500' : done ? 'border-green-700 bg-green-600' : 'border-line-strong bg-paper-raised',
                    )}
                  />
                  {index < species.stages.length - 2 && (
                    <span className={cn('absolute left-1/2 top-3 h-full w-px -translate-x-1/2', done ? 'bg-green-600/50' : 'bg-line')} />
                  )}
                </span>
                <span className="min-w-0">
                  <span className={cn('block text-sm', current ? 'font-semibold text-ink' : 'text-ink-2')}>
                    {s.label}
                    {current && <span className="ml-2 text-xs font-normal text-marigold-700">day {days}</span>}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-3">
                    day {s.fromDay}–{s.toDay > 900 ? season : s.toDay} · Kc {s.kc} · {s.note}
                  </span>
                </span>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="eyebrow">Harvest window</p>
            <p className="tnum mt-1 text-sm text-ink">
              {formatDate(harvestFrom, 'dayMonth')} – {formatDate(harvestTo, 'dayMonth')}
            </p>
          </div>
          <div>
            <p className="eyebrow">Days to harvest</p>
            <p className="tnum mt-1 text-sm text-ink">{Math.max(0, season - days)} of {season}</p>
          </div>
          <div>
            <p className="eyebrow">Previous crop</p>
            <p className="mt-1 text-sm text-ink">
              {plant.previousCropId === 'fallow' ? 'Fallow' : getSpecies(plant.previousCropId).name}
            </p>
          </div>
          <div>
            <p className="eyebrow">Updated</p>
            <p className="mt-1 text-sm text-ink">{relativeTime(plant.updatedAt)}</p>
          </div>
        </div>
        <div className="rounded-sm border border-dashed border-line-strong bg-paper-raised px-3 py-2.5">
          <p className="eyebrow">Field note</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">{plant.notes || 'No note recorded for this plot.'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" icon={<Pencil />} onClick={onEdit}>
            Edit properties
          </Button>
          <Button
            size="sm"
            variant="quiet"
            icon={<Sprout />}
            onClick={() => toast({ tone: 'info', title: `${species.name} · ${stage.label}`, body: stage.note })}
          >
            What to watch in this stage
          </Button>
        </div>
      </div>
    </div>
  )
}

function ChangeLog() {
  const bundle = useFarm((s) => s.bundle)
  const operations = bundle?.operations ?? []
  if (!operations.length) return null
  return (
    <Panel>
      <PanelHead
        title="Change log"
        meta="Every property operation on this farm, newest first"
        display
      />
      <ul className="divide-y divide-line">
        {operations.slice(0, 10).map((op) => (
          <li key={op.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5">
            <span className="text-xs text-ink-3">{formatDate(op.at)}</span>
            <span className="text-sm font-medium text-ink">{op.entityLabel}</span>
            <span className="text-sm text-ink-2">
              {op.fieldLabel}:{' '}
              <span className="tnum text-ink-3 line-through">{op.before}</span>{' '}
              <span aria-hidden>→</span> <span className="tnum font-semibold text-ink">{op.after}</span>
            </span>
            <span className="ml-auto text-xs text-ink-3">
              {op.actorName} · {relativeTime(op.at)}
            </span>
          </li>
        ))}
      </ul>
      {operations.length > 10 && (
        <p className="border-t border-line px-4 py-2.5 text-xs text-ink-3">
          Showing the 10 most recent of {operations.length} operations on this farm.
        </p>
      )}
    </Panel>
  )
}

/* ---------------------------------------------------------------- dialog -- */

function PlantDialog({
  mode,
  plant,
  open,
  onOpenChange,
  onSubmit,
  busy,
}: {
  mode: 'add' | 'edit'
  plant?: Plant
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: PlantPayload) => void
  busy: boolean
}) {
  const defaults = useMemo<PlantForm>(
    () => ({
      speciesId: plant?.speciesId ?? 'winter-wheat',
      variety: plant?.variety ?? getSpecies('winter-wheat').varieties[0].name,
      plantedAt: plant?.plantedAt ?? TODAY(),
      areaValue: plant?.area.value ?? 2,
      areaUnit: plant?.area.unit ?? 'acre',
      soilPh: plant?.soilPh ?? 6.4,
      soilMoisture: plant?.soilMoisture ?? 55,
      nitrogen: plant?.nitrogen ?? 34,
      phosphorus: plant?.phosphorus ?? 14,
      potassium: plant?.potassium ?? 50,
      organicMatter: plant?.organicMatter ?? 1.4,
      irrigationType: plant?.irrigationType ?? 'shallow-tubewell',
      previousCropId: plant?.previousCropId ?? 'fallow',
      spacingCm: plant?.spacingCm ?? 25,
      seedRateKgPerAcre: plant?.seedRateKgPerAcre ?? 8,
      stageOverride: plant?.stageOverride ?? '',
      notes: plant?.notes ?? '',
    }),
    [plant],
  )

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PlantForm, unknown, PlantPayload>({ resolver: zodResolver(plantSchema), values: defaults })

  const speciesId = watch('speciesId')
  const species = getSpecies(speciesId)
  const plantedAt = watch('plantedAt')
  const stageOverride = watch('stageOverride')
  const days = plantedAt ? Math.max(0, daysBetween(plantedAt, TODAY())) : 0
  const stage = stageForDay(species, days)

  const previousVariety = useMemo(() => defaults.variety, [defaults.variety])

  // Keep the variety valid when the crop changes.
  useEffect(() => {
    if (mode === 'add' || speciesId !== defaults.speciesId) {
      const current = getSpecies(speciesId)
      if (!current.varieties.some((v) => v.name === watch('variety'))) {
        setValue('variety', current.varieties[0].name)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speciesId])

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'add' ? 'Add a plant' : `Edit ${previousVariety}`}
      description="Soil test values, planting date and area are the inputs the engine reasons from. Stage is derived from the planting date unless you override it."
      width="lg"
      footer={
        <>
          <Button variant="quiet" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" loading={busy} onClick={handleSubmit(onSubmit)}>
            {mode === 'add' ? 'Add plant' : 'Save and recalculate'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Crop" error={errors.speciesId?.message}>
            {({ id, ...aria }) => (
              <Select
                id={id}
                options={SPECIES.map((s) => ({ value: s.id, label: s.name }))}
                {...aria}
                {...register('speciesId')}
              />
            )}
          </Field>
          <Field label="Variety" error={errors.variety?.message} hint={species.varieties.find((v) => v.name === watch('variety'))?.note}>
            {({ id, ...aria }) => (
              <Select id={id} options={species.varieties.map((v) => ({ value: v.name, label: `${v.name} · ${v.durationDays} d` }))} {...aria} {...register('variety')} />
            )}
          </Field>
          <Field label="Planted" error={errors.plantedAt?.message} hint={`Day ${days} of the season · ${stage.label}`}>
            {({ id, ...aria }) => <Input id={id} type="date" {...aria} {...register('plantedAt')} />}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Area" error={errors.areaValue?.message}>
            {({ id, ...aria }) => <Input id={id} type="number" step="0.1" min="0" {...aria} {...register('areaValue')} />}
          </Field>
          <Field label="Unit" error={errors.areaUnit?.message}>
            {({ id, ...aria }) => (
              <Select id={id} options={AREA_UNITS.map((u) => ({ value: u.id, label: u.plural }))} {...aria} {...register('areaUnit')} />
            )}
          </Field>
        </div>

        <fieldset className="rounded-sm border border-line bg-paper-sunken/50 p-3.5">
          <legend className="eyebrow px-1">Soil test values</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="pH" error={errors.soilPh?.message} hint="Water, 1:2.5">
              {({ id, ...aria }) => <Input id={id} type="number" step="0.01" min="3.5" max="9.5" {...aria} {...register('soilPh')} />}
            </Field>
            <Field label="Moisture (%)" error={errors.soilMoisture?.message}>
              {({ id, ...aria }) => <Input id={id} type="number" min="0" max="100" {...aria} {...register('soilMoisture')} />}
            </Field>
            <Field label="Organic matter (%)" error={errors.organicMatter?.message}>
              {({ id, ...aria }) => <Input id={id} type="number" step="0.1" min="0" {...aria} {...register('organicMatter')} />}
            </Field>
            <Field label="Available N (kg/ha)" error={errors.nitrogen?.message}>
              {({ id, ...aria }) => <Input id={id} type="number" min="0" {...aria} {...register('nitrogen')} />}
            </Field>
            <Field label="Available P (kg/ha)" error={errors.phosphorus?.message}>
              {({ id, ...aria }) => <Input id={id} type="number" min="0" {...aria} {...register('phosphorus')} />}
            </Field>
            <Field label="Exchangeable K (kg/ha)" error={errors.potassium?.message}>
              {({ id, ...aria }) => <Input id={id} type="number" min="0" {...aria} {...register('potassium')} />}
            </Field>
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Irrigation for this plot" error={errors.irrigationType?.message}>
            {({ id, ...aria }) => (
              <Select id={id} options={IRRIGATION_TYPES.map((t) => ({ value: t.id, label: t.label }))} {...aria} {...register('irrigationType')} />
            )}
          </Field>
          <Field label="Previous crop on this ground" error={errors.previousCropId?.message} hint="Drives the rotation advice.">
            {({ id, ...aria }) => (
              <Select id={id} options={PREVIOUS_CROP_OPTIONS.map((c) => ({ value: c.id, label: c.label }))} {...aria} {...register('previousCropId')} />
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Spacing (cm)" error={errors.spacingCm?.message}>
            {({ id, ...aria }) => <Input id={id} type="number" min="5" {...aria} {...register('spacingCm')} />}
          </Field>
          <Field label="Seed rate (kg/acre)" error={errors.seedRateKgPerAcre?.message}>
            {({ id, ...aria }) => <Input id={id} type="number" step="0.5" min="0" {...aria} {...register('seedRateKgPerAcre')} />}
          </Field>
          <Field label="Stage override" hint="Leave automatic unless you have walked the field.">
            {({ id, ...aria }) => (
              <Select
                id={id}
                options={[
                  { value: '', label: `Automatic — ${stage.label}` },
                  ...species.stages.slice(0, -1).map((s) => ({ value: s.id, label: s.label })),
                ]}
                {...aria}
                {...register('stageOverride')}
              />
            )}
          </Field>
        </div>
        {stageOverride && (
          <InlineAlert tone="warning" title="Stage is overridden">
            The engine is using {stageById(species, stageOverride as GrowthStageId).label} regardless of the planting date.
            Water and nutrient advice follows the stage you set.
          </InlineAlert>
        )}

        <Field label="Field note" error={errors.notes?.message}>
          {({ id, ...aria }) => (
            <Textarea id={id} rows={2} placeholder="Anything the field team should know about this plot." {...aria} {...register('notes')} />
          )}
        </Field>

        <div className="rounded-sm border border-dashed border-line-strong bg-paper-sunken px-3.5 py-3 text-xs leading-relaxed text-ink-2">
          <p className="font-semibold text-ink">Requirement for this crop</p>
          <p className="mt-1">
            {titleCase(species.name)} needs {species.nutrientNeed.n} kg N, {species.nutrientNeed.p} kg P₂O₅ and{' '}
            {species.nutrientNeed.k} kg K₂O per acre over {species.durationDays} days, with about {species.totalWaterMm} mm of
            water. Optimal pH is {species.optimalPh[0]}–{species.optimalPh[1]}.
          </p>
        </div>
      </form>
    </Dialog>
  )
}

export function PlantsSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-9" />
      ))}
    </div>
  )
}
