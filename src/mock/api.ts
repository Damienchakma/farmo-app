import type {
  AdviceVersion,
  ApiKey,
  ApiResponse,
  Farm,
  FarmAnalysis,
  FarmBundle,
  Id,
  Membership,
  Notification,
  Plant,
  Project,
  PropertyOperation,
  RiskVersion,
  TeamRole,
  User,
} from './types'
import { buildSeedState, DEMO_PASSWORD, SEED_VERSION, type DbState } from './seed'
import { analyzeFarm } from './engine'
import { addDays, isoDate, rngFor } from './util'

const STORAGE_KEY = 'farmo.demo.state.v3'

/* ================================================================= storage */

let cache: DbState | null = null

function readStorage(): DbState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DbState
    if (parsed.version !== SEED_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

function persist(state: DbState): void {
  cache = state
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* Quota or private-mode failures leave the in-memory state intact. */
  }
}

export function getState(): DbState {
  if (cache) return cache
  const stored = readStorage()
  if (stored) {
    cache = stored
    return stored
  }
  const seeded = buildSeedState(new Date())
  persist(seeded)
  return seeded
}

export function resetDemoData(): DbState {
  const seeded = buildSeedState(new Date())
  persist(seeded)
  return seeded
}

export function sessionUserId(): Id | null {
  return getState().sessionUserId
}

/* ====================================================== latency simulation */

/** The mock layer behaves like a network: every call costs 200–700 ms. */
const BASE_LATENCY = 200
const SPREAD_LATENCY = 500

export function latencyRange(): [number, number] {
  return [BASE_LATENCY, BASE_LATENCY + SPREAD_LATENCY]
}

function delay(ms?: number): Promise<void> {
  const wait = ms ?? BASE_LATENCY + Math.random() * SPREAD_LATENCY
  return new Promise((resolve) => {
    setTimeout(resolve, wait)
  })
}

/** Recalculation is heavier than a read, the way a model call would be. */
const RECALC_LATENCY = 1400

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

/* ================================================================ helpers */

