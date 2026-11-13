import type { AreaUnit, ClimateZone, IrrigationType, LandType, SoilType } from '../types'

/* ------------------------------------------------------------------- zones */

export interface ClimateZoneInfo {
  code: ClimateZone
  label: string
  description: string
  /** Typical flood exposure for the zone. */
  floodExposure: 'low' | 'moderate' | 'high' | 'severe'
  /** Typical drought exposure for the zone. */
  droughtExposure: 'low' | 'moderate' | 'high' | 'severe'
  note: string
}

export const CLIMATE_ZONES: Record<ClimateZone, ClimateZoneInfo> = {
  NW: {
    code: 'NW',
    label: 'Northwest — dry upland',
    description: 'Low rainfall, deep water table, late frosts, dry summers.',
    floodExposure: 'low',
    droughtExposure: 'high',
    note: 'Upland blocks need irrigation through the summer and a drought plan for spring-sown crops.',
  },
  N: {
    code: 'N',
    label: 'North — cold inland plain',
    description: 'Reliable rain, heavy soils, hard winter nights.',
    floodExposure: 'moderate',
    droughtExposure: 'low',
    note: 'Long cold nights in December and January slow establishment and shift flowering dates.',
  },
  NE: {
    code: 'NE',
    label: 'Northeast — wet river basin',
    description: 'Heavy rainfall, high water tables, spring flood risk.',
    floodExposure: 'severe',
    droughtExposure: 'low',
    note: 'One narrow window for winter cereals: the ground is often too wet to work until October.',
  },
  SW: {
    code: 'SW',
    label: 'Southwest — tidal lowland',
    description: 'Coastal salinity intrusion, tidal canals, late-summer waterlogging.',
    floodExposure: 'high',
    droughtExposure: 'moderate',
    note: 'Dry-season salinity builds in canal water from mid-summer; irrigation timing matters more than volume.',
  },
  SC: {
    code: 'SC',
    label: 'South-central — coastal plain',
    description: 'Storm exposure, brackish groundwater in places, heavy summer rain.',
    floodExposure: 'high',
    droughtExposure: 'moderate',
    note: 'Storm season runs late summer and autumn; keep harvest operations tight around it.',
  },
  SE: {
    code: 'SE',
    label: 'Southeast — humid hills',
    description: 'Very high rainfall, sloping ground, fast runoff.',
    floodExposure: 'moderate',
    droughtExposure: 'low',
    note: 'Slope and runoff leach nutrients quickly; potassium and sulphur are usually the limiting nutrients.',
  },
}

/* --------------------------------------------------------------- districts */

export interface District {
  id: string
  name: string
  /** Administrative region the district sits in. */
  region: string
  zone: ClimateZone
  /** Annual rainfall, mm. */
  rainfallMm: number
  /** Share of annual rain falling in the wet season (0–1). */
  wetSeasonShare: number
  /** Months (1-12) that make up the wet season. */
  wetMonths: number[]
  winterTempC: [number, number]
  summerTempC: [number, number]
  soilTypes: SoilType[]
  dominantLand: LandType
  /** 0–1 dry-season salinity severity. */
  salinitySeverity: number
  localities: string[]
  note: string
}

