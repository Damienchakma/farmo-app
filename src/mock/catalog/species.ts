import type { ClimateZone, GrowthStageId, Severity } from '../types'

/**
 * Crop catalogue. Numbers are agronomically grounded for Bangladesh conditions:
 * nutrient needs in elemental kg/acre (P as P2O5, K as K2O), water use in mm for
 * the whole season, Kc values from FAO-56 style stage curves.
 */

export interface SpeciesStage {
  id: GrowthStageId
  label: string
  /** Day of season the stage starts (inclusive). */
  fromDay: number
  /** Day of season the stage ends (exclusive). */
  toDay: number
  /** Crop coefficient driving crop water use (ETc = Kc x ET0). */
  kc: number
  /** Water stress in this stage costs the most yield. */
  waterCritical: boolean
  note: string
}

export interface PestProfile {
  id: string
  name: string
  kind: 'pest' | 'disease'
  /** Favourable window for the organism. */
  tempRange: [number, number]
  humidityMin: number
  /** Rainfall condition that favours it. */
  rainFavoured: boolean
  /** Stages when the crop is most exposed. */
  stageIds: GrowthStageId[]
  /** Base severity before weather and management modifiers. */
  baseSeverity: Severity
  sign: string
  control: string[]
}

export interface SpeciesVariety {
  name: string
  durationDays: number
  note: string
  /** Typical yield at the farm gate, maund per acre (1 maund = 37.32 kg). */
  yieldMaundPerAcre: number
}

export interface Species {
  id: string
  name: string
  localName: string
  category: 'cereal' | 'fibre' | 'tuber' | 'vegetable' | 'oilseed' | 'pulse'
  /** Grouping used by the rotation rules (same group = no repeat). */
  rotationGroup: string
  season: 'kharif' | 'rabi' | 'boro'
  durationDays: number
  varieties: SpeciesVariety[]
  stages: SpeciesStage[]
  /** Months (1-12) when planting is normal somewhere in the country. */
  plantingMonths: number[]
  /** Zone-specific planting window annotations shown in Timing advice. */
  zoneWindows: Partial<Record<ClimateZone, string>>
  /** Elemental nutrient requirement, kg per acre for the whole season. */
  nutrientNeed: { n: number; p: number; k: number; s: number; zn: number }
  /** Split schedule shares for N, matched to stage. */
  nitrogenSplits: Array<{ atStage: GrowthStageId; share: number }>
  totalWaterMm: number
  optimalPh: [number, number]
  phTolerance: [number, number]
  /** EC of saturated extract above which yield loss starts (dS/m). */
  salinityLimitDsm: number
  pests: PestProfile[]
  /** Farm-gate price, BDT per maund. */
  marketBaseBdtPerMaund: number
  /** 0-1; how violently the price moves within a season. */
  marketVolatility: number
  storageLifeDays: number
  rotationNote: string
  handlingNote: string
}

const RICE_STAGES: SpeciesStage[] = [
  { id: 'seedling', label: 'Seedling', fromDay: 0, toDay: 20, kc: 0.6, waterCritical: false, note: 'Keep shallow water after establishment; deep flooding weakens tillers.' },
  { id: 'tillering', label: 'Tillering', fromDay: 20, toDay: 55, kc: 1.0, waterCritical: false, note: 'The stage that decides panicle number per square metre.' },
  { id: 'panicle-initiation', label: 'Panicle initiation', fromDay: 55, toDay: 75, kc: 1.15, waterCritical: true, note: 'Most water- and nitrogen-sensitive window of the whole season.' },
  { id: 'flowering', label: 'Flowering', fromDay: 75, toDay: 95, kc: 1.2, waterCritical: true, note: 'Heat above 35 °C at flowering raises spikelet sterility sharply.' },
  { id: 'grain-filling', label: 'Grain filling', fromDay: 95, toDay: 120, kc: 1.0, waterCritical: true, note: 'Water stress here reduces grain weight, not grain number.' },
  { id: 'maturity', label: 'Maturity', fromDay: 120, toDay: 999, kc: 0.75, waterCritical: false, note: 'Drain 10–12 days before harvest for even ripening and easier cutting.' },
]

