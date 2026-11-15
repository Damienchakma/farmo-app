import type {
  AdviceVersion,
  ApiKey,
  Farm,
  Membership,
  Notification,
  Plant,
  Project,
  PropertyOperation,
  RiskVersion,
  User,
} from './types'
import { addDays, isoDate } from './util'
import { analyzeFarm } from './engine'

/**
 * Seed state for the demo. Every date is stored relative to the moment of
 * seeding so the crops sit in believable growth stages whenever the demo is
 * first opened, and the change log reads as a real working history.
 */

export interface DbState {
  version: number
  seededAt: string
  sessionUserId: string | null
  users: User[]
  projects: Project[]
  farms: Farm[]
  plants: Plant[]
  memberships: Membership[]
  notifications: Notification[]
  operations: PropertyOperation[]
  advice: AdviceVersion[]
  risk: RiskVersion[]
  apiKeys: ApiKey[]
  authChallenges: Array<{ id: string; email: string; code: string; purpose: 'verify-email' | 'verify-phone' | 'reset'; expiresAt: string; consumed: boolean }>
}

export const SEED_VERSION = 5

/* -------------------------------------------------------------------- users */

export const USERS: User[] = [
  {
    id: 'usr-sam',
    name: 'Sam Carter',
    email: 'sam.carter@farmo.dev',
    phone: '+1 555 0142',
    jobTitle: 'Farm owner',
    initials: 'SC',
    emailVerified: true,
    phoneVerified: true,
    createdAt: '2024-11-04T09:12:00.000Z',
  },
  {
    id: 'usr-elena',
    name: 'Elena Ruiz',
    email: 'elena.ruiz@farmo.dev',
    phone: '+1 555 0187',
    jobTitle: 'Consulting agronomist',
    initials: 'ER',
    emailVerified: true,
    phoneVerified: false,
    createdAt: '2025-01-19T06:40:00.000Z',
  },
  {
    id: 'usr-marcus',
    name: 'Marcus Reed',
    email: 'marcus.reed@farmo.dev',
    phone: '+1 555 0123',
    jobTitle: 'Field manager',
    initials: 'MR',
    emailVerified: true,
    phoneVerified: true,
    createdAt: '2025-06-02T11:05:00.000Z',
  },
  {
    id: 'usr-dana',
    name: 'Dana Whitfield',
    email: 'dana.whitfield@farmo.dev',
    phone: '+1 555 0166',
    jobTitle: 'Vegetable grower',
    initials: 'DW',
    emailVerified: true,
    phoneVerified: true,
    createdAt: '2025-03-27T04:20:00.000Z',
  },
]

export const DEMO_PASSWORD = 'farmo1234'

/* ----------------------------------------------------------------- projects */

