import type {
  AdviceBlock,
  AdviceSection,
  AdviceVersion,
  AnalysisCharts,
  AnalysisDriver,
  Farm,
  FarmAnalysis,
  FarmConditions,
  FertilizerRow,
  GrowthSeries,
  Id,
  Plant,
  Project,
  RiskCategory,
  RiskItem,
  RiskVersion,
  Severity,
  SoilMetric,
  WaterSeries,
  WeatherDay,
} from './types'
import { districtByName, getSpecies, seasonLength, stageForDay, type Species, type SpeciesStage } from './catalog'
import { addDays, clamp, daysBetween, generateWeather, isoDate, rainfallSum, referenceEt0, round, rngFor } from './util'
import { toAcre, toHectare } from './catalog/geography'

/* ============================================================ plant context */

export interface PlantContext {
  plant: Plant
  species: Species
  varietyName: string
  varietyNote: string
  acre: number
  hectare: number
  daysSincePlanting: number
  seasonDays: number
  stage: SpeciesStage
  stageProgress: number
  stageIndex: number
  daysToHarvest: number | null
  label: string
  /** 0–100 crop health index derived from pH, moisture, nutrients and rotation. */
  healthIndex: number
  phDistance: number
  moistureTarget: [number, number]
  previousCropLabel: string
  sameSpeciesLastSeason: boolean
}

const MOISTURE_TARGET: Record<string, [number, number]> = {
  rice: [65, 82],
  'winter-wheat': [55, 70],
  maize: [58, 72],
  soybean: [58, 72],
  potato: [58, 72],
  tomato: [55, 70],
  canola: [45, 60],
  lentil: [40, 55],
}

export function buildPlantContext(plant: Plant, now: Date): PlantContext {
  const species = getSpecies(plant.speciesId)
  const variety = species.varieties.find((v) => v.name === plant.variety) ?? species.varieties[0]
  const seasonDays = seasonLength(species, plant.variety)
  const daysSincePlanting = Math.max(0, daysBetween(plant.plantedAt, isoDate(now)))
  const stage = plant.stageOverride ? species.stages.find((s) => s.id === plant.stageOverride) ?? stageForDay(species, daysSincePlanting) : stageForDay(species, daysSincePlanting)
  const stageIndex = species.stages.findIndex((s) => s.id === stage.id)
  const stageProgress = clamp((daysSincePlanting - stage.fromDay) / Math.max(1, stage.toDay - stage.fromDay), 0, 1)
  const acre = toAcre(plant.area.value, plant.area.unit)
  const hectare = toHectare(plant.area.value, plant.area.unit)

  const phLow = species.optimalPh[0]
  const phHigh = species.optimalPh[1]
  const phDistance = plant.soilPh < phLow ? phLow - plant.soilPh : plant.soilPh > phHigh ? plant.soilPh - phHigh : 0

  const moistureTarget = MOISTURE_TARGET[species.id] ?? [50, 70]
  const [mLow, mHigh] = moistureTarget
  const moistureScore =
    plant.soilMoisture < mLow
      ? clamp(1 - (mLow - plant.soilMoisture) / 28, 0, 1)
      : plant.soilMoisture > mHigh
        ? clamp(1 - (plant.soilMoisture - mHigh) / 26, 0, 1)
        : 1
  const nutrientScore = clamp((plant.nitrogen / 45 + plant.phosphorus / 16 + plant.potassium / 60) / 3, 0.4, 1.1)
  const phScore = clamp(1 - phDistance / 0.85, 0.45, 1)
  const omScore = clamp(0.75 + plant.organicMatter / 4, 0.75, 1.05)
  const healthIndex = Math.round(clamp((phScore * 0.32 + moistureScore * 0.28 + nutrientScore * 0.28 + omScore * 0.12) * 100, 28, 98))

  const daysToHarvest = seasonDays - daysSincePlanting

  return {
    plant,
    species,
    varietyName: variety.name,
    varietyNote: variety.note,
    acre,
    hectare,
    daysSincePlanting,
    seasonDays,
    stage,
    stageProgress,
    stageIndex,
    daysToHarvest: daysToHarvest > 0 ? daysToHarvest : null,
    label: `${species.name} ${variety.name}`,
    healthIndex,
    phDistance,
    moistureTarget,
    previousCropLabel: previousCropLabel(plant.previousCropId),
    sameSpeciesLastSeason: plant.previousCropId === plant.speciesId,
  }
}

export function previousCropLabel(id: string): string {
  if (id === 'fallow') return 'Fallow'
  return getSpecies(id).name
}

export function farmWeather(farm: Farm, now: Date, back = 30, forward = 14): WeatherDay[] {
  const district = districtByName(farm.district)
  // Weather belongs to the place, not the farm record: two farms on the same
  // land — or a farm deleted and re-created — must see the same forecast.
  const locationKey =
    farm.latitude != null && farm.longitude != null
      ? `${farm.latitude.toFixed(2)},${farm.longitude.toFixed(2)}`
      : farm.locality.trim().toLowerCase() || district.id
  return generateWeather(district, locationKey, back, forward, now)
}

/* ============================================================== conditions */

export function computeConditions(contexts: PlantContext[], weather: WeatherDay[]): FarmConditions {
  const observed = weather.filter((d) => d.kind === 'observed')
  const forecast = weather.filter((d) => d.kind === 'forecast')
  const last7 = observed.slice(-7)
  const next7 = forecast.slice(0, 7)
  const rainfall7dMm = rainfallSum(last7)
  const rainfallNext7dMm = rainfallSum(next7)
  const heatStressDays = forecast.filter((d) => d.tMax >= 30).length

  const avgPh = contexts.length ? round(contexts.reduce((a, c) => a + c.plant.soilPh, 0) / contexts.length, 2) : 6.4
  const soilMoisture = contexts.length
    ? Math.round(contexts.reduce((a, c) => a + c.plant.soilMoisture, 0) / contexts.length)
    : 55

  const nScore = contexts.length ? clamp(contexts.reduce((a, c) => a + c.plant.nitrogen, 0) / contexts.length / 52, 0, 1) : 0.6
  const pScore = contexts.length ? clamp(contexts.reduce((a, c) => a + c.plant.phosphorus, 0) / contexts.length / 20, 0, 1) : 0.6
  const kScore = contexts.length ? clamp(contexts.reduce((a, c) => a + c.plant.potassium, 0) / contexts.length / 68, 0, 1) : 0.6
  const omScore = contexts.length ? clamp(contexts.reduce((a, c) => a + c.plant.organicMatter, 0) / contexts.length / 2.2, 0, 1) : 0.55
  const phScore = clamp(1 - Math.abs(avgPh - 6.5) / 1.4, 0, 1)
  const fertilityIndex = Math.round((nScore * 0.28 + pScore * 0.18 + kScore * 0.2 + omScore * 0.18 + phScore * 0.16) * 100)

  return {
    fertilityIndex,
    soilMoisture,
    averagePh: avgPh,
    perPlant: contexts.map((c) => ({
      plantId: c.plant.id,
      label: c.label,
      speciesLabel: c.species.name,
      stage: c.stage.label,
      stageProgress: round(c.stageProgress, 3),
      daysSincePlanting: c.daysSincePlanting,
      daysToHarvest: c.daysToHarvest,
      healthIndex: c.healthIndex,
    })),
    weather,
    rainfall7dMm,
    rainfallNext7dMm,
    heatStressDays,
  }
}

/* ================================================================== growth */

/** Logistic potential curve, scaled so the season ends at 100. */
function potentialAt(day: number, seasonDays: number): number {
  const mid = seasonDays * 0.52
  const k = 6.4 / seasonDays
  const logistic = 100 / (1 + Math.exp(-k * (day - mid)))
  const atEnd = 100 / (1 + Math.exp(-k * (seasonDays - mid)))
  const atZero = 100 / (1 + Math.exp(-k * (0 - mid)))
  return clamp(((logistic - atZero) / (atEnd - atZero)) * 100, 0, 100)
}

