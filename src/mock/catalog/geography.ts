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
    label: 'Northwest — Barind and drought-prone plain',
    description: 'Low rainfall, deep water table, winter fog, late-monsoon dry spells.',
    floodExposure: 'low',
    droughtExposure: 'high',
    note: 'Barind high land needs irrigation through the rabi season and a drought escape plan for Aman.',
  },
  N: {
    code: 'N',
    label: 'North-central — old Brahmaputra floodplain',
    description: 'Reliable monsoon, medium-high land, cold January nights.',
    floodExposure: 'moderate',
    droughtExposure: 'low',
    note: 'Long cold nights in December–January slow boro establishment and push flowering date.',
  },
  NE: {
    code: 'NE',
    label: 'Northeast — haor and Surma basin',
    description: 'Extremely heavy monsoon, deep flooding, flash-flood risk in April–May.',
    floodExposure: 'severe',
    droughtExposure: 'low',
    note: 'One crop, one window: the boro harvest must be off before the April flash flood.',
  },
  SW: {
    code: 'SW',
    label: 'Southwest — Ganges tidal floodplain',
    description: 'Salinity intrusion, tidal canals, late-monsoon waterlogging.',
    floodExposure: 'high',
    droughtExposure: 'moderate',
    note: 'Dry-season salinity builds in canal water from February; irrigation timing matters more than volume.',
  },
  SC: {
    code: 'SC',
    label: 'South-central — coastal and estuarine',
    description: 'Cyclone exposure, saline groundwater, heavy monsoon rain.',
    floodExposure: 'high',
    droughtExposure: 'moderate',
    note: 'Cyclone landfall season is April–May and October–November; keep harvest operations tight.',
  },
  SE: {
    code: 'SE',
    label: 'Southeast — Chittagong coastal plain',
    description: 'Very high rainfall, rolling terrain, flash-flood runoff from the hills.',
    floodExposure: 'moderate',
    droughtExposure: 'low',
    note: 'Slope and runoff drain nutrients fast; potassium and sulphur are usually the limiting nutrients.',
  },
}

/* --------------------------------------------------------------- districts */

export interface District {
  id: string
  name: string
  division: string
  zone: ClimateZone
  /** Annual rainfall, mm. */
  rainfallMm: number
  /** Monsoon (Jun–Sep) share, mm. */
  monsoonRainfallMm: number
  winterTempC: [number, number]
  summerTempC: [number, number]
  soilTypes: SoilType[]
  dominantLand: LandType
  /** 0–1 dry-season salinity severity. */
  salinitySeverity: number
  upazilas: string[]
  note: string
}