export function buildProjects(now: Date): Project[] {
  return [
    {
      id: 'prj-north',
      name: 'Northern Rotation Programme',
      summary:
        'Three blocks working a winter-cereal, oilseed and root rotation with a shared irrigation roster. Priority this season is the acidic patch in the Millbrook block and the dry upland at Highland Plots.',
      region: 'North County',
      climateZone: 'NW',
      budgetUsd: 186000,
      equipment: ['tractor', 'shallow-tubewell', 'deep-tubewell', 'knapsack-sprayer', 'power-tiller', 'thresher', 'seed-drill'],
      accommodations: [
        {
          id: 'acc-n1',
          kind: 'irrigation',
          label: 'Shallow well roster, three slots a week',
          detail: 'Shared between four growers; Millbrook slot is Wednesday and Saturday',
          available: true,
        },
        {
          id: 'acc-n2',
          kind: 'storage',
          label: 'On-farm grain store, 40 tonnes',
          detail: 'Dry floor, cleaned and fumigated after the last potato crop',
          available: true,
        },
        {
          id: 'acc-n3',
          kind: 'labor',
          label: 'Six permanent hands',
          detail: 'Plus a harvest crew of twelve at $45 a day',
          available: true,
        },
        {
          id: 'acc-n4',
          kind: 'transport',
          label: 'Trailer to the co-op, 35 minutes',
          detail: 'Bulk grain goes on a hired lorry to the mill',
          available: true,
        },
        {
          id: 'acc-n5',
          kind: 'credit',
          label: 'Co-operative input loan',
          detail: '$25,000 limit at 9 % service charge, repaid at harvest',
          available: true,
        },
      ],
      farmIds: ['farm-northfield', 'farm-highland', 'farm-riverside'],
      ownerId: 'usr-sam',
      createdAt: '2025-10-11T05:30:00.000Z',
      updatedAt: isoDate(addDays(now, -2)),
    },
    {
      id: 'prj-south',
      name: 'South County Vegetable Programme',
      summary:
        'Tidal lowland at Canal Plot and the high-land vegetable yard at Market Garden. This project is about reading the salinity curve and the protected-crop disease window rather than pushing yields.',
      region: 'South County',
      climateZone: 'SW',
      budgetUsd: 92000,
      equipment: ['shallow-tubewell', 'two-wheel-tractor', 'knapsack-sprayer', 'water-pump', 'reaper'],
      accommodations: [
        {
          id: 'acc-s1',
          kind: 'irrigation',
          label: 'Tidal canal, gravity fed',
          detail: 'Free water on the high tide until midsummer, then brackish',
          available: true,
        },
        {
          id: 'acc-s2',
          kind: 'storage',
          label: 'None on the yard',
          detail: 'Tomatoes go to the wholesale market the same day; potatoes to a cold store 20 minutes away',
          available: false,
        },
        {
          id: 'acc-s3',
          kind: 'labor',
          label: 'Three permanent, eight seasonal',
          detail: 'Grading crews available at $38 a day',
          available: true,
        },
        {
          id: 'acc-s4',
          kind: 'transport',
          label: 'Pickup to the wholesale market, 25 minutes',
          detail: 'Late-night loads reach the city market the next morning',
          available: true,
        },
        {
          id: 'acc-s5',
          kind: 'machinery',
          label: 'Compact tractor shared with two neighbours',
          detail: 'Each takes it for two days in rotation',
          available: true,
        },
      ],
      farmIds: ['farm-canal', 'farm-marketgarden'],
      ownerId: 'usr-sam',
      createdAt: '2026-02-18T08:15:00.000Z',
      updatedAt: isoDate(addDays(now, -5)),
    },
  ]
}
/* -------------------------------------------------------------------- farms */