export function buildGrowthSeries(contexts: PlantContext[]): GrowthSeries[] {
  return contexts.map((c) => {
    const horizon = Math.min(c.seasonDays, Math.max(c.daysSincePlanting + 21, Math.round(c.seasonDays * 0.9)))
    const jitter = rngFor(c.plant.id, 'growth')
    const points: Array<{ day: number; date: string; potential: number; actual: number; stage: string }> = []
    const health = c.healthIndex / 100
    let drift = 0
    for (let day = 0; day <= horizon; day += 3) {
      const potential = round(potentialAt(day, c.seasonDays), 1)
      const isPast = day <= c.daysSincePlanting
      drift = clamp(drift + (jitter() - 0.5) * 0.012, -0.06, 0.06)
      const penalty = isPast ? clamp(health + drift - 0.62, 0.35, 1.02) : clamp(health + drift - 0.62, 0.35, 1.02)
      const actual = round(potential * clamp(penalty, 0.28, 1), 1)
      points.push({
        day,
        date: isoDate(addDays(c.plant.plantedAt, day)),
        potential,
        actual,
        stage: stageForDay(c.species, day).label,
      })
    }
    return {
      plantId: c.plant.id,
      label: c.varietyName,
      speciesLabel: c.species.name,
      points,
      stageMarkers: c.species.stages
        .filter((s) => s.fromDay <= horizon)
        .map((s) => ({ day: s.fromDay, label: s.label })),
      currentStage: c.stage.label,
      harvestWindow: `${isoDate(addDays(c.plant.plantedAt, c.seasonDays - 5))} – ${isoDate(addDays(c.plant.plantedAt, c.seasonDays + 7))}`,
    }
  })
}

/* =================================================================== water */

export function buildWaterSeries(contexts: PlantContext[], weather: WeatherDay[], _now: Date): WaterSeries {
  const windowBack = 28
  const windowForward = 14
  const observed = weather.filter((d) => d.kind === 'observed').slice(-windowBack)
  const forecast = weather.filter((d) => d.kind === 'forecast').slice(0, windowForward)
  const days = [...observed, ...forecast]
  const labels = days.map((d) => d.date)

  const perPlant = contexts.map((c) => {
    const values = days.map((d) => {
      const dayIndex = clamp(daysBetween(c.plant.plantedAt, d.date), 0, c.seasonDays)
      const kc = stageForDay(c.species, dayIndex).kc
      const planted = daysBetween(c.plant.plantedAt, d.date) >= 0
      const etc = planted ? referenceEt0(d) * kc : 0
      return round(etc, 2)
    })
    return { plantId: c.plant.id, label: `${c.species.name} ${c.varietyName}`, values }
  })

  const totalEtcPerDay = days.map((_, i) => perPlant.reduce((acc, p) => acc + p.values[i], 0))
  const rainPerDay = days.map((d) => d.rainfallMm * 0.75) // effective rainfall share
  const totalMm = round(
    days.reduce((acc, _d, i) => acc + Math.max(0, totalEtcPerDay[i] - rainPerDay[i] / Math.max(1, contexts.length)), 0),
    1,
  )
  const effectiveRainfallMm = round(rainPerDay.reduce((a, b) => a + b, 0) / Math.max(1, contexts.length), 1)
  const irrigationNeedMm = totalMm
  const totalAcre = contexts.reduce((a, c) => a + c.acre, 0)
  let cumulative = 0
  const cumulativeM3 = days.map((_d, i) => {
    const deficitPerPlant = Math.max(0, totalEtcPerDay[i] - rainPerDay[i] / Math.max(1, contexts.length))
    cumulative += deficitPerPlant * 4.047 * totalAcre
    return Math.round(cumulative)
  })

  return {
    labels,
    todayIndex: Math.max(0, observed.length - 1),
    perPlant,
    cumulativeM3,
    periodLabel: `${labels[0]} to ${labels[labels.length - 1]}`,
    totalMm: round(totalEtcPerDay.reduce((a, b) => a + b, 0), 1),
    effectiveRainfallMm,
    irrigationNeedMm,
  }
}

/* ============================================================= fertilizer */

const NUTRIENT_LABELS: Record<FertilizerRow['nutrient'], { label: string; product: string; content: number }> = {
  N: { label: 'Nitrogen (N)', product: 'Urea', content: 0.46 },
  P: { label: 'Phosphate (P₂O₅)', product: 'TSP', content: 0.46 },
  K: { label: 'Potash (K₂O)', product: 'Muriate of potash (MoP)', content: 0.6 },
  S: { label: 'Sulphur (S)', product: 'Gypsum', content: 0.18 },
  Zn: { label: 'Zinc (Zn)', product: 'Zinc sulphate', content: 0.21 },
}

/** Share of the measured available nutrient the crop can actually take up. */
const AVAILABILITY: Record<FertilizerRow['nutrient'], number> = { N: 0.55, P: 0.5, K: 0.6, S: 0.5, Zn: 0.4 }

export function buildFertilizerPlan(contexts: PlantContext[]): FertilizerRow[] {
  const nutrients: FertilizerRow['nutrient'][] = ['N', 'P', 'K', 'S', 'Zn']
  const rows: FertilizerRow[] = []

  for (const nutrient of nutrients) {
    let cropNeed = 0
    let soilSupply = 0
    const splitMap = new Map<string, number>()

    for (const c of contexts) {
      cropNeed += c.species.nutrientNeed[nutrient.toLowerCase() as 'n' | 'p' | 'k' | 's' | 'zn'] * c.acre
      const measured =
        nutrient === 'N'
          ? c.plant.nitrogen
          : nutrient === 'P'
            ? c.plant.phosphorus
            : nutrient === 'K'
              ? c.plant.potassium
              : nutrient === 'S'
                ? 12 + c.plant.organicMatter * 4
                : 0.6 + c.plant.organicMatter * 0.5
      soilSupply += measured * 0.4047 * AVAILABILITY[nutrient] * c.acre
      if (nutrient === 'N') {
        const stageName = (id: string) => c.species.stages.find((s) => s.id === id)?.label ?? id
        for (const split of c.species.nitrogenSplits) {
          // Track the split as a per-acre rate so the schedule matches the plan.
          const key = stageName(split.atStage)
          splitMap.set(key, (splitMap.get(key) ?? 0) + split.share * c.species.nutrientNeed.n)
        }
      }
    }

    const totalAcre = contexts.reduce((a, c) => a + c.acre, 0) || 1
    const needPerAcre = round(cropNeed / totalAcre, 1)
    const supplyPerAcre = round(soilSupply / totalAcre, 1)
    const gap = Math.max(0, round(needPerAcre - supplyPerAcre, 1))
    const info = NUTRIENT_LABELS[nutrient]
    const splits =
      nutrient === 'N'
        ? Array.from(splitMap.entries()).map(([when, amountPerAcre]) => ({
            when,
            share: `${round(amountPerAcre, 1)} kg N/acre → ${Math.round(amountPerAcre / info.content / 5) * 5 || 5} kg urea`,
          }))
        : []

    rows.push({
      nutrient,
      label: info.label,
      cropNeedKgPerAcre: needPerAcre,
      soilSupplyKgPerAcre: supplyPerAcre,
      gapKgPerAcre: gap,
      productName: info.product,
      productKgPerAcre: gap > 0 ? Math.ceil(gap / info.content / 5) * 5 : 0,
      splits,
    })
  }
  return rows
}

export function limeRequirement(ph: number, acre: number, soilType: string): { kgPerAcre: number; totalKg: number } | null {
  if (ph >= 5.9) return null
  const base = (5.9 - ph) * 430 * (soilType === 'clay-loam' || soilType === 'saline-clay' ? 1.15 : 1)
  const kgPerAcre = Math.round(base / 10) * 10
  return { kgPerAcre, totalKg: Math.round(kgPerAcre * acre) }
}

/* ============================================================ soil metrics */

export function buildSoilMetrics(contexts: PlantContext[]): SoilMetric[] {
  if (!contexts.length) return []
  const avg = (f: (c: PlantContext) => number) => contexts.reduce((a, c) => a + f(c), 0) / contexts.length
  const n = round(avg((c) => c.plant.nitrogen), 1)
  const p = round(avg((c) => c.plant.phosphorus), 1)
  const k = round(avg((c) => c.plant.potassium), 1)
  const ph = round(avg((c) => c.plant.soilPh), 2)
  const om = round(avg((c) => c.plant.organicMatter), 2)
  const moisture = Math.round(avg((c) => c.plant.soilMoisture))
  const s = round(avg((c) => 9 + c.plant.organicMatter * 3.4), 1)
  const zn = round(avg((c) => 0.45 + c.plant.organicMatter * 0.35), 2)

  const band = (value: number, low: number, high: number): number => clamp(((value - low * 0.4) / (high * 1.25 - low * 0.4)) * 100, 0, 100)
  const verdict = (value: number, low: number, high: number): SoilMetric['verdict'] =>
    value < low * 0.7 ? 'deficient' : value < low ? 'low' : value <= high ? 'optimal' : 'excess'

  return [
    { key: 'n', label: 'Available N', value: n, unit: 'kg/ha', optimalLow: 45, optimalHigh: 80, index: round(band(n, 45, 80), 0), verdict: verdict(n, 45, 80) },
    { key: 'p', label: 'Available P', value: p, unit: 'kg/ha', optimalLow: 16, optimalHigh: 30, index: round(band(p, 16, 30), 0), verdict: verdict(p, 16, 30) },
    { key: 'k', label: 'Exchangeable K', value: k, unit: 'kg/ha', optimalLow: 60, optimalHigh: 120, index: round(band(k, 60, 120), 0), verdict: verdict(k, 60, 120) },
    { key: 'ph', label: 'Soil pH', value: ph, unit: '', optimalLow: 6.0, optimalHigh: 7.0, index: round(clamp(100 - Math.abs(ph - 6.5) * 62, 0, 100), 0), verdict: verdict(Math.abs(ph - 6.5) + 6, 6.0, 7.0) },
    { key: 'om', label: 'Organic matter', value: om, unit: '%', optimalLow: 1.5, optimalHigh: 3.0, index: round(band(om, 1.5, 3.0), 0), verdict: verdict(om, 1.5, 3.0) },
    { key: 's', label: 'Sulphur', value: s, unit: 'kg/ha', optimalLow: 12, optimalHigh: 24, index: round(band(s, 12, 24), 0), verdict: verdict(s, 12, 24) },
    { key: 'zn', label: 'Zinc', value: zn, unit: 'kg/ha', optimalLow: 0.8, optimalHigh: 2.0, index: round(band(zn, 0.8, 2.0), 0), verdict: verdict(zn, 0.8, 2.0) },
    { key: 'moisture', label: 'Soil moisture', value: moisture, unit: '%', optimalLow: 50, optimalHigh: 75, index: round(clamp(moisture, 0, 100), 0), verdict: moisture < 45 ? 'deficient' : moisture < 50 ? 'low' : moisture <= 78 ? 'optimal' : 'excess' },
  ]
}