export const DISTRICTS: District[] = [
  {
    id: 'bogura',
    name: 'Bogura',
    division: 'Rajshahi',
    zone: 'NW',
    rainfallMm: 1420,
    monsoonRainfallMm: 1010,
    winterTempC: [9, 26],
    summerTempC: [24, 37],
    soilTypes: ['silty-clay-loam', 'clay-loam'],
    dominantLand: 'medium',
    salinitySeverity: 0,
    upazilas: ['Sherpur', 'Kahaloo', 'Shajahanpur', 'Shivaloy', 'Gabtali'],
    note: 'Barind fringe: reliable groundwater but falling water table; late-monsoon dry spells cut Aman yields.',
  },
  {
    id: 'rajshahi',
    name: 'Rajshahi',
    division: 'Rajshahi',
    zone: 'NW',
    rainfallMm: 1330,
    monsoonRainfallMm: 950,
    winterTempC: [8, 26],
    summerTempC: [25, 39],
    soilTypes: ['sandy-loam', 'calcareous', 'silty-clay-loam'],
    dominantLand: 'high',
    salinitySeverity: 0,
    upazilas: ['Tanore', 'Godagari', 'Paba', 'Puthia', 'Charghat'],
    note: 'Barind high land with calcareous patches; the water table drops 3–4 m by March every year.',
  },
  {
    id: 'mymensingh',
    name: 'Mymensingh',
    division: 'Mymensingh',
    zone: 'N',
    rainfallMm: 2240,
    monsoonRainfallMm: 1560,
    winterTempC: [8, 25],
    summerTempC: [23, 35],
    soilTypes: ['silty-clay-loam', 'clay-loam', 'silt-loam'],
    dominantLand: 'medium',
    salinitySeverity: 0,
    upazilas: ['Muktagachha', 'Bhaluka', 'Trishal', 'Phulpur', 'Gaffargaon'],
    note: 'Old Brahmaputra floodplain — heavy monsoon, but a real dry window from November to March.',
  },
  {
    id: 'jashore',
    name: 'Jashore',
    division: 'Khulna',
    zone: 'SW',
    rainfallMm: 1680,
    monsoonRainfallMm: 1180,
    winterTempC: [10, 27],
    summerTempC: [24, 38],
    soilTypes: ['silt-loam', 'silty-clay-loam', 'saline-clay'],
    dominantLand: 'high',
    salinitySeverity: 0.35,
    upazilas: ['Jhikargachha', 'Dupuria', 'Keshabpur', 'Monirumpur', 'Abhaynagar'],
    note: 'The vegetable belt of the southwest: high land, shallow tubewells, and strong off-season market links.',
  },
  {
    id: 'khulna',
    name: 'Khulna',
    division: 'Khulna',
    zone: 'SW',
    rainfallMm: 1720,
    monsoonRainfallMm: 1200,
    winterTempC: [11, 28],
    summerTempC: [24, 37],
    soilTypes: ['saline-clay', 'silt-loam'],
    dominantLand: 'low',
    salinitySeverity: 0.68,
    upazilas: ['Dumuria', 'Batiaghata', 'Rupsa', 'Phultala', 'Dighalia'],
    note: 'Tidal land: canal water turns saline after February, and drainage in August is the main constraint.',
  },
  {
    id: 'dinajpur',
    name: 'Dinajpur',
    division: 'Rangpur',
    zone: 'NW',
    rainfallMm: 1980,
    monsoonRainfallMm: 1420,
    winterTempC: [7, 25],
    summerTempC: [22, 36],
    soilTypes: ['silty-clay-loam', 'clay-loam'],
    dominantLand: 'medium',
    salinitySeverity: 0,
    upazilas: ['Birganj', 'Chirirbandar', 'Parbatipur', 'Birol', 'Kaharole'],
    note: 'Coldest winter nights in the country: boro flowering dates must clear the January–February cold slot.',
  },
  {
    id: 'barishal',
    name: 'Barishal',
    division: 'Barishal',
    zone: 'SC',
    rainfallMm: 2180,
    monsoonRainfallMm: 1500,
    winterTempC: [11, 28],
    summerTempC: [24, 36],
    soilTypes: ['silt-loam', 'saline-clay'],
    dominantLand: 'low',
    salinitySeverity: 0.45,
    upazilas: ['Bakerganj', 'Banaripara', 'Gaurnadi', 'Wazirpur', 'Babuganj'],
    note: 'Rivers surround it; late-monsoon waterlogging and seasonal salinity both shape the cropping calendar.',
  },
  {
    id: 'rangpur',
    name: 'Rangpur',
    division: 'Rangpur',
    zone: 'NW',
    rainfallMm: 2090,
    monsoonRainfallMm: 1500,
    winterTempC: [7, 25],
    summerTempC: [22, 36],
    soilTypes: ['silty-clay-loam', 'silt-loam'],
    dominantLand: 'medium',
    salinitySeverity: 0,
    upazilas: ['Badarganj', 'Gangachara', 'Pirgachha', 'Mithapukur', 'Taraganj'],
    note: 'Tista floodplain: good water availability, but potato blight pressure is high in foggy January.',
  },
  {
    id: 'pabna',
    name: 'Pabna',
    division: 'Rajshahi',
    zone: 'NW',
    rainfallMm: 1560,
    monsoonRainfallMm: 1120,
    winterTempC: [9, 26],
    summerTempC: [24, 37],
    soilTypes: ['silty-clay-loam', 'clay-loam'],
    dominantLand: 'medium',
    salinitySeverity: 0.05,
    upazilas: ['Ishwardi', 'Bera', 'Sujanagar', 'Bhangura', 'Chatmohar'],
    note: 'Chalan Beel edge — early monsoon flooding is common; choose varieties that can take a 5-day submergence.',
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
    note: 'The workhorse soil of the northern floodplains; holds moisture well and responds to organic matter.',
  },
  {
    id: 'clay-loam',
    label: 'Clay loam',
    typicalPh: [5.8, 6.8],
    drainage: 'poor',
    organicMatterPct: 1.8,
    note: 'Heavy, slow-draining: excellent for paddy, troublesome for potato and vegetables in the monsoon.',
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
    label: 'Calcareous (Barind)',
    typicalPh: [7.2, 8.0],
    drainage: 'good',
    organicMatterPct: 0.6,
    note: 'Free lime keeps pH high: zinc and boron are the usual hidden deficiencies here.',
  },
  {
    id: 'saline-clay',
    label: 'Saline clay',
    typicalPh: [6.6, 7.8],
    drainage: 'poor',
    organicMatterPct: 1.0,
    note: 'Salinity rises through the dry season. Salt-tolerant varieties and gypsum plus leaching are the levers.',
  },
]