export function buildFarms(now: Date): Farm[] {
  return [
    {
      id: 'farm-northfield',
      projectId: 'prj-north',
      name: 'Northfield Block',
      district: 'Cedar Valley',
      locality: 'North Ridge',
      area: { value: 4.4, unit: 'acre' },
      soilType: 'silty-clay-loam',
      landType: 'medium',
      irrigationType: 'shallow-tubewell',
      waterSource: 'Shared shallow well, three slots a week',
      establishedYear: 2016,
      notes:
        'Winter wheat followed by canola is the settled pattern here. The east corner stays wet after heavy rain and has never been levelled properly.',
      createdAt: '2025-10-11T05:34:00.000Z',
      updatedAt: isoDate(addDays(now, -3)),
    },
    {
      id: 'farm-highland',
      projectId: 'prj-north',
      name: 'Highland Plots',
      district: 'Stonebridge',
      locality: 'Westbridge',
      area: { value: 3, unit: 'acre' },
      soilType: 'calcareous',
      landType: 'high',
      irrigationType: 'deep-tubewell',
      waterSource: 'Community deep well, $9 an hour',
      establishedYear: 2019,
      notes:
        'Dry upland — the water table drops about four metres by late summer. Winter crops are carried on two irrigations and residual moisture.',
      createdAt: '2025-10-11T05:40:00.000Z',
      updatedAt: isoDate(addDays(now, -8)),
    },
    {
      id: 'farm-riverside',
      projectId: 'prj-north',
      name: 'Riverside Fields',
      district: 'Millbrook',
      locality: 'Long Meadow',
      area: { value: 5, unit: 'acre' },
      soilType: 'clay-loam',
      landType: 'medium',
      irrigationType: 'shallow-tubewell',
      waterSource: 'Own shallow well plus canal top-up in spring',
      establishedYear: 2014,
      notes:
        'Heavy land, good for cereals. The northern quarter is distinctly acidic and has been limed once, four seasons ago.',
      createdAt: '2025-10-11T05:45:00.000Z',
      updatedAt: isoDate(addDays(now, -1)),
    },
    {
      id: 'farm-canal',
      projectId: 'prj-south',
      name: 'Canal Plot',
      district: 'Riverside',
      locality: 'Tide Mill',
      area: { value: 6, unit: 'acre' },
      soilType: 'saline-clay',
      landType: 'low',
      irrigationType: 'tidal',
      waterSource: 'Tidal canal, gravity fed',
      establishedYear: 2011,
      notes:
        'Water enters and leaves on the tide. From mid-summer the canal turns brackish and every irrigation has to be tested with an EC meter first.',
      createdAt: '2026-02-18T08:20:00.000Z',
      updatedAt: isoDate(addDays(now, -4)),
    },
    {
      id: 'farm-marketgarden',
      projectId: 'prj-south',
      name: 'Market Garden Yard',
      district: 'Greenfield',
      locality: 'Southgate',
      area: { value: 3.5, unit: 'acre' },
      soilType: 'silt-loam',
      landType: 'high',
      irrigationType: 'shallow-tubewell',
      waterSource: 'Own well, 2 cusec',
      establishedYear: 2018,
      notes:
        'High land built for vegetables. Tomato and potato run back to back, which is the reason for the disease pressure on the yard.',
      createdAt: '2026-02-18T08:26:00.000Z',
      updatedAt: isoDate(addDays(now, -6)),
    },
  ]
}

/* ------------------------------------------------------------------- plants */

interface PlantSeed {
  id: string
  farmId: string
  speciesId: string
  variety: string
  plantedDaysAgo: number
  area: { value: number; unit: Plant['area']['unit'] }
  soilPh: number
  soilMoisture: number
  nitrogen: number
  phosphorus: number
  potassium: number
  organicMatter: number
  irrigationType: Plant['irrigationType']
  previousCropId: string
  spacingCm: number
  seedRateKgPerAcre: number
  notes: string
  createdDaysAgo: number
}