/* ================================================================= advice */

interface AdviceBuild {
  sections: AdviceSection[]
  confidence: number
}

function fmtDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(`${d}T00:00:00`) : d
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function p(text: string): AdviceBlock {
  return { kind: 'p', text }
}
function list(items: string[]): AdviceBlock {
  return { kind: 'list', items }
}
function why(label: string, text: string): AdviceBlock {
  return { kind: 'why', label, text }
}

export function buildAdvice(
  project: Project,
  farm: Farm,
  contexts: PlantContext[],
  fertilizer: FertilizerRow[],
  soil: SoilMetric[],
  weather: WeatherDay[],
  now: Date,
): AdviceBuild {
  const district = districtByName(farm.district)
  const zones = district.zone
  const irrigationAcc = project.accommodations.find((a) => a.kind === 'irrigation' && a.available)
  const storageAcc = project.accommodations.find((a) => a.kind === 'storage' && a.available)
  const totalAcre = contexts.reduce((a, c) => a + c.acre, 0)
  const forecast = weather.filter((d) => d.kind === 'forecast').slice(0, 14)
  const next7 = forecast.slice(0, 7)
  const hotDays = forecast.filter((d) => d.tMax >= 30).length
  const sections: AdviceSection[] = []
  let confidence = 0.86

  /* ---------------------------------------------------------- commodity */
  {
    const blocks: AdviceBlock[] = []
    const commodityDrivers: string[] = []
    const rotationRepeats = contexts.filter((c) => c.sameSpeciesLastSeason)
    const pastSeason = contexts.filter((c) => c.daysToHarvest === null)
    const salinePlot = district.salinitySeverity > 0.4 ? contexts.filter((c) => c.species.salinityLimitDsm < 2.2) : []

    const lines: string[] = []
    if (rotationRepeats.length) {
      lines.push(
        `Hold the same commodity mix only where you must. ${rotationRepeats
          .map((c) => `${c.species.name} ${c.varietyName} on ${round(c.acre, 2)} acres follows ${c.previousCropLabel.toLowerCase()}`)
          .join('; ')} — a repeat of the same crop family on the same plot.`,
      )
      commodityDrivers.push(`Repeat-crop plots: ${rotationRepeats.map((c) => c.species.name).join(', ')}`)
    }
    if (pastSeason.length) {
      const next = nextCropFor(pastSeason[0].species.id, farm)
      lines.push(
        `${pastSeason[0].label} on ${round(pastSeason[0].acre, 2)} acres is past its harvest window (sown ${fmtDate(
          pastSeason[0].plant.plantedAt,
        )}, ${pastSeason[0].seasonDays}-day variety). Plan ${next.species} — ${next.reason}`,
      )
      commodityDrivers.push(`${pastSeason[0].label} past harvest window`)
    }
    if (salinePlot.length) {
      lines.push(
        `On the ${salinePlot.map((c) => round(c.acre, 2)).join(' and ')} acre plots of ${salinePlot
          .map((c) => c.species.name)
          .join(', ')}, dry-season salinity (district severity ${(district.salinitySeverity * 100).toFixed(0)} %) will reach the crop's tolerance limit of ${salinePlot[0].species.salinityLimitDsm} dS/m by late February. Shift those plots to salt-tolerant varieties or to a cool-season crop with a shorter calendar.`,
      )
      commodityDrivers.push(`District dry-season salinity severity ${(district.salinitySeverity * 100).toFixed(0)} %`)
    }
    if (!lines.length) {
      lines.push(
        `The current commodity mix across ${round(totalAcre, 2)} acres is well matched to ${district.name}: ${
          contexts.map((c) => `${c.species.name} (${round(c.acre, 2)} acres)`).join(', ')
        }.`,
      )
    }

    // Market-facing sentence grounded in volatility and storage.
    const volatile = contexts
      .map((c) => ({ c, vol: c.species.marketVolatility }))
      .sort((a, b) => b.vol - a.vol)[0]
    if (volatile && volatile.vol > 0.45) {
      lines.push(
        `${volatile.c.species.name} is the price-risk commodity here (seasonal swing around ${(volatile.vol * 100).toFixed(0)} %). ${
          storageAcc
            ? `With ${storageAcc.label.toLowerCase()} available, hold the first 30–40 % of the harvest and sell in two lots.`
            : 'Without on-farm storage, plan to sell in one negotiated lot rather than daily at the local spot price.'
        }`,
      )
      commodityDrivers.push(`Price volatility ${(volatile.vol * 100).toFixed(0)} % on ${volatile.c.species.name}`)
    }

    blocks.push(p(lines[0]))
    if (lines.length > 1) blocks.push(list(lines.slice(1)))
    if (commodityDrivers.length) {
      blocks.push(
        why(
          'Why this changes',
          `Driven by previous-crop records, the district salinity profile for ${district.name}, and the current mix of ${contexts.length} plot${contexts.length === 1 ? '' : 's'}.`,
        ),
      )
    }
    sections.push({
      id: 'commodity',
      title: 'Commodity changes',
      gist: rotationRepeats.length
        ? `Change the mix on ${round(rotationRepeats.reduce((a, c) => a + c.acre, 0), 2)} acres of repeat-crop land.`
        : 'The current mix fits the district; keep it and manage within the season.',
      blocks,
      drivers: commodityDrivers,
    })
  }

  /* --------------------------------------------------------- fertilizer */
  {
    const blocks: AdviceBlock[] = []
    const fertDrivers: string[] = []
    const needed = fertilizer.filter((f) => f.gapKgPerAcre > 0.5)
    const totalUrea = needed.find((n) => n.nutrient === 'N')?.productKgPerAcre ?? 0
    const totalTsp = needed.find((n) => n.nutrient === 'P')?.productKgPerAcre ?? 0
    const totalMop = needed.find((n) => n.nutrient === 'K')?.productKgPerAcre ?? 0

    blocks.push(
      p(
        `The soil test covers ${round(totalAcre, 2)} acres of ${contexts
          .map((c) => c.species.name)
          .join(' and ')}. Against crop requirement, the pending balance is ${needed
          .map((n) => `${round(n.gapKgPerAcre, 1)} kg ${n.nutrient}/acre`)
          .join(', ') || 'nothing — the field is already above crop need'}.`,
      ),
    )

    if (needed.length) {
      blocks.push({
        kind: 'ops',
        caption: 'Product plan per acre',
        rows: needed.map((n) => ({
          label: `${n.productName} — ${n.productKgPerAcre} kg/acre`,
          detail: `covers the ${round(n.gapKgPerAcre, 1)} kg ${n.nutrient}/acre gap (crop need ${n.cropNeedKgPerAcre}, soil supply ${n.soilSupplyKgPerAcre})`,
          when:
            n.nutrient === 'N'
              ? 'in splits below'
              : n.nutrient === 'P'
                ? 'all as basal at final land preparation'
                : n.nutrient === 'K'
                  ? 'basal, or half basal + half at flowering'
                  : 'basal',
        })),
      })
    }

    const nitrogen = needed.find((n) => n.nutrient === 'N')
    if (nitrogen && nitrogen.splits.length) {
      blocks.push(
        list([
          `Split nitrogen rather than a single dose: ${nitrogen.splits.map((s) => `${s.share} at ${s.when.toLowerCase()}`).join('; ')}.`,
          `Total product for the farm at current area: ${Math.round(totalUrea * totalAcre)} kg urea, ${Math.round(totalTsp * totalAcre)} kg TSP, ${Math.round(totalMop * totalAcre)} kg MoP.`,
          storageAcc
            ? `Store fertiliser dry and off the floor — ${storageAcc.label.toLowerCase()} is noted as available on this project.`
            : 'Buy fertiliser in two lots rather than one; a single purchase of the full season is where quality complaints come from.',
        ]),
      )
      fertDrivers.push(`Nitrogen gap ${round(nitrogen.gapKgPerAcre, 1)} kg/acre from soil test`)
    }

    const highRain = next7.reduce((a, d) => a + d.rainfallMm, 0)
    if (highRain > 45) {
      blocks.push(
        p(
          `Rain of ${round(highRain, 1)} mm is forecast in the next seven days. Shift the urea top-dress to just after the heaviest day — broadcasting before 20 mm or more of rain loses 15–25 % of it to runoff and volatilisation.`,
        ),
      )
      fertDrivers.push(`Forecast rainfall ${round(highRain, 1)} mm in 7 days`)
    }

    const lowOm = soil.find((s) => s.key === 'om')
    if (lowOm && lowOm.verdict !== 'optimal') {
      blocks.push(
        p(
          `Organic matter at ${lowOm.value} % is below the 1.5 % floor. Add 1.5–2 t/acre of compost or farmyard manure, or sow a legume green manure such as vetch before the next cereal — it is the cheapest way to raise the cation exchange capacity, and it holds the fertiliser you are already paying for.`,
        ),
      )
      fertDrivers.push(`Organic matter ${lowOm.value} %`)
    }

    blocks.push(
      why(
        'Why this changes',
        'Fertiliser quantities are recalculated from requirement minus measured supply, then converted to product weight. Change a soil test value or plant a different crop on the same acre and the plan moves with it.',
      ),
    )
    sections.push({
      id: 'fertilizer',
      title: 'Fertilizer suggestions',
      gist: needed.length
        ? `${needed.map((n) => `${n.productName} ${n.productKgPerAcre} kg/acre`).join(' · ')}`
        : 'Soil supply already meets crop requirement — maintenance dose only.',
      blocks,
      drivers: fertDrivers,
    })
  }

  /* ------------------------------------------------------------- soil */
  {
    const blocks: AdviceBlock[] = []
    const soilDrivers: string[] = []
    const phMetric = soil.find((s) => s.key === 'ph')
    const avgPh = phMetric?.value ?? 6.5

    if (avgPh < 5.9) {
      const lime = limeRequirement(avgPh, totalAcre, farm.soilType)
      if (lime) {
        blocks.push(
          p(
            `Apply agricultural lime at ${lime.kgPerAcre} kg/acre (${lime.totalKg.toLocaleString('en-US')} kg across the farm) and incorporate it during final land preparation, two to three weeks before sowing.`,
          ),
          why(
            'Why lime, and why now',
            `At pH ${avgPh} the exchangeable aluminium and manganese in ${farm.soilType.replace(/-/g, ' ')} hold phosphorus in forms the root cannot take up, and the rhizobium on any pulse crop stops fixing nitrogen. Lime during land preparation has the whole season to work; applied on the surface afterwards it barely moves.`,
          ),
        )
        soilDrivers.push(`Average pH ${avgPh} (below the 6.0 threshold)`)
      }
    } else if (avgPh > 7.6) {
      const zn = fertilizer.find((f) => f.nutrient === 'Zn')
      blocks.push(
        p(
          `The soil is alkaline (pH ${avgPh}) and calcareous soils in this range lock out zinc and boron long before nitrogen is short. Apply ${
            zn && zn.gapKgPerAcre > 0.1 ? `${zn.productKgPerAcre} kg/acre of zinc sulphate` : 'zinc sulphate at 8 kg/acre'
          } as basal, and use gypsum as the sulphur source rather than ammonium sulphate.`,
        ),
        why('Why zinc shows up here', 'Above pH 7.4, zinc forms insoluble zincate complexes — the soil test can read adequate while the plant still shows interveinal chlorosis on the younger leaves.'),
      )
      soilDrivers.push(`Average pH ${avgPh} (above the 7.0 optimum)`)
    } else {
      blocks.push(
        p(
          `Soil reaction at pH ${avgPh} sits inside the working range, so no amendment is due this season. Keep sampling every second season — paddy soils in ${district.name} typically drift down 0.2 units a decade under continuous fertiliser use.`,
        ),
      )
    }

    const moisture = soil.find((s) => s.key === 'moisture')
    if (moisture && moisture.value < 45) {
      blocks.push(
        p(
          `Soil moisture at ${moisture.value} % is below the working range for the crops in the ground. This is a structural problem on ${farm.landType} land, not only a dry spell: add a mulch layer where you can and plan a summer green manure to rebuild infiltration.`,
        ),
      )
      soilDrivers.push(`Soil moisture ${moisture.value} %`)
    }

    if (farm.soilType === 'saline-clay' || district.salinitySeverity > 0.5) {
      blocks.push(
        p(
          `On ${farm.soilType.replace(/-/g, ' ')} along the tidal zone, keep the dry-season water table from rising into the root zone. Where the canal is saline, apply gypsum at 150–200 kg/acre and leach with the first monsoon rain rather than trying to flush with saltier canal water.`,
        ),
      )
      soilDrivers.push(`Saline soil type with district salinity severity ${(district.salinitySeverity * 100).toFixed(0)} %`)
    }

    blocks.push(
      why(
        'Why this is checked every time',
        'pH, organic matter and moisture do not move quickly, but they decide how much of the fertiliser you buy actually reaches the plant. Every property edit re-runs this check.',
      ),
    )
    sections.push({
      id: 'soil',
      title: 'Soil management',
      gist:
        avgPh < 5.9
          ? `Lime required — pH ${avgPh} is limiting phosphorus availability.`
          : avgPh > 7.6
            ? `Alkaline soil — micronutrient plan matters more than NPK.`
            : `pH ${avgPh} is in range; hold the current amendment programme.`,
      blocks,
      drivers: soilDrivers,
    })
  }

  /* --------------------------------------------------------- rotation */
  {
    const blocks: AdviceBlock[] = []
    const rotationDrivers: string[] = []
    const repeats = contexts.filter((c) => c.sameSpeciesLastSeason)
    const cerealsOnCereals = repeats.filter((c) => c.species.rotationGroup === 'cereal')
    const solanaceaeRepeat = repeats.filter((c) => c.species.rotationGroup === 'solanaceae' || c.species.rotationGroup === 'tuber')
    const riceRepeat = repeats.filter((c) => c.species.rotationGroup === 'rice')

    if (cerealsOnCereals.length) {
      const alt = nextCropFor('winter-wheat', farm)
      const acres = round(cerealsOnCereals.reduce((a, c) => a + c.acre, 0), 2)
      blocks.push(
        p(
          `${acres} acres went from ${cerealsOnCereals[0].previousCropLabel.toLowerCase()} straight into ${cerealsOnCereals[0].species.name}. A second cereal on the same ground is the largest single drag on the yield trend: take-all, Septoria and stem borer carry over in the stubble, and the rooting zone stays compacted.`,
        ),
        {
          kind: 'ops',
          caption: 'Rotation to plan for the next window',
          rows: [
            { label: `${alt.species} on ${acres} acres`, detail: alt.reason, when: alt.window },
            {
              label: 'Or a short-season pulse where the land must return to a cereal',
              detail: 'Soybean or lentil fixes 60–90 kg N/acre and comes off in time for autumn drilling.',
              when: 'sow in the spring window',
            },
          ],
        },
      )
      rotationDrivers.push(`Cereal after cereal on ${acres} acres`)
    }

    if (riceRepeat.length) {
      const acres = round(riceRepeat.reduce((a, c) => a + c.acre, 0), 2)
      blocks.push(
        p(
          `Flooded rice has run two seasons on ${acres} acres. Continuous puddling keeps the plough pan intact so roots never get below 15 cm, and it carries stem borer forward. A break to a legume or an oilseed restores structure and breaks the cycle.`,
        ),
      )
      rotationDrivers.push(`Rice after rice on ${acres} acres`)
    }

    if (solanaceaeRepeat.length) {
      blocks.push(
        p(
          `${solanaceaeRepeat[0].species.name} on the same plot two seasons running carries soil-borne wilt, eelworm and blight forward. Break it with a cereal or an oilseed for at least one season — a two-year gap is what actually clears bacterial wilt.`,
        ),
      )
      rotationDrivers.push(`Potato or tomato repeated on ${round(solanaceaeRepeat.reduce((a, c) => a + c.acre, 0), 2)} acres`)
    }

    if (!repeats.length) {
      blocks.push(
        p(
          `No plot currently repeats its previous crop family. That is the right starting point — the next decision is what follows this season. With ${contexts
            .map((c) => c.species.name)
            .join(' and ')} in the ground, the following season should alternate a cereal with a pulse or an oilseed.`,
        ),
      )
    }

    const legumePresent = contexts.some((c) => c.species.rotationGroup === 'legume')
    if (!legumePresent) {
      blocks.push(
        p(
          `No legume appears in the current plan. A single soybean or lentil crop in the next window replaces 60–90 kg of nitrogen per acre and, more importantly, breaks the pest and disease cycle that cereals share.`,
        ),
      )
      rotationDrivers.push('No legume in the current rotation')
    }

    blocks.push(
      why(
        'Why rotation is treated as a first-class decision',
        'Rotation is the only lever that improves yield without a cash outlay, and its effect is cumulative: two seasons of a cereal followed by a pulse typically shows up as 8–12 % higher yield in the third season.',
      ),
    )
    sections.push({
      id: 'rotation',
      title: 'Crop rotation',
      gist: repeats.length
        ? `Break the repeat on ${round(repeats.reduce((a, c) => a + c.acre, 0), 2)} acres in the next window.`
        : 'Rotation is sound; alternate cereal with pulse or oilseed next season.',
      blocks,
      drivers: rotationDrivers,
    })
  }

  /* ------------------------------------------------------- irrigation */
  {
    const blocks: AdviceBlock[] = []
    const irrDrivers: string[] = []
    const today = weather.find((d) => d.date === isoDate(now)) ?? forecast[0]
    const et0Today = today ? referenceEt0(today) : 4
    const irrigationInfo = farm.irrigationType
    const rainWeek = rainfallSum(next7)

    for (const c of contexts) {
      const etc = round(et0Today * c.stage.kc, 2)
      const [mLow, mHigh] = c.moistureTarget
      const deficit = c.plant.soilMoisture < mLow
      const depth = c.species.id.includes('rice') ? 45 : 38
      const interval = Math.max(1, Math.round(depth / Math.max(1.2, etc)))
      if (deficit || c.stage.waterCritical) {
        blocks.push(
          p(
            `**${c.label}** (${c.stage.label}, day ${c.daysSincePlanting} of ${c.seasonDays}) is using about ${etc} mm/day. Soil moisture is ${c.plant.soilMoisture} % against a working range of ${mLow}–${mHigh} %. Irrigate with ${depth} mm — roughly ${round(depth / 25.4, 1)} inches — and then repeat every ${interval} days if the forecast stays dry.${
              c.stage.waterCritical
                ? ` This is a water-critical stage: ${c.stage.note.toLowerCase()}`
                : ''
            }`,
          ),
        )
        irrDrivers.push(`${c.species.name} at ${c.stage.label}: ETc ${etc} mm/day, moisture ${c.plant.soilMoisture} %`)
      } else {
        blocks.push(
          p(
            `**${c.label}** is comfortable at ${c.plant.soilMoisture} % moisture in the ${c.stage.label} stage. Current demand is ${etc} mm/day, so a ${depth} mm application would carry ${interval} days.`,
          ),
        )
      }
    }

    if (rainWeek > 60) {
      blocks.push(
        p(
          `${round(rainWeek, 1)} mm of rain is forecast over the next seven days. Close the canal gate and stop pumping — for paddy this is the cheapest water of the season, and for upland crops check that ${farm.landType} land drains before the soil saturates.`,
        ),
      )
      irrDrivers.push(`Forecast rain ${round(rainWeek, 1)} mm in 7 days`)
    }

    if (farm.soilType === 'saline-clay' || district.salinitySeverity > 0.4) {
      blocks.push(
        p(
          `Canal water in ${district.name} turns brackish as the season dries out (dry-season salinity severity ${(district.salinitySeverity * 100).toFixed(0)} %). Test with a handheld EC meter before each irrigation; above 2 dS/m, switch to a well source or delay the application until a freshwater tide.`,
        ),
      )
      irrDrivers.push(`District dry-season salinity ${(district.salinitySeverity * 100).toFixed(0)} %`)
    }

    if (contexts.some((c) => c.species.id === 'rice')) {
      blocks.push(
        p(
          `For flooded rice, alternate wetting and drying — let the water drop to 15 cm below the surface before re-flooding — saves 18–22 % of pumping cost with no measurable yield penalty, provided you never let the field crack between panicle initiation and flowering.`,
        ),
      )
    }

    blocks.push(
      why(
        'Why these numbers',
        `Demand is FAO-56 crop water use: ET₀ for today (${et0Today} mm) multiplied by the crop coefficient for the ${contexts[0]?.stage.label.toLowerCase() ?? 'current'} stage. Irrigation depth follows the ${irrigationInfo.replace('-', ' ')} efficiency in the farm record.`,
      ),
    )
    sections.push({
      id: 'irrigation',
      title: 'Irrigation',
      gist: `${contexts.reduce((a, c) => a + round(referenceEt0(today ?? forecast[0]) * c.stage.kc, 1), 0).toFixed(1)} mm/day total demand · ${rainWeek > 60 ? 'hold off, rain coming' : `next application inside ${Math.max(1, Math.round(45 / 4))} days`}`,
      blocks,
      drivers: irrDrivers,
    })
    if (irrigationAcc) confidence += 0.02
  }

  /* ----------------------------------------------------------- timing */
  {
    const blocks: AdviceBlock[] = []
    const timingDrivers: string[] = []
    const month = now.getMonth() + 1

    const offWindow = contexts.filter((c) => !c.species.plantingMonths.includes(month) && c.daysSincePlanting < 30)
    if (offWindow.length) {
      blocks.push(
        p(
          `${offWindow.map((c) => c.label).join(' and ')} was planted outside the normal window for ${district.name} (${offWindow[0].species.plantingMonths
            .map((m) => monthName(m))
            .join('–')}). ${
            offWindow[0].species.zoneWindows[zones] ?? 'Expect a shifted flowering date and adjust the fertiliser splits to the actual stage, not the calendar.'
          }`,
        ),
      )
      timingDrivers.push(`Planting outside the recommended window for ${district.name}`)
    }

    const nowRows: Array<{ label: string; detail: string; when: string }> = []
    for (const c of contexts) {
      const nitrogen = c.species.nitrogenSplits
      const upcoming = nitrogen.find((s) => (c.species.stages.find((st) => st.id === s.atStage)?.fromDay ?? 0) > c.daysSincePlanting)
      if (upcoming) {
        const at = addDays(c.plant.plantedAt, c.species.stages.find((st) => st.id === upcoming.atStage)?.fromDay ?? c.daysSincePlanting)
        nowRows.push({
          label: `Top-dress ${c.label}`,
          detail: `${Math.round((c.species.nutrientNeed.n * upcoming.share) / 0.46 / 5) * 5} kg urea/acre at ${upcoming.atStage.replace(/-/g, ' ')}`,
          when: fmtDate(at),
        })
      }
      nowRows.push({
        label: `Harvest window — ${c.label}`,
        detail: `${c.species.handlingNote}`,
        when: `${fmtDate(addDays(c.plant.plantedAt, c.seasonDays - 5))} – ${fmtDate(addDays(c.plant.plantedAt, c.seasonDays + 7))}`,
      })
    }
    if (nowRows.length) {
      blocks.push({ kind: 'ops', caption: 'Field calendar', rows: nowRows })
    }

    if (hotDays > 0) {
      blocks.push(
        p(
          `${hotDays} day${hotDays === 1 ? '' : 's'} above 30 °C appear in the forecast. ${
            contexts.some((c) => c.stage.id === 'flowering' || c.stage.id === 'grain-filling')
              ? 'Heat at flowering and grain fill removes grain sites and shortens the fill — irrigate in the early morning so the canopy stays cooler through the afternoon.'
              : 'Keep the soil surface moist to buffer the crop and avoid any mid-day spraying.'
          }`,
        ),
      )
      timingDrivers.push(`${hotDays} forecast days ≥ 30 °C`)
    }

    const coldNights = forecast.filter((d) => d.tMin <= 0).length
    if (coldNights > 2) {
      blocks.push(
        p(
          `${coldNights} frost nights are forecast (minimum at or below 0 °C). Frost slows ${contexts
            .map((c) => c.species.name.toLowerCase())
            .join(' and ')} establishment and can kill exposed leaf. Hold nitrogen until the frost passes, avoid travelling on frozen or thawing soil, and keep the autumn-sown crop off the ridge tops where cold air settles.`,
        ),
      )
      timingDrivers.push(`${coldNights} forecast frost nights (≤ 0 °C)`)
    }

    const heavyRain = forecast.filter((d) => d.rainfallMm >= 25)
    if (heavyRain.length) {
      blocks.push(
        p(
          `Heavy rain (${heavyRain
            .map((d) => `${round(d.rainfallMm, 0)} mm on ${fmtDate(d.date)}`)
            .join(', ')}) is in the forecast. Bring the harvest forward on any plot within two weeks of maturity, and open the drainage channel on ${farm.landType} land before the first event rather than during it.`,
        ),
      )
      timingDrivers.push(`Heavy rain events: ${heavyRain.length} in the 14-day forecast`)
    }

    blocks.push(
      why(
        'Why timing is recalculated',
        `Every date here is anchored to the actual planting date on the plot record and the ${district.zone} zone window for ${district.name}, then cross-checked against the 14-day forecast.`,
      ),
    )
    sections.push({
      id: 'timing',
      title: 'Timing',
      gist: nowRows.length
        ? `Next operation: ${nowRows[0].label} on ${nowRows[0].when}.`
        : 'No operation falls due in the next three weeks.',
      blocks,
      drivers: timingDrivers,
    })
  }

  // An empty farm still needs a coherent answer rather than broken sentences.
  if (!contexts.length) {
    return {
      sections: [
        {
          id: 'commodity',
          title: 'Commodity changes',
          gist: 'No plants recorded on this farm yet.',
          blocks: [
            p(
              `${farm.name} in ${district.name} has no plant record yet, so there is nothing to plan against. Add the first plot — species, variety, planting date and the last soil test values — and the full advice set (commodity, fertiliser, soil, rotation, irrigation and timing) is generated from the property record.`,
            ),
            list([
              `Land on record: ${farm.landType} ${farm.soilType.replace(/-/g, ' ')} at ${farm.area.value} ${farm.area.unit}.`,
              `Irrigation arrangement: ${farm.irrigationType.replace(/-/g, ' ')} — ${farm.waterSource}.`,
              `District: ${district.name}, ${district.zone} zone. ${district.note}`,
            ]),
            why(
              'Why this is empty',
              'Advice, risk and every chart are derived from plant properties. With no plants there is no soil test, no growth stage and no area to reason about.',
            ),
          ],
          drivers: [],
        },
      ],
      confidence: 0.4,
    }
  }

  return { sections, confidence: clamp(confidence, 0.5, 0.97) }
}

