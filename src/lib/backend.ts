/**
 * Remote API layer for the FastAPI/MongoDB backend.
 *
 * Opt-in via VITE_API_URL: when unset the app stays fully mock. When set,
 * auth/projects/farms/plants go to the backend; advice and risk are still
 * computed locally by the deterministic engine (the backend has no
 * generation endpoints).
 */

import { isGuestDemo } from '@/lib/guest'
import { analyzeFarm, severityRank, type AnalyzeOptions } from '@/mock/engine'
import { FIELD_LABELS, formatValue } from '@/mock/changes'
import {
  CLIMATE_ZONES,
  EQUIPMENT_BY_ID,
  IRRIGATION_TYPES,
  SOIL_TYPES,
  getSpecies,
  stageForDay,
  toAcre,
} from '@/mock/catalog'
import type {
  Accommodation,
  AdviceVersion,
  ApiKey,
  ApiResponse,
  ClimateZone,
  EquipmentId,
  Farm,
  FarmAnalysis,
  FarmBundle,
  GrowthStageId,
  Id,
  InviteStatus,
  IrrigationType,
  Membership,
  Notification,
  Plant,
  Project,
  PropertyOperation,
  RiskVersion,
  Severity,
  SoilType,
  TeamRole,
  User,
} from '@/mock/types'

export const backendEnabled = Boolean(import.meta.env.VITE_API_URL) && !isGuestDemo
const BASE = `${String(import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')}/api/v1`
const DEVELOPER_BASE = `${String(import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')}/developer/api/v1`

/** Base URL the developer console/docs display. */
export const backendDeveloperBaseUrl = DEVELOPER_BASE
export const backendDeveloperAuthHeader = 'X-Developer-Token'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

/* ------------------------------------------------------------------ tokens */

const TOKEN_KEY = 'farmo.tokens'
interface TokenPair {
  access: string
  refresh: string
}

function readTokens(): TokenPair | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as TokenPair
    return parsed.access && parsed.refresh ? parsed : null
  } catch {
    return null
  }
}

function writeTokens(tokens: TokenPair): void {
  try {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens))
  } catch {
    /* private mode: session lives in memory only */
  }
}

function clearTokens(): void {
  cachedUser = null
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

let refreshing: Promise<boolean> | null = null

function refreshTokens(): Promise<boolean> {
  refreshing ??= (async () => {
    const tokens = readTokens()
    if (!tokens) return false
    try {
      const response = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: tokens.refresh }),
      })
      if (!response.ok) {
        clearTokens()
        return false
      }
      const payload = await response.json()
      writeTokens({ access: payload.data.access_token, refresh: payload.data.refresh_token })
      return true
    } catch {
      return false
    }
  })().finally(() => {
    refreshing = null
  })
  return refreshing
}

/* ----------------------------------------------------------------- request */