const PLANT_SEEDS: PlantSeed[] = [
  {
    id: 'plant-nf-wheat',
    farmId: 'farm-northfield',
    speciesId: 'winter-wheat',
    variety: 'Bread wheat, mid-season',
    plantedDaysAgo: 49,
    area: { value: 2.6, unit: 'acre' },
    soilPh: 6.4,
    soilMoisture: 61,
    nitrogen: 38,
    phosphorus: 15,
    potassium: 52,
    organicMatter: 1.7,
    irrigationType: 'shallow-tubewell',
    previousCropId: 'soybean',
    spacingCm: 18,
    seedRateKgPerAcre: 75,
    notes: 'Drilled on 18 cm rows after soybean. Rolled twice for slug control.',
    createdDaysAgo: 50,
  },
  {
    id: 'plant-nf-canola',
    farmId: 'farm-northfield',
    speciesId: 'canola',
    variety: 'Open-pollinated winter type',
    plantedDaysAgo: 64,
    area: { value: 1.8, unit: 'acre' },
    soilPh: 6.3,
    soilMoisture: 52,
    nitrogen: 34,
    phosphorus: 14,
    potassium: 48,
    organicMatter: 1.7,
    irrigationType: 'shallow-tubewell',
    previousCropId: 'winter-wheat',
    spacingCm: 30,
    seedRateKgPerAcre: 3,
    notes: 'Drilled in 30 cm rows on the eastern strips after the wheat was cleared.',
    createdDaysAgo: 64,
  },
  {
    id: 'plant-hl-lentil',
    farmId: 'farm-highland',
    speciesId: 'lentil',
    variety: 'Small-seeded winter lentil',
    plantedDaysAgo: 24,
    area: { value: 1.5, unit: 'acre' },
    soilPh: 7.1,
    soilMoisture: 33,
    nitrogen: 22,
    phosphorus: 9,
    potassium: 38,
    organicMatter: 0.7,
    irrigationType: 'deep-tubewell',
    previousCropId: 'fallow',
    spacingCm: 25,
    seedRateKgPerAcre: 30,
    notes: 'Seed inoculated before drilling. Carried on residual moisture so far.',
    createdDaysAgo: 24,
  },
  {
    id: 'plant-hl-canola',
    farmId: 'farm-highland',
    speciesId: 'canola',
    variety: 'Hybrid winter type',
    plantedDaysAgo: 69,
    area: { value: 1.5, unit: 'acre' },
    soilPh: 7.5,
    soilMoisture: 41,
    nitrogen: 26,
    phosphorus: 8,
    potassium: 40,
    organicMatter: 0.6,
    irrigationType: 'deep-tubewell',
    previousCropId: 'winter-wheat',
    spacingCm: 30,
    seedRateKgPerAcre: 2.5,
    notes: 'Calcareous upland plot — zinc has been the problem here, not nitrogen.',
    createdDaysAgo: 69,
  },
  {
    id: 'plant-rs-wheat',
    farmId: 'farm-riverside',
    speciesId: 'winter-wheat',
    variety: 'Bread wheat, early',
    plantedDaysAgo: 39,
    area: { value: 3.2, unit: 'acre' },
    soilPh: 5.6,
    soilMoisture: 68,
    nitrogen: 30,
    phosphorus: 11,
    potassium: 44,
    organicMatter: 1.4,
    irrigationType: 'shallow-tubewell',
    previousCropId: 'winter-wheat',
    spacingCm: 18,
    seedRateKgPerAcre: 80,
    notes: 'Northern quarter of the block. Acidic patch that was limed four seasons back.',
    createdDaysAgo: 39,
  },
  {
    id: 'plant-rs-potato',
    farmId: 'farm-riverside',
    speciesId: 'potato',
    variety: 'Second-crop, red skin',
    plantedDaysAgo: 80,
    area: { value: 1.8, unit: 'acre' },
    soilPh: 5.9,
    soilMoisture: 63,
    nitrogen: 33,
    phosphorus: 16,
    potassium: 58,
    organicMatter: 1.5,
    irrigationType: 'shallow-tubewell',
    previousCropId: 'potato',
    spacingCm: 60,
    seedRateKgPerAcre: 750,
    notes: 'Ridges opened 60 cm apart. Seed tubers from the cold store in the next village.',
    createdDaysAgo: 80,
  },
  {
    id: 'plant-cn-rice',
    farmId: 'farm-canal',
    speciesId: 'rice',
    variety: 'Medium-grain irrigated',
    plantedDaysAgo: 176,
    area: { value: 4, unit: 'acre' },
    soilPh: 6.8,
    soilMoisture: 74,
    nitrogen: 36,
    phosphorus: 13,
    potassium: 55,
    organicMatter: 1.9,
    irrigationType: 'tidal',
    previousCropId: 'rice',
    spacingCm: 22,
    seedRateKgPerAcre: 30,
    notes: 'Transplanted on the lowest portion; the plot takes water on every spring tide.',
    createdDaysAgo: 176,
  },
  {
    id: 'plant-cn-tomato',
    farmId: 'farm-canal',
    speciesId: 'tomato',
    variety: 'Protected crop, truss type',
    plantedDaysAgo: 54,
    area: { value: 2, unit: 'acre' },
    soilPh: 6.6,
    soilMoisture: 55,
    nitrogen: 32,
    phosphorus: 15,
    potassium: 60,
    organicMatter: 1.9,
    irrigationType: 'drip',
    previousCropId: 'fallow',
    spacingCm: 45,
    seedRateKgPerAcre: 0.1,
    notes: 'Polytunnel trusses on drip; the ground was rested over the summer.',
    createdDaysAgo: 54,
  },
  {
    id: 'plant-mg-tomato',
    farmId: 'farm-marketgarden',
    speciesId: 'tomato',
    variety: 'Field fresh-market',
    plantedDaysAgo: 60,
    area: { value: 1.4, unit: 'acre' },
    soilPh: 6.3,
    soilMoisture: 48,
    nitrogen: 31,
    phosphorus: 17,
    potassium: 57,
    organicMatter: 1.2,
    irrigationType: 'shallow-tubewell',
    previousCropId: 'tomato',
    spacingCm: 60,
    seedRateKgPerAcre: 0.08,
    notes: 'Same yard as last season — the wilt patches from last year are marked with stakes.',
    createdDaysAgo: 60,
  },
  {
    id: 'plant-mg-potato',
    farmId: 'farm-marketgarden',
    speciesId: 'potato',
    variety: 'Maincrop, chipping type',
    plantedDaysAgo: 80,
    area: { value: 1.1, unit: 'acre' },
    soilPh: 6.1,
    soilMoisture: 59,
    nitrogen: 35,
    phosphorus: 18,
    potassium: 62,
    organicMatter: 1.2,
    irrigationType: 'shallow-tubewell',
    previousCropId: 'potato',
    spacingCm: 60,
    seedRateKgPerAcre: 800,
    notes: 'Second crop for the chipping contract; due to be lifted this fortnight.',
    createdDaysAgo: 80,
  },
  {
    id: 'plant-mg-canola',
    farmId: 'farm-marketgarden',
    speciesId: 'canola',
    variety: 'Open-pollinated winter type',
    plantedDaysAgo: 64,
    area: { value: 1, unit: 'acre' },
    soilPh: 6.2,
    soilMoisture: 46,
    nitrogen: 29,
    phosphorus: 12,
    potassium: 50,
    organicMatter: 1.2,
    irrigationType: 'shallow-tubewell',
    previousCropId: 'soybean',
    spacingCm: 30,
    seedRateKgPerAcre: 3,
    notes: 'Border plot after soybean; the strongest of the three canola strips.',
    createdDaysAgo: 64,
  },
]