function uid(prefix: string): Id {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`
}

function requireUser(state: DbState): User {
  const user = state.users.find((u) => u.id === state.sessionUserId)
  if (!user) throw new ApiError(401, 'Not signed in.')
  return user
}

function projectOfFarm(state: DbState, farmId: Id): Project {
  const farm = state.farms.find((f) => f.id === farmId)
  if (!farm) throw new ApiError(404, `Farm ${farmId} not found.`)
  const project = state.projects.find((p) => p.id === farm.projectId)
  if (!project) throw new ApiError(404, `Project for farm ${farmId} not found.`)
  return project
}

function plantsOfFarm(state: DbState, farmId: Id): Plant[] {
  return state.plants.filter((p) => p.farmId === farmId)
}

function latestAdvice(state: DbState, farmId: Id): AdviceVersion | undefined {
  return state.advice
    .filter((a) => a.farmId === farmId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
}

function latestRisk(state: DbState, farmId: Id): RiskVersion | undefined {
  return state.risk
    .filter((r) => r.farmId === farmId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
}

/** A farm with no plant yet still gets a coherent (empty) analysis. */
function analysisFor(state: DbState, farmId: Id, options: Parameters<typeof analyzeFarm>[3] = {}): FarmAnalysis {
  const farm = state.farms.find((f) => f.id === farmId)!
  const project = projectOfFarm(state, farmId)
  return analyzeFarm(project, farm, plantsOfFarm(state, farmId), options)
}

function bundle(state: DbState, farmId: Id): FarmBundle {
  const farm = state.farms.find((f) => f.id === farmId)
  if (!farm) throw new ApiError(404, `Farm ${farmId} not found.`)
  const fresh = analysisFor(state, farmId)
  const storedAdvice = latestAdvice(state, farmId)
  const storedRisk = latestRisk(state, farmId)
  return {
    farm,
    project: projectOfFarm(state, farmId),
    plants: plantsOfFarm(state, farmId),
    analysis: {
      ...fresh,
      advice: storedAdvice ?? fresh.advice,
      risk: storedRisk ?? fresh.risk,
    },
    operations: state.operations.filter((op) => op.farmId === farmId).sort((a, b) => b.at.localeCompare(a.at)),
    adviceHistory: state.advice.filter((a) => a.farmId === farmId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    riskHistory: state.risk.filter((r) => r.farmId === farmId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    memberships: state.memberships.filter((m) => m.farmId === farmId),
  }
}

function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'number') {
    if (field === 'soilPh') return value.toFixed(2)
    if (field === 'soilMoisture') return `${value} %`
    if (['nitrogen', 'phosphorus', 'potassium'].includes(field)) return `${value} kg/ha`
    if (field === 'organicMatter') return `${value} %`
    if (field === 'spacingCm') return `${value} cm`
    if (field === 'seedRateKgPerAcre') return `${value} kg/acre`
    return String(value)
  }
  if (field === 'area' && typeof value === 'object' && value) {
    const area = value as { value: number; unit: string }
    return `${area.value} ${area.unit}`
  }
  return String(value)
}

const FIELD_LABELS: Record<string, string> = {
  variety: 'Variety',
  plantedAt: 'Planting date',
  area: 'Area',
  soilPh: 'Soil pH',
  soilMoisture: 'Soil moisture',
  nitrogen: 'Available nitrogen',
  phosphorus: 'Available phosphorus',
  potassium: 'Available potassium',
  organicMatter: 'Organic matter',
  irrigationType: 'Irrigation type',
  previousCropId: 'Previous crop',
  spacingCm: 'Spacing',
  seedRateKgPerAcre: 'Seed rate',
  stageOverride: 'Growth stage',
  notes: 'Notes',
  name: 'Name',
  district: 'District',
  upazila: 'Upazila',
  soilType: 'Soil type',
  landType: 'Land type',
  waterSource: 'Water source',
  establishedYear: 'Established',
  summary: 'Summary',
  region: 'Region',
  climateZone: 'Climate zone',
  budgetBdt: 'Budget',
  equipment: 'Equipment',
}

/* ================================================================ queries */

export const api = {
  /* --------------------------------------------------------------- auth */
  async login(email: string, password: string): Promise<User> {
    await delay()
    const state = getState()
    const user = state.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
    if (!user) throw new ApiError(401, 'No Farmo account matches that email address.')
    if (password !== DEMO_PASSWORD) throw new ApiError(401, 'That password is not correct. Check it and try again.')
    state.sessionUserId = user.id
    persist(state)
    return user
  },

  async signup(input: { name: string; email: string; phone: string; password: string }): Promise<{ user: User; code: string }> {
    await delay()
    const state = getState()
    const email = input.email.trim().toLowerCase()
    if (state.users.some((u) => u.email.toLowerCase() === email)) {
      throw new ApiError(409, 'An account with this email already exists. Sign in instead.')
    }
    const user: User = {
      id: uid('usr'),
      name: input.name.trim(),
      email,
      phone: input.phone.trim(),
      jobTitle: 'Farm owner',
      initials: input.name
        .split(/\s+/)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      emailVerified: false,
      phoneVerified: false,
      providers: [],
      createdAt: new Date().toISOString(),
    }
    const code = makeCode(email, 'verify-email')
    state.users.push(user)
    state.authChallenges.push({
      id: uid('chg'),
      email,
      code,
      purpose: 'verify-email',
      expiresAt: addDays(new Date(), 1).toISOString(),
      consumed: false,
    })
    state.sessionUserId = user.id
    persist(state)
    return { user, code }
  },

  async requestOtp(email: string, purpose: 'verify-email' | 'verify-phone' | 'reset' = 'verify-email'): Promise<string> {
    await delay(320)
    const state = getState()
    const user = state.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
    if (purpose !== 'reset' && !user) throw new ApiError(404, 'No Farmo account matches that email address.')
    const code = makeCode(email.trim().toLowerCase(), purpose)
    state.authChallenges = state.authChallenges.filter((c) => !(c.email === email && c.purpose === purpose))
    state.authChallenges.push({
      id: uid('chg'),
      email: email.trim().toLowerCase(),
      code,
      purpose,
      expiresAt: addDays(new Date(), 1).toISOString(),
      consumed: false,
    })
    persist(state)
    return code
  },

  async verifyOtp(email: string, code: string, purpose: 'verify-email' | 'verify-phone' | 'reset' = 'verify-email'): Promise<User> {
    await delay(520)
    const state = getState()
    const challenge = state.authChallenges.find(
      (c) => c.email.toLowerCase() === email.trim().toLowerCase() && c.purpose === purpose && !c.consumed,
    )
    if (!challenge) throw new ApiError(410, 'That code has expired. Request a new one.')
    if (challenge.code !== code.trim()) throw new ApiError(422, 'That code is not correct. Six digits, no spaces.')
    challenge.consumed = true
    const user = state.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
    if (!user) throw new ApiError(404, 'No Farmo account matches that email address.')
    if (purpose === 'verify-email') user.emailVerified = true
    if (purpose === 'verify-phone') user.phoneVerified = true
    persist(state)
    return user
  },

  async completePasswordReset(email: string, code: string, _password: string): Promise<void> {
    await delay()
    const state = getState()
    const challenge = state.authChallenges.find(
      (c) => c.email.toLowerCase() === email.trim().toLowerCase() && c.purpose === 'reset' && !c.consumed,
    )
    if (!challenge || challenge.code !== code) throw new ApiError(422, 'That reset code is not valid.')
    challenge.consumed = true
    const user = state.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
    if (!user) throw new ApiError(404, 'No Farmo account matches that email address.')
    user.emailVerified = true
    user.providers = user.providers.includes('google') ? user.providers : user.providers
    persist(state)
  },

  /** Fake OAuth: the consent screen has already been approved by the user. */
  async oauthSignIn(provider: 'google' | 'facebook' | 'yahoo', email: string, name: string): Promise<User> {
    await delay(680)
    const state = getState()
    let user = state.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
    if (!user) {
      user = {
        id: uid('usr'),
        name: name.trim() || 'Farmo grower',
        email: email.trim().toLowerCase(),
        phone: '',
        jobTitle: 'Farm owner',
        initials: (name || 'FG')
          .split(/\s+/)
          .map((part) => part[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
        emailVerified: true,
        phoneVerified: false,
        providers: [provider],
        createdAt: new Date().toISOString(),
      }
      state.users.push(user)
    } else if (!user.providers.includes(provider)) {
      user.providers = [...user.providers, provider]
    }
    state.sessionUserId = user.id
    persist(state)
    return user
  },

  async signOut(): Promise<void> {
    await delay(240)
    const state = getState()
    state.sessionUserId = null
    persist(state)
  },

  async switchUser(userId: Id): Promise<User> {
    await delay(320)
    const state = getState()
    const user = state.users.find((u) => u.id === userId)
    if (!user) throw new ApiError(404, 'Unknown demo user.')
    state.sessionUserId = user.id
    persist(state)
    return user
  },

  async currentUser(): Promise<User | null> {
    await delay(160)
    const state = getState()
    return state.users.find((u) => u.id === state.sessionUserId) ?? null
  },

  async listUsers(): Promise<User[]> {
    await delay(200)
    return getState().users
  },

  async updateProfile(patch: Partial<Pick<User, 'name' | 'phone' | 'jobTitle'>>): Promise<User> {
    await delay()
    const state = getState()
    const user = requireUser(state)
    Object.assign(user, patch, {
      initials: (patch.name ?? user.name)
        .split(/\s+/)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    })
    persist(state)
    return user
  },

  /* ----------------------------------------------------------- projects */
  async listProjects(): Promise<Array<{ project: Project; farmCount: number; plantCount: number; areaAcre: number; criticalRisks: number; topRisk: string | null }>> {
    await delay()
    const state = getState()
    return state.projects.map((project) => {
      const farms = state.farms.filter((f) => project.farmIds.includes(f.id))
      const plants = state.plants.filter((pl) => farms.some((f) => f.id === pl.farmId))
      let criticalRisks = 0
      let topRisk: string | null = null
      let areaAcre = 0
      for (const farm of farms) {
        const risk = latestRisk(state, farm.id)
        const items = risk?.items ?? []
        criticalRisks += items.filter((i) => i.severity === 'high' || i.severity === 'critical').length
        const headline = items[0]
        if (headline && (!topRisk || (headline.severity === 'critical' && topRisk !== 'critical'))) {
          topRisk = headline.severity === 'low' ? null : headline.title
        }
        areaAcre += farm.area.value * (farm.area.unit === 'bigha' ? 0.330579 : farm.area.unit === 'decimal' ? 0.01 : farm.area.unit === 'acre' ? 1 : 2.47105)
      }
      return {
        project,
        farmCount: farms.length,
        plantCount: plants.length,
        areaAcre: Math.round(areaAcre * 100) / 100,
        criticalRisks,
        topRisk,
      }
    })
  },

  async getProject(projectId: Id): Promise<Project | null> {
    await delay()
    const state = getState()
    return state.projects.find((p) => p.id === projectId) ?? null
  },

  async createProject(input: { name: string; summary: string; region: string; climateZone: Project['climateZone']; budgetBdt: number }): Promise<Project> {
    await delay()
    const state = getState()
    const user = requireUser(state)
    const project: Project = {
      id: uid('prj'),
      name: input.name.trim(),
      summary: input.summary.trim(),
      region: input.region,
      climateZone: input.climateZone,
      budgetBdt: input.budgetBdt,
      equipment: ['knapsack-sprayer', 'power-tiller'],
      accommodations: [],
      farmIds: [],
      ownerId: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: isoDate(new Date()),
    }
    state.projects.push(project)
    persist(state)
    return project
  },

  async updateProject(projectId: Id, patch: Partial<Project>): Promise<Project> {
    await delay()
    const state = getState()
    const user = requireUser(state)
    const project = state.projects.find((p) => p.id === projectId)
    if (!project) throw new ApiError(404, `Project ${projectId} not found.`)
    const ops: PropertyOperation[] = []
    for (const [field, value] of Object.entries(patch)) {
      const before = project[field as keyof Project]
      if (JSON.stringify(before) === JSON.stringify(value)) continue
      ops.push({
        id: uid('op'),
        farmId: project.farmIds[0] ?? '',
        entity: 'project',
        entityId: project.id,
        entityLabel: project.name,
        field,
        fieldLabel: FIELD_LABELS[field] ?? field,
        before: typeof before === 'object' ? JSON.stringify(before) : formatValue(field, before),
        after: formatValue(field, value),
        at: new Date().toISOString(),
        actorId: user.id,
        actorName: user.name,
        note: null,
      })
    }
    Object.assign(project, patch, { updatedAt: isoDate(new Date()) })
    state.operations.push(...ops.filter((op) => op.farmId))
    persist(state)
    return project
  },

  async deleteProject(projectId: Id): Promise<void> {
    await delay()
    const state = getState()
    const project = state.projects.find((p) => p.id === projectId)
    if (!project) throw new ApiError(404, `Project ${projectId} not found.`)
    const farmIds = new Set(project.farmIds)
    state.projects = state.projects.filter((p) => p.id !== projectId)
    state.farms = state.farms.filter((f) => !farmIds.has(f.id))
    state.plants = state.plants.filter((pl) => !farmIds.has(pl.farmId))
    state.memberships = state.memberships.filter((m) => !farmIds.has(m.farmId))
    state.operations = state.operations.filter((op) => !farmIds.has(op.farmId))
    state.advice = state.advice.filter((a) => !farmIds.has(a.farmId))
    state.risk = state.risk.filter((r) => !farmIds.has(r.farmId))
    persist(state)
  },

  /* -------------------------------------------------------------- farms */
  async listFarms(projectId: Id): Promise<Array<{ farm: Farm; plantCount: number; worstRisk: RiskVersion | undefined; conditions: FarmAnalysis['conditions'] }>> {
    await delay()
    const state = getState()
    return state.farms
      .filter((f) => f.projectId === projectId)
      .map((farm) => ({
        farm,
        plantCount: plantsOfFarm(state, farm.id).length,
        worstRisk: latestRisk(state, farm.id),
        conditions: analysisFor(state, farm.id).conditions,
      }))
  },

  async getFarmBundle(farmId: Id): Promise<FarmBundle> {
    await delay()
    return bundle(getState(), farmId)
  },

  async createFarm(input: Omit<Farm, 'id' | 'createdAt' | 'updatedAt'>): Promise<Farm> {
    await delay()
    const state = getState()
    const farm: Farm = { ...input, id: uid('farm'), createdAt: new Date().toISOString(), updatedAt: isoDate(new Date()) }
    state.farms.push(farm)
    const project = state.projects.find((p) => p.id === farm.projectId)
    if (!project) throw new ApiError(404, `Project ${farm.projectId} not found.`)
    project.farmIds = [...project.farmIds, farm.id]
    project.updatedAt = isoDate(new Date())
    persist(state)
    return farm
  },

  async updateFarm(farmId: Id, patch: Partial<Farm>, actor?: User): Promise<FarmBundle> {
    await delay()
    const state = getState()
    const user = actor ?? requireUser(state)
    const farm = state.farms.find((f) => f.id === farmId)
    if (!farm) throw new ApiError(404, `Farm ${farmId} not found.`)
    const ops: PropertyOperation[] = []
    for (const [field, value] of Object.entries(patch)) {
      const before = farm[field as keyof Farm]
      if (JSON.stringify(before) === JSON.stringify(value)) continue
      ops.push({
        id: uid('op'),
        farmId: farm.id,
        entity: 'farm',
        entityId: farm.id,
        entityLabel: farm.name,
        field,
        fieldLabel: FIELD_LABELS[field] ?? field,
        before: formatValue(field, before),
        after: formatValue(field, value),
        at: new Date().toISOString(),
        actorId: user.id,
        actorName: user.name,
        note: null,
      })
    }
    Object.assign(farm, patch, { updatedAt: isoDate(new Date()) })
    state.operations.push(...ops)
    persist(state)
    await delay(RECALC_LATENCY)
    return commitRecalculation(state, farm.id, ops, user)
  },

  async deleteFarm(farmId: Id): Promise<void> {
    await delay()
    const state = getState()
    const farm = state.farms.find((f) => f.id === farmId)
    if (!farm) throw new ApiError(404, `Farm ${farmId} not found.`)
    state.farms = state.farms.filter((f) => f.id !== farmId)
    state.plants = state.plants.filter((pl) => pl.farmId !== farmId)
    state.memberships = state.memberships.filter((m) => m.farmId !== farmId)
    state.operations = state.operations.filter((op) => op.farmId !== farmId)
    state.advice = state.advice.filter((a) => a.farmId !== farmId)
    state.risk = state.risk.filter((r) => r.farmId !== farmId)
    state.notifications = state.notifications.filter((n) => n.farmId !== farmId)
    const project = state.projects.find((p) => p.id === farm.projectId)
    if (project) project.farmIds = project.farmIds.filter((id) => id !== farmId)
    persist(state)
  },

  /* ------------------------------------------------------------- plants */
  async addPlant(farmId: Id, input: Omit<Plant, 'id' | 'farmId' | 'createdAt' | 'updatedAt'>): Promise<FarmBundle> {
    await delay()
    const state = getState()
    const user = requireUser(state)
    const farm = state.farms.find((f) => f.id === farmId)
    if (!farm) throw new ApiError(404, `Farm ${farmId} not found.`)
    const plant: Plant = {
      ...input,
      id: uid('plant'),
      farmId,
      createdAt: new Date().toISOString(),
      updatedAt: isoDate(new Date()),
    }
    state.plants.push(plant)
    const op: PropertyOperation = {
      id: uid('op'),
      farmId,
      entity: 'plant',
      entityId: plant.id,
      entityLabel: `${plant.variety}`,
      field: 'created',
      fieldLabel: 'Plant added',
      before: '—',
      after: `${plant.variety}, ${plant.area.value} ${plant.area.unit}`,
      at: new Date().toISOString(),
      actorId: user.id,
      actorName: user.name,
      note: plant.notes || null,
    }
    state.operations.push(op)
    persist(state)
    await delay(RECALC_LATENCY * 0.6)
    return commitRecalculation(state, farmId, [op], user)
  },

  /** The central demo path: edit a plant property → operation log → recompute. */
  async updatePlant(plantId: Id, patch: Partial<Plant>): Promise<{ bundle: FarmBundle; operations: PropertyOperation[] }> {
    await delay()
    const state = getState()
    const user = requireUser(state)
    const plant = state.plants.find((p) => p.id === plantId)
    if (!plant) throw new ApiError(404, `Plant ${plantId} not found.`)
    const ops: PropertyOperation[] = []
    for (const [field, value] of Object.entries(patch)) {
      const before = plant[field as keyof Plant]
      if (JSON.stringify(before) === JSON.stringify(value)) continue
      ops.push({
        id: uid('op'),
        farmId: plant.farmId,
        entity: 'plant',
        entityId: plant.id,
        entityLabel: `${plant.variety}`,
        field,
        fieldLabel: FIELD_LABELS[field] ?? field,
        before: formatValue(field, before),
        after: formatValue(field, value),
        at: new Date().toISOString(),
        actorId: user.id,
        actorName: user.name,
        note: null,
      })
    }
    Object.assign(plant, patch, { updatedAt: isoDate(new Date()) })
    state.operations.push(...ops)
    persist(state)
    await delay(RECALC_LATENCY)
    return { bundle: commitRecalculation(state, plant.farmId, ops, user), operations: ops }
  },

  async deletePlant(plantId: Id): Promise<FarmBundle> {
    await delay()
    const state = getState()
    const user = requireUser(state)
    const plant = state.plants.find((p) => p.id === plantId)
    if (!plant) throw new ApiError(404, `Plant ${plantId} not found.`)
    state.plants = state.plants.filter((p) => p.id !== plantId)
    const op: PropertyOperation = {
      id: uid('op'),
      farmId: plant.farmId,
      entity: 'plant',
      entityId: plant.id,
      entityLabel: `${plant.variety}`,
      field: 'deleted',
      fieldLabel: 'Plant removed',
      before: `${plant.variety}, ${plant.area.value} ${plant.area.unit}`,
      after: '—',
      at: new Date().toISOString(),
      actorId: user.id,
      actorName: user.name,
      note: null,
    }
    state.operations.push(op)
    persist(state)
    return commitRecalculation(state, plant.farmId, [op], user)
  },

  /* -------------------------------------------------- advice and risk */
  async regenerateAdvice(farmId: Id): Promise<FarmBundle> {
    await delay()
    const state = getState()
    const user = requireUser(state)
    await delay(RECALC_LATENCY * 0.75)
    return commitRecalculation(state, farmId, [], user, 'manual')
  },

  async getAdviceHistory(farmId: Id): Promise<AdviceVersion[]> {
    await delay()
    return getState()
      .advice.filter((a) => a.farmId === farmId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  async getRiskHistory(farmId: Id): Promise<RiskVersion[]> {
    await delay()
    return getState()
      .risk.filter((r) => r.farmId === farmId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  /* -------------------------------------------------------------- teams */
  async inviteMember(farmId: Id, input: { email: string; role: TeamRole; message: string }): Promise<Membership> {
    await delay()
    const state = getState()
    const user = requireUser(state)
    const email = input.email.trim().toLowerCase()
    if (state.memberships.some((m) => m.farmId === farmId && m.email === email && (m.status === 'pending' || m.status === 'accepted'))) {
      throw new ApiError(409, 'That address is already on this farm team.')
    }
    const known = state.users.find((u) => u.email.toLowerCase() === email)
    const membership: Membership = {
      id: uid('mem'),
      farmId,
      email,
      name: known?.name ?? null,
      userId: known?.id ?? null,
      role: input.role,
      status: 'pending',
      invitedById: user.id,
      invitedAt: new Date().toISOString(),
      respondedAt: null,
      message: input.message.trim() || null,
    }
    state.memberships.push(membership)
    if (known) {
      const farm = state.farms.find((f) => f.id === farmId)
      state.notifications.unshift({
        id: uid('ntf'),
        userId: known.id,
        kind: 'invite',
        title: `${user.name} invited you to ${farm?.name ?? 'a farm'}`,
        body: `Role: ${input.role}. ${input.message ? `“${input.message}”` : ''}`.trim(),
        at: new Date().toISOString(),
        read: false,
        membershipId: membership.id,
        farmId,
      })
    }
    persist(state)
    return membership
  },

  async respondToInvite(membershipId: Id, decision: 'accepted' | 'rejected'): Promise<Membership> {
    await delay()
    const state = getState()
    const user = requireUser(state)
    const membership = state.memberships.find((m) => m.id === membershipId)
    if (!membership) throw new ApiError(404, 'That invitation no longer exists.')
    membership.status = decision
    membership.respondedAt = new Date().toISOString()
    membership.userId = membership.userId ?? user.id
    membership.name = membership.name ?? user.name
    const farm = state.farms.find((f) => f.id === membership.farmId)
    state.notifications = state.notifications.map((n) => (n.membershipId === membershipId ? { ...n, read: true } : n))
    if (farm) {
      state.notifications.unshift({
        id: uid('ntf'),
        userId: membership.invitedById,
        kind: 'decision',
        title: `${user.name} ${decision === 'accepted' ? 'accepted' : 'declined'} the invitation to ${farm.name}`,
        body: decision === 'accepted' ? `Role: ${membership.role}. They can see the farm now.` : 'The invitation is closed.',
        at: new Date().toISOString(),
        read: false,
        membershipId: membership.id,
        farmId: farm.id,
      })
    }
    persist(state)
    return membership
  },

  async revokeMember(membershipId: Id): Promise<Membership> {
    await delay()
    const state = getState()
    const membership = state.memberships.find((m) => m.id === membershipId)
    if (!membership) throw new ApiError(404, 'That team member is no longer on the farm.')
    membership.status = 'revoked'
    membership.respondedAt = new Date().toISOString()
    persist(state)
    return membership
  },

  async changeMemberRole(membershipId: Id, role: TeamRole): Promise<Membership> {
    await delay(280)
    const state = getState()
    const membership = state.memberships.find((m) => m.id === membershipId)
    if (!membership) throw new ApiError(404, 'That team member is no longer on the farm.')
    membership.role = role
    persist(state)
    return membership
  },

  /* ------------------------------------------------------- notifications */
  async listNotifications(): Promise<Notification[]> {
    await delay(240)
    const state = getState()
    if (!state.sessionUserId) return []
    return state.notifications
      .filter((n) => n.userId === state.sessionUserId)
      .sort((a, b) => b.at.localeCompare(a.at))
  },

  async markNotificationsRead(): Promise<void> {
    await delay(180)
    const state = getState()
    state.notifications = state.notifications.map((n) => (n.userId === state.sessionUserId ? { ...n, read: true } : n))
    persist(state)
  },

  /* ------------------------------------------------------------ api keys */
  async listApiKeys(): Promise<ApiKey[]> {
    await delay(260)
    return getState().apiKeys
  },

  async createApiKey(label: string, scopes: string[]): Promise<ApiKey> {
    await delay()
    const state = getState()
    const raw = Array.from({ length: 28 }, () => 'abcdef0123456789'[Math.floor(Math.random() * 16)]).join('')
    const prefix = `fm_live_${raw.slice(0, 4)}`
    const secret = `${prefix}${raw}`
    const key: ApiKey = {
      id: uid('key'),
      label: label.trim(),
      prefix,
      secret,
      secretPreview: `${prefix}••••••••••••••••${raw.slice(-4)}`,
      scopes,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      status: 'active',
      requestCount: 0,
      rateLimitPerHour: 600,
    }
    state.apiKeys.push(key)
    persist(state)
    return key
  },

  async revokeApiKey(keyId: Id): Promise<ApiKey> {
    await delay()
    const state = getState()
    const key = state.apiKeys.find((k) => k.id === keyId)
    if (!key) throw new ApiError(404, 'That key does not exist.')
    key.status = 'revoked'
    persist(state)
    return key
  },

  /* ------------------------------------------------- reset demo data */
  async resetDemoData(): Promise<void> {
    await delay(600)
    resetDemoData()
  },
}

/* ===================================================== shared mutations */

function commitRecalculation(
  state: DbState,
  farmId: Id,
  ops: PropertyOperation[],
  user: User,
  origin: 'auto' | 'manual' = 'auto',
): FarmBundle {
  const analysis = analysisFor(state, farmId, {
    origin,
    actor: { id: user.id, name: user.name },
    operations: ops.map((op) => ({
      field: op.field,
      fieldLabel: op.fieldLabel,
      before: op.before,
      after: op.after,
    })),
    literalOperations: ops.map((op) => op.id),
  })
  state.advice = [...state.advice.filter((a) => a.id !== analysis.advice.id), analysis.advice].slice(-120)
  state.risk = [...state.risk.filter((r) => r.id !== analysis.risk.id), analysis.risk].slice(-120)
  persist(state)
  return bundle(state, farmId)
}

/* --------------------------------------------- developer API simulation */

interface RequestLogEntry {
  id: string
  keyId: string | null
  method: string
  path: string
  status: number
  ms: number
  at: string
}

const requestLog: RequestLogEntry[] = []
const rateWindow: Array<{ keyId: string; at: number }> = []

export function apiRequestLog(): RequestLogEntry[] {
  return [...requestLog].slice(-40).reverse()
}

function rateHeaders(key: ApiKey | null): Record<string, string> {
  const limit = key?.rateLimitPerHour ?? 60
  const now = Date.now()
  const used = rateWindow.filter((r) => r.keyId === (key?.id ?? 'anon') && now - r.at < 3600000).length
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(Math.max(0, limit - used - 1)),
    'X-RateLimit-Reset': String(Math.ceil((now + 3600000) / 1000)),
  }
}

/**
 * Routes a developer-console request through the same handlers the UI uses,
 * so the payloads shown are the real ones (and real errors).
 */
export async function apiRequest(
  method: string,
  path: string,
  options: { body?: unknown; apiKey?: string } = {},
): Promise<ApiResponse<unknown>> {
  const started = performance.now()
  const state = getState()
  const key = options.apiKey
    ? state.apiKeys.find((k) => k.secret === options.apiKey || k.prefix === options.apiKey) ?? null
    : state.apiKeys.find((k) => k.status === 'active') ?? null

  const respond = async (status: number, body: unknown, extra: Record<string, string> = {}): Promise<ApiResponse<unknown>> => {
    await delay(180 + Math.random() * 320)
    const ms = Math.round(performance.now() - started)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Farmo-Mock': 'true',
      'X-Request-Id': `req_${Math.random().toString(36).slice(2, 10)}`,
      ...rateHeaders(key),
      ...extra,
    }
    requestLog.push({
      id: uid('log'),
      keyId: key?.id ?? null,
      method: method.toUpperCase(),
      path,
      status,
      ms,
      at: new Date().toISOString(),
    })
    if (requestLog.length > 200) requestLog.shift()
    if (key) {
      rateWindow.push({ keyId: key.id, at: Date.now() })
      key.requestCount += 1
      key.lastUsedAt = new Date().toISOString()
      persist(state)
    }
    return { status, ok: status < 400, ms, headers, body }
  }

  if (options.apiKey && !key) return respond(401, { error: 'invalid_api_key', message: 'No API key matches that value.' })
  if (key && key.status === 'revoked') {
    return respond(403, { error: 'key_revoked', message: 'This key was revoked. Create a new one in the developer console.' })
  }
  const limit = key?.rateLimitPerHour ?? 60
  if (key && rateWindow.filter((r) => r.keyId === key.id && Date.now() - r.at < 3600000).length >= limit) {
    return respond(429, { error: 'rate_limited', message: `Rate limit of ${limit} requests per hour exceeded.` })
  }

  const segments = path.replace(/^\/+|\/+$/g, '').split('/')
  const version = segments[0] === 'v1' ? segments.shift() : 'v1'
  if (version !== 'v1') return respond(404, { error: 'not_found', message: 'Only /v1 is served by this API.' })
  const [resource, id, sub] = segments

  const methodUpper = method.toUpperCase()
  try {
    if (resource === 'me' && methodUpper === 'GET') {
      const user = state.users.find((u) => u.id === state.sessionUserId)
      return respond(200, { id: user?.id ?? null, name: user?.name ?? null, email: user?.email ?? null, api_key: key ? { label: key.label, scopes: key.scopes } : null })
    }

    if (resource === 'projects') {
      if (!id) {
        if (methodUpper === 'GET') {
          return respond(200, {
            data: state.projects.map((p) => ({
              ...p,
              farm_count: p.farmIds.length,
              plant_count: state.plants.filter((pl) => p.farmIds.includes(pl.farmId)).length,
            })),
            meta: { count: state.projects.length, generated_at: new Date().toISOString() },
          })
        }
        if (methodUpper === 'POST') {
          const body = (options.body ?? {}) as Partial<Project>
          if (!body.name) return respond(422, { error: 'validation_error', message: 'name is required' })
          const user = requireUser(state)
          const project: Project = {
            id: uid('prj'),
            name: body.name,
            summary: body.summary ?? '',
            region: body.region ?? 'Northern Bangladesh',
            climateZone: body.climateZone ?? 'NW',
            budgetBdt: body.budgetBdt ?? 0,
            equipment: body.equipment ?? [],
            accommodations: body.accommodations ?? [],
            farmIds: [],
            ownerId: user.id,
            createdAt: new Date().toISOString(),
            updatedAt: isoDate(new Date()),
          }
          state.projects.push(project)
          persist(state)
          return respond(201, { data: project }, { Location: `/v1/projects/${project.id}` })
        }
        return respond(405, { error: 'method_not_allowed', message: `${methodUpper} is not allowed on /v1/projects` })
      }
      const project = state.projects.find((p) => p.id === id)
      if (!project) return respond(404, { error: 'not_found', message: `Project ${id} not found` })
      if (methodUpper === 'GET' && !sub) return respond(200, { data: project })
      if (methodUpper === 'PATCH' && !sub) {
        Object.assign(project, options.body ?? {}, { updatedAt: isoDate(new Date()) })
        persist(state)
        return respond(200, { data: project })
      }
      if (methodUpper === 'DELETE' && !sub) {
        state.projects = state.projects.filter((p) => p.id !== id)
        persist(state)
        return respond(204, null)
      }
      if (sub === 'farms' && methodUpper === 'GET') {
        return respond(200, {
          data: state.farms.filter((f) => f.projectId === id),
          meta: { project_id: id, count: project.farmIds.length },
        })
      }
    }

    if (resource === 'farms') {
      const farm = state.farms.find((f) => f.id === id)
      if (!farm) return respond(404, { error: 'not_found', message: `Farm ${id} not found` })
      if (methodUpper === 'GET' && !sub) {
        return respond(200, { data: { ...farm, plant_count: plantsOfFarm(state, farm.id).length } })
      }
      if (methodUpper === 'PATCH' && !sub) {
        Object.assign(farm, options.body ?? {}, { updatedAt: isoDate(new Date()) })
        persist(state)
        return respond(200, { data: farm })
      }
      if (sub === 'plants') {
        if (methodUpper === 'GET') {
          return respond(200, { data: plantsOfFarm(state, farm.id), meta: { farm_id: farm.id, count: plantsOfFarm(state, farm.id).length } })
        }
        if (methodUpper === 'POST') {
          const body = (options.body ?? {}) as Partial<Plant>
          if (!body.speciesId || !body.variety) return respond(422, { error: 'validation_error', message: 'speciesId and variety are required' })
          const plant: Plant = {
            id: uid('plant'),
            farmId: farm.id,
            speciesId: body.speciesId,
            variety: body.variety,
            plantedAt: body.plantedAt ?? isoDate(new Date()),
            area: body.area ?? { value: 1, unit: 'bigha' },
            soilPh: body.soilPh ?? 6.4,
            soilMoisture: body.soilMoisture ?? 58,
            nitrogen: body.nitrogen ?? 34,
            phosphorus: body.phosphorus ?? 14,
            potassium: body.potassium ?? 50,
            organicMatter: body.organicMatter ?? 1.4,
            irrigationType: body.irrigationType ?? farm.irrigationType,
            previousCropId: body.previousCropId ?? 'fallow',
            spacingCm: body.spacingCm ?? 25,
            seedRateKgPerAcre: body.seedRateKgPerAcre ?? 8,
            stageOverride: null,
            notes: body.notes ?? '',
            createdAt: new Date().toISOString(),
            updatedAt: isoDate(new Date()),
          }
          state.plants.push(plant)
          persist(state)
          commitRecalculation(state, farm.id, [], state.users.find((u) => u.id === state.sessionUserId) ?? state.users[0])
          return respond(201, { data: plant }, { Location: `/v1/plants/${plant.id}` })
        }
      }
      if (sub === 'advice' && methodUpper === 'GET') {
        const advice = latestAdvice(state, farm.id)
        if (!advice) return respond(404, { error: 'not_generated', message: 'Advice has not been generated for this farm yet.' })
        return respond(200, { data: advice, meta: { model: advice.modelVersion, sections: advice.sections.length } })
      }
      if (sub === 'advice' && methodUpper === 'POST') {
        const user = state.users.find((u) => u.id === state.sessionUserId) ?? state.users[0]
        const next = bundle(state, farm.id)
        const refreshed = commitRecalculation(state, farm.id, [], user, 'manual')
        return respond(201, { data: refreshed.analysis.advice, previous_version: next.analysis.advice.id })
      }
      if (sub === 'risk' && methodUpper === 'GET') {
        const risk = latestRisk(state, farm.id)
        if (!risk) return respond(404, { error: 'not_generated', message: 'Risk has not been generated for this farm yet.' })
        return respond(200, { data: risk, meta: { model: risk.modelVersion, items: risk.items.length, overall: risk.overall } })
      }
      if (sub === 'visualizations' && methodUpper === 'GET') {
        const analysis = analysisFor(state, farm.id)
        return respond(200, {
          data: {
            growth: analysis.charts.growth,
            water: analysis.charts.water,
            fertilizer: analysis.charts.fertilizer,
            soil: analysis.charts.soil,
            conditions: analysis.conditions,
          },
          meta: { generated_at: analysis.computedAt },
        })
      }
      if (sub === 'operations' && methodUpper === 'GET') {
        return respond(200, { data: state.operations.filter((op) => op.farmId === farm.id) })
      }
    }

    if (resource === 'plants') {
      const plant = state.plants.find((p) => p.id === id)
      if (!plant) return respond(404, { error: 'not_found', message: `Plant ${id} not found` })
      if (methodUpper === 'GET') return respond(200, { data: plant })
      if (methodUpper === 'PATCH') {
        const body = (options.body ?? {}) as Partial<Plant>
        const changed = Object.keys(body)
        if (!changed.length) return respond(422, { error: 'validation_error', message: 'Provide at least one property to change.' })
        Object.assign(plant, body, { updatedAt: isoDate(new Date()) })
        persist(state)
        const user = state.users.find((u) => u.id === state.sessionUserId) ?? state.users[0]
        const withOps = commitRecalculation(state, plant.farmId, [], user)
        return respond(200, {
          data: plant,
          meta: { changed, advice_version: withOps.analysis.advice.id, risk_version: withOps.analysis.risk.id },
        })
      }
      if (methodUpper === 'DELETE') {
        state.plants = state.plants.filter((p) => p.id !== id)
        persist(state)
        return respond(204, null)
      }
    }

    return respond(404, { error: 'not_found', message: `${methodUpper} ${path} is not a Farmo endpoint.` })
  } catch (error) {
    if (error instanceof ApiError) return respond(error.status, { error: 'error', message: error.message })
    return respond(500, { error: 'internal_error', message: error instanceof Error ? error.message : 'Unknown error' })
  }
}

/* ================================================================= OTP codes */

/**
 * Deterministic per (email, purpose, day) so the "dev toast" always shows the
 * same code a tester would have received, without a mail server in the loop.
 */
function makeCode(email: string, purpose: string): string {
  const r = rngFor(email, purpose, isoDate(new Date()))
  return String(Math.floor(100000 + r() * 900000))
}