async function request<T>(method: string, path: string, body?: unknown, auth = true): Promise<T> {
  const send = (token: string | null) =>
    fetch(`${BASE}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

  let response: Response
  try {
    response = await send(auth ? readTokens()?.access ?? null : null)
  } catch {
    throw new ApiError(0, 'Could not reach the Farmo backend. Check that it is running.')
  }

  if (response.status === 401 && auth && readTokens()?.refresh) {
    if (await refreshTokens()) {
      try {
        response = await send(readTokens()?.access ?? null)
      } catch {
        throw new ApiError(0, 'Could not reach the Farmo backend. Check that it is running.')
      }
    }
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401 && auth) clearTokens()
    const message = payload?.error ?? payload?.detail ?? `Request failed (${response.status}).`
    throw new ApiError(response.status, typeof message === 'string' ? message : JSON.stringify(message))
  }
  return (payload?.data ?? payload) as T
}

/* ------------------------------------------------------------- raw shapes */

interface RawUser {
  id: string
  name?: string
  username?: string
  email: string
  phone?: string
  jobTitle?: string
  job_title?: string
  email_verified?: boolean
  phone_verified?: boolean
  created_at?: string
}

interface RawProject {
  id: string
  name: string
  summary?: string | null
  region?: string
  climate_zone?: string
  climateZone?: string
  budget_usd?: number
  budgetUsd?: number
  equipment?: string[]
  accommodations?: Accommodation[]
  farm_ids?: string[]
  owner_id: string
  created_at: string
  updated_at: string
}

interface RawFarm {
  id: string
  project_id: string
  name: string
  properties?: Record<string, any>
  latitude?: number | null
  longitude?: number | null
  farmer_priority?: string | null
  water_availability?: string | null
  equipment_limitation?: string | null
  market_preference?: string | null
  human_judgment_acknowledged?: boolean
  created_at: string
  updated_at: string
}

interface RawPlant {
  id: string
  farm_id: string
  name: string
  properties?: Record<string, any>
  created_at: string
  updated_at: string
}

interface RawMembership {
  id: string
  farmId: string
  email: string
  name: string | null
  userId: string | null
  role: TeamRole
  status: InviteStatus
  invitedById: string
  invitedAt: string
  respondedAt: string | null
  message: string | null
}

interface RawApiKey {
  id: string
  label: string
  prefix: string
  secret?: string
  secretPreview?: string
  scopes: string[]
  createdAt: string
  lastUsedAt: string | null
  status: 'active' | 'revoked'
  requestCount: number
  rateLimitPerHour: number
}

/* ---------------------------------------------------------------- mappers */

function mapUser(raw: RawUser): User {
  const name = raw.name || raw.username || 'Farmo user'
  return {
    id: raw.id,
    name,
    email: raw.email,
    phone: raw.phone ?? '',
    jobTitle: raw.jobTitle ?? raw.job_title ?? 'Farm owner',
    initials: name
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
    emailVerified: raw.email_verified ?? false,
    phoneVerified: raw.phone_verified ?? false,
    createdAt: raw.created_at ?? new Date().toISOString(),
  }
}

function mapProject(raw: RawProject): Project {
  const zone = raw.climate_zone ?? raw.climateZone ?? 'NW'
  return {
    id: raw.id,
    name: raw.name,
    summary: raw.summary ?? '',
    region: raw.region ?? '',
    climateZone: (zone in CLIMATE_ZONES ? zone : 'NW') as ClimateZone,
    budgetUsd: raw.budget_usd ?? raw.budgetUsd ?? 0,
    equipment: (raw.equipment ?? []).filter((id) => EQUIPMENT_BY_ID.has(id as EquipmentId)) as EquipmentId[],
    accommodations: raw.accommodations ?? [],
    farmIds: raw.farm_ids ?? [],
    ownerId: raw.owner_id,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

function soilId(value: unknown): SoilType {
  const text = String(value ?? '')
  if (SOIL_TYPES.some((s) => s.id === text)) return text as SoilType
  return SOIL_TYPES.find((s) => s.label.toLowerCase() === text.toLowerCase())?.id ?? 'silty-clay-loam'
}

function irrigationId(value: unknown, fallback: IrrigationType = 'rainfed'): IrrigationType {
  const text = String(value ?? '')
  if (IRRIGATION_TYPES.some((i) => i.id === text)) return text as IrrigationType
  return IRRIGATION_TYPES.find((i) => i.label.toLowerCase() === text.toLowerCase())?.id ?? fallback
}

function areaUnit(value: unknown): Farm['area']['unit'] {
  const text = String(value ?? 'acre')
  if (text === 'hectares' || text === 'hectare') return 'hectare'
  if (text === 'square_meters' || text === 'sqm') return 'sqm'
  return 'acre'
}

function mapFarm(raw: RawFarm): Farm {
  const p = raw.properties ?? {}
  return {
    id: raw.id,
    projectId: raw.project_id,
    name: raw.name,
    district: p.district ?? '',
    locality: p.locality ?? '',
    area: { value: Number(p.area ?? 0), unit: areaUnit(p.area_unit) },
    soilType: soilId(p.soil_type),
    landType: (['high', 'medium', 'low'].includes(p.land_type) ? p.land_type : 'medium') as Farm['landType'],
    irrigationType: irrigationId(p.irrigation),
    waterSource: p.water_source ?? '',
    establishedYear: Number(p.cultivation_start_year ?? new Date().getFullYear()),
    notes: p.notes ?? '',
    latitude: raw.latitude ?? p.latitude ?? null,
    longitude: raw.longitude ?? p.longitude ?? null,
    farmerPriority: raw.farmer_priority ?? p.farmer_priority ?? '',
    waterAvailability: raw.water_availability ?? p.water_availability ?? '',
    equipmentLimitation: raw.equipment_limitation ?? p.equipment_limitation ?? '',
    marketPreference: raw.market_preference ?? p.market_preference ?? '',
    humanJudgmentAcknowledged: raw.human_judgment_acknowledged ?? true,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

function farmToProperties(farm: Partial<Farm>): Record<string, unknown> {
  const p: Record<string, unknown> = {}
  if (farm.area !== undefined) {
    p.area = farm.area.value
    p.area_unit = farm.area.unit
  }
  if (farm.soilType !== undefined) p.soil_type = farm.soilType
  if (farm.landType !== undefined) p.land_type = farm.landType
  if (farm.irrigationType !== undefined) p.irrigation = farm.irrigationType
  if (farm.district !== undefined) p.district = farm.district
  if (farm.locality !== undefined) p.locality = farm.locality
  if (farm.waterSource !== undefined) p.water_source = farm.waterSource
  if (farm.establishedYear !== undefined) p.cultivation_start_year = farm.establishedYear
  if (farm.notes !== undefined) p.notes = farm.notes
  // The backend schema rejects null coordinates, so clearing keeps the stored pair.
  if (farm.latitude != null) p.latitude = farm.latitude
  if (farm.longitude != null) p.longitude = farm.longitude
  if (farm.farmerPriority !== undefined) p.farmer_priority = farm.farmerPriority
  if (farm.waterAvailability !== undefined) p.water_availability = farm.waterAvailability
  if (farm.equipmentLimitation !== undefined) p.equipment_limitation = farm.equipmentLimitation
  if (farm.marketPreference !== undefined) p.market_preference = farm.marketPreference
  if (farm.humanJudgmentAcknowledged !== undefined) p.human_judgment_acknowledged = farm.humanJudgmentAcknowledged
  return p
}

/** Frontend stage ids → the backend's coarser Title Case enum. */
const STAGE_TO_BACKEND: Record<GrowthStageId, string> = {
  establishment: 'Seed',
  seedling: 'Seedling',
  vegetative: 'Vegetative',
  tillering: 'Tillering',
  'stem-elongation': 'Vegetative',
  heading: 'Flowering',
  'panicle-initiation': 'Flowering',
  flowering: 'Flowering',
  podding: 'Fruiting',
  'tuber-bulking': 'Fruiting',
  'grain-filling': 'Fruiting',
  maturity: 'Mature',
}

const STAGE_FROM_BACKEND: Record<string, GrowthStageId | null> = {
  Automatic: null,
  Seed: 'establishment',
  Germination: 'establishment',
  Seedling: 'seedling',
  Vegetative: 'vegetative',
  Tillering: 'tillering',
  Flowering: 'flowering',
  Fruiting: 'grain-filling',
  Mature: 'maturity',
}

function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000))
}

function mapPlant(raw: RawPlant, farm: Farm): Plant {
  const p = raw.properties ?? {}
  return {
    id: raw.id,
    farmId: raw.farm_id,
    speciesId: p.species ?? 'winter-wheat',
    variety: p.variety ?? raw.name,
    plantedAt: p.planting_date ?? new Date().toISOString().slice(0, 10),
    area: { value: Number(p.area ?? 1), unit: areaUnit(p.area_unit) },
    soilPh: Number(p.soil_ph ?? 6.4),
    soilMoisture: Number(p.soil_moisture_percent ?? 55),
    nitrogen: Number(p.available_nitrogen_kg_per_ha ?? 34),
    phosphorus: Number(p.available_phosphorus_kg_per_ha ?? 14),
    potassium: Number(p.exchangeable_potassium_kg_per_ha ?? 50),
    organicMatter: Number(p.organic_matter ?? 1.4),
    irrigationType: irrigationId(p.irrigation_source, farm.irrigationType),
    previousCropId: p.previous_crop ?? 'fallow',
    spacingCm: Number(p.spacing_cm ?? 25),
    seedRateKgPerAcre: Number(p.seed_rate_kg_per_acre ?? 8),
    stageOverride: STAGE_FROM_BACKEND[p.growth_stage_override ?? 'Automatic'] ?? null,
    notes: p.field_note ?? '',
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

function plantToProperties(plant: Partial<Plant>, current?: Plant): Record<string, unknown> {
  const p: Record<string, unknown> = {}
  if (plant.speciesId !== undefined) p.species = plant.speciesId
  if (plant.variety !== undefined) p.variety = plant.variety
  if (plant.plantedAt !== undefined) p.planting_date = plant.plantedAt
  if (plant.area !== undefined) {
    p.area = plant.area.value
    p.area_unit = plant.area.unit
  }
  if (plant.previousCropId !== undefined) p.previous_crop = plant.previousCropId
  if (plant.spacingCm !== undefined) p.spacing_cm = plant.spacingCm
  if (plant.seedRateKgPerAcre !== undefined) p.seed_rate_kg_per_acre = plant.seedRateKgPerAcre
  if (plant.notes !== undefined) p.field_note = plant.notes
  if (plant.soilPh !== undefined) p.soil_ph = plant.soilPh
  if (plant.soilMoisture !== undefined) p.soil_moisture_percent = plant.soilMoisture
  if (plant.organicMatter !== undefined) p.organic_matter = plant.organicMatter
  if (plant.nitrogen !== undefined) p.available_nitrogen_kg_per_ha = plant.nitrogen
  if (plant.phosphorus !== undefined) p.available_phosphorus_kg_per_ha = plant.phosphorus
  if (plant.potassium !== undefined) p.exchangeable_potassium_kg_per_ha = plant.potassium
  if (plant.irrigationType !== undefined) p.irrigation_source = plant.irrigationType
  if (plant.stageOverride !== undefined) {
    p.growth_stage_override = plant.stageOverride ? STAGE_TO_BACKEND[plant.stageOverride] : 'Automatic'
  }
  const speciesId = plant.speciesId ?? current?.speciesId
  const plantedAt = plant.plantedAt ?? current?.plantedAt
  const stageTouched = plant.stageOverride !== undefined || plant.plantedAt !== undefined || plant.speciesId !== undefined
  if (speciesId && plantedAt && (!current || stageTouched)) {
    const override = plant.stageOverride !== undefined ? plant.stageOverride : current?.stageOverride
    p.growth_stage = override
      ? STAGE_TO_BACKEND[override]
      : STAGE_TO_BACKEND[stageForDay(getSpecies(speciesId), daysSince(plantedAt)).id]
  }
  if (!current) p.quantity = 1
  return p
}

function mapMembership(raw: RawMembership): Membership {
  return {
    id: raw.id,
    farmId: raw.farmId,
    email: raw.email,
    name: raw.name,
    userId: raw.userId,
    role: raw.role,
    status: raw.status,
    invitedById: raw.invitedById,
    invitedAt: raw.invitedAt,
    respondedAt: raw.respondedAt,
    message: raw.message,
  }
}

function mapApiKey(raw: RawApiKey): ApiKey {
  return {
    id: raw.id,
    label: raw.label,
    prefix: raw.prefix,
    secretPreview: raw.secretPreview ?? `${raw.prefix}••••••••`,
    secret: raw.secret ?? '',
    scopes: raw.scopes,
    createdAt: raw.createdAt,
    lastUsedAt: raw.lastUsedAt,
    status: raw.status,
    requestCount: raw.requestCount,
    rateLimitPerHour: raw.rateLimitPerHour,
  }
}

/* ------------------------------------------------------- farm/plant index */

const INDEX_KEY = 'farmo.backend.index'
interface BackendIndex {
  farms: Record<Id, Id>
  plants: Record<Id, { projectId: Id; farmId: Id }>
}

function readIndex(): BackendIndex {
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    if (!raw) return { farms: {}, plants: {} }
    const parsed = JSON.parse(raw) as BackendIndex
    return { farms: parsed.farms ?? {}, plants: parsed.plants ?? {} }
  } catch {
    return { farms: {}, plants: {} }
  }
}

function writeIndex(index: BackendIndex): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index))
  } catch {
    /* ignore */
  }
}

function rememberFarm(projectId: Id, farmId: Id): void {
  const index = readIndex()
  index.farms[farmId] = projectId
  writeIndex(index)
}

function rememberPlant(projectId: Id, farmId: Id, plantId: Id): void {
  const index = readIndex()
  index.plants[plantId] = { projectId, farmId }
  writeIndex(index)
}

let rebuilding: Promise<void> | null = null

/** There is no farm-by-id endpoint: rebuild the index from the project list. */
function rebuildIndex(): Promise<void> {
  rebuilding ??= (async () => {
    const index: BackendIndex = { farms: {}, plants: {} }
    const projects = await request<RawProject[]>('GET', '/projects/')
    await Promise.all(
      projects.map(async (project) => {
        const farms = await request<RawFarm[]>('GET', `/projects/${project.id}/farms/`)
        await Promise.all(
          farms.map(async (farm) => {
            index.farms[farm.id] = project.id
            const plants = await request<RawPlant[]>('GET', `/projects/${project.id}/farms/${farm.id}/plants/`)
            for (const plant of plants) index.plants[plant.id] = { projectId: project.id, farmId: farm.id }
          }),
        )
      }),
    )
    writeIndex(index)
  })().finally(() => {
    rebuilding = null
  })
  return rebuilding
}

async function resolveFarm(farmId: Id): Promise<Id> {
  const hit = readIndex().farms[farmId]
  if (hit) return hit
  await rebuildIndex()
  const again = readIndex().farms[farmId]
  if (!again) throw new ApiError(404, `Farm ${farmId} not found.`)
  return again
}

async function resolvePlant(plantId: Id): Promise<{ projectId: Id; farmId: Id }> {
  const hit = readIndex().plants[plantId]
  if (hit) return hit
  await rebuildIndex()
  const again = readIndex().plants[plantId]
  if (!again) throw new ApiError(404, `Plant ${plantId} not found.`)
  return again
}

/* ------------------------------------------------- bundle and change log */

let cachedUser: User | null = null

function actor(): { id: Id; name: string } {
  return cachedUser ? { id: cachedUser.id, name: cachedUser.name } : { id: 'remote', name: 'You' }
}

function opId(): Id {
  return `op-${Math.random().toString(36).slice(2, 10)}`
}

function diffOps(
  entity: PropertyOperation['entity'],
  entityId: Id,
  entityLabel: string,
  farmId: Id,
  before: Record<string, unknown>,
  patch: Record<string, unknown>,
): PropertyOperation[] {
  const ops: PropertyOperation[] = []
  for (const [field, value] of Object.entries(patch)) {
    const prev = before[field]
    if (JSON.stringify(prev) === JSON.stringify(value)) continue
    ops.push({
      id: opId(),
      farmId,
      entity,
      entityId,
      entityLabel,
      field,
      fieldLabel: FIELD_LABELS[field] ?? field,
      before: formatValue(field, prev),
      after: formatValue(field, value),
      at: new Date().toISOString(),
      actorId: actor().id,
      actorName: actor().name,
      note: null,
    })
  }
  return ops
}

function analyzeOptions(ops: PropertyOperation[], origin: 'auto' | 'manual' = 'auto'): AnalyzeOptions {
  return {
    origin,
    actor: actor(),
    operations: ops.map((op) => ({ field: op.field, fieldLabel: op.fieldLabel, before: op.before, after: op.after })),
    literalOperations: ops.map((op) => op.id),
  }
}

async function fetchBundle(farmId: Id, options: AnalyzeOptions = {}, operations: PropertyOperation[] = []): Promise<FarmBundle> {
  const projectId = await resolveFarm(farmId)
  const [projectRaw, farmRaw, plantsRaw] = await Promise.all([
    request<RawProject>('GET', `/projects/${projectId}`),
    request<RawFarm>('GET', `/projects/${projectId}/farms/${farmId}`),
    request<RawPlant[]>('GET', `/projects/${projectId}/farms/${farmId}/plants/`),
  ])
  const project = mapProject(projectRaw)
  const farm = mapFarm(farmRaw)
  const plants = plantsRaw.map((raw) => mapPlant(raw, farm))
  for (const plant of plants) rememberPlant(projectId, farmId, plant.id)
  const analysis = analyzeFarm(project, farm, plants, options)
  return {
    farm,
    project,
    plants,
    analysis,
    operations,
    adviceHistory: [analysis.advice],
    riskHistory: [analysis.risk],
    // shortcut: live farm memberships remain unavailable until the backend implements team roles.
    memberships: [],
  }
}

/* -------------------------------------------------------------- row types */

interface ProjectRow {
  project: Project
  farmCount: number
  plantCount: number
  areaAcre: number
  criticalRisks: number
  topRisk: string | null
  adviceUpdatedAt: string | null
  farms: Array<{ id: Id; name: string; district: string; plantCount: number; worstSeverity: Severity | null; headline: string | null }>
}

/* ------------------------------------------------------------- remote api */

export const backendApi = {
  /* auth */
  async login(email: string, password: string): Promise<User> {
    const data = await request<{ access_token: string; refresh_token: string; user: RawUser }>(
      'POST',
      '/auth/login',
      { email: email.trim().toLowerCase(), password },
      false,
    )
    writeTokens({ access: data.access_token, refresh: data.refresh_token })
    cachedUser = mapUser(data.user)
    return cachedUser
  },

  async signup(input: { name: string; email: string; phone: string; password: string }): Promise<{ user: User; code: string }> {
    const data = await request<{ access_token: string; refresh_token: string; user: RawUser; dev_code?: string | null }>(
      'POST',
      '/auth/register',
      { name: input.name.trim(), email: input.email.trim().toLowerCase(), phone: input.phone.trim(), password: input.password },
      false,
    )
    writeTokens({ access: data.access_token, refresh: data.refresh_token })
    cachedUser = mapUser(data.user)
    return { user: cachedUser, code: data.dev_code ?? '' }
  },

  async requestOtp(email: string, purpose: 'verify-email' | 'verify-phone' | 'reset' = 'verify-email'): Promise<string> {
    const result = await request<{ dev_code?: string | null }>('POST', '/auth/otp/request',
      { email: email.trim().toLowerCase(), purpose }, purpose !== 'reset')
    return result.dev_code ?? ''
  },

  async verifyOtp(email: string, code: string, purpose: 'verify-email' | 'verify-phone' | 'reset' = 'verify-email'): Promise<User> {
    const result = await request<{ user: RawUser }>('POST', '/auth/otp/verify',
      { email: email.trim().toLowerCase(), code, purpose })
    cachedUser = mapUser(result.user)
    return cachedUser
  },

  async completePasswordReset(email: string, code: string, password: string): Promise<void> {
    await request('POST', '/auth/password/reset', { email: email.trim().toLowerCase(), code, password }, false)
    clearTokens()
  },

  async deleteAccount(userId: Id): Promise<void> {
    const me = await backendApi.currentUser()
    if (!me || me.id !== userId) throw new ApiError(403, 'You can only delete your own account.')
    await request('DELETE', '/auth/me')
    clearTokens()
    writeIndex({ farms: {}, plants: {} })
  },

  async currentUser(): Promise<User | null> {
    if (!readTokens()) return null
    try {
      cachedUser = mapUser(await request<RawUser>('GET', '/auth/me'))
      return cachedUser
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null
      throw error
    }
  },

  async signOut(): Promise<void> {
    const tokens = readTokens()
    if (tokens) {
      try {
        await request('POST', '/auth/logout', { refresh_token: tokens.refresh }, false)
      } catch {
        /* revocation is best-effort; the local session ends regardless */
      }
    }
    clearTokens()
  },

  async switchUser(userId: Id): Promise<User> {
    const me = await backendApi.currentUser()
    if (me && me.id === userId) return me
    throw new ApiError(404, 'Unknown user.')
  },

  async listUsers(): Promise<User[]> {
    const me = await backendApi.currentUser()
    return me ? [me] : []
  },

  async updateProfile(patch: Partial<Pick<User, 'name' | 'phone' | 'jobTitle'>>): Promise<User> {
    cachedUser = mapUser(await request<RawUser>('PATCH', '/auth/me', patch))
    return cachedUser
  },

  /* projects */
  async listProjects(): Promise<ProjectRow[]> {
    const raw = await request<RawProject[]>('GET', '/projects/')
    return Promise.all(
      raw.map(async (row) => {
        const project = mapProject(row)
        const farmsRaw = await request<RawFarm[]>('GET', `/projects/${project.id}/farms/`)
        const farms = farmsRaw.map(mapFarm)
        for (const farm of farms) rememberFarm(project.id, farm.id)
        const plantsByFarm = await Promise.all(
          farms.map(async (farm) => {
            const plantsRaw = await request<RawPlant[]>('GET', `/projects/${project.id}/farms/${farm.id}/plants/`)
            const plants = plantsRaw.map((p) => mapPlant(p, farm))
            for (const plant of plants) rememberPlant(project.id, farm.id, plant.id)
            return plants
          }),
        )

        let criticalRisks = 0
        let topRisk: string | null = null
        let areaAcre = 0
        let adviceUpdatedAt: string | null = null
        const farmRows = farms.map((farm, index) => {
          const plants = plantsByFarm[index]
          const items = analyzeFarm(project, farm, plants).risk.items
          const major = items.filter((i) => severityRank(i.severity) >= severityRank('moderate'))
          criticalRisks += items.filter((i) => i.severity === 'high' || i.severity === 'critical').length
          const headline = items[0]
          if (headline && severityRank(headline.severity) >= severityRank('moderate')) topRisk = headline.title
          else if (!topRisk && items.length) topRisk = items[0].title
          areaAcre += toAcre(farm.area.value, farm.area.unit)
          const computedAt = new Date().toISOString()
          if (!adviceUpdatedAt || computedAt > adviceUpdatedAt) adviceUpdatedAt = computedAt
          return {
            id: farm.id,
            name: farm.name,
            district: farm.district,
            plantCount: plants.length,
            worstSeverity: major.length ? major[0].severity : (items[0]?.severity ?? null),
            headline: major[0]?.title ?? items[0]?.title ?? null,
          }
        })

        return {
          project,
          farmCount: farms.length,
          plantCount: plantsByFarm.reduce((sum, plants) => sum + plants.length, 0),
          areaAcre: Math.round(areaAcre * 100) / 100,
          criticalRisks,
          topRisk,
          adviceUpdatedAt,
          farms: farmRows,
        }
      }),
    )
  },

  async getProject(projectId: Id): Promise<Project | null> {
    try {
      return mapProject(await request<RawProject>('GET', `/projects/${projectId}`))
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null
      throw error
    }
  },

  async createProject(input: { name: string; summary: string; region: string; climateZone: ClimateZone; budgetUsd: number }): Promise<Project> {
    const raw = await request<RawProject>('POST', '/projects/', {
      name: input.name.trim(),
      summary: input.summary.trim(),
      region: input.region,
      climate_zone: input.climateZone,
      budget_usd: input.budgetUsd,
      equipment: ['knapsack-sprayer', 'power-tiller'],
      accommodations: [],
    })
    return mapProject(raw)
  },

  async updateProject(projectId: Id, patch: Partial<Project>): Promise<Project> {
    const body: Record<string, unknown> = {}
    if (patch.name !== undefined) body.name = patch.name
    if (patch.summary !== undefined) body.summary = patch.summary
    if (patch.region !== undefined) body.region = patch.region
    if (patch.climateZone !== undefined) body.climate_zone = patch.climateZone
    if (patch.budgetUsd !== undefined) body.budget_usd = patch.budgetUsd
    if (patch.equipment !== undefined) body.equipment = patch.equipment
    if (patch.accommodations !== undefined) body.accommodations = patch.accommodations
    // The backend requires a name even for partial updates.
    if (body.name === undefined) body.name = (await request<RawProject>('GET', `/projects/${projectId}`)).name
    return mapProject(await request<RawProject>('PATCH', `/projects/${projectId}`, body))
  },

  async deleteProject(projectId: Id): Promise<void> {
    // The backend does not cascade: remove farms (which cascade plants) first.
    const farms = await request<RawFarm[]>('GET', `/projects/${projectId}/farms/`)
    for (const farm of farms) {
      await request('DELETE', `/projects/${projectId}/farms/${farm.id}`)
    }
    await request('DELETE', `/projects/${projectId}`)
    const index = readIndex()
    for (const [farmId, owner] of Object.entries(index.farms)) {
      if (owner === projectId) delete index.farms[farmId]
    }
    for (const [plantId, loc] of Object.entries(index.plants)) {
      if (loc.projectId === projectId) delete index.plants[plantId]
    }
    writeIndex(index)
  },

  /* farms */
  async listFarms(projectId: Id): Promise<Array<{ farm: Farm; plantCount: number; worstRisk: RiskVersion | undefined; conditions: FarmAnalysis['conditions'] }>> {
    const [projectRaw, farmsRaw] = await Promise.all([
      request<RawProject>('GET', `/projects/${projectId}`),
      request<RawFarm[]>('GET', `/projects/${projectId}/farms/`),
    ])
    const project = mapProject(projectRaw)
    return Promise.all(
      farmsRaw.map(async (raw) => {
        const farm = mapFarm(raw)
        rememberFarm(projectId, farm.id)
        const plantsRaw = await request<RawPlant[]>('GET', `/projects/${projectId}/farms/${farm.id}/plants/`)
        const plants = plantsRaw.map((p) => mapPlant(p, farm))
        for (const plant of plants) rememberPlant(projectId, farm.id, plant.id)
        const analysis = analyzeFarm(project, farm, plants)
        return { farm, plantCount: plants.length, worstRisk: analysis.risk, conditions: analysis.conditions }
      }),
    )
  },

  async getFarmBundle(farmId: Id): Promise<FarmBundle> {
    return fetchBundle(farmId)
  },

  async createFarm(input: Omit<Farm, 'id' | 'createdAt' | 'updatedAt'>): Promise<Farm> {
    const raw = await request<RawFarm>('POST', `/projects/${input.projectId}/farms/`, {
      name: input.name,
      properties: farmToProperties(input),
    })
    rememberFarm(input.projectId, raw.id)
    return mapFarm(raw)
  },

  async updateFarm(farmId: Id, patch: Partial<Farm>, _actor?: User): Promise<FarmBundle> {
    const projectId = await resolveFarm(farmId)
    const before = mapFarm(await request<RawFarm>('GET', `/projects/${projectId}/farms/${farmId}`))
    const body: { name?: string; properties?: Record<string, unknown> } = {}
    if (patch.name !== undefined) body.name = patch.name
    const properties = farmToProperties(patch)
    if (Object.keys(properties).length) body.properties = properties
    if (body.name === undefined && !body.properties) throw new ApiError(400, 'No changes provided.')
    await request('PATCH', `/projects/${projectId}/farms/${farmId}`, body)
    const ops = diffOps('farm', farmId, patch.name ?? before.name, farmId, before as unknown as Record<string, unknown>, patch as Record<string, unknown>)
    return fetchBundle(farmId, analyzeOptions(ops), ops)
  },

  async deleteFarm(farmId: Id): Promise<void> {
    const projectId = await resolveFarm(farmId)
    await request('DELETE', `/projects/${projectId}/farms/${farmId}`)
    const index = readIndex()
    delete index.farms[farmId]
    for (const [plantId, loc] of Object.entries(index.plants)) {
      if (loc.farmId === farmId) delete index.plants[plantId]
    }
    writeIndex(index)
  },

  /* plants */
  async addPlant(farmId: Id, input: Omit<Plant, 'id' | 'farmId' | 'createdAt' | 'updatedAt'>): Promise<FarmBundle> {
    const projectId = await resolveFarm(farmId)
    const farm = mapFarm(await request<RawFarm>('GET', `/projects/${projectId}/farms/${farmId}`))
    const name = input.variety.trim().length >= 2 ? input.variety.trim() : getSpecies(input.speciesId).name
    const raw = await request<RawPlant>('POST', `/projects/${projectId}/farms/${farmId}/plants/`, {
      name,
      properties: plantToProperties(input),
    })
    rememberPlant(projectId, farmId, raw.id)
    const plant = mapPlant(raw, farm)
    const op: PropertyOperation = {
      id: opId(),
      farmId,
      entity: 'plant',
      entityId: plant.id,
      entityLabel: plant.variety,
      field: 'created',
      fieldLabel: 'Plant added',
      before: '—',
      after: `${plant.variety}, ${plant.area.value} ${plant.area.unit}`,
      at: new Date().toISOString(),
      actorId: actor().id,
      actorName: actor().name,
      note: plant.notes || null,
    }
    return fetchBundle(farmId, analyzeOptions([op]), [op])
  },

  async updatePlant(plantId: Id, patch: Partial<Plant>): Promise<{ bundle: FarmBundle; operations: PropertyOperation[] }> {
    const { projectId, farmId } = await resolvePlant(plantId)
    const [farmRaw, plantRaw] = await Promise.all([
      request<RawFarm>('GET', `/projects/${projectId}/farms/${farmId}`),
      request<RawPlant>('GET', `/projects/${projectId}/farms/${farmId}/plants/${plantId}`),
    ])
    const farm = mapFarm(farmRaw)
    const before = mapPlant(plantRaw, farm)
    const properties = plantToProperties(patch, before)
    if (!Object.keys(properties).length) throw new ApiError(400, 'No changes provided.')
    await request('PATCH', `/projects/${projectId}/farms/${farmId}/plants/${plantId}`, { properties })
    const ops = diffOps('plant', plantId, before.variety, farmId, before as unknown as Record<string, unknown>, patch as Record<string, unknown>)
    const bundle = await fetchBundle(farmId, analyzeOptions(ops), ops)
    return { bundle, operations: ops }
  },

  async deletePlant(plantId: Id): Promise<FarmBundle> {
    const { projectId, farmId } = await resolvePlant(plantId)
    const farm = mapFarm(await request<RawFarm>('GET', `/projects/${projectId}/farms/${farmId}`))
    const plant = mapPlant(await request<RawPlant>('GET', `/projects/${projectId}/farms/${farmId}/plants/${plantId}`), farm)
    await request('DELETE', `/projects/${projectId}/farms/${farmId}/plants/${plantId}`)
    const index = readIndex()
    delete index.plants[plantId]
    writeIndex(index)
    const op: PropertyOperation = {
      id: opId(),
      farmId,
      entity: 'plant',
      entityId: plant.id,
      entityLabel: plant.variety,
      field: 'deleted',
      fieldLabel: 'Plant removed',
      before: `${plant.variety}, ${plant.area.value} ${plant.area.unit}`,
      after: '—',
      at: new Date().toISOString(),
      actorId: actor().id,
      actorName: actor().name,
      note: null,
    }
    return fetchBundle(farmId, analyzeOptions([op]), [op])
  },

  /* teams */
  async inviteMember(farmId: Id, input: { email: string; role: TeamRole; message: string }): Promise<Membership> {
    return mapMembership(
      await request<RawMembership>('POST', `/farms/${farmId}/members`, {
        email: input.email.trim().toLowerCase(),
        role: input.role,
        message: input.message.trim(),
      }),
    )
  },

  async respondToInvite(membershipId: Id, decision: 'accepted' | 'rejected'): Promise<Membership> {
    return mapMembership(await request<RawMembership>('POST', `/members/${membershipId}/respond`, { decision }))
  },

  async revokeMember(membershipId: Id): Promise<Membership> {
    return mapMembership(await request<RawMembership>('DELETE', `/members/${membershipId}`))
  },

  async changeMemberRole(membershipId: Id, role: TeamRole): Promise<Membership> {
    return mapMembership(await request<RawMembership>('POST', `/members/${membershipId}/role`, { role }))
  },

  /* notifications */
  async listNotifications(): Promise<Notification[]> {
    // shortcut: live notifications remain unavailable until the backend implements notification routes.
    return []
  },

  async markNotificationsRead(): Promise<void> {},

  /* developer api keys */
  async listApiKeys(): Promise<ApiKey[]> {
    return (await request<RawApiKey[]>('GET', '/api_tokens')).map(mapApiKey)
  },

  async createApiKey(label: string, scopes: string[]): Promise<ApiKey> {
    return mapApiKey(
      await request<RawApiKey>('POST', '/api_tokens', { label: label.trim(), scopes }),
    )
  },

  async revokeApiKey(keyId: Id): Promise<ApiKey> {
    return mapApiKey(await request<RawApiKey>('DELETE', `/api_tokens/${keyId}`))
  },

  /* advice and risk: computed locally, single current version */
  async regenerateAdvice(farmId: Id): Promise<FarmBundle> {
    return fetchBundle(farmId, { origin: 'manual', actor: actor() })
  },

  async getAdviceHistory(farmId: Id): Promise<AdviceVersion[]> {
    return (await fetchBundle(farmId)).adviceHistory
  },

  async getRiskHistory(farmId: Id): Promise<RiskVersion[]> {
    return (await fetchBundle(farmId)).riskHistory
  },
}

/* ------------------------------------------------- developer API console */

export interface DeveloperRequestLogEntry {
  id: string
  keyId: string | null
  method: string
  path: string
  status: number
  ms: number
  at: string
}

const developerRequestLog: DeveloperRequestLogEntry[] = []

export function backendApiRequestLog(): DeveloperRequestLogEntry[] {
  return [...developerRequestLog].slice(-40).reverse()
}

/**
 * Sends a request to the live developer API exactly as an external client
 * would. Paths are relative to `${API}/developer/api/v1`.
 */
export async function backendApiRequest(
  method: string,
  path: string,
  options: { body?: unknown; apiKey?: string } = {},
): Promise<ApiResponse<unknown>> {
  const started = performance.now()
  const methodUpper = method.toUpperCase()

  const respond = (status: number, body: unknown, headers: Record<string, string>): ApiResponse<unknown> => {
    const ms = Math.max(1, Math.round(performance.now() - started))
    developerRequestLog.push({
      id: `log_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      keyId: null,
      method: methodUpper,
      path,
      status,
      ms,
      at: new Date().toISOString(),
    })
    if (developerRequestLog.length > 200) developerRequestLog.shift()
    return { status, ok: status < 400, ms, headers, body }
  }

  if (!options.apiKey) {
    return respond(401, {
      error: 'invalid_api_key',
      message: 'Create an API key above, then send the request. The secret is shown only once.',
    }, {})
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    [backendDeveloperAuthHeader]: options.apiKey,
  }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  const suffix = path.startsWith('/') ? path : `/${path}`
  try {
    const response = await fetch(`${DEVELOPER_BASE}${suffix}`, {
      method: methodUpper,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
    const text = await response.text()
    let body: unknown = null
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      body = text
    }
    const responseHeaders: Record<string, string> = {
      'Content-Type': response.headers.get('content-type') ?? 'application/json; charset=utf-8',
    }
    for (const name of ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']) {
      const value = response.headers.get(name)
      if (value) responseHeaders[name] = value
    }
    return respond(response.status, body, responseHeaders)
  } catch {
    return respond(0, {
      error: 'network_error',
      message: 'Could not reach the Farmo backend. Check that the API is running.',
    }, {})
  }
}