function monthName(m: number): string {
  return new Date(2026, m - 1, 1).toLocaleDateString('en-GB', { month: 'long' })
}

/** Rotation target with a season-specific reason. */
export function nextCropFor(currentSpeciesId: string, farm: Farm): { species: string; reason: string; window: string } {
  const district = districtByName(farm.district)
  const group = currentSpeciesId === 'fallow' ? 'fallow' : getSpecies(currentSpeciesId).rotationGroup
  if (group === 'rice') {
    if (farm.landType === 'high' || district.zone === 'NW') {
      return {
        species: 'Winter canola or lentil',
        reason: 'Both are drilled into the paddy stubble, use the residual moisture, and dry the profile out again for the next spring crop.',
        window: 'drill late August to early October',
      }
    }
    return {
      species: 'Canola or a pulse',
      reason: 'A break from flooded culture reduces stem borer carryover and lets the plough pan crack over winter.',
      window: 'drill from early September',
    }
  }
  if (group === 'solanaceae' || group === 'tuber') {
    return {
      species: 'Winter wheat or a pulse',
      reason: 'A cereal or a legume between two vegetable crops interrupts eelworm and wilt pressure, which no chemical fixes.',
      window: 'drill in the autumn window',
    }
  }
  if (group === 'legume' || group === 'oilseed') {
    return {
      species: 'Winter wheat or maize',
      reason: 'Following a pulse or an oilseed, cereal yields rise 8–12 % on the residual nitrogen alone.',
      window: 'drill September–October or sow maize in spring',
    }
  }
  if (group === 'fibre') {
    return {
      species: 'Rice or maize in the summer slot',
      reason: 'A summer cereal after a winter crop uses the rainfall you already get, and the stubble is easy to work down.',
      window: 'sow or transplant May–June',
    }
  }
  return {
    species: 'A pulse or an oilseed',
    reason: 'Alternating a cereal with a pulse or an oilseed is the lowest-cost way to stop the yield plateau.',
    window: 'drill in the autumn window',
  }
}