export const SOIL_TYPE_BY_ID = new Map(SOIL_TYPES.map((s) => [s.id, s]))

/* ------------------------------------------------------------- irrigation */

export interface IrrigationInfo {
  id: IrrigationType
  label: string
  /** Rough application efficiency, 0–1. */
  efficiency: number
  costPerMmPerAcreBdt: number
  note: string
}

export const IRRIGATION_TYPES: IrrigationInfo[] = [
  { id: 'rainfed', label: 'Rainfed', efficiency: 0.7, costPerMmPerAcreBdt: 0, note: 'No pumping cost, no control — plan around the monsoon break.' },
  { id: 'canal', label: 'Canal / khal', efficiency: 0.55, costPerMmPerAcreBdt: 9, note: 'Low cost per mm but supply is a schedule, not a tap; salinity rises late in the dry season.' },
  { id: 'shallow-tubewell', label: 'Shallow tubewell (STW)', efficiency: 0.65, costPerMmPerAcreBdt: 22, note: 'Fastest to arrange; output drops as the water table falls in March.' },
  { id: 'deep-tubewell', label: 'Deep tubewell (DTW)', efficiency: 0.7, costPerMmPerAcreBdt: 16, note: 'Steady supply across the dry season, but needs shared scheduling with neighbours.' },
  { id: 'tidal', label: 'Tidal canal (gher)', efficiency: 0.5, costPerMmPerAcreBdt: 4, note: 'Free water on the tide, but salinity and timing follow the moon, not the crop.' },
  { id: 'pond', label: 'Pond / beel lift', efficiency: 0.6, costPerMmPerAcreBdt: 14, note: 'Good for vegetables and seedbeds; usually exhausted by March.' },
  { id: 'drip', label: 'Drip', efficiency: 0.9, costPerMmPerAcreBdt: 38, note: 'Highest efficiency and most reliable for row crops; needs clean water and filtration.' },
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
  { id: 'decimal', label: 'decimal', plural: 'decimals', toAcre: 0.01, toHectare: 0.0040468, note: '1 acre = 100 decimals' },
  { id: 'bigha', label: 'bigha', plural: 'bigha', toAcre: 0.330579, toHectare: 0.133781, note: '1 bigha = 33 decimals = 20 katha' },
  { id: 'acre', label: 'acre', plural: 'acres', toAcre: 1, toHectare: 0.404686, note: '1 acre = 3.03 bigha' },
  { id: 'hectare', label: 'hectare', plural: 'hectares', toAcre: 2.47105, toHectare: 1, note: 'Corrected acres: 1 ha = 2.47 acres' },
]

export const AREA_UNIT_BY_ID = new Map(AREA_UNITS.map((u) => [u.id, u]))

export function toAcre(value: number, unit: AreaUnit): number {
  return value * (AREA_UNIT_BY_ID.get(unit)?.toAcre ?? 1)
}

export function toHectare(value: number, unit: AreaUnit): number {
  return value * (AREA_UNIT_BY_ID.get(unit)?.toHectare ?? 0.404686)
}

/** A maund is 37.3242 kg — the unit every farm-gate price in the country is quoted in. */
export const KG_PER_MAUND = 37.3242

export function formatArea(value: number, unit: AreaUnit): string {
  const info = AREA_UNIT_BY_ID.get(unit)
  const n = value % 1 === 0 ? value.toString() : value.toFixed(2).replace(/\.?0+$/, '')
  return `${n} ${info?.plural ?? unit}`
}