export function buildPlants(now: Date): Plant[] {
  return PLANT_SEEDS.map((s) => ({
    id: s.id,
    farmId: s.farmId,
    speciesId: s.speciesId,
    variety: s.variety,
    plantedAt: isoDate(addDays(now, -s.plantedDaysAgo)),
    area: s.area,
    soilPh: s.soilPh,
    soilMoisture: s.soilMoisture,
    nitrogen: s.nitrogen,
    phosphorus: s.phosphorus,
    potassium: s.potassium,
    organicMatter: s.organicMatter,
    irrigationType: s.irrigationType,
    previousCropId: s.previousCropId,
    spacingCm: s.spacingCm,
    seedRateKgPerAcre: s.seedRateKgPerAcre,
    stageOverride: null,
    notes: s.notes,
    createdAt: isoDate(addDays(now, -s.createdDaysAgo)),
    updatedAt: isoDate(addDays(now, -Math.min(s.createdDaysAgo, 3))),
  }))
}
/* -------------------------------------------------------------------- teams */

export function buildMemberships(now: Date): Membership[] {
  const rows: Array<[string, string, string, string | null, string | null, Membership['role'], Membership['status'], number, number | null, string | null]> = [
    ['mem-1', 'farm-northfield', 'elena.ruiz@farmo.dev', 'Elena Ruiz', 'usr-elena', 'agronomist', 'accepted', 40, 39, 'Please keep the fertiliser plan and the irrigation log up to date.'],
    ['mem-2', 'farm-northfield', 'marcus.reed@farmo.dev', 'Marcus Reed', 'usr-marcus', 'manager', 'pending', 2, null, 'Looking after the canola strips and the irrigation roster.'],
    ['mem-3', 'farm-highland', 'elena.ruiz@farmo.dev', 'Elena Ruiz', 'usr-elena', 'agronomist', 'accepted', 30, 30, null],
    ['mem-4', 'farm-canal', 'dana.whitfield@farmo.dev', 'Dana Whitfield', 'usr-dana', 'manager', 'accepted', 6, 5, 'Vegetable side plus the tidal irrigation schedule.'],
    ['mem-5', 'farm-marketgarden', 'dana.whitfield@farmo.dev', 'Dana Whitfield', 'usr-dana', 'manager', 'accepted', 6, 4, null],
    ['mem-6', 'farm-riverside', 'jonas.bell@example.com', null, null, 'field-worker', 'rejected', 9, 6, 'Declined — already working full time with another grower this season.'],
    ['mem-7', 'farm-highland', 'priya.nair@example.com', null, null, 'viewer', 'revoked', 20, 14, 'Access withdrawn after the input loan was settled.'],
    ['mem-8', 'farm-marketgarden', 'elena.ruiz@farmo.dev', 'Elena Ruiz', 'usr-elena', 'agronomist', 'pending', 1, null, 'Need a second opinion on the wilt patches before the next tomato cycle.'],
  ]
  return rows.map(([id, farmId, email, name, userId, role, status, invitedDaysAgo, respondedDaysAgo, message]) => ({
    id,
    farmId,
    email,
    name,
    userId,
    role,
    status,
    invitedById: 'usr-sam',
    invitedAt: isoDate(addDays(now, -invitedDaysAgo)),
    respondedAt: respondedDaysAgo === null ? null : isoDate(addDays(now, -respondedDaysAgo)),
    message,
  }))
}