export const DISTRICTS: District[] = [
  {
    id: 'cedar-valley',
    name: 'Cedar Valley',
    region: 'North County',
    zone: 'NW',
    rainfallMm: 520,
    wetSeasonShare: 0.46,
    wetMonths: [5, 6, 7, 8],
    winterTempC: [-6, 6],
    summerTempC: [12, 29],
    soilTypes: ['sandy-loam', 'silt-loam'],
    dominantLand: 'high',
    salinitySeverity: 0,
    localities: ['North Ridge', 'Cedar Falls', 'Pine Hollow', 'Stone Creek', 'Mill Road'],
    note: 'Upland district with a falling water table; summer dry spells cut spring-sown yields.',
  },
  {
    id: 'stonebridge',
    name: 'Stonebridge',
    region: 'North County',
    zone: 'NW',
    rainfallMm: 610,
    wetSeasonShare: 0.5,
    wetMonths: [5, 6, 7, 8],
    winterTempC: [-5, 7],
    summerTempC: [13, 30],
    soilTypes: ['calcareous', 'sandy-loam', 'silt-loam'],
    dominantLand: 'high',
    salinitySeverity: 0,
    localities: ['Westbridge', 'Old Quarry', 'Harlow', 'Ashton', 'Bramble Hill'],
    note: 'Calcareous patches keep pH high: zinc and boron are the usual hidden deficiencies here.',
  },
  {
    id: 'millbrook',
    name: 'Millbrook',
    region: 'North County',
    zone: 'N',
    rainfallMm: 820,
    wetSeasonShare: 0.52,
    wetMonths: [5, 6, 7, 8],
    winterTempC: [-8, 5],
    summerTempC: [12, 28],
    soilTypes: ['clay-loam', 'silty-clay-loam'],
    dominantLand: 'medium',
    salinitySeverity: 0,
    localities: ['Millbrook', 'Fairhaven', 'Long Meadow', 'Ashford', 'Barrow'],
    note: 'River valley with heavy soils and the coldest winter nights in the county.',
  },
  {
    id: 'northfield',
    name: 'Northfield',
    region: 'Central County',
    zone: 'N',
    rainfallMm: 780,
    wetSeasonShare: 0.5,
    wetMonths: [5, 6, 7, 8],
    winterTempC: [-6, 6],
    summerTempC: [13, 29],
    soilTypes: ['silty-clay-loam', 'silt-loam'],
    dominantLand: 'medium',
    salinitySeverity: 0,
    localities: ['Northfield', 'Grange', 'Elmstead', 'Kingsbury', 'Wexley'],
    note: 'Reliable rainfall and even soils; the workhorse district for winter cereals.',
  },
  {
    id: 'fairview',
    name: 'Fairview',
    region: 'East County',
    zone: 'NE',
    rainfallMm: 1180,
    wetSeasonShare: 0.58,
    wetMonths: [5, 6, 7, 8, 9],
    winterTempC: [-4, 7],
    summerTempC: [14, 28],
    soilTypes: ['silt-loam', 'silty-clay-loam'],
    dominantLand: 'medium',
    salinitySeverity: 0,
    localities: ['Fairview', 'Rushford', 'Bellwater', 'Copse End', 'Marlow'],
    note: 'Wettest district in the demo: drainage, not irrigation, is the limiting factor.',
  },
  {
    id: 'oakridge',
    name: 'Oakridge',
    region: 'East County',
    zone: 'SE',
    rainfallMm: 1020,
    wetSeasonShare: 0.55,
    wetMonths: [5, 6, 7, 8],
    winterTempC: [-3, 8],
    summerTempC: [15, 30],
    soilTypes: ['silt-loam', 'sandy-loam'],
    dominantLand: 'high',
    salinitySeverity: 0,
    localities: ['Oakridge', 'High Fell', 'Dunmore', 'Coldharbour', 'Ridgeway'],
    note: 'Sloping ground on the eastern ridge; runoff carries nitrogen away quickly.',
  },
  {
    id: 'greenfield',
    name: 'Greenfield',
    region: 'South County',
    zone: 'SW',
    rainfallMm: 700,
    wetSeasonShare: 0.45,
    wetMonths: [6, 7, 8],
    winterTempC: [-2, 9],
    summerTempC: [14, 30],
    soilTypes: ['silt-loam', 'sandy-loam'],
    dominantLand: 'high',
    salinitySeverity: 0.15,
    localities: ['Greenfield', 'Southgate', 'Hayward', 'Cobble End', 'Wrenbury'],
    note: 'Light, workable soils built for field vegetables and early potatoes.',
  },
  {
    id: 'riverside',
    name: 'Riverside',
    region: 'South County',
    zone: 'SW',
    rainfallMm: 760,
    wetSeasonShare: 0.48,
    wetMonths: [6, 7, 8],
    winterTempC: [0, 10],
    summerTempC: [15, 30],
    soilTypes: ['saline-clay', 'silt-loam'],
    dominantLand: 'low',
    salinitySeverity: 0.62,
    localities: ['Riverside', 'Tide Mill', 'Saltmarsh', 'Penny Bridge', 'Weir End'],
    note: 'Tidal land: canal water turns brackish after midsummer, and drainage is the main constraint.',
  },
  {
    id: 'westbrook',
    name: 'Westbrook',
    region: 'South County',
    zone: 'SC',
    rainfallMm: 840,
    wetSeasonShare: 0.5,
    wetMonths: [6, 7, 8],
    winterTempC: [-1, 9],
    summerTempC: [15, 31],
    soilTypes: ['silty-clay-loam', 'clay-loam'],
    dominantLand: 'medium',
    salinitySeverity: 0.35,
    localities: ['Westbrook', 'Merrow', 'Stanwell', 'Lower Marsh', 'Kettleby'],
    note: 'Coastal plain with a brackish aquifer; storm season shapes the autumn calendar.',
  },
]

export const DISTRICT_BY_ID = new Map(DISTRICTS.map((d) => [d.id, d]))

export function districtByName(name: string): District {
  return DISTRICTS.find((d) => d.name === name) ?? DISTRICTS[0]
}

/* -------------------------------------------------------------- soil types */

export interface SoilTypeInfo {
  id: SoilType
  label: string
  typicalPh: [number, number]
  drainage: 'poor' | 'moderate' | 'good'
  organicMatterPct: number
  note: string
}

