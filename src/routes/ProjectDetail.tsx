import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Droplets,
  MapPin,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Sprout,
  Trash2,
  Users,
  Warehouse,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { PlotIllustration } from '@/components/brand/brand'
import { Button, CheckboxField, Field, Input, Select, SwitchField, Textarea } from '@/components/ui/controls'
import { Ledger, SeverityStamp, Stamp, Td, Th } from '@/components/ui/data'
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
import { Divider, Panel, PanelBody, PanelHead, SectionHead } from '@/components/ui/surfaces'
import { useAsync } from '@/lib/hooks'
import { cn } from '@/lib/cn'
import { formatArea, formatMoney, formatNumber, relativeTime } from '@/lib/format'
import { api, ApiError } from '@/mock/api'
import {
  ACCOMMODATION_KINDS,
  AREA_UNITS,
  CLIMATE_ZONES,
  DISTRICTS,
  EQUIPMENT,
  IRRIGATION_TYPES,
  SOIL_TYPES,
  districtByName,
} from '@/mock/catalog'
import type { Accommodation, EquipmentId, Farm, Project } from '@/mock/types'
import { USERS } from '@/mock/seed'
import { toast, useUi } from '@/store/ui'

const farmSchema = z.object({
  name: z.string().min(3, 'Give the block a name at least 3 characters long.').max(60, 'Keep it under 60 characters.'),
  district: z.string().min(1, 'Choose the district.'),
  locality: z.string().min(2, 'Which locality is the land in?'),
  areaValue: z.coerce.number().gt(0, 'Area must be greater than zero.').max(20000, 'That area looks too large.'),
  areaUnit: z.enum(['acre', 'hectare', 'sqm']),
  soilType: z.string().min(1),
  landType: z.enum(['high', 'medium', 'low']),
  irrigationType: z.string().min(1),
  waterSource: z.string().min(2, 'Describe where irrigation water comes from.'),
  establishedYear: z.coerce.number().min(1900, 'That year is too early.').max(new Date().getFullYear(), 'The year cannot be in the future.'),
  notes: z.string().max(400, 'That is longer than the field allows.').optional().default(''),
  latitude: z.union([z.literal(''), z.coerce.number().min(-90, 'Latitude is between -90 and 90.').max(90, 'Latitude is between -90 and 90.')]),
  longitude: z.union([z.literal(''), z.coerce.number().min(-180, 'Longitude is between -180 and 180.').max(180, 'Longitude is between -180 and 180.')]),
})

type FarmValues = z.input<typeof farmSchema>