export function buildNotifications(now: Date): Notification[] {
  const at = (days: number, hh: number, mm: number) =>
    `${isoDate(addDays(now, -days))}T${`${hh}`.padStart(2, '0')}:${`${mm}`.padStart(2, '0')}:00.000Z`
  return [
    {
      id: 'ntf-1',
      userId: 'usr-marcus',
      kind: 'invite',
      title: 'Sam Carter invited you to Northfield Block',
      body: 'Role: Manager. “Looking after the canola strips and the irrigation roster.”',
      at: at(2, 7, 40),
      read: false,
      membershipId: 'mem-2',
      farmId: 'farm-northfield',
    },
    {
      id: 'ntf-2',
      userId: 'usr-elena',
      kind: 'invite',
      title: 'Sam Carter invited you to Market Garden Yard',
      body: 'Role: Agronomist. “Need a second opinion on the wilt patches before the next tomato cycle.”',
      at: at(1, 9, 5),
      read: false,
      membershipId: 'mem-8',
      farmId: 'farm-marketgarden',
    },
    {
      id: 'ntf-3',
      userId: 'usr-sam',
      kind: 'decision',
      title: 'Dana Whitfield accepted the invitation to Canal Plot',
      body: 'She now has manager access to the tidal plot and its irrigation log.',
      at: at(5, 13, 20),
      read: false,
      membershipId: 'mem-4',
      farmId: 'farm-canal',
    },
    {
      id: 'ntf-4',
      userId: 'usr-sam',
      kind: 'decision',
      title: 'Jonas Bell declined the invitation to Riverside Fields',
      body: '“Already working full time with another grower this season.”',
      at: at(6, 11, 2),
      read: true,
      membershipId: 'mem-6',
      farmId: 'farm-riverside',
    },
    {
      id: 'ntf-5',
      userId: 'usr-elena',
      kind: 'system',
      title: 'Advice and risk recalculated for Riverside Fields',
      body: 'Soil pH came back at 5.6 on the northern quarter — lime is now on the plan.',
      at: at(2, 8, 15),
      read: true,
      membershipId: null,
      farmId: 'farm-riverside',
    },
  ]
}

/* ------------------------------------------------------------- change log */

