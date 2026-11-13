/**
 * Farmo domain model.
 *
 * Everything here is what a real backend would return; the demo keeps the same
 * shapes so swapping `src/mock/api.ts` for HTTP calls is a mechanical change.
 */

export type Id = string

/* ------------------------------------------------------------------ people */

export type OAuthProvider = 'google' | 'facebook' | 'yahoo'

export interface User {
  id: Id
  name: string
  email: string
  phone: string
  jobTitle: string
  initials: string
  emailVerified: boolean
  phoneVerified: boolean
  providers: OAuthProvider[]
  createdAt: string
}

export type TeamRole = 'agronomist' | 'manager' | 'field-worker' | 'viewer'

export type InviteStatus = 'pending' | 'accepted' | 'rejected' | 'revoked'

export interface Membership {
  id: Id
  farmId: Id
  email: string
  name: string | null
  userId: Id | null
  role: TeamRole
  status: InviteStatus
  invitedById: Id
  invitedAt: string
  respondedAt: string | null
  message: string | null
}

export interface Notification {
  id: Id
  userId: Id
  kind: 'invite' | 'decision' | 'system'
  title: string
  body: string
  at: string
  read: boolean
  /** Present when the notification is actionable (currently: farm invitations). */
  membershipId: Id | null
  farmId: Id | null
}

/* ------------------------------------------------------------------ projects */

export type ClimateZone = 'NW' | 'N' | 'NE' | 'SW' | 'SC' | 'SE'

export type EquipmentId =
  | 'power-tiller'
  | 'tractor'
  | 'two-wheel-tractor'
  | 'knapsack-sprayer'
  | 'pedal-thresher'
  | 'shallow-tubewell'
  | 'deep-tubewell'
  | 'reaper'
  | 'seed-drill'
  | 'water-pump'
  | 'thresher'

export interface Accommodation {
  id: Id
  kind: 'irrigation' | 'storage' | 'labor' | 'machinery' | 'transport' | 'credit'
  label: string
  detail: string
  available: boolean
}

export interface Project {
  id: Id
  name: string
  summary: string
  region: string
  climateZone: ClimateZone
  budgetUsd: number
  equipment: EquipmentId[]
  accommodations: Accommodation[]
  farmIds: Id[]
  ownerId: Id
  createdAt: string
  updatedAt: string
}

/* --------------------------------------------------------------------- farms */

export type AreaUnit = 'acre' | 'hectare' | 'sqm'

export interface Area {
  value: number
  unit: AreaUnit
}

export type SoilType =
  | 'silty-clay-loam'
  | 'clay-loam'
  | 'sandy-loam'
  | 'silt-loam'
  | 'calcareous'
  | 'saline-clay'

export type LandType = 'high' | 'medium' | 'low'

export type IrrigationType =
  | 'rainfed'
  | 'canal'
  | 'shallow-tubewell'
  | 'deep-tubewell'
  | 'tidal'
  | 'pond'
  | 'drip'

export interface Farm {
  id: Id
  projectId: Id
  name: string
  district: string
  locality: string
  area: Area
  soilType: SoilType
  landType: LandType
  irrigationType: IrrigationType
  waterSource: string
  establishedYear: number
  notes: string
  createdAt: string
  updatedAt: string
}

/* -------------------------------------------------------------------- plants */

export type GrowthStageId =
  | 'establishment'
  | 'seedling'
  | 'vegetative'
  | 'tillering'
  | 'stem-elongation'
  | 'heading'
  | 'panicle-initiation'
  | 'flowering'
  | 'podding'
  | 'tuber-bulking'
  | 'grain-filling'
  | 'maturity'

export interface Plant {
  id: Id
  farmId: Id
  speciesId: string
  variety: string
  /** ISO date (yyyy-mm-dd) */
  plantedAt: string
  area: Area
  soilPh: number
  soilMoisture: number
  /** Available soil nutrients from the last soil test, kg/ha. */
  nitrogen: number
  phosphorus: number
  potassium: number
  organicMatter: number
  irrigationType: IrrigationType
  /** What grew on this plot the season before — drives rotation rules. */
  previousCropId: string
  spacingCm: number
  seedRateKgPerAcre: number
  stageOverride: GrowthStageId | null
  notes: string
  createdAt: string
  updatedAt: string
}

/** Editable plant fields, in the order the property editor shows them. */
export const PLANT_FIELDS = [
  'variety',
  'plantedAt',
  'area',
  'soilPh',
  'soilMoisture',
  'nitrogen',
  'phosphorus',
  'potassium',
  'organicMatter',
  'irrigationType',
  'previousCropId',
  'spacingCm',
  'seedRateKgPerAcre',
  'stageOverride',
  'notes',
] as const

export type PlantField = (typeof PLANT_FIELDS)[number]

/* ------------------------------------------------------------------- changes */

export type EntityKind = 'plant' | 'farm' | 'project'

export interface PropertyOperation {
  id: Id
  farmId: Id
  entity: EntityKind
  entityId: Id
  /** Human label of what was touched, e.g. "Winter wheat · soil pH". */
  entityLabel: string
  field: string
  fieldLabel: string
  before: string
  after: string
  at: string
  actorId: Id
  actorName: string
  note: string | null
}

/* ------------------------------------------------------------------- advice */

export type AdviceSectionId =
  | 'commodity'
  | 'fertilizer'
  | 'soil'
  | 'rotation'
  | 'irrigation'
  | 'timing'