export const SOIL_TYPES: SoilTypeInfo[] = [
  {
    id: 'silty-clay-loam',
    label: 'Silty clay loam',
    typicalPh: [6.0, 6.8],
    drainage: 'moderate',
    organicMatterPct: 1.6,
    note: 'Holds moisture well and responds to organic matter; the commonest arable soil in the demo.',
  },
  {
    id: 'clay-loam',
    label: 'Clay loam',
    typicalPh: [5.8, 6.8],
    drainage: 'poor',
    organicMatterPct: 1.8,
    note: 'Heavy and slow-draining: excellent for paddy, troublesome for potatoes in a wet spring.',
  },
  {
    id: 'sandy-loam',
    label: 'Sandy loam',
    typicalPh: [6.2, 7.2],
    drainage: 'good',
    organicMatterPct: 0.8,
    note: 'Drains and warms early but leaches nitrogen and potassium fast — split dosing matters.',
  },
  {
    id: 'silt-loam',
    label: 'Silt loam',
    typicalPh: [6.1, 7.0],
    drainage: 'moderate',
    organicMatterPct: 1.2,
    note: 'Favourable tilth; prone to surface crusting after heavy rain, which hurts small-seeded crops.',
  },
  {
    id: 'calcareous',
    label: 'Calcareous',
    typicalPh: [7.2, 8.0],
    drainage: 'good',
    organicMatterPct: 0.6,
    note: 'Free lime keeps pH high: zinc and boron are the usual hidden deficiencies.',
  },
  {
    id: 'saline-clay',
    label: 'Saline clay',
    typicalPh: [6.6, 7.8],
    drainage: 'poor',
    organicMatterPct: 1.0,
    note: 'Salinity rises through the dry season. Salt-tolerant varieties plus gypsum and leaching are the levers.',
  },
]

export const SOIL_TYPE_BY_ID = new Map(SOIL_TYPES.map((s) => [s.id, s]))

/* ------------------------------------------------------------- irrigation */

export interface IrrigationInfo {
  id: IrrigationType
  label: string
  /** Rough application efficiency, 0–1. */
  efficiency: number
  costPerMmPerAcreUsd: number
  note: string
}

export const IRRIGATION_TYPES: IrrigationInfo[] = [
  { id: 'rainfed', label: 'Rainfed', efficiency: 0.7, costPerMmPerAcreUsd: 0, note: 'No pumping cost and no control — plan around the dry spell.' },
  { id: 'canal', label: 'Canal / ditch', efficiency: 0.55, costPerMmPerAcreUsd: 0.5, note: 'Low cost per mm but supply is a schedule, not a tap.' },
  { id: 'shallow-tubewell', label: 'Shallow well', efficiency: 0.65, costPerMmPerAcreUsd: 1.2, note: 'Fastest to arrange; output drops as the water table falls in late summer.' },
  { id: 'deep-tubewell', label: 'Deep well', efficiency: 0.7, costPerMmPerAcreUsd: 0.9, note: 'Steady supply across the dry season, but needs shared scheduling with neighbours.' },
  { id: 'tidal', label: 'Tidal canal', efficiency: 0.5, costPerMmPerAcreUsd: 0.2, note: 'Free water on the tide, but salinity and timing follow the moon, not the crop.' },
  { id: 'pond', label: 'Pond / reservoir lift', efficiency: 0.6, costPerMmPerAcreUsd: 0.8, note: 'Good for vegetables and seedbeds; usually exhausted by midsummer.' },
  { id: 'drip', label: 'Drip', efficiency: 0.9, costPerMmPerAcreUsd: 2.1, note: 'Highest efficiency and most reliable for row crops; needs clean water and filtration.' },
]

export const IRRIGATION_BY_ID = new Map(IRRIGATION_TYPES.map((i) => [i.id, i]))

/* ------------------------------------------------------------------ units */

export interface AreaUnitInfo {
  id: AreaUnit
  label: string
  plural: string
  toAcre: number
  toHectare: number
  note: string
}

export const AREA_UNITS: AreaUnitInfo[] = [
  { id: 'acre', label: 'acre', plural: 'acres', toAcre: 1, toHectare: 0.404686, note: '1 acre = 0.40 hectares' },
  { id: 'hectare', label: 'hectare', plural: 'hectares', toAcre: 2.47105, toHectare: 1, note: '1 hectare = 2.47 acres' },
  { id: 'sqm', label: 'square metre', plural: 'square metres', toAcre: 0.000247105, toHectare: 0.0001, note: 'For tunnels, beds and small plots' },
]

export const AREA_UNIT_BY_ID = new Map(AREA_UNITS.map((u) => [u.id, u]))

export function toAcre(value: number, unit: AreaUnit): number {
  return value * (AREA_UNIT_BY_ID.get(unit)?.toAcre ?? 1)
}

export function toHectare(value: number, unit: AreaUnit): number {
  return value * (AREA_UNIT_BY_ID.get(unit)?.toHectare ?? 0.404686)
}

/** Grain and oilseed prices are quoted per tonne. */
export const KG_PER_TONNE = 1000

export function formatArea(value: number, unit: AreaUnit): string {
  const info = AREA_UNIT_BY_ID.get(unit)
  const n = value % 1 === 0 ? value.toString() : value.toFixed(2).replace(/\.?0+$/, '')
  return `${n} ${Number(value) === 1 ? (info?.label ?? unit) : (info?.plural ?? unit)}`
}