export function buildOperations(now: Date): PropertyOperation[] {
  const at = (d: number, hh: number, mm: number) =>
    `${isoDate(addDays(now, -d))}T${`${hh}`.padStart(2, '0')}:${`${mm}`.padStart(2, '0')}:00.000Z`
  const rows: Array<[string, PropertyOperation['farmId'], PropertyOperation['entity'], string, string, string, string, string, string, number, number, number, string, string]> = [
    ['op-1', 'farm-northfield', 'plant', 'plant-nf-wheat', 'Bread wheat, mid-season', 'created', 'Plant added', '—', 'Winter wheat, 2.6 acres', 50, 6, 20, 'usr-sam', 'Sam Carter'],
    ['op-2', 'farm-northfield', 'plant', 'plant-nf-wheat', 'Bread wheat, mid-season', 'soilMoisture', 'Soil moisture', '58 %', '61 %', 3, 11, 45, 'usr-elena', 'Elena Ruiz'],
    ['op-3', 'farm-northfield', 'plant', 'plant-nf-canola', 'Canola, open-pollinated', 'created', 'Plant added', '—', 'Winter canola, 1.8 acres', 64, 7, 10, 'usr-sam', 'Sam Carter'],
    ['op-4', 'farm-riverside', 'plant', 'plant-rs-wheat', 'Bread wheat, early · northern quarter', 'soilPh', 'Soil pH', '6.2', '5.6', 2, 8, 15, 'usr-elena', 'Elena Ruiz'],
    ['op-5', 'farm-riverside', 'plant', 'plant-rs-wheat', 'Bread wheat, early · northern quarter', 'nitrogen', 'Available nitrogen', '34 kg/ha', '30 kg/ha', 2, 8, 22, 'usr-elena', 'Elena Ruiz'],
    ['op-6', 'farm-riverside', 'plant', 'plant-rs-potato', 'Potato, second crop', 'created', 'Plant added', '—', 'Potato, 1.8 acres', 80, 6, 45, 'usr-sam', 'Sam Carter'],
    ['op-7', 'farm-highland', 'plant', 'plant-hl-lentil', 'Lentil, small-seeded', 'soilMoisture', 'Soil moisture', '38 %', '33 %', 4, 16, 5, 'usr-elena', 'Elena Ruiz'],
    ['op-8', 'farm-highland', 'plant', 'plant-hl-canola', 'Canola, hybrid winter type', 'soilPh', 'Soil pH', '7.3', '7.5', 9, 10, 30, 'usr-elena', 'Elena Ruiz'],
    ['op-9', 'farm-marketgarden', 'plant', 'plant-mg-tomato', 'Tomato, field fresh-market', 'nitrogen', 'Available nitrogen', '28 kg/ha', '31 kg/ha', 6, 9, 25, 'usr-dana', 'Dana Whitfield'],
    ['op-10', 'farm-marketgarden', 'plant', 'plant-mg-potato', 'Potato, maincrop', 'area', 'Area', '1 acre', '1.1 acre', 80, 6, 15, 'usr-dana', 'Dana Whitfield'],
    ['op-11', 'farm-canal', 'plant', 'plant-cn-rice', 'Rice, medium-grain', 'soilMoisture', 'Soil moisture', '70 %', '74 %', 5, 15, 40, 'usr-dana', 'Dana Whitfield'],
    ['op-12', 'farm-canal', 'farm', 'farm-canal', 'Canal Plot', 'waterSource', 'Water source', 'Canal, tide gate', 'Tidal canal, gravity fed', 15, 8, 0, 'usr-sam', 'Sam Carter'],
  ]
  return rows.map(([id, farmId, entity, entityId, entityLabel, field, fieldLabel, before, after, days, hh, mm, actorId, actorName]) => ({
    id,
    farmId,
    entity,
    entityId,
    entityLabel,
    field,
    fieldLabel,
    before,
    after,
    at: at(days, hh, mm),
    actorId,
    actorName,
    note: null,
  }))
}

/* ---------------------------------------------------------------- api keys */