export type AdviceBlock =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'why'; label: string; text: string }
  | { kind: 'ops'; caption: string; rows: Array<{ label: string; detail: string; when: string }> }

export interface AdviceSection {
  id: AdviceSectionId
  title: string
  /** One-line gist shown in the section index and collapsed state. */
  gist: string
  blocks: AdviceBlock[]
  /** What in the data produced this section, exposed for the "why" panel. */
  drivers: string[]
}

export interface AnalysisDriver {
  field: string
  label: string
  before: string
  after: string
}

export interface AdviceVersion {
  id: Id
  farmId: Id
  createdAt: string
  createdById: Id
  createdByName: string
  /** 'auto' when a property change triggered it, 'manual' for the regenerate button. */
  origin: 'auto' | 'manual'
  modelVersion: string
  confidence: number
  sections: AdviceSection[]
  drivers: AnalysisDriver[]
  /** Operations that triggered this version (ids), for cross-linking the change log. */
  operationIds: Id[]
}

/* --------------------------------------------------------------------- risk */

export type RiskCategory = 'drought' | 'flood' | 'pest-disease' | 'nutrient' | 'market'

export type Severity = 'low' | 'moderate' | 'high' | 'critical'

export interface RiskItem {
  id: Id
  category: RiskCategory
  categoryLabel: string
  title: string
  severity: Severity
  /** 0–1 model likelihood, displayed as a percentage. */
  likelihood: number
  /** Plain-language impact if nothing is done. */
  impact: string
  window: string
  blocks: AdviceBlock[]
  drivers: string[]
  mitigation: string[]
}

export interface RiskVersion {
  id: Id
  farmId: Id
  createdAt: string
  createdById: Id
  createdByName: string
  origin: 'auto' | 'manual'
  modelVersion: string
  overall: Severity
  items: RiskItem[]
  drivers: AnalysisDriver[]
  operationIds: Id[]
}

/* ------------------------------------------------------------ visualisations */

export interface SeriesPoint {
  x: string
  y: number
}

export interface GrowthSeries {
  plantId: Id
  label: string
  speciesLabel: string
  /** 0–100 % of potential biomass. */
  points: Array<{ day: number; date: string; potential: number; actual: number; stage: string }>
  stageMarkers: Array<{ day: number; label: string }>
  currentStage: string
  harvestWindow: string
}

export interface WaterSeries {
  labels: string[]
  /** Index of the last observed day; everything after it is forecast. */
  todayIndex: number
  /** mm/day crop water use per plant (ETc). */
  perPlant: Array<{ plantId: Id; label: string; values: number[] }>
  /** Cumulative m³ for the whole farm. */
  cumulativeM3: number[]
  periodLabel: string
  totalMm: number
  effectiveRainfallMm: number
  irrigationNeedMm: number
}

export interface FertilizerRow {
  nutrient: 'N' | 'P' | 'K' | 'S' | 'Zn'
  label: string
  cropNeedKgPerAcre: number
  soilSupplyKgPerAcre: number
  gapKgPerAcre: number
  productName: string
  productKgPerAcre: number
  splits: Array<{ when: string; share: string }>
}

export interface SoilMetric {
  key: string
  label: string
  value: number
  unit: string
  optimalLow: number
  optimalHigh: number
  /** 0–100 index used by the radar chart. */
  index: number
  verdict: 'deficient' | 'low' | 'optimal' | 'excess'
}

export interface AnalysisCharts {
  growth: GrowthSeries[]
  water: WaterSeries
  fertilizer: FertilizerRow[]
  soil: SoilMetric[]
  weather: WeatherDay[]
}

export interface FarmConditions {
  fertilityIndex: number
  soilMoisture: number
  averagePh: number
  perPlant: Array<{
    plantId: Id
    label: string
    speciesLabel: string
    stage: string
    stageProgress: number
    daysSincePlanting: number
    daysToHarvest: number | null
    healthIndex: number
  }>
  weather: WeatherDay[]
  rainfall7dMm: number
  rainfallNext7dMm: number
  heatStressDays: number
}

/* ------------------------------------------------------------------ weather */

export interface WeatherDay {
  date: string
  tMax: number
  tMin: number
  rainfallMm: number
  humidity: number
  /** 'observed' for the past, 'forecast' for the future. */
  kind: 'observed' | 'forecast'
}

/* --------------------------------------------------------------- developer */

export interface ApiKey {
  id: Id
  label: string
  prefix: string
  secretPreview: string
  /** The full secret, returned once at creation; kept here so the demo can copy it. */
  secret: string
  scopes: string[]
  createdAt: string
  lastUsedAt: string | null
  status: 'active' | 'revoked'
  requestCount: number
  rateLimitPerHour: number
}

export interface ApiResponse<T> {
  status: number
  ok: boolean
  /** Round-trip time the mock layer actually took, surfaced in the API console. */
  ms: number
  headers: Record<string, string>
  body: T
}

/* ----------------------------------------------------------------- analysis */

export interface FarmAnalysis {
  farmId: Id
  computedAt: string
  conditions: FarmConditions
  advice: AdviceVersion
  risk: RiskVersion
  charts: AnalysisCharts
}

export interface FarmBundle {
  farm: Farm
  project: Project
  plants: Plant[]
  analysis: FarmAnalysis
  operations: PropertyOperation[]
  adviceHistory: AdviceVersion[]
  riskHistory: RiskVersion[]
  memberships: Membership[]
}
