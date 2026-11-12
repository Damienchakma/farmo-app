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
  /** OTP challenges and password-reset codes for the mock auth flow. */
  authChallenges: Array<{ id: string; email: string; code: string; purpose: 'verify-email' | 'verify-phone' | 'reset'; expiresAt: string; consumed: boolean }>
}

export const SEED_VERSION = 3

/* -------------------------------------------------------------------- users */

export const USERS: User[] = [
  {
    id: 'usr-nusrat',
    name: 'Nusrat Jahan',
    email: 'nusrat.jahan@farmo.dev',
    phone: '+8801811224455',
    jobTitle: 'Farm owner',
    initials: 'NJ',
    emailVerified: true,
    phoneVerified: true,
    providers: ['google'],
    createdAt: '2024-11-04T09:12:00.000Z',
  },
  {
    id: 'usr-rafiq',
    name: 'Rafiqul Islam',
    email: 'rafiq.islam@farmo.dev',
    phone: '+8801712338890',
    jobTitle: 'Consulting agronomist',
    initials: 'RI',
    emailVerified: true,
    phoneVerified: false,
    providers: [],
    createdAt: '2025-01-19T06:40:00.000Z',
  },
  {
    id: 'usr-shahida',
    name: 'Shahida Begum',
    email: 'shahida.begum@farmo.dev',
    phone: '+8801913772210',
    jobTitle: 'Field manager',
    initials: 'SB',
    emailVerified: true,
    phoneVerified: true,
    providers: ['facebook'],
    createdAt: '2025-06-02T11:05:00.000Z',
  },
  {
    id: 'usr-tanvir',
    name: 'Tanvir Ahmed',
    email: 'tanvir.ahmed@farmo.dev',
    phone: '+8801677445512',
    jobTitle: 'Vegetable grower',
    initials: 'TA',
    emailVerified: true,
    phoneVerified: true,
    providers: ['yahoo'],
    createdAt: '2025-03-27T04:20:00.000Z',
  },
]

export const DEMO_PASSWORD = 'farmo1234'

/* ----------------------------------------------------------------- projects */

