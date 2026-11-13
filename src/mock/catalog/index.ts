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
  { id: 'tractor', label: 'Tractor with plough and power harrow', note: '4-wheel, 110 hp class', enables: 'Primary cultivation in 1–2 days per 10 acres' },
  { id: 'power-tiller', label: 'Two-wheel tractor', note: '12 hp, walk-behind', enables: 'Bed forming and shallow tillage in small plots' },
  { id: 'two-wheel-tractor', label: 'Compact utility tractor', note: '45 hp with loader', enables: 'Timely tillage and muck handling' },
  { id: 'shallow-tubewell', label: 'Shallow well and pump set', note: 'Borehole to 15 m, 2 cusec', enables: 'Dry-season irrigation to 20–30 acres' },
  { id: 'deep-tubewell', label: 'Deep well (shared)', note: 'Community well, scheduled supply', enables: 'Reliable dry-season supply' },
  { id: 'water-pump', label: 'Low-lift pump', note: 'For canal or reservoir lifting', enables: 'Supplementary irrigation from surface water' },
  { id: 'knapsack-sprayer', label: 'Knapsack sprayer', note: '16 L, two units', enables: 'Timely plant protection at threshold' },
  { id: 'seed-drill', label: 'Seed drill / row planter', note: 'Conventional or minimum tillage', enables: 'Even stand and lower seed rate' },
  { id: 'reaper', label: 'Combine header / reaper', note: 'Contracted harvest', enables: 'Harvest 10 acres in a day' },
  { id: 'pedal-thresher', label: 'Small thresher', note: 'Farm-scale', enables: 'Threshing within a day of cutting' },
  { id: 'thresher', label: 'Mobile thresher', note: 'Contract available', enables: 'Same-day threshing of grain crops' },
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
    placeholder: 'Canal water on a rotation',
    detailHint: 'Capacity, schedule, and cost per hour',
  },
  {
    id: 'storage',
    label: 'Storage',
    placeholder: 'Grain store, 40 tonnes',
    detailHint: 'Capacity and protection from damp',
  },
  {
    id: 'labor',
    label: 'Labour',
    placeholder: 'Two permanent hands plus a harvest crew',
    detailHint: 'Permanent versus seasonal, and the daily rate',
  },
  {
    id: 'machinery',
    label: 'Machinery',
    placeholder: 'Compact tractor shared with two neighbours',
    detailHint: 'Owned or contract, and the sharing arrangement',
  },
  {
    id: 'transport',
    label: 'Transport',
    placeholder: 'Trailer to the co-op, 30 minutes',
    detailHint: 'Distance to the nearest buying point',
  },
  {
    id: 'credit',
    label: 'Credit line',
    placeholder: 'Input loan through the co-operative',
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
  { id: 'winter-wheat', label: 'Winter wheat' },
  { id: 'rice', label: 'Rice (paddy)' },
  { id: 'maize', label: 'Maize' },
  { id: 'soybean', label: 'Soybean' },
  { id: 'potato', label: 'Potato' },
  { id: 'tomato', label: 'Tomato' },
  { id: 'canola', label: 'Winter canola' },
  { id: 'lentil', label: 'Winter lentil' },
] as const
