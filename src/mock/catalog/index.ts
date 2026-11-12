import type { EquipmentId, TeamRole } from '../types'

export * from './species'
export * from './geography'

/* -------------------------------------------------------------- equipment */

export interface EquipmentInfo {
  id: EquipmentId
  label: string
  note: string
  /** Which operations it makes possible. */
  enables: string
}

export const EQUIPMENT: EquipmentInfo[] = [
  { id: 'tractor', label: 'Tractor with rotavator', note: '4-wheel, 45 hp class', enables: 'Land preparation in 1–2 days per bigha' },
  { id: 'power-tiller', label: 'Power tiller', note: 'Two-wheel, 12 hp', enables: 'Puddling and shallow tillage' },
  { id: 'two-wheel-tractor', label: 'Two-wheel tractor with implements', note: 'Plough, ladder, pump set', enables: 'Timely tillage in small plots' },
  { id: 'shallow-tubewell', label: 'Shallow tubewell (STW)', note: '2 cusec, diesel or electric', enables: 'Dry-season irrigation to 10–20 bigha' },
  { id: 'deep-tubewell', label: 'Deep tubewell (DTW)', note: 'Shared community well', enables: 'Reliable dry-season supply' },
  { id: 'water-pump', label: 'Low-lift pump', note: 'For canal or pond lifting', enables: 'Supplementary irrigation from surface water' },
  { id: 'knapsack-sprayer', label: 'Knapsack sprayer', note: '16 L, 2 units', enables: 'Timely plant protection at threshold' },
  { id: 'seed-drill', label: 'Seed drill / bed planter', note: 'Rabi row crops', enables: 'Even stand and lower seed rate' },
  { id: 'reaper', label: 'Reaper', note: 'Rice and wheat harvest', enables: 'Harvest 1 bigha in 2 hours' },
  { id: 'pedal-thresher', label: 'Pedal thresher', note: 'Family-scale', enables: 'Threshing within a day of cutting' },
  { id: 'thresher', label: 'Power thresher', note: 'Contract available', enables: 'Same-day threshing of paddy and maize' },
]

export const EQUIPMENT_BY_ID = new Map(EQUIPMENT.map((e) => [e.id, e]))

/* --------------------------------------------------------- accommodations */

export interface AccommodationKindInfo {
  id: 'irrigation' | 'storage' | 'labor' | 'machinery' | 'transport' | 'credit'
  label: string
  placeholder: string
  detailHint: string
}

export const ACCOMMODATION_KINDS: AccommodationKindInfo[] = [
  {
    id: 'irrigation',
    label: 'Irrigation access',
    placeholder: 'Canal water available on rotation',
    detailHint: 'Capacity, schedule, and cost per hour',
  },
  {
    id: 'storage',
    label: 'Storage',
    placeholder: 'Home godown, 40 maund',
    detailHint: 'Capacity and protection from damp',
  },
  {
    id: 'labor',
    label: 'Labour',
    placeholder: '4 permanent hands plus harvest crew',
    detailHint: 'Permanent versus seasonal, and daily wage',
  },
  {
    id: 'machinery',
    label: 'Machinery',
    placeholder: 'Power tiller shared with two neighbours',
    detailHint: 'Owned or contract, and the sharing arrangement',
  },
  {
    id: 'transport',
    label: 'Transport',
    placeholder: 'Van to Bazar, 30 min',
    detailHint: 'Distance to the nearest buying point',
  },
  {
    id: 'credit',
    label: 'Credit line',
    placeholder: 'Input loan through the cooperative',
    detailHint: 'Limit, interest, and repayment timing',
  },
]

/* ------------------------------------------------------------------ roles */

export interface TeamRoleInfo {
  id: TeamRole
  label: string
  description: string
  canEdit: boolean
}

export const TEAM_ROLES: TeamRoleInfo[] = [
  { id: 'agronomist', label: 'Agronomist', description: 'Edits plant and farm properties, regenerates advice, sees every tab.', canEdit: true },
  { id: 'manager', label: 'Farm manager', description: 'Day-to-day operations: plants, irrigation notes, teams.', canEdit: true },
  { id: 'field-worker', label: 'Field worker', description: 'Reads advice and records field observations. No property edits.', canEdit: false },
  { id: 'viewer', label: 'Viewer', description: 'Read-only access for lenders, buyers, or family members.', canEdit: false },
]

export const TEAM_ROLE_BY_ID = new Map(TEAM_ROLES.map((r) => [r.id, r]))

/* -------------------------------------------------------- previous crops */

/** Options in the "previous crop" selector — includes fallow and a non-crop. */
export const PREVIOUS_CROP_OPTIONS = [
  { id: 'fallow', label: 'Fallow / rested' },
  { id: 'aman-rice', label: 'Aman rice' },
  { id: 'boro-rice', label: 'Boro rice' },
  { id: 'jute', label: 'Jute' },
  { id: 'potato', label: 'Potato' },
  { id: 'tomato', label: 'Tomato' },
  { id: 'mustard', label: 'Mustard' },
  { id: 'lentil', label: 'Lentil' },
  { id: 'maize', label: 'Maize' },
] as const