export function buildProjects(now: Date): Project[] {
  return [
    {
      id: 'prj-north',
      name: 'North Bengal Rice & Rabi Programme',
      summary:
        'Three blocks across Bogura, Rajshahi and Dinajpur working the Aman–rabi–boro cycle with a shared tubewell roster. Priority this season is the acid patch in Chirirbandar and the Barind moisture deficit.',
      region: 'Northern Bangladesh',
      climateZone: 'NW',
      budgetBdt: 2450000,
      equipment: ['tractor', 'shallow-tubewell', 'deep-tubewell', 'knapsack-sprayer', 'power-tiller', 'thresher', 'seed-drill'],
      accommodations: [
        {
          id: 'acc-n1',
          kind: 'irrigation',
          label: 'STW roster, 3 slots a week',
          detail: 'Shared between four growers; Chirirbandar slot is Wednesday and Saturday',
          available: true,
        },
        {
          id: 'acc-n2',
          kind: 'storage',
          label: 'Home godown, 40 maund',
          detail: 'Dry floor, fumigated after the last potato season',
          available: true,
        },
        {
          id: 'acc-n3',
          kind: 'labor',
          label: '6 permanent hands',
          detail: 'Plus a harvest crew of 12 at BDT 450/day',
          available: true,
        },
        {
          id: 'acc-n4',
          kind: 'transport',
          label: 'Van to Bogura bazar, 35 min',
          detail: 'Bulk paddy goes on a rented truck to Naogaon',
          available: true,
        },
        {
          id: 'acc-n5',
          kind: 'credit',
          label: 'Cooperative input loan',
          detail: 'BDT 300,000 limit at 9 % service charge, repaid at harvest',
          available: true,
        },
      ],
      farmIds: ['farm-kaliganj', 'farm-barind', 'farm-chirirbandar'],
      ownerId: 'usr-nusrat',
      createdAt: '2025-10-11T05:30:00.000Z',
      updatedAt: isoDate(addDays(now, -2)),
    },
    {
      id: 'prj-southwest',
      name: 'Southwest Salinity & Vegetable Watch',
      summary:
        'Tidal land at Dumuria and the high-land vegetable yard at Jhikargacha. This project is about reading the salinity curve and the late-blight fog window rather than pushing yields.',
      region: 'Khulna Division',
      climateZone: 'SW',
      budgetBdt: 1180000,
      equipment: ['shallow-tubewell', 'two-wheel-tractor', 'knapsack-sprayer', 'water-pump', 'reaper'],
      accommodations: [
        {
          id: 'acc-s1',
          kind: 'irrigation',
          label: 'Tidal canal, gravity fed',
          detail: 'Free water on the high tide until February, then brackish',
          available: true,
        },
        {
          id: 'acc-s2',
          kind: 'storage',
          label: 'None on the yard',
          detail: 'Tomatoes go to the arat the same day; potatoes to cold store at Jhikargacha',
          available: false,
        },
        {
          id: 'acc-s3',
          kind: 'labor',
          label: '3 permanent, 8 seasonal',
          detail: 'Women’s groups available for tomato grading at BDT 380/day',
          available: true,
        },
        {
          id: 'acc-s4',
          kind: 'transport',
          label: 'Pickup to Jashore arat, 25 min',
          detail: 'Late-night loads reach Kawran Bazar the next morning',
          available: true,
        },
        {
          id: 'acc-s5',
          kind: 'machinery',
          label: 'Two-wheel tractor shared with two neighbours',
          detail: 'Each takes it for two days in rotation',
          available: true,
        },
      ],
      farmIds: ['farm-dumuria', 'farm-jhikargacha'],
      ownerId: 'usr-nusrat',
      createdAt: '2026-02-18T08:15:00.000Z',
      updatedAt: isoDate(addDays(now, -5)),
    },
  ]
}

/* -------------------------------------------------------------------- farms */