/* ============================================================== assembly */

export interface AnalyzeOptions {
  now?: Date
  origin?: 'auto' | 'manual'
  actor?: { id: Id; name: string }
  /** Operations that triggered this run; becomes the "updated because" trail. */
  operations?: Array<{ field: string; fieldLabel: string; before: string; after: string }>
  literalOperations?: Id[]
}

export const ADVICE_MODEL = 'farmo-advise-2.4'
export const RISK_MODEL = 'farmo-risk-1.9'

export function analyzeFarm(
  project: Project,
  farm: Farm,
  plants: Plant[],
  options: AnalyzeOptions = {},
): FarmAnalysis {
  const now = options.now ?? new Date()
  const planted = plants.filter((pl) => pl.farmId === farm.id)
  const contexts = planted
    .map((pl) => buildPlantContext(pl, now))
    .sort((a, b) => a.daysSincePlanting - b.daysSincePlanting)

  const weather = farmWeather(farm, now)
  const conditions = computeConditions(contexts, weather)
  const growth = buildGrowthSeries(contexts)
  const water = buildWaterSeries(contexts, weather, now)
  const fertilizer = buildFertilizerPlan(contexts)
  const soil = buildSoilMetrics(contexts)
  const advice = buildAdvice(project, farm, contexts, fertilizer, soil, weather, now)
  const riskItems = buildRisks(project, farm, contexts, fertilizer, soil, weather, now)

  const driverList: AnalysisDriver[] = (options.operations ?? []).map((op) => ({
    field: op.field,
    label: op.fieldLabel,
    before: op.before,
    after: op.after,
  }))
  const operationIds = options.literalOperations ?? []
  const origin = options.origin ?? 'auto'
  const actor = options.actor ?? { id: 'system', name: 'Farmo engine' }

  const adviceVersion: AdviceVersion = {
    id: `adv-${farm.id}-${now.getTime().toString(36)}`,
    farmId: farm.id,
    createdAt: now.toISOString(),
    createdById: actor.id,
    createdByName: actor.name,
    origin,
    modelVersion: ADVICE_MODEL,
    confidence: advice.confidence,
    sections: advice.sections,
    drivers: driverList,
    operationIds,
  }

  const riskVersion: RiskVersion = {
    id: `rsk-${farm.id}-${now.getTime().toString(36)}`,
    farmId: farm.id,
    createdAt: now.toISOString(),
    createdById: actor.id,
    createdByName: actor.name,
    origin,
    modelVersion: RISK_MODEL,
    overall: maxSeverity(riskItems),
    items: riskItems.sort((a, b) => severityRank(b.severity) - severityRank(a.severity)),
    drivers: driverList,
    operationIds,
  }

  const charts: AnalysisCharts = { growth, water, fertilizer, soil, weather }

  return {
    farmId: farm.id,
    computedAt: now.toISOString(),
    conditions,
    advice: adviceVersion,
    risk: riskVersion,
    charts,
  }
}

