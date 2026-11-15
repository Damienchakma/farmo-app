import { CloudRain, Droplets, MapPin, Plus, Sprout, Sun } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/controls'
import { SeverityStamp, Stamp } from '@/components/ui/data'
import { EmptyState, InlineAlert } from '@/components/ui/feedback'
import { Panel, PanelBody, PanelHead } from '@/components/ui/surfaces'
import { PlotIllustration } from '@/components/brand/brand'
import { formatNumber } from '@/lib/format'
import { useFarm } from '@/store/farm'

/** Shown wherever advice is presented in farmer mode. */
export function HumanJudgmentNote({ className }: { className?: string }) {
  return (
    <InlineAlert tone="info" className={className}>
      Farmo supports your decisions — it does not replace local knowledge. Check recommendations against what you see in
      the field before acting.
    </InlineAlert>
  )
}

function rainWords(mm: number): string {
  if (mm < 2) return 'almost no rain'
  if (mm < 15) return 'light rain'
  if (mm < 40) return 'useful rain'
  return 'heavy rain'
}

function moistureWords(percent: number): string {
  if (percent < 35) return 'dry — crops may need water soon'
  if (percent < 65) return 'comfortable for most crops'
  return 'wet — watch for standing water'
}

/** Plain-language farm overview for farmer mode. Same data, fewer numbers. */
export function FarmerOverview({ onAddPlant }: { onAddPlant: () => void }) {
  const bundle = useFarm((s) => s.bundle)!
  const { farm, analysis } = bundle
  const { conditions } = analysis
  const navigate = useNavigate()

  const riskItems = analysis.risk?.items ?? []
  const actions: Array<{ title: string; detail: string }> = riskItems.slice(0, 3).map((item) => ({
    title: item.title,
    detail: item.mitigation[0] ?? item.impact,
  }))
  for (const section of analysis.advice?.sections ?? []) {
    if (actions.length >= 3) break
    actions.push({ title: section.title, detail: section.gist })
  }

  const frostNights = conditions.weather.filter((d) => d.kind === 'forecast' && d.tMin <= 0).length
  const priorities = [
    { label: 'Your priority', value: farm.farmerPriority },
    { label: 'Water availability', value: farm.waterAvailability },
    { label: 'Equipment limits', value: farm.equipmentLimitation },
    { label: 'Market preference', value: farm.marketPreference },
  ].filter((p) => p.value)

  return (
    <div className="space-y-5">
      <HumanJudgmentNote />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHead
            title="What to do next"
            meta="The three things that matter most right now"
            actions={
              <Button size="sm" variant="quiet" onClick={() => navigate(`/farms/${farm.id}/advice`)}>
                Full advice
              </Button>
            }
            display
          />
          {actions.length === 0 ? (
            <PanelBody>
              <p className="text-sm text-ink-2">Nothing urgent. Keep walking the fields as usual.</p>
            </PanelBody>
          ) : (
            <ol className="divide-y divide-line">
              {actions.map((action, index) => (
                <li key={`${action.title}-${index}`} className="flex gap-3 px-4 py-3.5">
                  <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-green-100 font-display text-sm text-green-700">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{action.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-ink-2">{action.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel>
          <PanelHead title="Weather and water, in words" display />
          <PanelBody className="space-y-3 text-sm leading-relaxed text-ink-2">
            <p className="flex items-start gap-2">
              <CloudRain size={15} className="mt-[3px] flex-none text-ink-3" aria-hidden />
              <span>
                Last week brought {rainWords(conditions.rainfall7dMm)} ({formatNumber(conditions.rainfall7dMm, 0)} mm).
                Next week looks like {rainWords(conditions.rainfallNext7dMm)} ({formatNumber(conditions.rainfallNext7dMm, 0)} mm).
              </span>
            </p>
            <p className="flex items-start gap-2">
              <Sun size={15} className="mt-[3px] flex-none text-ink-3" aria-hidden />
              <span>
                {conditions.heatStressDays > 0
                  ? `${conditions.heatStressDays} hot day${conditions.heatStressDays === 1 ? '' : 's'} ahead — water early in the morning and watch flowering crops.`
                  : 'No hot days expected in the coming week.'}
                {frostNights > 0 && ` ${frostNights} frost night${frostNights === 1 ? '' : 's'} forecast — protect sensitive crops.`}
              </span>
            </p>
            <p className="flex items-start gap-2">
              <Droplets size={15} className="mt-[3px] flex-none text-ink-3" aria-hidden />
              <span>The soil is {moistureWords(conditions.soilMoisture)}.</span>
            </p>
            {farm.latitude != null && farm.longitude != null && (
              <p className="flex items-start gap-2 text-xs text-ink-3">
                <MapPin size={13} className="mt-[2px] flex-none" aria-hidden />
                Pinpointed at {farm.latitude.toFixed(4)}, {farm.longitude.toFixed(4)} for SMAP soil-moisture and GPM rainfall data.
              </p>
            )}
          </PanelBody>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHead
            title="Your crops"
            actions={
              <Button size="sm" variant="quiet" icon={<Plus />} onClick={onAddPlant}>
                Add plant
              </Button>
            }
            display
          />
          {bundle.plants.length === 0 ? (
            <EmptyState
              compact
              illustration={<PlotIllustration className="w-[120px]" />}
              title="No crops recorded yet"
              description="Add your first crop and Farmo will tell you what it needs each week."
              actions={
                <Button variant="primary" icon={<Plus />} onClick={onAddPlant}>
                  Add a plant
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {conditions.perPlant.map((row) => (
                <li key={row.plantId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{row.label}</p>
                    <p className="mt-0.5 text-xs text-ink-3">
                      {row.speciesLabel} · {row.stage}
                      {row.daysToHarvest !== null ? ` · about ${row.daysToHarvest} days to harvest` : ' · past the harvest window'}
                    </p>
                  </div>
                  <Stamp tone={row.healthIndex >= 70 ? 'green' : row.healthIndex >= 45 ? 'marigold' : 'clay'}>
                    <Sprout size={10} aria-hidden />
                    {row.healthIndex >= 70 ? 'doing well' : row.healthIndex >= 45 ? 'needs attention' : 'struggling'}
                  </Stamp>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHead
            title="Your priorities"
            actions={
              <Button size="sm" variant="quiet" onClick={() => navigate(`/farms/${farm.id}/settings`)}>
                Edit
              </Button>
            }
            display
          />
          <PanelBody>
            {priorities.length === 0 ? (
              <p className="text-sm leading-relaxed text-ink-2">
                Tell Farmo what matters most — water, equipment, the market — in Settings, and advice will keep it in
                view.
              </p>
            ) : (
              <dl className="space-y-2.5">
                {priorities.map((p) => (
                  <div key={p.label} className="border-t border-line pt-2.5 first:border-0 first:pt-0">
                    <dt className="eyebrow">{p.label}</dt>
                    <dd className="mt-0.5 text-sm text-ink">{p.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {riskItems.length > 0 && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-3">
                Biggest risk today: <SeverityStamp severity={riskItems[0].severity} /> {riskItems[0].title}
              </p>
            )}
          </PanelBody>
        </Panel>
      </div>
    </div>
  )
}