export function buildFarms(now: Date): Farm[] {
  return [
    {
      id: 'farm-kaliganj',
      projectId: 'prj-north',
      name: 'Kaliganj North Block',
      district: 'Bogura',
      upazila: 'Shajahanpur',
      area: { value: 4.4, unit: 'bigha' },
      soilType: 'silty-clay-loam',
      landType: 'medium',
      irrigationType: 'shallow-tubewell',
      waterSource: 'Shared STW, 3 slots a week',
      establishedYear: 2016,
      notes:
        'Aman followed by mustard is the settled pattern here. The east corner stays wet after heavy rain and has never been levelled properly.',
      createdAt: '2025-10-11T05:34:00.000Z',
      updatedAt: isoDate(addDays(now, -3)),
    },
    {
      id: 'farm-barind',
      projectId: 'prj-north',
      name: 'Tanore Barind Plots',
      district: 'Rajshahi',
      upazila: 'Tanore',
      area: { value: 3, unit: 'bigha' },
      soilType: 'calcareous',
      landType: 'high',
      irrigationType: 'deep-tubewell',
      waterSource: 'Community DTW, BDT 140/hour',
      establishedYear: 2019,
      notes:
        'Barind high land — the water table drops about four metres by March. Rabi crops are carried on two irrigations and residual moisture.',
      createdAt: '2025-10-11T05:40:00.000Z',
      updatedAt: isoDate(addDays(now, -8)),
    },
    {
      id: 'farm-chirirbandar',
      projectId: 'prj-north',
      name: 'Chirirbandar Boro Plots',
      district: 'Dinajpur',
      upazila: 'Chirirbandar',
      area: { value: 5, unit: 'bigha' },
      soilType: 'clay-loam',
      landType: 'medium',
      irrigationType: 'shallow-tubewell',
      waterSource: 'Own STW plus canal top-up in January',
      establishedYear: 2014,
      notes:
        'Heavy land, good for paddy. The northern quarter is distinctly acidic and has been limed once, four seasons ago.',
      createdAt: '2025-10-11T05:45:00.000Z',
      updatedAt: isoDate(addDays(now, -1)),
    },
    {
      id: 'farm-dumuria',
      projectId: 'prj-southwest',
      name: 'Dumuria Canal Plot',
      district: 'Khulna',
      upazila: 'Dumuria',
      area: { value: 6, unit: 'bigha' },
      soilType: 'saline-clay',
      landType: 'low',
      irrigationType: 'tidal',
      waterSource: 'Dumuria canal, tidal',
      establishedYear: 2011,
      notes:
        'Water enters and leaves on the tide. From late February the canal turns brackish and every irrigation has to be tested with an EC meter first.',
      createdAt: '2026-02-18T08:20:00.000Z',
      updatedAt: isoDate(addDays(now, -4)),
    },
    {
      id: 'farm-jhikargacha',
      projectId: 'prj-southwest',
      name: 'Jhikargacha Vegetable Yard',
      district: 'Jashore',
      upazila: 'Jhikargacha',
      area: { value: 3.5, unit: 'bigha' },
      soilType: 'silt-loam',
      landType: 'high',
      irrigationType: 'shallow-tubewell',
      waterSource: 'Own STW, 2 cusec',
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
  /** Days before "now" that the crop went in. */
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
    id: 'plant-kal-aman',
    farmId: 'farm-kaliganj',
    speciesId: 'aman-rice',
    variety: 'BRRI dhan49',
    plantedDaysAgo: 118,
    area: { value: 2.6, unit: 'bigha' },
    soilPh: 6.4,
    soilMoisture: 61,
    nitrogen: 38,
    phosphorus: 15,
    potassium: 52,
    organicMatter: 1.7,
    irrigationType: 'shallow-tubewell',
    previousCropId: 'jute',
    spacingCm: 20,
    seedRateKgPerAcre: 12,
    notes: 'Transplanted 20 cm x 15 cm. Jute stubble was incorporated before puddling.',
    createdDaysAgo: 122,
  },
  {
    id: 'plant-kal-mustard',
    farmId: 'farm-kaliganj',
    speciesId: 'mustard',
    variety: 'BARI Sarisha-14',
    plantedDaysAgo: 16,
    area: { value: 1.8, unit: 'bigha' },
    soilPh: 6.3,
    soilMoisture: 52,
    nitrogen: 34,
    phosphorus: 14,
    potassium: 48,
    organicMatter: 1.7,
    irrigationType: 'shallow-tubewell',
    previousCropId: 'aman-rice',
    spacingCm: 30,
    seedRateKgPerAcre: 3,
    notes: 'Sown on the eastern strips after Aman was cut. Line sowing on 30 cm rows.',
    createdDaysAgo: 16,
  },
  {
    id: 'plant-barind-lentil',
    farmId: 'farm-barind',
    speciesId: 'lentil',
    variety: 'BARI Masur-6',
    plantedDaysAgo: 11,
    area: { value: 1.5, unit: 'bigha' },
    soilPh: 7.1,
    soilMoisture: 33,
    nitrogen: 22,
    phosphorus: 9,
    potassium: 38,
    organicMatter: 0.7,
    irrigationType: 'deep-tubewell',
    previousCropId: 'fallow',
    spacingCm: 30,
    seedRateKgPerAcre: 12,
    notes: 'Seed treated with rhizobium before sowing. Carried on residual moisture so far.',
    createdDaysAgo: 11,
  },
  {
    id: 'plant-barind-mustard',
    farmId: 'farm-barind',
    speciesId: 'mustard',
    variety: 'Tori-7',
    plantedDaysAgo: 24,
    area: { value: 1.5, unit: 'bigha' },
    soilPh: 7.5,
    soilMoisture: 41,
    nitrogen: 26,
    phosphorus: 8,
    potassium: 40,
    organicMatter: 0.6,
    irrigationType: 'deep-tubewell',
    previousCropId: 'aman-rice',
    spacingCm: 25,
    seedRateKgPerAcre: 4,
    notes: 'Barind calcareous plot — zinc has been the problem here, not nitrogen.',
    createdDaysAgo: 24,
  },
  {
    id: 'plant-chiri-aman',
    farmId: 'farm-chirirbandar',
    speciesId: 'aman-rice',
    variety: 'BRRI dhan71',
    plantedDaysAgo: 96,
    area: { value: 3.2, unit: 'bigha' },
    soilPh: 5.6,
    soilMoisture: 68,
    nitrogen: 30,
    phosphorus: 11,
    potassium: 44,
    organicMatter: 1.4,
    irrigationType: 'shallow-tubewell',
    previousCropId: 'aman-rice',
    spacingCm: 20,
    seedRateKgPerAcre: 12,
    notes: 'Northern quarter of the plot. Acidic patch that was limed four seasons back.',
    createdDaysAgo: 96,
  },
  {
    id: 'plant-chiri-potato',
    farmId: 'farm-chirirbandar',
    speciesId: 'potato',
    variety: 'Diamant',
    plantedDaysAgo: 10,
    area: { value: 1.8, unit: 'bigha' },
    soilPh: 5.9,
    soilMoisture: 63,
    nitrogen: 33,
    phosphorus: 16,
    potassium: 58,
    organicMatter: 1.5,
    irrigationType: 'shallow-tubewell',
    previousCropId: 'potato',
    spacingCm: 60,
    seedRateKgPerAcre: 800,
    notes: 'Ridges opened 60 cm apart. Seed tubers from the cold store at Hili.',
    createdDaysAgo: 10,
  },
  {
    id: 'plant-dumuria-aman',
    farmId: 'farm-dumuria',
    speciesId: 'aman-rice',
    variety: 'BR11',
    plantedDaysAgo: 100,
    area: { value: 4, unit: 'bigha' },
    soilPh: 6.8,
    soilMoisture: 74,
    nitrogen: 36,
    phosphorus: 13,
    potassium: 55,
    organicMatter: 1.9,
    irrigationType: 'tidal',
    previousCropId: 'aman-rice',
    spacingCm: 22,
    seedRateKgPerAcre: 14,
    notes: 'Traditional variety on the lowest portion; the plot takes water on every spring tide.',
    createdDaysAgo: 100,
  },
  {
    id: 'plant-dumuria-tomato',
    farmId: 'farm-dumuria',
    speciesId: 'tomato',
    variety: 'BARI Tomato-14',
    plantedDaysAgo: 19,
    area: { value: 2, unit: 'bigha' },
    soilPh: 6.6,
    soilMoisture: 55,
    nitrogen: 32,
    phosphorus: 15,
    potassium: 60,
    organicMatter: 1.9,
    irrigationType: 'tidal',
    previousCropId: 'fallow',
    spacingCm: 60,
    seedRateKgPerAcre: 0.08,
    notes: 'Transplanted on the ridge tops after the aman harvest; staked with bamboo.',
    createdDaysAgo: 19,
  },
  {
    id: 'plant-jhik-tomato',
    farmId: 'farm-jhikargacha',
    speciesId: 'tomato',
    variety: 'Hybrid Ratan',
    plantedDaysAgo: 29,
    area: { value: 1.4, unit: 'bigha' },
    soilPh: 6.3,
    soilMoisture: 48,
    nitrogen: 31,
    phosphorus: 17,
    potassium: 57,
    organicMatter: 1.2,
    irrigationType: 'shallow-tubewell',
    previousCropId: 'tomato',
    spacingCm: 60,
    seedRateKgPerAcre: 0.07,
    notes: 'Same yard as last season — the wilt patches from last year are marked with sticks.',
    createdDaysAgo: 29,
  },
  {
    id: 'plant-jhik-potato',
    farmId: 'farm-jhikargacha',
    speciesId: 'potato',
    variety: 'BARI Alu-7 (Asterix)',
    plantedDaysAgo: 12,
    area: { value: 1.1, unit: 'bigha' },
    soilPh: 6.1,
    soilMoisture: 59,
    nitrogen: 35,
    phosphorus: 18,
    potassium: 62,
    organicMatter: 1.2,
    irrigationType: 'shallow-tubewell',
    previousCropId: 'potato',
    spacingCm: 60,
    seedRateKgPerAcre: 750,
    notes: 'Red-skinned variety for the table market at Jashore.',
    createdDaysAgo: 12,
  },
  {
    id: 'plant-jhik-mustard',
    farmId: 'farm-jhikargacha',
    speciesId: 'mustard',
    variety: 'BARI Sarisha-17',
    plantedDaysAgo: 21,
    area: { value: 1, unit: 'bigha' },
    soilPh: 6.2,
    soilMoisture: 46,
    nitrogen: 29,
    phosphorus: 12,
    potassium: 50,
    organicMatter: 1.2,
    irrigationType: 'shallow-tubewell',
    previousCropId: 'jute',
    spacingCm: 30,
    seedRateKgPerAcre: 3,
    notes: 'Border plot after jute; the strongest of the three mustard strips.',
    createdDaysAgo: 21,
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
  return [
    {
      id: 'mem-1',
      farmId: 'farm-kaliganj',
      email: 'rafiq.islam@farmo.dev',
      name: 'Rafiqul Islam',
      userId: 'usr-rafiq',
      role: 'agronomist',
      status: 'accepted',
      invitedById: 'usr-nusrat',
      invitedAt: isoDate(addDays(now, -40)),
      respondedAt: isoDate(addDays(now, -39)),
      message: 'Please keep the fertiliser plan and the irrigation log up to date.',
    },
    {
      id: 'mem-2',
      farmId: 'farm-kaliganj',
      email: 'shahida.begum@farmo.dev',
      name: 'Shahida Begum',
      userId: 'usr-shahida',
      role: 'manager',
      status: 'pending',
      invitedById: 'usr-nusrat',
      invitedAt: isoDate(addDays(now, -2)),
      respondedAt: null,
      message: 'Looking after the mustard strips and the irrigation roster.',
    },
    {
      id: 'mem-3',
      farmId: 'farm-barind',
      email: 'rafiq.islam@farmo.dev',
      name: 'Rafiqul Islam',
      userId: 'usr-rafiq',
      role: 'agronomist',
      status: 'accepted',
      invitedById: 'usr-nusrat',
      invitedAt: isoDate(addDays(now, -30)),
      respondedAt: isoDate(addDays(now, -30)),
      message: null,
    },
    {
      id: 'mem-4',
      farmId: 'farm-dumuria',
      email: 'tanvir.ahmed@farmo.dev',
      name: 'Tanvir Ahmed',
      userId: 'usr-tanvir',
      role: 'manager',
      status: 'accepted',
      invitedById: 'usr-nusrat',
      invitedAt: isoDate(addDays(now, -6)),
      respondedAt: isoDate(addDays(now, -5)),
      message: 'Vegetable side plus the tidal irrigation schedule.',
    },
    {
      id: 'mem-5',
      farmId: 'farm-jhikargacha',
      email: 'tanvir.ahmed@farmo.dev',
      name: 'Tanvir Ahmed',
      userId: 'usr-tanvir',
      role: 'manager',
      status: 'accepted',
      invitedById: 'usr-nusrat',
      invitedAt: isoDate(addDays(now, -6)),
      respondedAt: isoDate(addDays(now, -4)),
      message: null,
    },
    {
      id: 'mem-6',
      farmId: 'farm-chirirbandar',
      email: 'kamrul.hasan@example.com',
      name: null,
      userId: null,
      role: 'field-worker',
      status: 'rejected',
      invitedById: 'usr-nusrat',
      invitedAt: isoDate(addDays(now, -9)),
      respondedAt: isoDate(addDays(now, -6)),
      message: 'Declined — already working full time with another grower this season.',
    },
    {
      id: 'mem-7',
      farmId: 'farm-barind',
      email: 'sohel.rana@example.com',
      name: null,
      userId: null,
      role: 'viewer',
      status: 'revoked',
      invitedById: 'usr-nusrat',
      invitedAt: isoDate(addDays(now, -20)),
      respondedAt: isoDate(addDays(now, -14)),
      message: 'Access withdrawn after the input loan was settled.',
    },
    {
      id: 'mem-8',
      farmId: 'farm-jhikargacha',
      email: 'rafiq.islam@farmo.dev',
      name: 'Rafiqul Islam',
      userId: 'usr-rafiq',
      role: 'agronomist',
      status: 'pending',
      invitedById: 'usr-nusrat',
      invitedAt: isoDate(addDays(now, -1)),
      respondedAt: null,
      message: 'Need a second opinion on the wilt patches before the next tomato cycle.',
    },
  ]
}

export function buildNotifications(now: Date): Notification[] {
  return [
    {
      id: 'ntf-1',
      userId: 'usr-shahida',
      kind: 'invite',
      title: 'Nusrat Jahan invited you to Kaliganj North Block',
      body: 'Role: Manager. “Looking after the mustard strips and the irrigation roster.”',
      at: `${isoDate(addDays(now, -2))}T07:40:00.000Z`,
      read: false,
      membershipId: 'mem-2',
      farmId: 'farm-kaliganj',
    },
    {
      id: 'ntf-2',
      userId: 'usr-rafiq',
      kind: 'invite',
      title: 'Nusrat Jahan invited you to Jhikargacha Vegetable Yard',
      body: 'Role: Agronomist. “Need a second opinion on the wilt patches before the next tomato cycle.”',
      at: `${isoDate(addDays(now, -1))}T09:05:00.000Z`,
      read: false,
      membershipId: 'mem-8',
      farmId: 'farm-jhikargacha',
    },
    {
      id: 'ntf-3',
      userId: 'usr-nusrat',
      kind: 'decision',
      title: 'Tanvir Ahmed accepted the invitation to Dumuria Canal Plot',
      body: 'He now has manager access to the tidal plot and its irrigation log.',
      at: `${isoDate(addDays(now, -5))}T13:20:00.000Z`,
      read: false,
      membershipId: 'mem-4',
      farmId: 'farm-dumuria',
    },
    {
      id: 'ntf-4',
      userId: 'usr-nusrat',
      kind: 'decision',
      title: 'Kamrul Hasan declined the invitation to Chirirbandar Boro Plots',
      body: '“Already working full time with another grower this season.”',
      at: `${isoDate(addDays(now, -6))}T11:02:00.000Z`,
      read: true,
      membershipId: 'mem-6',
      farmId: 'farm-chirirbandar',
    },
    {
      id: 'ntf-5',
      userId: 'usr-rafiq',
      kind: 'system',
      title: 'Advice and risk recalculated for Chirirbandar Boro Plots',
      body: 'Soil pH came back at 5.6 on the northern quarter — lime is now on the plan.',
      at: `${isoDate(addDays(now, -2))}T08:15:00.000Z`,
      read: true,
      membershipId: null,
      farmId: 'farm-chirirbandar',
    },
  ]
}

/* ------------------------------------------------------------- change log */

export function buildOperations(now: Date): PropertyOperation[] {
  const at = (daysAgo: number, hh: number, mm: number) => `${isoDate(addDays(now, -daysAgo))}T${`${hh}`.padStart(2, '0')}:${`${mm}`.padStart(2, '0')}:00.000Z`
  return [
    {
      id: 'op-1',
      farmId: 'farm-kaliganj',
      entity: 'plant',
      entityId: 'plant-kal-aman',
      entityLabel: 'Aman rice BRRI dhan49',
      field: 'created',
      fieldLabel: 'Plant added',
      before: '—',
      after: 'Aman rice BRRI dhan49, 2.6 bigha',
      at: at(122, 6, 20),
      actorId: 'usr-nusrat',
      actorName: 'Nusrat Jahan',
      note: 'Transplanting finished on the east strips.',
    },
    {
      id: 'op-2',
      farmId: 'farm-kaliganj',
      entity: 'plant',
      entityId: 'plant-kal-aman',
      entityLabel: 'Aman rice BRRI dhan49',
      field: 'soilMoisture',
      fieldLabel: 'Soil moisture',
      before: '58 %',
      after: '61 %',
      at: at(3, 11, 45),
      actorId: 'usr-rafiq',
      actorName: 'Rafiqul Islam',
      note: 'Tensiometer reading after Wednesday’s irrigation slot.',
    },
    {
      id: 'op-3',
      farmId: 'farm-kaliganj',
      entity: 'plant',
      entityId: 'plant-kal-mustard',
      entityLabel: 'Mustard BARI Sarisha-14',
      field: 'created',
      fieldLabel: 'Plant added',
      before: '—',
      after: 'Mustard BARI Sarisha-14, 1.8 bigha',
      at: at(16, 7, 10),
      actorId: 'usr-nusrat',
      actorName: 'Nusrat Jahan',
      note: 'Line sown three days after the Aman was cut.',
    },
    {
      id: 'op-4',
      farmId: 'farm-chirirbandar',
      entity: 'plant',
      entityId: 'plant-chiri-aman',
      entityLabel: 'Aman rice BRRI dhan71 · northern quarter',
      field: 'soilPh',
      fieldLabel: 'Soil pH',
      before: '6.2',
      after: '5.6',
      at: at(2, 8, 15),
      actorId: 'usr-rafiq',
      actorName: 'Rafiqul Islam',
      note: 'Re-tested after the aman cut. The acid patch is wider than last season — lime is overdue.',
    },
    {
      id: 'op-5',
      farmId: 'farm-chirirbandar',
      entity: 'plant',
      entityId: 'plant-chiri-aman',
      entityLabel: 'Aman rice BRRI dhan71 · northern quarter',
      field: 'nitrogen',
      fieldLabel: 'Available nitrogen',
      before: '34 kg/ha',
      after: '30 kg/ha',
      at: at(2, 8, 22),
      actorId: 'usr-rafiq',
      actorName: 'Rafiqul Islam',
      note: 'Same sample as the pH reading.',
    },
    {
      id: 'op-6',
      farmId: 'farm-chirirbandar',
      entity: 'plant',
      entityId: 'plant-chiri-potato',
      entityLabel: 'Potato Diamant',
      field: 'created',
      fieldLabel: 'Plant added',
      before: '—',
      after: 'Potato Diamant, 1.8 bigha',
      at: at(10, 6, 45),
      actorId: 'usr-nusrat',
      actorName: 'Nusrat Jahan',
      note: 'Seed tubers from the Hili cold store, 800 kg/acre.',
    },
    {
      id: 'op-7',
      farmId: 'farm-barind',
      entity: 'plant',
      entityId: 'plant-barind-lentil',
      entityLabel: 'Lentil BARI Masur-6',
      field: 'soilMoisture',
      fieldLabel: 'Soil moisture',
      before: '38 %',
      after: '33 %',
      at: at(4, 16, 5),
      actorId: 'usr-rafiq',
      actorName: 'Rafiqul Islam',
      note: 'Barind plot drying faster than the two-irrigation plan assumed.',
    },
    {
      id: 'op-8',
      farmId: 'farm-barind',
      entity: 'plant',
      entityId: 'plant-barind-mustard',
      entityLabel: 'Mustard Tori-7',
      field: 'soilPh',
      fieldLabel: 'Soil pH',
      before: '7.3',
      after: '7.5',
      at: at(9, 10, 30),
      actorId: 'usr-rafiq',
      actorName: 'Rafiqul Islam',
      note: 'Calcareous patch reading; zinc deficiency symptoms match.',
    },
    {
      id: 'op-9',
      farmId: 'farm-jhikargacha',
      entity: 'plant',
      entityId: 'plant-jhik-tomato',
      entityLabel: 'Tomato Hybrid Ratan',
      field: 'nitrogen',
      fieldLabel: 'Available nitrogen',
      before: '28 kg/ha',
      after: '31 kg/ha',
      at: at(6, 9, 25),
      actorId: 'usr-tanvir',
      actorName: 'Tanvir Ahmed',
      note: 'Soil test from the Jashore laboratory came back higher than the field kit.',
    },
    {
      id: 'op-10',
      farmId: 'farm-jhikargacha',
      entity: 'plant',
      entityId: 'plant-jhik-potato',
      entityLabel: 'Potato BARI Alu-7 (Asterix)',
      field: 'area',
      fieldLabel: 'Area',
      before: '1 bigha',
      after: '1.1 bigha',
      at: at(12, 6, 15),
      actorId: 'usr-tanvir',
      actorName: 'Tanvir Ahmed',
      note: 'Took in the strip next to the mustard that was left fallow last year.',
    },
    {
      id: 'op-11',
      farmId: 'farm-dumuria',
      entity: 'plant',
      entityId: 'plant-dumuria-aman',
      entityLabel: 'Aman rice BR11',
      field: 'soilMoisture',
      fieldLabel: 'Soil moisture',
      before: '70 %',
      after: '74 %',
      at: at(5, 15, 40),
      actorId: 'usr-tanvir',
      actorName: 'Tanvir Ahmed',
      note: 'Spring tide came higher than predicted and the tail end stayed under water for a day.',
    },
    {
      id: 'op-12',
      farmId: 'farm-dumuria',
      entity: 'farm',
      entityId: 'farm-dumuria',
      entityLabel: 'Dumuria Canal Plot',
      field: 'waterSource',
      fieldLabel: 'Water source',
      before: 'Dumuria canal, tide gate',
      after: 'Dumuria canal, tidal',
      at: at(15, 8, 0),
      actorId: 'usr-nusrat',
      actorName: 'Nusrat Jahan',
      note: 'Tide gate has been repaired by the water development board; water now enters on its own.',
    },
  ]
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
 * the real engine, and the Chirirbandar block additionally keeps the version
 * that existed before the pH re-test, so the version history is genuine.
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
    const farmOps = operations
      .filter((op) => op.farmId === farm.id)
      .sort((a, b) => b.at.localeCompare(a.at))
    const recent = farmOps.filter((op) => (now.getTime() - new Date(op.at).getTime()) / 86400000 <= 7)

    if (farm.id === 'farm-chirirbandar') {
      // The state before the pH re-test: the acid patch read 6.2 and nitrogen 34.
      const earlier = plants.map((pl) =>
        pl.id === 'plant-chiri-aman' ? { ...pl, soilPh: 6.2, nitrogen: 34, updatedAt: isoDate(addDays(now, -3)) } : pl,
      )
      const beforeAt = addDays(now, -2)
      beforeAt.setHours(beforeAt.getHours() - 6)
      const v1 = analyzeFarm(projectOf(farm.id), farm, earlier, {
        now: beforeAt,
        origin: 'auto',
        actor: { id: 'usr-rafiq', name: 'Rafiqul Islam' },
      })
      advice.push({ ...v1.advice, createdAt: beforeAt.toISOString() })
      risk.push({ ...v1.risk, createdAt: beforeAt.toISOString() })
    }

    const current = analyzeFarm(projectOf(farm.id), farm, plants, {
      now,
      origin: 'auto',
      actor: { id: 'usr-rafiq', name: 'Rafiqul Islam' },
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