export function ProjectDetailRoute() {
  const { projectId = '' } = useParams()
  const navigate = useNavigate()
  const project = useAsync(() => api.getProject(projectId), [projectId])
  const farms = useAsync(() => api.listFarms(projectId), [projectId])
  const [addFarmOpen, setAddFarmOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [equipmentOpen, setEquipmentOpen] = useState(false)
  const [accommodationEditing, setAccommodationEditing] = useState<Accommodation | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Farm | null>(null)
  const [busy, setBusy] = useState(false)

  const reloadAll = () => {
    project.reload()
    farms.reload()
  }

  if (!project.loading && !project.data) {
    return (
      <Panel>
        <EmptyState
          illustration={<PlotIllustration />}
          title="That project no longer exists"
          description="It may have been deleted, or the link came from an earlier version of the demo data."
          actions={
            <Button variant="primary" onClick={() => navigate('/projects')}>
              Back to projects
            </Button>
          }
        />
      </Panel>
    )
  }

  const p = project.data
  const rows = farms.data ?? []

  return (
    <div className="mx-auto max-w-[1240px]">
      <Link to="/projects" className="link inline-flex items-center gap-1.5 text-xs">
        <ArrowLeft size={12} aria-hidden />
        All projects
      </Link>

      <div className="mt-3">
        {project.loading || !p ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-[46%]" />
            <Skeleton className="h-3 w-[64%]" />
          </div>
        ) : (
          <SectionHead
            eyebrow={`${p.region} · ${CLIMATE_ZONES[p.climateZone].label}`}
            title={p.name}
            description={p.summary}
            actions={
              <>
                <Button variant="outline" icon={<Pencil />} onClick={() => setEditOpen(true)}>
                  Edit profile
                </Button>
                <Button variant="primary" icon={<Plus />} onClick={() => setAddFarmOpen(true)}>
                  Add farm
                </Button>
              </>
            }
          />
        )}
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1.62fr)_minmax(0,1fr)]">
        {/* Farms ledger */}
        <div className="space-y-5">
          <Panel>
            <PanelHead
              title="Farms in this programme"
              meta={
                p
                  ? `${rows.length} block${rows.length === 1 ? '' : 's'} · ${formatMoney(p.budgetUsd, { compact: true })} season budget`
                  : undefined
              }
              actions={
                <Button size="sm" variant="outline" icon={<Plus />} onClick={() => setAddFarmOpen(true)}>
                  Add farm
                </Button>
              }
            />
            {farms.loading && (
              <div className="space-y-2 p-4">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-9" />
                ))}
              </div>
            )}
            {!farms.loading && rows.length === 0 && (
              <EmptyState
                compact
                illustration={<PlotIllustration className="w-[130px]" />}
                title="No farms yet"
                description="A farm is one block of land with its own soil, water source and plant record. Advice is generated farm by farm."
                actions={
                  <Button variant="primary" icon={<Plus />} onClick={() => setAddFarmOpen(true)}>
                    Add the first farm
                  </Button>
                }
              />
            )}
            {!farms.loading && rows.length > 0 && (
              <div className="overflow-x-auto">
                <Ledger>
                  <caption className="sr-only">Farms in {p?.name}</caption>
                  <thead>
                    <tr>
                      <Th>Farm</Th>
                      <Th>District</Th>
                      <Th numeric>Area</Th>
                      <Th>Land &amp; soil</Th>
                      <Th numeric>Plants</Th>
                      <Th>Risk</Th>
                      <Th>Advice</Th>
                      <Th className="col-actions">
                        <span className="sr-only">Actions</span>
                      </Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const severity = row.worstRisk?.items[0]?.severity ?? null
                      return (
                        <tr key={row.farm.id}>
                          <Td label="Farm" className="strong">
                            <Link to={`/farms/${row.farm.id}/overview`} className="hover:underline">
                              {row.farm.name}
                            </Link>
                            <span className="mt-0.5 block text-[11px] text-ink-3">{row.farm.locality}</span>
                          </Td>
                          <Td label="District">{row.farm.district}</Td>
                          <Td numeric label="Area">
                            {formatArea(row.farm.area)}
                          </Td>
                          <Td label="Land & soil">
                            <span className="capitalize">{row.farm.landType}</span>
                            <span className="mt-0.5 block text-[11px] text-ink-3">
                              {row.farm.soilType.replace(/-/g, ' ')}
                            </span>
                          </Td>
                          <Td numeric label="Plants">
                            {row.plantCount}
                          </Td>
                          <Td label="Risk">
                            {severity ? (
                              <SeverityStamp severity={severity} />
                            ) : (
                              <span className="text-xs text-ink-3">pending</span>
                            )}
                          </Td>
                          <Td label="Advice">
                            <span className="text-xs text-ink-3">
                              {row.worstRisk ? relativeTime(row.worstRisk.createdAt) : '—'}
                            </span>
                          </Td>
                          <Td className="col-actions">
                            <span className="actions-inner">
                              <Button
                                size="sm"
                                variant="quiet"
                                aria-label={`Open ${row.farm.name}`}
                                onClick={() => navigate(`/farms/${row.farm.id}/overview`)}
                              >
                                <ArrowRight aria-hidden />
                              </Button>
                              <Dropdown>
                                <DropdownTrigger asChild>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-quiet btn-icon"
                                    aria-label={`More actions for ${row.farm.name}`}
                                  >
                                    <MoreHorizontal aria-hidden />
                                  </button>
                                </DropdownTrigger>
                                <DropdownContent>
                                  <DropdownItem icon={<ArrowRight />} onSelect={() => navigate(`/farms/${row.farm.id}/overview`)}>
                                    Open farm
                                  </DropdownItem>
                                  <DropdownItem icon={<Sprout />} onSelect={() => navigate(`/farms/${row.farm.id}/plants`)}>
                                    Plants &amp; properties
                                  </DropdownItem>
                                  <DropdownItem icon={<Users />} onSelect={() => navigate(`/farms/${row.farm.id}/teams`)}>
                                    Team &amp; invitations
                                  </DropdownItem>
                                  <DropdownSeparator />
                                  <DropdownItem icon={<Trash2 />} danger onSelect={() => setDeleting(row.farm)}>
                                    Delete farm
                                  </DropdownItem>
                                </DropdownContent>
                              </Dropdown>
                            </span>
                          </Td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Ledger>
              </div>
            )}
          </Panel>

          {/* What the engine reads from the project profile. */}
          <Panel>
            <PanelHead title="How this project profile is used" display />
            <PanelBody className="space-y-3.5">
              {p && (
                <dl className="grid gap-4 sm:grid-cols-3">
                  <ProfileFigure label="Region" value={p.region} note="Sets the rainfall and temperature baseline" />
                  <ProfileFigure
                    label="Climate zone"
                    value={p.climateZone}
                    note={CLIMATE_ZONES[p.climateZone].description}
                  />
                  <ProfileFigure
                    label="Season budget"
                    value={formatMoney(p.budgetUsd, { compact: true })}
                    note="Compared against input and irrigation cost in advice"
                  />
                </dl>
              )}
              <ul className="space-y-2 text-sm text-ink-2">
                <li className="flex gap-2">
                  <Check size={14} className="mt-[5px] flex-none text-green-600" aria-hidden />
                  <span>
                    <span className="font-medium text-ink">Equipment</span> decides which operations advice may recommend —
                    a reaper changes the harvest timing plan, a drip line changes the irrigation depth.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Check size={14} className="mt-[5px] flex-none text-green-600" aria-hidden />
                  <span>
                    <span className="font-medium text-ink">Accommodations</span> — storage, labour, transport, credit — decide how
                    strongly market risk is scored and whether a holding strategy is realistic.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Check size={14} className="mt-[5px] flex-none text-green-600" aria-hidden />
                  <span>
                    Changing any of these records an operation and re-runs advice and risk for every farm in the programme.
                  </span>
                </li>
              </ul>
            </PanelBody>
          </Panel>
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          <Panel>
            <PanelHead
              title="Equipment"
              meta={p ? `${p.equipment.length} of ${EQUIPMENT.length} recorded` : undefined}
              actions={
                <Button size="sm" variant="quiet" icon={<Pencil />} onClick={() => setEquipmentOpen(true)}>
                  Edit
                </Button>
              }
            />
            <ul className="divide-y divide-line">
              {(p?.equipment ?? []).map((id) => {
                const item = EQUIPMENT.find((e) => e.id === id)
                if (!item) return null
                return (
                  <li key={id} className="flex items-start gap-3 px-4 py-2.5">
                    <Package size={14} className="mt-[3px] flex-none text-ink-3" aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-sm text-ink">{item.label}</span>
                      <span className="mt-0.5 block text-xs text-ink-3">{item.enables}</span>
                    </span>
                  </li>
                )
              })}
              {p?.equipment.length === 0 && (
                <li className="px-4 py-3 text-sm text-ink-3">
                  Nothing recorded. Advice will assume only hand tools and rain.
                </li>
              )}
            </ul>
          </Panel>

          <Panel>
            <PanelHead
              title="Accommodations"
              meta={p ? `${p.accommodations.filter((a) => a.available).length} available` : undefined}
              actions={
                <Button size="sm" variant="quiet" icon={<Plus />} onClick={() => setAccommodationEditing('new')}>
                  Add
                </Button>
              }
            />
            <ul className="divide-y divide-line">
              {(p?.accommodations ?? []).map((acc) => (
                <li key={acc.id} className="flex items-start gap-3 px-4 py-2.5">
                  <span className={cn('mt-[3px] flex-none', acc.available ? 'text-green-600' : 'text-soil-300')}>
                    {acc.kind === 'storage' ? <Warehouse size={14} aria-hidden /> : <Droplets size={14} aria-hidden />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm text-ink">{acc.label}</span>
                      <Stamp tone={acc.available ? 'green' : 'neutral'}>{acc.available ? 'available' : 'not available'}</Stamp>
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-3">{acc.detail}</span>
                  </span>
                  <button
                    type="button"
                    className="link flex-none text-[11px]"
                    onClick={() => setAccommodationEditing(acc)}
                  >
                    edit
                  </button>
                </li>
              ))}
              {p?.accommodations.length === 0 && (
                <li className="px-4 py-3 text-sm text-ink-3">
                  Storage, labour and transport records sharpen the market risk scoring.
                </li>
              )}
            </ul>
          </Panel>

          {p && (
            <Panel>
              <PanelHead title="Record" />
              <PanelBody className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink-3">Created</span>
                  <span className="text-ink-2">{relativeTime(p.createdAt)}</span>
                </div>
                <Divider className="my-2.5" />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink-3">Last changed</span>
                  <span className="text-ink-2">{relativeTime(p.updatedAt)}</span>
                </div>
                <Divider className="my-2.5" />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink-3">Owner</span>
                  <span className="text-ink-2">{USERS.find((user) => user.id === p.ownerId)?.name ?? 'Project owner'}</span>
                </div>
                <Divider className="my-2.5" />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink-3">Total area</span>
                  <span className="tnum text-ink-2">
                    {formatNumber(rows.reduce((a, r) => a + toAcreOf(r.farm), 0), 2)} acres
                  </span>
                </div>
              </PanelBody>
            </Panel>
          )}
        </div>
      </div>

      <AddFarmDialog
        project={p ?? null}
        open={addFarmOpen}
        onOpenChange={setAddFarmOpen}
        onCreated={(farm) => {
          reloadAll()
          toast({ tone: 'success', title: `${farm.name} added`, body: 'Now add the plants growing on it.' })
          navigate(`/farms/${farm.id}/overview`)
        }}
      />

      {p && (
        <EditProjectDialog
          project={p}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={() => {
            setEditOpen(false)
            project.reload()
            toast({ tone: 'success', title: 'Project profile updated', body: 'Advice and risk recalculated for its farms.' })
          }}
        />
      )}

      {p && (
        <EquipmentDialog
          project={p}
          open={equipmentOpen}
          onOpenChange={setEquipmentOpen}
          onSaved={() => {
            setEquipmentOpen(false)
            project.reload()
          }}
        />
      )}

      {p && accommodationEditing && (
        <AccommodationDialog
          project={p}
          editing={accommodationEditing === 'new' ? null : accommodationEditing}
          onOpenChange={(open) => !open && setAccommodationEditing(null)}
          onSaved={() => {
            setAccommodationEditing(null)
            project.reload()
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? 'this farm'}?`}
        description="Its plants, change log, team and every advice version are removed with it. Seeded data can be restored from the developer menu."
        confirmLabel="Delete farm"
        tone="danger"
        loading={busy}
        onConfirm={() => {
          if (!deleting) return
          setBusy(true)
          void api
            .deleteFarm(deleting.id)
            .then(() => {
              toast({ tone: 'info', title: `${deleting.name} deleted` })
              setDeleting(null)
              reloadAll()
            })
            .finally(() => setBusy(false))
        }}
      />
    </div>
  )
}

function ProfileFigure({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="border-t border-line pt-2.5">
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
      <dd className="mt-0.5 text-xs leading-relaxed text-ink-3">{note}</dd>
    </div>
  )
}

function toAcreOf(farm: Farm): number {
  const unit = AREA_UNITS.find((u) => u.id === farm.area.unit)
  return farm.area.value * (unit?.toAcre ?? 1)
}

/* ---------------------------------------------------------------- dialogs -- */

function AddFarmDialog({
  project,
  open,
  onOpenChange,
  onCreated,
}: {
  project: Project | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (farm: Farm) => void
}) {
  const [formError, setFormError] = useState<string | null>(null)
  const mode = useUi((s) => s.mode)
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FarmValues>({
    resolver: zodResolver(farmSchema),
    defaultValues: {
      name: '',
      district: 'Cedar Valley',
      locality: '',
      areaValue: 2,
      areaUnit: 'acre',
      soilType: 'silty-clay-loam',
      landType: 'medium',
      irrigationType: 'shallow-tubewell',
      waterSource: '',
      establishedYear: new Date().getFullYear(),
      notes: '',
      latitude: '',
      longitude: '',
    },
  })

  // Farmer mode skips the district picker: the project's climate zone places the farm.
  const derivedDistrict = DISTRICTS.find((d) => d.zone === project?.climateZone)?.name ?? 'Cedar Valley'
  const districtName = watch('district')
  const district = districtByName(mode === 'farmer' ? derivedDistrict : (districtName ?? 'Cedar Valley'))
  const soilType = watch('soilType')

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

  const submit = async (values: FarmValues) => {
    if (!project) return
    setFormError(null)
    try {
      const farm = await api.createFarm({
        projectId: project.id,
        name: values.name,
        district: mode === 'farmer' ? derivedDistrict : values.district,
        locality: values.locality,
        area: { value: Number(values.areaValue), unit: values.areaUnit },
        soilType: values.soilType as Farm['soilType'],
        landType: values.landType,
        irrigationType: values.irrigationType as Farm['irrigationType'],
        waterSource: values.waterSource,
        establishedYear: Number(values.establishedYear),
        notes: values.notes ?? '',
        latitude: values.latitude === '' ? null : Number(values.latitude),
        longitude: values.longitude === '' ? null : Number(values.longitude),
      })
      reset()
      onOpenChange(false)
      onCreated(farm)
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Could not create the farm.')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add a farm"
      description="One block of land with a single soil profile, water source and cropping record. Advice is generated per farm."
      width="lg"
      footer={
        <>
          <Button variant="quiet" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" loading={isSubmitting} onClick={handleSubmit(submit)}>
            Add farm
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
        {formError && <InlineAlert tone="danger" title="Could not add the farm">{formError}</InlineAlert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Farm name" error={errors.name?.message} hint="What the field team calls this block.">
            {({ id, ...aria }) => <Input id={id} placeholder="North Ridge Block" {...aria} {...register('name')} />}
          </Field>
          <Field label="Locality" error={errors.locality?.message} hint={`Common here: ${district.localities.slice(0, 3).join(', ')}`}>
            {({ id, ...aria }) => <Input id={id} placeholder="North Ridge" {...aria} {...register('locality')} />}
          </Field>
        </div>

        <div className={cn('grid gap-4', mode === 'researcher' ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
          {mode === 'researcher' && (
            <Field label="District" error={errors.district?.message}>
              {({ id, ...aria }) => (
                <Select
                  id={id}
                  options={DISTRICTS.map((d) => ({ value: d.name, label: `${d.name} (${d.zone})` }))}
                  {...aria}
                  {...register('district')}
                />
              )}
            </Field>
          )}
          <Field label="Area" error={errors.areaValue?.message}>
            {({ id, ...aria }) => (
              <Input id={id} type="number" step="0.1" min="0" {...aria} {...register('areaValue')} />
            )}
          </Field>
          <Field label="Unit" error={errors.areaUnit?.message} hint={AREA_UNITS.find((u) => u.id === watch('areaUnit'))?.note}>
            {({ id, ...aria }) => (
              <Select
                id={id}
                options={AREA_UNITS.map((u) => ({ value: u.id, label: u.plural }))}
                {...aria}
                {...register('areaUnit')}
              />
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Soil type" error={errors.soilType?.message} hint={SOIL_TYPES.find((s) => s.id === soilType)?.note}>
            {({ id, ...aria }) => (
              <Select
                id={id}
                options={SOIL_TYPES.map((s) => ({ value: s.id, label: s.label }))}
                {...aria}
                {...register('soilType')}
              />
            )}
          </Field>
          <Field label="Land type" error={errors.landType?.message} hint="Sets flood exposure: low land floods first.">
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
              <Select
                id={id}
                options={IRRIGATION_TYPES.map((t) => ({ value: t.id, label: t.label }))}
                {...aria}
                {...register('irrigationType')}
              />
            )}
          </Field>
          <Field label="Water source" error={errors.waterSource?.message} hint="Who supplies it, and on what schedule.">
            {({ id, ...aria }) => <Input id={id} placeholder="Shared shallow well, three slots a week" {...aria} {...register('waterSource')} />}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="In cultivation since" error={errors.establishedYear?.message}>
            {({ id, ...aria }) => <Input id={id} type="number" min="1900" {...aria} {...register('establishedYear')} />}
          </Field>
          <Field label="Notes" error={errors.notes?.message} hint="Anything the field team should know." className="sm:col-span-1">
            {({ id, ...aria }) => <Textarea id={id} rows={2} placeholder="East corner stays wet after heavy rain." {...aria} {...register('notes')} />}
          </Field>
        </div>

        <div className="space-y-2 border-t border-line pt-4">
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
            Optional, but a Google Maps-style pin lets SMAP soil-moisture and GPM rainfall satellite data pinpoint this
            farm. You can add it later in the farm's Settings.
          </p>
        </div>
      </form>
    </Dialog>
  )
}

function EditProjectDialog({
  project,
  open,
  onOpenChange,
  onSaved,
}: {
  project: Project
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [name, setName] = useState(project.name)
  const [summary, setSummary] = useState(project.summary)
  const [region, setRegion] = useState(project.region)
  const [climateZone, setClimateZone] = useState(project.climateZone)
  const [budget, setBudget] = useState(project.budgetUsd)
  const [loading, setLoading] = useState(false)

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit project profile"
      description="These properties feed the weather model, the planting windows and the cost side of every recommendation."
      footer={
        <>
          <Button variant="quiet" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={loading}
            onClick={() => {
              setLoading(true)
              void api
                .updateProject(project.id, {
                  name,
                  summary,
                  region,
                  climateZone,
                  budgetUsd: Number(budget),
                })
                .then(onSaved)
                .finally(() => setLoading(false))
            }}
          >
            Save profile
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Programme name">
          {({ id, ...aria }) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} {...aria} />}
        </Field>
        <Field label="Summary" hint="Shown on the dashboard and above this page.">
          {({ id, ...aria }) => <Textarea id={id} rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} {...aria} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Region">
            {({ id, ...aria }) => <Input id={id} value={region} onChange={(e) => setRegion(e.target.value)} {...aria} />}
          </Field>
          <Field label="Climate zone" hint={CLIMATE_ZONES[climateZone].note}>
            {({ id, ...aria }) => (
              <Select
                id={id}
                value={climateZone}
                onChange={(e) => setClimateZone(e.target.value as Project['climateZone'])}
                options={Object.values(CLIMATE_ZONES).map((zone) => ({ value: zone.code, label: `${zone.code} · ${zone.label}` }))}
                {...aria}
              />
            )}
          </Field>
        </div>
        <Field label="Season budget" hint="Compared against irrigation and input cost in the advice.">
          {({ id, ...aria }) => (
            <Input id={id} type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} {...aria} />
          )}
        </Field>
      </div>
    </Dialog>
  )
}

function EquipmentDialog({
  project,
  open,
  onOpenChange,
  onSaved,
}: {
  project: Project
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [selected, setSelected] = useState<EquipmentId[]>(project.equipment)
  const [loading, setLoading] = useState(false)
  const count = useMemo(() => selected.length, [selected])

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Equipment available to the programme"
      description="Advice only recommends operations the programme can actually carry out with this list."
      footer={
        <>
          <Button variant="quiet" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={loading}
            onClick={() => {
              setLoading(true)
              void api.updateProject(project.id, { equipment: selected }).then(onSaved).finally(() => setLoading(false))
            }}
          >
            Save {count} item{count === 1 ? '' : 's'}
          </Button>
        </>
      }
    >
      <fieldset>
        <legend className="sr-only">Available equipment</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {EQUIPMENT.map((item) => (
            <CheckboxField
              key={item.id}
              checked={selected.includes(item.id)}
              onCheckedChange={(checked) =>
                setSelected((current) => (checked ? [...current, item.id] : current.filter((id) => id !== item.id)))
              }
              label={item.label}
              description={item.enables}
            />
          ))}
        </div>
      </fieldset>
    </Dialog>
  )
}

function AccommodationDialog({
  project,
  editing,
  onOpenChange,
  onSaved,
}: {
  project: Project
  editing: Accommodation | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [kind, setKind] = useState(editing?.kind ?? 'irrigation')
  const [label, setLabel] = useState(editing?.label ?? '')
  const [detail, setDetail] = useState(editing?.detail ?? '')
  const [available, setAvailable] = useState(editing?.available ?? true)
  const [labelError, setLabelError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const kindInfo = ACCOMMODATION_KINDS.find((k) => k.id === kind)!

  const save = () => {
    if (label.trim().length < 3) {
      setLabelError('Describe the arrangement in at least 3 characters.')
      return
    }
    setLabelError(null)
    const entry: Accommodation = {
      id: editing?.id ?? `acc-${Math.random().toString(36).slice(2, 8)}`,
      kind,
      label: label.trim(),
      detail: detail.trim(),
      available,
    }
    const next = editing
      ? project.accommodations.map((a) => (a.id === entry.id ? entry : a))
      : [...project.accommodations, entry]
    setLoading(true)
    void api.updateProject(project.id, { accommodations: next }).then(onSaved).finally(() => setLoading(false))
  }

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      title={editing ? 'Edit accommodation' : 'Add an accommodation'}
      description="Storage, labour, transport and credit records change how market risk is scored and what selling strategy is realistic."
      footer={
        <>
          <Button variant="quiet" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" loading={loading} onClick={save}>
            Save
          </Button>
          {editing && (
            <Button
              variant="danger"
              onClick={() => {
                setLoading(true)
                void api
                  .updateProject(project.id, { accommodations: project.accommodations.filter((a) => a.id !== editing.id) })
                  .then(onSaved)
                  .finally(() => setLoading(false))
              }}
            >
              Remove
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Kind">
          {({ id, ...aria }) => (
            <Select
              id={id}
              value={kind}
              onChange={(e) => setKind(e.target.value as Accommodation['kind'])}
              options={ACCOMMODATION_KINDS.map((k) => ({ value: k.id, label: k.label }))}
              {...aria}
            />
          )}
        </Field>
        <Field label="What it is" error={labelError} hint={kindInfo.detailHint}>
          {({ id, ...aria }) => (
            <Input
              id={id}
              value={label}
              placeholder={kindInfo.placeholder}
              onChange={(e) => setLabel(e.target.value)}
              {...aria}
            />
          )}
        </Field>
        <Field label="Detail" hint="Capacity, schedule, cost — whatever decides whether it can be relied on.">
          {({ id, ...aria }) => <Textarea id={id} rows={2} value={detail} onChange={(e) => setDetail(e.target.value)} {...aria} />}
        </Field>
        <SwitchField
          checked={available}
          onCheckedChange={setAvailable}
          label="Currently available"
          description="Unavailable accommodations are excluded from recommendations."
        />
      </div>
    </Dialog>
  )
}