export function buildApiKeys(now: Date): ApiKey[] {
  return [
    {
      id: 'key-1',
      label: 'Field dashboard (production)',
      prefix: 'fm_live_7c41',
      secretPreview: 'fm_live_7c41••••••••••••••••3f9a',
      secret: 'fm_live_7c41b8e2d54a4f0c9d31ab77ee3f9a',
      scopes: ['projects:read', 'farms:read', 'plants:read', 'advice:read', 'risk:read'],
      createdAt: `${isoDate(addDays(now, -62))}T04:00:00.000Z`,
      lastUsedAt: `${isoDate(addDays(now, -1))}T18:42:00.000Z`,
      status: 'active',
      requestCount: 18422,
      rateLimitPerHour: 600,
    },
    {
      id: 'key-2',
      label: 'Agronomy research export',
      prefix: 'fm_live_2ad9',
      secretPreview: 'fm_live_2ad9••••••••••••••••c07b',
      secret: 'fm_live_2ad95f1c88b34de0917caca0e5c07b',
      scopes: ['projects:read', 'farms:read', 'plants:read', 'advice:read', 'risk:read', 'plants:write'],
      createdAt: `${isoDate(addDays(now, -30))}T07:30:00.000Z`,
      lastUsedAt: `${isoDate(addDays(now, -4))}T05:12:00.000Z`,
      status: 'active',
      requestCount: 3120,
      rateLimitPerHour: 300,
    },
    {
      id: 'key-3',
      label: 'Old weather ingest bridge',
      prefix: 'fm_test_91be',
      secretPreview: 'fm_test_91be••••••••••••••••4d21',
      secret: 'fm_test_91be0c7a15f04b3e8a6299d1f14d21',
      scopes: ['farms:read'],
      createdAt: `${isoDate(addDays(now, -120))}T02:15:00.000Z`,
      lastUsedAt: `${isoDate(addDays(now, -95))}T09:00:00.000Z`,
      status: 'revoked',
      requestCount: 880,
      rateLimitPerHour: 60,
    },
  ]
}

/* ------------------------------------------------------------- assembling */

/**
 * Build the whole seed state. Advice and risk versions are produced by running
 * the real engine, and the Riverside block additionally keeps the version that
 * existed before the pH re-test, so the version history is genuine.
 */
export function buildSeedState(now: Date = new Date()): DbState {
  const projects = buildProjects(now)
  const farms = buildFarms(now)
  const plants = buildPlants(now)
  const operations = buildOperations(now)
  const advice: AdviceVersion[] = []
  const risk: RiskVersion[] = []

  const projectOf = (farmId: string) => projects.find((prj) => prj.farmIds.includes(farmId))!

  for (const farm of farms) {
    const farmOps = operations.filter((op) => op.farmId === farm.id).sort((a, b) => b.at.localeCompare(a.at))
    const recent = farmOps.filter((op) => (now.getTime() - new Date(op.at).getTime()) / 86400000 <= 7)

    if (farm.id === 'farm-riverside') {
      const earlier = plants.map((pl) =>
        pl.id === 'plant-rs-wheat' ? { ...pl, soilPh: 6.2, nitrogen: 34, updatedAt: isoDate(addDays(now, -3)) } : pl,
      )
      const beforeAt = addDays(now, -2)
      beforeAt.setHours(beforeAt.getHours() - 6)
      const v1 = analyzeFarm(projectOf(farm.id), farm, earlier, {
        now: beforeAt,
        origin: 'auto',
        actor: { id: 'usr-elena', name: 'Elena Ruiz' },
      })
      advice.push({ ...v1.advice, createdAt: beforeAt.toISOString() })
      risk.push({ ...v1.risk, createdAt: beforeAt.toISOString() })
    }

    const current = analyzeFarm(projectOf(farm.id), farm, plants, {
      now,
      origin: 'auto',
      actor: { id: 'usr-elena', name: 'Elena Ruiz' },
      operations: recent.map((op) => ({
        field: op.field,
        fieldLabel: op.fieldLabel,
        before: op.before,
        after: op.after,
      })),
      literalOperations: recent.map((op) => op.id),
    })
    advice.push(current.advice)
    risk.push(current.risk)
  }

  return {
    version: SEED_VERSION,
    seededAt: now.toISOString(),
    sessionUserId: null,
    users: USERS,
    projects,
    farms,
    plants,
    memberships: buildMemberships(now),
    notifications: buildNotifications(now),
    operations,
    advice,
    risk,
    apiKeys: buildApiKeys(now),
    authChallenges: [],
  }
}