/* ==================================================================== risk */

const SEVERITY_ORDER: Severity[] = ['low', 'moderate', 'high', 'critical']

export function severityFromScore(score: number): Severity {
  if (score >= 0.75) return 'critical'
  if (score >= 0.5) return 'high'
  if (score >= 0.26) return 'moderate'
  return 'low'
}

export function severityRank(s: Severity): number {
  return SEVERITY_ORDER.indexOf(s)
}

export function maxSeverity(items: RiskItem[]): Severity {
  return items.reduce<Severity>((acc, i) => (severityRank(i.severity) > severityRank(acc) ? i.severity : acc), 'low')
}

const CATEGORY_LABELS: Record<RiskCategory, string> = {
  drought: 'Drought',
  flood: 'Flood',
  'pest-disease': 'Pest & disease',
  nutrient: 'Nutrient deficiency',
  market: 'Market & price',
}

function usd(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`
}

function cropValuePerAcre(c: PlantContext): number {
  const variety = c.species.varieties.find((v) => v.name === c.varietyName) ?? c.species.varieties[0]
  return variety.yieldTonnesPerAcre * c.species.marketPricePerTonne
}

export function buildRisks(
  project: Project,
  farm: Farm,
  contexts: PlantContext[],
  fertilizer: FertilizerRow[],
  soil: SoilMetric[],
  weather: WeatherDay[],
  now: Date,
): RiskItem[] {
  const district = districtByName(farm.district)
  const items: RiskItem[] = []
  const observed = weather.filter((d) => d.kind === 'observed')
  const forecast = weather.filter((d) => d.kind === 'forecast')
  const last14 = observed.slice(-14)
  const next14 = forecast.slice(0, 14)
  const next7 = forecast.slice(0, 7)
  const rainLast14 = rainfallSum(last14)
  const rainNext7 = rainfallSum(next7)
  const rainNext14 = rainfallSum(next14)
  const totalAcre = contexts.reduce((a, c) => a + c.acre, 0) || 1
  const irrigationAcc = project.accommodations.find((a) => a.kind === 'irrigation' && a.available)
  const storageAcc = project.accommodations.find((a) => a.kind === 'storage' && a.available)
  const transportAcc = project.accommodations.find((a) => a.kind === 'transport' && a.available)
  const jitter = rngFor(farm.id, 'risk')

  /* ------------------------------------------------------------ drought */
  {
    const exposures = contexts
      .map((c) => {
        const [mLow] = c.moistureTarget
        const moistureGap = clamp((mLow - c.plant.soilMoisture) / 30, 0, 1)
        const stageWeight = c.stage.waterCritical ? 1.18 : 1
        const supplyWeight =
          farm.irrigationType === 'rainfed' ? 1.15 : farm.irrigationType === 'tidal' ? 1.05 : irrigationAcc ? 0.72 : 0.9
        const rainRelief = clamp(1 - rainNext7 / 60, 0.45, 1)
        const zoneWeight = district.zone === 'NW' ? 1.12 : district.zone === 'NE' || district.zone === 'SE' ? 0.85 : 1
        return { c, score: clamp(moistureGap * stageWeight * supplyWeight * rainRelief * zoneWeight, 0, 1) }
      })
      .sort((a, b) => b.score - a.score)
    const worst = exposures[0]
    const score = worst?.score ?? 0
    const severity = severityFromScore(score)
    if (worst && (severity !== 'low' || worst.c.stage.waterCritical)) {
      const lossPct = round(clamp(score * 26, 3, 42), 0)
      items.push({
        id: `risk-drought-${farm.id}`,
        category: 'drought',
        categoryLabel: CATEGORY_LABELS.drought,
        title: `Moisture deficit building on ${worst.c.label}`,
        severity,
        likelihood: round(clamp(score * 0.92 + 0.05, 0.05, 0.95), 2),
        impact: `A ${lossPct} % yield loss on ${round(worst.c.acre, 2)} acres is about ${usd((lossPct / 100) * cropValuePerAcre(worst.c) * worst.c.acre)} at ${district.name} farm-gate prices.`,
        window: worst.c.stage.waterCritical ? 'Next 7–10 days (water-critical stage)' : 'Next 14 days',
        blocks: [
          p(
            `Soil moisture is ${worst.c.plant.soilMoisture} % against a ${worst.c.moistureTarget[0]}–${worst.c.moistureTarget[1]} % working range, and only ${round(rainNext7, 1)} mm of rain is forecast in the next seven days (${round(rainLast14, 1)} mm fell in the last fourteen).`,
          ),
          list([
            `Deliver ${worst.c.species.id.includes('rice') ? '45' : '38'} mm per application rather than a light daily splash — light applications wet only the top 5 cm.`,
            farm.irrigationType === 'rainfed'
              ? 'With no irrigation source on this farm, prioritise the highest-value plot and consider renting a low-lift pump for a single rescue application.'
              : `The irrigation source here is ${farm.irrigationType.replace(/-/g, ' ')} — book the slot now, not when the field shows the deficit.`,
            'Keep a dust mulch or straw mulch over the inter-row to cut evaporation by 15–20 %.',
          ]),
          why(
            'What drove this',
            `Moisture gap, ${worst.c.stage.label.toLowerCase()} stage sensitivity, ${district.zone} zone rainfall pattern, and the irrigation arrangement recorded on the project.`,
          ),
        ],
        drivers: [
          `Soil moisture ${worst.c.plant.soilMoisture} % (range ${worst.c.moistureTarget[0]}–${worst.c.moistureTarget[1]} %)`,
          `Forecast rain ${round(rainNext7, 1)} mm in 7 days`,
          worst.c.stage.waterCritical ? `${worst.c.stage.label} is a water-critical stage` : `${worst.c.stage.label} stage`,
          irrigationAcc ? `Irrigation access: ${irrigationAcc.label}` : 'No irrigation accommodation recorded',
        ],
        mitigation: [
          'Irrigate the water-critical plot first',
          'Reduce the area under the thirstiest crop next season',
          'Record every irrigation event so the estimate learns the real application rate',
        ],
      })
    }
  }

  /* -------------------------------------------------------------- flood */
  {
    const landWeight = farm.landType === 'low' ? 1.3 : farm.landType === 'medium' ? 1 : 0.72
    const zoneWeight =
      district.zone === 'NE' ? 1.35 : district.zone === 'SC' ? 1.2 : district.zone === 'SW' ? 1.12 : district.zone === 'SE' ? 1.05 : 0.7
    const rainWeight = clamp(rainNext14 / 220, 0, 1.25)
    const drainWeight =
      farm.soilType === 'clay-loam' || farm.soilType === 'saline-clay' ? 1.18 : farm.soilType === 'sandy-loam' ? 0.8 : 1
    const score = clamp((landWeight * zoneWeight * 0.42 + rainWeight * 0.42) * drainWeight, 0, 1)
    const severity = severityFromScore(score)
    if (severity !== 'low') {
      const pondingDays = Math.round(clamp(score * 5.2, 1, 7))
      const lossShare = clamp(score * 0.22, 0.04, 0.38)
      items.push({
        id: `risk-flood-${farm.id}`,
        category: 'flood',
        categoryLabel: CATEGORY_LABELS.flood,
        title: `Waterlogging exposure on ${farm.landType} land`,
        severity,
        likelihood: round(clamp(score * 0.85 + 0.08, 0.05, 0.93), 2),
        impact: `Ponding beyond ${pondingDays} days at the current stage costs roughly ${round(lossShare * 100, 0)} % of the standing crop on ${round(totalAcre, 2)} acres — about ${usd(lossShare * contexts.reduce((a, c) => a + cropValuePerAcre(c) * c.acre, 0))}.`,
        window: 'Next 14 days',
        blocks: [
          p(
            `${farm.name} sits on ${farm.landType} land in a zone with ${district.zone === 'NE' || district.zone === 'SC' ? 'severe' : 'high'} flood exposure. ${round(rainNext14, 1)} mm is forecast over fourteen days, and the ${farm.soilType.replace(/-/g, ' ')} profile drains ${farm.soilType === 'clay-loam' || farm.soilType === 'saline-clay' ? 'slowly' : 'moderately'}.`,
          ),
          list([
            'Clear and cut the drainage channel at the plot tail before the first heavy event — doing it during the storm is too late.',
            contexts.some((c) => c.species.id.includes('rice'))
              ? 'For paddy, submergence of up to 5 days at tillering is recoverable if the water is clear; keep the bund height uniform so the field drains evenly.'
              : 'Upland crops (potato, tomato, mustard) lose roots inside 48 hours of saturation — put the lowest beds on raised rows.',
            'Photograph any standing water with its date; that record is what a relief or insurance claim turns on.',
          ]),
          why(
            'What drove this',
            `Land type, drainage class, zone flood exposure and the ${round(rainNext14, 1)} mm forecast over the next fortnight.`,
          ),
        ],
        drivers: [
          `${farm.landType} land, ${farm.soilType.replace(/-/g, ' ')}`,
          `${district.zone} zone flood exposure: ${district.zone === 'NE' ? 'severe' : district.zone === 'SC' ? 'high' : 'moderate'}`,
          `Forecast rain ${round(rainNext14, 1)} mm in 14 days`,
        ],
        mitigation: [
          'Open drainage before the event',
          'Raise the lowest beds',
          'Keep a submergence-tolerant variety option for the next season',
        ],
      })
    }
  }

  /* ------------------------------------------------------ pest & disease */
  {
    for (const c of contexts) {
      for (const pest of c.species.pests) {
        if (!pest.stageIds.includes(c.stage.id)) continue
        const relevant = observed.slice(-10)
        const windowDays = relevant.filter(
          (d) =>
            (d.tMax + d.tMin) / 2 >= pest.tempRange[0] &&
            (d.tMax + d.tMin) / 2 <= pest.tempRange[1] &&
            d.humidity >= pest.humidityMin,
        ).length
        const forecastWindow = next14.filter(
          (d) =>
            (d.tMax + d.tMin) / 2 >= pest.tempRange[0] &&
            (d.tMax + d.tMin) / 2 <= pest.tempRange[1] &&
            d.humidity >= pest.humidityMin,
        ).length
        const weatherFit = clamp((windowDays + forecastWindow) / 12, 0, 1)
        const rainFactor = pest.rainFavoured
          ? clamp(rainLast14 / 90 + forecastWindow / 28, 0, 1)
          : clamp(1 - rainLast14 / 160, 0.5, 1)
        const base = pest.baseSeverity === 'high' ? 0.62 : pest.baseSeverity === 'moderate' ? 0.44 : 0.28
        const repeatPenalty = c.sameSpeciesLastSeason ? 0.14 : 0
        const varietyResistance = /tolerant|resistant/i.test(c.varietyNote) ? -0.1 : 0
        const score = clamp(
          base * 0.55 + weatherFit * 0.45 + rainFactor * 0.18 + repeatPenalty + varietyResistance + (jitter() - 0.5) * 0.04,
          0,
          1,
        )
        const severity = severityFromScore(score)
        if (severityRank(severity) < severityRank('moderate')) continue
        const lossPct = round(clamp(score * 24, 4, 34), 0)
        items.push({
          id: `risk-${pest.id}-${c.plant.id}`,
          category: 'pest-disease',
          categoryLabel: CATEGORY_LABELS['pest-disease'],
          title: `${pest.name} pressure likely on ${c.species.name}`,
          severity,
          likelihood: round(clamp(score * 0.9, 0.08, 0.94), 2),
          impact: `${lossPct} % of ${round(c.acre, 2)} acres is about ${usd((lossPct / 100) * cropValuePerAcre(c) * c.acre)} if the infection is not interrupted.`,
          window: pest.kind === 'disease' ? 'Next 10–14 days (weather-driven)' : 'Next 2–3 weeks as the population builds',
          blocks: [
            p(
              `${pest.name} favours ${pest.tempRange[0]}–${pest.tempRange[1]} °C at ${pest.humidityMin} %+ humidity; ${windowDays} of the last 10 days and ${forecastWindow} of the next 14 fit that window. ${c.label} is in the ${c.stage.label} stage, one of the stages this organism attacks.`,
            ),
            p(`Recognise it by: ${pest.sign}`),
            list(pest.control),
            c.sameSpeciesLastSeason
              ? p(
                  `Last season's ${c.previousCropLabel.toLowerCase()} on this same plot means inoculum is already in the soil — treat the spray threshold as lower this year.`,
                )
              : p(
                  'The previous crop on this plot breaks the carryover for this organism, so start from the field scouting threshold rather than a calendar spray.',
                ),
          ],
          drivers: [
            `${windowDays}/10 recent days and ${forecastWindow}/14 forecast days inside the favourable weather window`,
            `Crop stage: ${c.stage.label}`,
            c.sameSpeciesLastSeason ? `Same crop family last season (${c.previousCropLabel})` : `Previous crop: ${c.previousCropLabel}`,
          ],
          mitigation: [
            `Scout twice a week from ${fmtDate(addDays(now, 2))}`,
            'Spray only at threshold, and rotate the active ingredient',
            'Spray in the afternoon at low nozzle pressure',
          ],
        })
      }
    }
  }

  /* ----------------------------------------------------- nutrient risk */
  {
    const deficits = fertilizer.filter((f) => f.gapKgPerAcre > 0.5)
    const lockup =
      (soil.find((s) => s.key === 'ph')?.verdict === 'deficient' ? 0.22 : 0) +
      (soil.find((s) => s.key === 'om')?.verdict !== 'optimal' ? 0.12 : 0) +
      ((soil.find((s) => s.key === 'moisture')?.value ?? 60) < 40 ? 0.14 : 0)
    const gapRatio = deficits.length
      ? clamp(deficits.reduce((a, f) => a + f.gapKgPerAcre / Math.max(1, f.cropNeedKgPerAcre), 0) / deficits.length, 0, 1)
      : 0
    const score = clamp(gapRatio * 0.62 + lockup, 0, 1)
    const severity = severityFromScore(score)
    if (severity !== 'low') {
      const yieldPenalty = round(clamp(score * 28, 4, 32), 0)
      const shorthand = deficits.some((d) => d.nutrient === 'N')
        ? 'pale lower leaves and thin tillers'
        : deficits.some((d) => d.nutrient === 'P')
          ? 'stunted roots and delayed flowering'
          : 'leaf-margin scorch and weak grain fill'
      items.push({
        id: `risk-nutrient-${farm.id}`,
        category: 'nutrient',
        categoryLabel: CATEGORY_LABELS.nutrient,
        title: `${deficits.map((d) => d.nutrient).join(', ') || 'Nutrient'} balance below crop requirement`,
        severity,
        likelihood: round(clamp(0.32 + score * 0.6, 0.2, 0.95), 2),
        impact: `Left uncorrected the imbalance usually shows as ${shorthand} — about ${yieldPenalty} % of yield, or ${usd((yieldPenalty / 100) * contexts.reduce((a, c) => a + cropValuePerAcre(c) * c.acre, 0))}.`,
        window: 'Correction window: the next 3 weeks',
        blocks: [
          p(`Soil supply against requirement: ${deficits.map((d) => `${d.nutrient} short ${round(d.gapKgPerAcre, 1)} kg/acre`).join('; ') || 'no shortfall at the current crop mix'}.`),
          list([
            'Apply the balance in split doses matched to the stage curve rather than one basal application.',
            (soil.find((s) => s.key === 'ph')?.value ?? 6.5) < 5.9
              ? 'Correct the pH in the same operation — phosphorus applied into an acid soil is largely locked up.'
              : 'Keep a small maintenance dose even where the test reads adequate; it is crop removal that moves the number.',
            'Sample again after harvest from the same spots so the trend line means something.',
          ]),
        ],
        drivers: [
          `${deficits.length} nutrient${deficits.length === 1 ? '' : 's'} below requirement`,
          `pH ${soil.find((s) => s.key === 'ph')?.value ?? '—'}, organic matter ${soil.find((s) => s.key === 'om')?.value ?? '—'} %`,
        ],
        mitigation: ['Split the top-dress', 'Hold the basal until pH is corrected', 'Re-sample the same points next season'],
      })
    }
  }

  /* ------------------------------------------------------------ market */
  {
    for (const c of contexts) {
      const volatility = c.species.marketVolatility
      if (volatility < 0.35) continue
      const daysToHarvest = c.daysToHarvest
      const nearHarvest = daysToHarvest !== null && daysToHarvest <= 35 ? 1 : 0.55
      const storageRelief = storageAcc ? 0.62 : 1
      const score = clamp(volatility * nearHarvest * storageRelief + (jitter() - 0.5) * 0.05, 0, 1)
      const severity = severityFromScore(score)
      if (severityRank(severity) < severityRank('moderate')) continue
      const swing = round(volatility * 30, 0)
      const exposure = cropValuePerAcre(c) * c.acre
      items.push({
        id: `risk-market-${c.plant.id}`,
        category: 'market',
        categoryLabel: CATEGORY_LABELS.market,
        title: `${c.species.name} price swing at harvest`,
        severity,
        likelihood: round(clamp(0.3 + volatility * 0.6, 0.2, 0.9), 2),
        impact: `A ±${swing} % move on ${round(c.acre, 2)} acres is roughly ±${usd((swing / 100) * exposure)} on the harvest value.`,
        window: daysToHarvest !== null ? `Harvest in ${daysToHarvest} days` : 'Already at the harvest window',
        blocks: [
          p(
            `${c.species.name} typically moves ±${swing} % within the season at ${district.name} prices (base ${usd(c.species.marketPricePerTonne)} per tonne). ${
              daysToHarvest !== null && daysToHarvest <= 35
                ? `The crop is ${daysToHarvest} days from harvest, so the selling decision is imminent.`
                : `The crop is ${daysToHarvest ?? '—'} days from harvest — there is still time to plan a selling route.`
            }`,
          ),
          list([
            storageAcc
              ? `Use ${storageAcc.label.toLowerCase()} to stagger sales: move 40 % straight after harvest to cover cash needs and hold the balance for the recovery that normally follows peak arrivals.`
              : 'With no storage recorded, arrange a group or contract sale rather than selling on the day of arrival, when the spot price is at its worst.',
            transportAcc
              ? `${transportAcc.label} — check the wholesale price at the nearest larger market before accepting the local quote.`
              : 'Distance to market is not recorded; a short transport gap can hide a 15 % price difference between two markets.',
            'Grade and pack before selling — ungraded lots are priced at the worst grade they contain.',
          ]),
          why(
            'What drove this',
            `Commodity volatility index for ${c.species.name}, ${daysToHarvest !== null ? `${daysToHarvest} days to harvest` : 'harvest already due'}, and ${storageAcc ? 'available on-farm storage' : 'no on-farm storage recorded on the project'}.`,
          ),
        ],
        drivers: [
          `Seasonal price swing ±${swing} %`,
          daysToHarvest !== null ? `${daysToHarvest} days to harvest` : 'Harvest window reached',
          storageAcc ? `Storage: ${storageAcc.label}` : 'No storage recorded on the project',
        ],
        mitigation: ['Stagger sales', 'Sell through a group or contract', 'Grade before selling'],
      })
    }
  }

  return items
}