export const SPECIES: Species[] = [
  {
    id: 'aman-rice',
    name: 'Aman rice',
    localName: 'Aman dhan',
    category: 'cereal',
    rotationGroup: 'rice',
    season: 'kharif',
    durationDays: 135,
    varieties: [
      { name: 'BRRI dhan49', durationDays: 135, note: 'Photoperiod-sensitive, dependable in medium land.', yieldMaundPerAcre: 48 },
      { name: 'BRRI dhan71', durationDays: 120, note: 'Short duration; drought-escaping option in Barind.', yieldMaundPerAcre: 45 },
      { name: 'BR11', durationDays: 145, note: 'Traditional choice for low, flood-prone plots.', yieldMaundPerAcre: 42 },
    ],
    stages: RICE_STAGES,
    plantingMonths: [6, 7, 8],
    zoneWindows: {
      NW: 'Transplant 25 June – 15 July to escape the August drought gap.',
      SW: 'Transplant 15 July – 10 August after the tidal water recedes.',
      N: 'Transplant July; late August planting pushes flowering into cold stress.',
    },
    nutrientNeed: { n: 36, p: 12, k: 16, s: 5, zn: 0.5 },
    nitrogenSplits: [
      { atStage: 'seedling', share: 0.34 },
      { atStage: 'tillering', share: 0.33 },
      { atStage: 'panicle-initiation', share: 0.33 },
    ],
    totalWaterMm: 1050,
    optimalPh: [5.5, 6.5],
    phTolerance: [4.8, 7.8],
    salinityLimitDsm: 3.2,
    pests: [
      {
        id: 'blast',
        name: 'Rice blast',
        kind: 'disease',
        tempRange: [20, 28],
        humidityMin: 82,
        rainFavoured: true,
        stageIds: ['tillering', 'panicle-initiation'],
        baseSeverity: 'moderate',
        sign: 'Diamond-shaped grey-centred lesions on leaves; neck rot at panicle.',
        control: ['Use a blast-tolerant variety next season', 'Avoid late evening irrigation', 'Tricyclazole 75 WP at 0.6 g/L if lesions exceed 5 per hill'],
      },
      {
        id: 'bacterial-leaf-blight',
        name: 'Bacterial leaf blight',
        kind: 'disease',
        tempRange: [25, 34],
        humidityMin: 78,
        rainFavoured: true,
        stageIds: ['tillering', 'panicle-initiation', 'flowering'],
        baseSeverity: 'moderate',
        sign: 'Water-soaked yellow margins running down the leaf from the tip.',
        control: ['Stop nitrogen top-dressing until the field drains', 'Drain standing water for 3–4 days', 'Do not move through a wet field — it spreads on boots and tools'],
      },
      {
        id: 'brown-planthopper',
        name: 'Brown planthopper',
        kind: 'pest',
        tempRange: [25, 31],
        humidityMin: 80,
        rainFavoured: false,
        stageIds: ['tillering', 'panicle-initiation'],
        baseSeverity: 'low',
        sign: 'Hopper burn patches — plants drying in circular islands.',
        control: ['Split nitrogen rather than applying it all at once', 'Drain the field; hoppers dislike exposed stems', 'Imidacloprid seed treatment next season'],
      },
    ],
    marketBaseBdtPerMaund: 1150,
    marketVolatility: 0.2,
    storageLifeDays: 180,
    rotationNote: 'Never follow rice with rice where a rabi crop is possible — it is the single largest source of yield decline in the paddy belt.',
    handlingNote: 'Dry paddy to 14 % moisture before storage; above that, aflatoxin risk rises within three weeks.',
  },
  {
    id: 'boro-rice',
    name: 'Boro rice',
    localName: 'Boro dhan',
    category: 'cereal',
    rotationGroup: 'rice',
    season: 'boro',
    durationDays: 160,
    varieties: [
      { name: 'BRRI dhan29', durationDays: 160, note: 'Highest yield potential, heavy water feeder.', yieldMaundPerAcre: 62 },
      { name: 'BRRI dhan28', durationDays: 140, note: 'Escapes the late-April heat; preferred with limited water.', yieldMaundPerAcre: 55 },
    ],
    stages: [
      { id: 'seedling', label: 'Seedling', fromDay: 0, toDay: 25, kc: 0.65, waterCritical: false, note: 'Maintain 2–3 cm water after transplanting to anchor seedlings.' },
      { id: 'tillering', label: 'Tillering', fromDay: 25, toDay: 65, kc: 1.05, waterCritical: false, note: 'Alternate wetting and drying here saves 18–22 % irrigation water.' },
      { id: 'panicle-initiation', label: 'Panicle initiation', fromDay: 65, toDay: 90, kc: 1.18, waterCritical: true, note: 'Do not let the field crack at this stage.' },
      { id: 'flowering', label: 'Flowering', fromDay: 90, toDay: 115, kc: 1.2, waterCritical: true, note: 'Cold below 15 °C at flowering causes partial spikelet sterility.' },
      { id: 'grain-filling', label: 'Grain filling', fromDay: 115, toDay: 145, kc: 1.0, waterCritical: true, note: 'Keep 5 cm water until the dough stage.' },
      { id: 'maturity', label: 'Maturity', fromDay: 145, toDay: 999, kc: 0.8, waterCritical: false, note: 'Drain two weeks before harvest.' },
    ],
    plantingMonths: [12, 1, 2],
    zoneWindows: {
      NW: 'Seedbed in late November; transplant by 15 January to miss April heat.',
      SW: 'Transplant mid-December while canal water is still fresh.',
      N: 'Transplant January — haor areas should finish before 10 February.',
    },
    nutrientNeed: { n: 50, p: 15, k: 22, s: 6, zn: 0.6 },
    nitrogenSplits: [
      { atStage: 'seedling', share: 0.3 },
      { atStage: 'tillering', share: 0.35 },
      { atStage: 'panicle-initiation', share: 0.35 },
    ],
    totalWaterMm: 1320,
    optimalPh: [5.5, 6.5],
    phTolerance: [4.8, 7.6],
    salinityLimitDsm: 2.4,
    pests: [
      {
        id: 'stem-borer',
        name: 'Yellow stem borer',
        kind: 'pest',
        tempRange: [22, 32],
        humidityMin: 70,
        rainFavoured: false,
        stageIds: ['tillering', 'panicle-initiation'],
        baseSeverity: 'moderate',
        sign: 'Dead hearts in tillering, white heads after flowering.',
        control: ['Clip seedling tips before transplanting', 'Pheromone traps at 5 per bigha', 'Cartap hydrochloride 50 SP if dead hearts exceed 5 %'],
      },
      {
        id: 'blast',
        name: 'Rice blast',
        kind: 'disease',
        tempRange: [20, 28],
        humidityMin: 82,
        rainFavoured: true,
        stageIds: ['tillering', 'panicle-initiation'],
        baseSeverity: 'low',
        sign: 'Diamond lesions; neck breakage late in the season.',
        control: ['Avoid excess nitrogen in cloudy weather', 'Keep silicon levels up through ash or slag'],
      },
      {
        id: 'cold-sterility',
        name: 'Cold-induced sterility',
        kind: 'disease',
        tempRange: [-5, 16],
        humidityMin: 0,
        rainFavoured: false,
        stageIds: ['flowering'],
        baseSeverity: 'high',
        sign: 'Empty glumes with normal-looking panicles; no grain set.',
        control: ['Shift planting so flowering falls after 10 April', 'Maintain deeper water at night to buffer temperature'],
      },
    ],
    marketBaseBdtPerMaund: 1250,
    marketVolatility: 0.18,
    storageLifeDays: 180,
    rotationNote: 'Boro followed by a short-duration mungbean or jute adds nitrogen and breaks the paddy pest cycle.',
    handlingNote: 'Late-harvested Boro in May needs immediate drying; humid pre-monsoon air re-wets stored paddy overnight.',
  },
  {
    id: 'jute',
    name: 'Jute',
    localName: 'Tossa pat',
    category: 'fibre',
    rotationGroup: 'fibre',
    season: 'kharif',
    durationDays: 120,
    varieties: [
      { name: 'O-9897 (Tossa)', durationDays: 120, note: 'Standard tossa; good fibre strength.', yieldMaundPerAcre: 27 },
      { name: 'BJRI Tossa pat-8', durationDays: 115, note: 'Tolerant to stem rot, suits early sowing.', yieldMaundPerAcre: 29 },
    ],
    stages: [
      { id: 'seedling', label: 'Seedling', fromDay: 0, toDay: 25, kc: 0.5, waterCritical: false, note: 'Thin to 8–10 cm spacing three weeks after sowing.' },
      { id: 'vegetative', label: 'Vegetative', fromDay: 25, toDay: 60, kc: 0.95, waterCritical: false, note: 'Fast height gain; this is where top-dressing pays.' },
      { id: 'stem-elongation', label: 'Stem elongation', fromDay: 60, toDay: 95, kc: 1.1, waterCritical: true, note: 'Drought here shortens fibre length and cuts grade.' },
      { id: 'flowering', label: 'Flowering', fromDay: 95, toDay: 110, kc: 1.05, waterCritical: false, note: 'Harvest at small-pod stage for the best grade.' },
      { id: 'maturity', label: 'Maturity', fromDay: 110, toDay: 999, kc: 0.8, waterCritical: false, note: 'Earlier cutting gives finer, brighter fibre.' },
    ],
    plantingMonths: [3, 4],
    zoneWindows: {
      NW: 'Sow 15 March – 10 April; later sowing pushes harvest into monsoon.',
      SC: 'Sow after 20 March — jute needs 3–4 weeks before the first heavy rain.',
    },
    nutrientNeed: { n: 24, p: 8, k: 14, s: 4, zn: 0.3 },
    nitrogenSplits: [
      { atStage: 'seedling', share: 0.5 },
      { atStage: 'vegetative', share: 0.5 },
    ],
    totalWaterMm: 520,
    optimalPh: [5.8, 6.8],
    phTolerance: [5.0, 7.6],
    salinityLimitDsm: 2.0,
    pests: [
      {
        id: 'stem-rot',
        name: 'Stem rot',
        kind: 'disease',
        tempRange: [26, 34],
        humidityMin: 80,
        rainFavoured: true,
        stageIds: ['vegetative', 'stem-elongation'],
        baseSeverity: 'moderate',
        sign: 'Brown-black lesions at the collar; plants wilt in patches.',
        control: ['Improve drainage before June', 'Seed treatment with carbendazim', 'Rogue out and burn affected plants'],
      },
      {
        id: 'hairy-caterpillar',
        name: 'Hairy caterpillar',
        kind: 'pest',
        tempRange: [24, 33],
        humidityMin: 65,
        rainFavoured: false,
        stageIds: ['vegetative', 'stem-elongation'],
        baseSeverity: 'low',
        sign: 'Skeletonised leaves; fuzzy black caterpillars under the leaves.',
        control: ['Hand-pick egg masses in the morning', 'Light trap at 1 per bigha during the moth flight'],
      },
    ],
    marketBaseBdtPerMaund: 3200,
    marketVolatility: 0.42,
    storageLifeDays: 300,
    rotationNote: 'Jute is the best legume-friendly predecessor for Aman rice: it opens the canopy, drops leaves, and breaks paddy stem-borer carryover.',
    handlingNote: 'Ribbon-retting in clean water gives a grade jump of one band; retting in muddy water costs you the premium.',
  },
  {
    id: 'potato',
    name: 'Potato',
    localName: 'Alu',
    category: 'tuber',
    rotationGroup: 'root',
    season: 'rabi',
    durationDays: 95,
    varieties: [
      { name: 'Diamant', durationDays: 90, note: 'Cold-store standard; needs late-blight management.', yieldMaundPerAcre: 195 },
      { name: 'BARI Alu-7 (Asterix)', durationDays: 95, note: 'Richer red skin, better table-market price.', yieldMaundPerAcre: 185 },
    ],
    stages: [
      { id: 'seedling', label: 'Sprouting', fromDay: 0, toDay: 20, kc: 0.45, waterCritical: false, note: 'Keep the ridge moist but not saturated; seed pieces rot easily.' },
      { id: 'vegetative', label: 'Vegetative', fromDay: 20, toDay: 45, kc: 0.85, waterCritical: false, note: 'Earthing up at 30 days keeps tubers shallow and greening-free.' },
      { id: 'tuber-bulking', label: 'Tuber bulking', fromDay: 45, toDay: 80, kc: 1.15, waterCritical: true, note: 'Water stress here cuts marketable tuber size, not count.' },
      { id: 'maturity', label: 'Maturity', fromDay: 80, toDay: 999, kc: 0.8, waterCritical: false, note: 'Stop irrigation 10 days before haulm cutting to set skin.' },
    ],
    plantingMonths: [11, 12],
    zoneWindows: {
      NW: 'Plant 10 November – 5 December; late planting collides with late blight in January.',
      SW: 'Plant from 15 November; avoid waterlogged ridges on tidal land.',
      N: 'Plant late October in Mymensingh — earliest harvest price is 40 % higher.',
    },
    nutrientNeed: { n: 40, p: 18, k: 32, s: 6, zn: 0.6 },
    nitrogenSplits: [
      { atStage: 'vegetative', share: 0.6 },
      { atStage: 'tuber-bulking', share: 0.4 },
    ],
    totalWaterMm: 420,
    optimalPh: [5.2, 6.5],
    phTolerance: [4.5, 7.2],
    salinityLimitDsm: 1.7,
    pests: [
      {
        id: 'late-blight',
        name: 'Late blight',
        kind: 'disease',
        tempRange: [12, 20],
        humidityMin: 85,
        rainFavoured: true,
        stageIds: ['vegetative', 'tuber-bulking'],
        baseSeverity: 'high',
        sign: 'Water-soaked leaf patches with a white fringe underneath; a sweet rotting smell in the field.',
        control: ['Preventive mancozeb 80 WP at 2 g/L every 7 days in wet weather', 'Switch to metalaxyl + mancozeb once lesions appear', 'Never irrigate in the evening before a foggy night'],
      },
      {
        id: 'cutworm',
        name: 'Cutworm',
        kind: 'pest',
        tempRange: [18, 30],
        humidityMin: 55,
        rainFavoured: false,
        stageIds: ['seedling', 'vegetative'],
        baseSeverity: 'low',
        sign: 'Seedlings cut at soil level, gaps in the row.',
        control: ['Hand-pick larvae at dusk', 'Chlorpyrifos bait along the ridge line only where damage is localised'],
      },
    ],
    marketBaseBdtPerMaund: 900,
    marketVolatility: 0.58,
    storageLifeDays: 120,
    rotationNote: 'Potato after potato builds up late blight inoculum and scab; follow with a cereal to break both.',
    handlingNote: 'Cure potatoes for 12–14 days in the shade before cold storage — rushed storage loses 8–10 % to rot.',
  },
  {
    id: 'tomato',
    name: 'Tomato',
    localName: 'Tomato',
    category: 'vegetable',
    rotationGroup: 'solanaceae',
    season: 'rabi',
    durationDays: 115,
    varieties: [
      { name: 'BARI Tomato-14', durationDays: 110, note: 'Firm, crack-tolerant, good for long-distance transport.', yieldMaundPerAcre: 430 },
      { name: 'BARI Tomato-2', durationDays: 115, note: 'Sweeter for the fresh market; thinner skin.', yieldMaundPerAcre: 380 },
      { name: 'Hybrid Ratan', durationDays: 120, note: 'Heavy yield under plastic-tunnel seedling raising.', yieldMaundPerAcre: 520 },
    ],
    stages: [
      { id: 'seedling', label: 'Transplant shock', fromDay: 0, toDay: 14, kc: 0.55, waterCritical: false, note: 'Water daily for the first week to hold establishment.' },
      { id: 'vegetative', label: 'Vegetative', fromDay: 14, toDay: 45, kc: 0.95, waterCritical: false, note: 'Staking and first truss pruning decide fruit quality.' },
      { id: 'flowering', label: 'Flowering', fromDay: 45, toDay: 70, kc: 1.1, waterCritical: true, note: 'Uneven irrigation here causes cracked fruit and blossom-end rot.' },
      { id: 'podding', label: 'Fruiting', fromDay: 70, toDay: 100, kc: 1.15, waterCritical: true, note: 'This is the window where fruit borer damage turns a good crop into seconds.' },
      { id: 'maturity', label: 'Harvest', fromDay: 100, toDay: 999, kc: 0.9, waterCritical: false, note: 'Pick at light pink for market; full red only for local sale.' },
    ],
    plantingMonths: [10, 11],
    zoneWindows: {
      NW: 'Raise seedlings in September, transplant 20 October – 15 November.',
      SW: 'Transplant from late October; salt-tolerant seedling raising under tunnel is safer.',
      SE: 'Cumilla growers transplant October for the November–February price window.',
    },
    nutrientNeed: { n: 36, p: 16, k: 30, s: 5, zn: 0.5 },
    nitrogenSplits: [
      { atStage: 'vegetative', share: 0.4 },
      { atStage: 'flowering', share: 0.35 },
      { atStage: 'podding', share: 0.25 },
    ],
    totalWaterMm: 460,
    optimalPh: [6.0, 6.8],
    phTolerance: [5.5, 7.5],
    salinityLimitDsm: 2.5,
    pests: [
      {
        id: 'fruit-borer',
        name: 'Tomato fruit borer',
        kind: 'pest',
        tempRange: [24, 33],
        humidityMin: 60,
        rainFavoured: false,
        stageIds: ['flowering', 'podding'],
        baseSeverity: 'high',
        sign: 'Small entry holes near the calyx with frass; fruit rots from inside.',
        control: ['Install pheromone traps at 8 per bigha', 'Spray emamectin benzoate at dusk, not mid-day', 'Collect and destroy infested fruit twice a week'],
      },
      {
        id: 'late-blight-tomato',
        name: 'Late blight',
        kind: 'disease',
        tempRange: [12, 21],
        humidityMin: 85,
        rainFavoured: true,
        stageIds: ['vegetative', 'flowering'],
        baseSeverity: 'moderate',
        sign: 'Greasy grey-brown leaf patches spreading fast after fog.',
        control: ['Mancozeb preventive sprays through December fog', 'Keep rows open to wind — 60 cm spacing minimum'],
      },
      {
        id: 'leaf-curl',
        name: 'Tomato leaf curl virus',
        kind: 'disease',
        tempRange: [26, 36],
        humidityMin: 45,
        rainFavoured: false,
        stageIds: ['seedling', 'vegetative'],
        baseSeverity: 'moderate',
        sign: 'Upward curling, thickened leathery leaves, no fruit set on affected branches.',
        control: ['Control whitefly with yellow sticky traps', 'Use virus-tolerant variety next season', 'Remove infected plants early — there is no cure'],
      },
    ],
    marketBaseBdtPerMaund: 1400,
    marketVolatility: 0.72,
    storageLifeDays: 14,
    rotationNote: 'Tomato after tomato or after another solanaceous crop multiplies soil-borne wilt and leaf curl; rotate with a cereal or a legume for two seasons.',
    handlingNote: 'Grading by size the same day as picking is worth 10–15 % at Kawran Bazar; mixed lots sell at seconds prices.',
  },
  {
    id: 'mustard',
    name: 'Mustard',
    localName: 'Sarisha',
    category: 'oilseed',
    rotationGroup: 'oilseed',
    season: 'rabi',
    durationDays: 82,
    varieties: [
      { name: 'BARI Sarisha-14', durationDays: 80, note: 'Short duration, fits after Aman rice without delaying Boro.', yieldMaundPerAcre: 16 },
      { name: 'BARI Sarisha-17', durationDays: 85, note: 'Higher oil content, slightly later.', yieldMaundPerAcre: 18 },
      { name: 'Tori-7', durationDays: 75, note: 'Earliest; good for late Aman fields.', yieldMaundPerAcre: 13 },
    ],
    stages: [
      { id: 'seedling', label: 'Seedling', fromDay: 0, toDay: 18, kc: 0.5, waterCritical: false, note: 'Thin to 10–12 cm; thick stands invite aphid.' },
      { id: 'vegetative', label: 'Rosette', fromDay: 18, toDay: 40, kc: 0.9, waterCritical: false, note: 'One irrigation at rosette roughly doubles yield in Barind.' },
      { id: 'flowering', label: 'Flowering', fromDay: 40, toDay: 62, kc: 1.05, waterCritical: true, note: 'Aphid damage at flowering is the main yield thief.' },
      { id: 'podding', label: 'Pod filling', fromDay: 62, toDay: 78, kc: 0.95, waterCritical: true, note: 'Moisture here fills the seed; dry soil gives shrivelled, low-oil gram.' },
      { id: 'maturity', label: 'Maturity', fromDay: 78, toDay: 999, kc: 0.7, waterCritical: false, note: 'Harvest when 70 % of pods turn light brown — shattering starts after that.' },
    ],
    plantingMonths: [10, 11],
    zoneWindows: {
      NW: 'Sow 10 October – 15 November on Barind high land; later sowing meets aphid before podding.',
      SW: 'Sow by 20 November; earlier sowing in wet land invites foot rot.',
    },
    nutrientNeed: { n: 20, p: 10, k: 8, s: 6, zn: 0.3 },
    nitrogenSplits: [
      { atStage: 'seedling', share: 0.5 },
      { atStage: 'vegetative', share: 0.5 },
    ],
    totalWaterMm: 230,
    optimalPh: [6.0, 7.0],
    phTolerance: [5.5, 7.6],
    salinityLimitDsm: 2.2,
    pests: [
      {
        id: 'mustard-aphid',
        name: 'Mustard aphid',
        kind: 'pest',
        tempRange: [8, 20],
        humidityMin: 55,
        rainFavoured: false,
        stageIds: ['vegetative', 'flowering', 'podding'],
        baseSeverity: 'high',
        sign: 'Grey-green colonies on the growing tip and flower racemes; leaves curl and shine with honeydew.',
        control: ['Spray thiamethoxam 25 WG at 0.25 g/L when 20 aphids per plant', 'Spray in the afternoon when pollinators are down', 'Late sowings escape the first aphid flight — sow before 15 November'],
      },
      {
        id: 'alternaria-blight',
        name: 'Alternaria blight',
        kind: 'disease',
        tempRange: [18, 26],
        humidityMin: 80,
        rainFavoured: true,
        stageIds: ['flowering', 'podding'],
        baseSeverity: 'moderate',
        sign: 'Concentric dark rings on lower leaves, moving upward.',
        control: ['Remove lower infected leaves', 'Iprodione 50 WP at 2 g/L twice, 12 days apart'],
      },
    ],
    marketBaseBdtPerMaund: 2800,
    marketVolatility: 0.3,
    storageLifeDays: 240,
    rotationNote: 'Mustard is the classic rice–mustard–rice rotation crop: it is short, uses residual soil moisture, and improves the structure of puddled soil.',
    handlingNote: 'Sell seed with oil content tested; a 2 % oil premium from the miller is normal when moisture is under 8 %.',
  },
  {
    id: 'lentil',
    name: 'Lentil',
    localName: 'Masur dal',
    category: 'pulse',
    rotationGroup: 'legume',
    season: 'rabi',
    durationDays: 105,
    varieties: [
      { name: 'BARI Masur-6', durationDays: 105, note: 'Wilt-tolerant, best for Barind rainfed conditions.', yieldMaundPerAcre: 13 },
      { name: 'BARI Masur-7', durationDays: 100, note: 'Early, escapes terminal heat.', yieldMaundPerAcre: 12 },
      { name: 'BARI Masur-8', durationDays: 110, note: 'Larger seed, better market grade.', yieldMaundPerAcre: 14 },
    ],
    stages: [
      { id: 'seedling', label: 'Establishment', fromDay: 0, toDay: 20, kc: 0.45, waterCritical: false, note: 'Rainfed establishment is fine in Barind; irrigation only if the soil cracks.' },
      { id: 'vegetative', label: 'Vegetative', fromDay: 20, toDay: 45, kc: 0.85, waterCritical: false, note: 'Keep weed-free — lentil does not compete in the first month.' },
      { id: 'flowering', label: 'Flowering', fromDay: 45, toDay: 70, kc: 1.05, waterCritical: true, note: 'One irrigation at flowering can add 25 % to pod set.' },
      { id: 'podding', label: 'Pod filling', fromDay: 70, toDay: 95, kc: 0.9, waterCritical: true, note: 'Excess water now causes flower drop and root rot.' },
      { id: 'maturity', label: 'Maturity', fromDay: 95, toDay: 999, kc: 0.65, waterCritical: false, note: 'Harvest when the lowest pods turn pale brown.' },
    ],
    plantingMonths: [10, 11],
    zoneWindows: {
      NW: 'Sow 5–30 November in Barind; seed at 12 kg/acre with rhizobium treatment.',
      SW: 'Sow after 15 November once residual moisture settles.',
    },
    nutrientNeed: { n: 8, p: 10, k: 10, s: 4, zn: 0.3 },
    nitrogenSplits: [{ atStage: 'vegetative', share: 1 }],
    totalWaterMm: 190,
    optimalPh: [6.0, 7.0],
    phTolerance: [5.5, 7.4],
    salinityLimitDsm: 1.8,
    pests: [
      {
        id: 'stemphylium',
        name: 'Stemphylium blight',
        kind: 'disease',
        tempRange: [15, 25],
        humidityMin: 82,
        rainFavoured: true,
        stageIds: ['flowering', 'podding'],
        baseSeverity: 'moderate',
        sign: 'Tan blotches spreading from the lower canopy upward in foggy weather.',
        control: ['Seed treatment with vitavax before sowing', 'Two sprays of iprodione at flowering and 12 days later', 'Avoid dense sowing above 12 kg seed/acre'],
      },
      {
        id: 'lentil-root-rot',
        name: 'Root rot / fusarium wilt',
        kind: 'disease',
        tempRange: [20, 28],
        humidityMin: 70,
        rainFavoured: true,
        stageIds: ['seedling', 'vegetative'],
        baseSeverity: 'low',
        sign: 'Patches of wilting plants with dark, rotted roots.',
        control: ['Rotate out of lentil for two seasons', 'Improve drainage at the plot tail end'],
      },
    ],
    marketBaseBdtPerMaund: 5200,
    marketVolatility: 0.34,
    storageLifeDays: 240,
    rotationNote: 'As a legume, lentil fixes 30–40 kg of nitrogen per acre for the next crop; putting it before Boro rice cuts urea need measurably.',
    handlingNote: 'Thresh gently and grade by size; whole red lentils sell 20 % above split grades in the same market.',
  },
  {
    id: 'maize',
    name: 'Maize',
    localName: 'Bhutta',
    category: 'cereal',
    rotationGroup: 'cereal-other',
    season: 'rabi',
    durationDays: 140,
    varieties: [
      { name: 'BARI Hybrid Bhutta-11', durationDays: 140, note: 'Rabi hybrid, heavy feeder, 8 t/ha potential.', yieldMaundPerAcre: 87 },
      { name: 'NK-40', durationDays: 145, note: 'Popular with poultry feed buyers.', yieldMaundPerAcre: 95 },
    ],
    stages: [
      { id: 'seedling', label: 'Emergence', fromDay: 0, toDay: 20, kc: 0.4, waterCritical: false, note: 'Thin to 60 cm x 20 cm stand; do not thin in dry weather.' },
      { id: 'vegetative', label: 'Vegetative', fromDay: 20, toDay: 55, kc: 0.9, waterCritical: false, note: 'Knee-high top-dressing; stem is storing sugar now.' },
      { id: 'stem-elongation', label: 'Stem elongation', fromDay: 55, toDay: 80, kc: 1.15, waterCritical: true, note: 'Water demand peaks; never let the soil dry to cracking.' },
      { id: 'flowering', label: 'Tasselling and silking', fromDay: 80, toDay: 105, kc: 1.2, waterCritical: true, note: 'The most yield-critical 12 days of the season.' },
      { id: 'grain-filling', label: 'Grain filling', fromDay: 105, toDay: 130, kc: 1.05, waterCritical: true, note: 'Dent stage needs steady moisture for cob weight.' },
      { id: 'maturity', label: 'Maturity', fromDay: 130, toDay: 999, kc: 0.7, waterCritical: false, note: 'Harvest at black layer with 20 % moisture.' },
    ],
    plantingMonths: [10, 11],
    zoneWindows: {
      NW: 'Sow 1–25 November for the rabi crop; fodder value is highest if you sell green.',
      N: 'Sow November through early December; later sowings face armyworm in warmer February.',
    },
    nutrientNeed: { n: 44, p: 16, k: 20, s: 6, zn: 0.8 },
    nitrogenSplits: [
      { atStage: 'vegetative', share: 0.5 },
      { atStage: 'stem-elongation', share: 0.5 },
    ],
    totalWaterMm: 620,
    optimalPh: [5.8, 7.0],
    phTolerance: [5.2, 7.8],
    salinityLimitDsm: 2.6,
    pests: [
      {
        id: 'fall-armyworm',
        name: 'Fall armyworm',
        kind: 'pest',
        tempRange: [20, 32],
        humidityMin: 50,
        rainFavoured: false,
        stageIds: ['vegetative', 'stem-elongation'],
        baseSeverity: 'high',
        sign: 'Ragged whorls with moist sawdust-like frass.',
        control: ['Scout twice a week until tasselling', 'Spinetoram 12 SC at 0.4 ml/L aimed into the whorl', 'Hand-pick larvae in small plots'],
      },
    ],
    marketBaseBdtPerMaund: 1050,
    marketVolatility: 0.26,
    storageLifeDays: 150,
    rotationNote: 'Maize works best after a legume; continuous maize strips potassium and invites armyworm carryover.',
    handlingNote: 'Dry to 14 % before selling to feed mills — wet grain is penalised 12–15 % on price.',
  },
]

const SPECIES_BY_ID = new Map(SPECIES.map((s) => [s.id, s]))

export function getSpecies(id: string): Species {
  return SPECIES_BY_ID.get(id) ?? SPECIES[0]
}

export function speciesLabel(id: string): string {
  return getSpecies(id).name
}

export function varietyOf(speciesId: string, varietyName: string): SpeciesVariety {
  const species = getSpecies(speciesId)
  return species.varieties.find((v) => v.name === varietyName) ?? species.varieties[0]
}

export function stageForDay(species: Species, day: number): SpeciesStage {
  const found = species.stages.find((s) => day >= s.fromDay && day < s.toDay)
  return found ?? species.stages[species.stages.length - 1]
}

export function stageById(species: Species, id: GrowthStageId): SpeciesStage {
  return species.stages.find((s) => s.id === id) ?? species.stages[0]
}

/** Total season length used for progress bars (variety duration, or species default). */
export function seasonLength(species: Species, varietyName: string): number {
  return varietyOf(species.id, varietyName).durationDays || species.durationDays
}

