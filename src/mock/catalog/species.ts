import type { ClimateZone, GrowthStageId, Severity } from '../types'

/**
 * Crop catalogue. A temperate double-cropping rotation: winter cereals and
 * oilseeds, spring-sown summer crops, plus irrigated rice and protected
 * vegetables. Nutrient needs are elemental kg/acre for the season (P as P2O5,
 * K as K2O), water use in mm, Kc values along an FAO-56 style stage curve.
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
  /** Typical farm-gate yield, tonnes per acre. */
  yieldTonnesPerAcre: number
}

export interface Species {
  id: string
  name: string
  category: 'cereal' | 'oilseed' | 'pulse' | 'tuber' | 'vegetable'
  /** Grouping used by the rotation rules (same group = no repeat). */
  rotationGroup: string
  season: 'winter' | 'spring' | 'summer' | 'autumn'
  durationDays: number
  varieties: SpeciesVariety[]
  stages: SpeciesStage[]
  /** Months (1-12) when planting is normal for this rotation. */
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
  /** Farm-gate price, USD per tonne. */
  marketPricePerTonne: number
  /** 0-1; how violently the price moves within a season. */
  marketVolatility: number
  storageLifeDays: number
  rotationNote: string
  handlingNote: string
}

export const SPECIES: Species[] = [
  {
    id: 'winter-wheat',
    name: 'Winter wheat',
    category: 'cereal',
    rotationGroup: 'cereal',
    season: 'winter',
    durationDays: 240,
    varieties: [
      { name: 'Bread wheat, mid-season', durationDays: 240, note: 'Standard feed and milling type; stands through hard frost.', yieldTonnesPerAcre: 3.6 },
      { name: 'Bread wheat, early', durationDays: 210, note: 'Earliest to clear the field for a double crop.', yieldTonnesPerAcre: 3.1 },
      { name: 'Soft wheat, low-input', durationDays: 235, note: 'Lower nitrogen requirement; good after a legume.', yieldTonnesPerAcre: 2.9 },
    ],
    stages: [
      { id: 'establishment', label: 'Establishment', fromDay: 0, toDay: 30, kc: 0.4, waterCritical: false, note: 'Get an even stand before the first frost; rolling after drilling helps.' },
      { id: 'tillering', label: 'Tillering', fromDay: 30, toDay: 110, kc: 0.7, waterCritical: false, note: 'Tiller number per square metre is set here, mostly before winter.' },
      { id: 'stem-elongation', label: 'Stem elongation', fromDay: 110, toDay: 150, kc: 1.05, waterCritical: true, note: 'The first nitrogen top-dress belongs here, not earlier.' },
      { id: 'heading', label: 'Heading & booting', fromDay: 150, toDay: 175, kc: 1.15, waterCritical: true, note: 'Drought at heading removes grain sites rather than grain weight.' },
      { id: 'flowering', label: 'Flowering', fromDay: 175, toDay: 195, kc: 1.15, waterCritical: true, note: 'Fusarium risk peaks if rain falls during flowering.' },
      { id: 'grain-filling', label: 'Grain filling', fromDay: 195, toDay: 225, kc: 1.05, waterCritical: true, note: 'Heat above 30 °C shortens the fill and cuts test weight.' },
      { id: 'maturity', label: 'Ripening', fromDay: 225, toDay: 999, kc: 0.45, waterCritical: false, note: 'Harvest at 14–15 % grain moisture to avoid drying cost.' },
    ],
    plantingMonths: [9, 10, 11],
    zoneWindows: {
      NW: 'Drill 20 September – 15 October; later sowing cuts yield roughly 0.5 % a day.',
      N: 'Drill from early October; the cold nights slow establishment after mid-November.',
      NE: 'Drill in late September so the crop roots before the wet autumn.',
    },
    nutrientNeed: { n: 48, p: 16, k: 20, s: 6, zn: 0.4 },
    nitrogenSplits: [
      { atStage: 'establishment', share: 0.25 },
      { atStage: 'stem-elongation', share: 0.45 },
      { atStage: 'heading', share: 0.3 },
    ],
    totalWaterMm: 480,
    optimalPh: [6.0, 7.0],
    phTolerance: [5.2, 8.0],
    salinityLimitDsm: 4.0,
    pests: [
      {
        id: 'septoria',
        name: 'Septoria leaf blotch',
        kind: 'disease',
        tempRange: [12, 22],
        humidityMin: 85,
        rainFavoured: true,
        stageIds: ['stem-elongation', 'heading'],
        baseSeverity: 'moderate',
        sign: 'Pale oval lesions with dark speckles, moving up from the lower leaves after wet weather.',
        control: ['Use a resistant variety in the next rotation', 'Fungicide at first lesion on leaf three', 'Avoid excessive nitrogen in a wet spring'],
      },
      {
        id: 'septoria-head-blight',
        name: 'Fusarium head blight',
        kind: 'disease',
        tempRange: [15, 25],
        humidityMin: 80,
        rainFavoured: true,
        stageIds: ['flowering'],
        baseSeverity: 'high',
        sign: 'Bleached spikelets on part of the head; pinkish mould in humid weather.',
        control: ['Spray at early flowering if rain is forecast for the following 48 hours', 'Harvest and store separately if a patch is affected', 'Rotate away from maize stubble'],
      },
      {
        id: 'aphid-cereal',
        name: 'Cereal aphid',
        kind: 'pest',
        tempRange: [14, 26],
        humidityMin: 55,
        rainFavoured: false,
        stageIds: ['stem-elongation', 'heading'],
        baseSeverity: 'low',
        sign: 'Dense colonies on the stem and underside of the flag leaf; honeydew shine.',
        control: ['Protect the natural predators — only treat at threshold', 'Aphids carry barley yellow dwarf virus, so treat early in mild winters'],
      },
    ],
    marketPricePerTonne: 260,
    marketVolatility: 0.22,
    storageLifeDays: 240,
    rotationNote: 'Wheat after wheat carries Septoria and take-all upward from the stubble; a break crop pays for itself even at a lower gross margin.',
    handlingNote: 'Store at or below 13 % moisture. Grain above that heats in store within a month.',
  },
  {
    id: 'rice',
    name: 'Rice (paddy)',
    category: 'cereal',
    rotationGroup: 'rice',
    season: 'summer',
    durationDays: 125,
    varieties: [
      { name: 'Medium-grain irrigated', durationDays: 125, note: 'Dependable paddy type for flooded culture.', yieldTonnesPerAcre: 3.4 },
      { name: 'Long-grain irrigated', durationDays: 135, note: 'Higher milling value; slightly later.', yieldTonnesPerAcre: 3.1 },
      { name: 'Short-season upland', durationDays: 105, note: 'Grown on non-flooded ground with irrigation.', yieldTonnesPerAcre: 2.4 },
    ],
    stages: [
      { id: 'seedling', label: 'Seedling', fromDay: 0, toDay: 20, kc: 0.6, waterCritical: false, note: 'Keep shallow water after transplanting; deep flooding weakens tillers.' },
      { id: 'tillering', label: 'Tillering', fromDay: 20, toDay: 55, kc: 1.0, waterCritical: false, note: 'Decides panicle number per square metre.' },
      { id: 'panicle-initiation', label: 'Panicle initiation', fromDay: 55, toDay: 75, kc: 1.15, waterCritical: true, note: 'The most water- and nitrogen-sensitive window of the season.' },
      { id: 'heading', label: 'Heading', fromDay: 75, toDay: 95, kc: 1.2, waterCritical: true, note: 'Heat above 35 °C at heading raises sterility sharply.' },
      { id: 'grain-filling', label: 'Grain filling', fromDay: 95, toDay: 115, kc: 1.0, waterCritical: true, note: 'Water stress here reduces grain weight, not grain number.' },
      { id: 'maturity', label: 'Maturity', fromDay: 115, toDay: 999, kc: 0.75, waterCritical: false, note: 'Drain 10 days before harvest for even ripening.' },
    ],
    plantingMonths: [5, 6],
    zoneWindows: {
      N: 'Transplant 20 May – 15 June once the water is warm; cold water at transplanting stalls the crop for two weeks.',
      SC: 'Transplant June for the main season; late planting pushes flowering into the heat.',
      SE: 'Transplant late May to use the early monsoon rain.',
    },
    nutrientNeed: { n: 40, p: 14, k: 18, s: 5, zn: 0.5 },
    nitrogenSplits: [
      { atStage: 'seedling', share: 0.34 },
      { atStage: 'tillering', share: 0.33 },
      { atStage: 'heading', share: 0.33 },
    ],
    totalWaterMm: 900,
    optimalPh: [5.5, 6.5],
    phTolerance: [4.8, 7.8],
    salinityLimitDsm: 3.0,
    pests: [
      {
        id: 'rice-blast',
        name: 'Rice blast',
        kind: 'disease',
        tempRange: [20, 28],
        humidityMin: 82,
        rainFavoured: true,
        stageIds: ['tillering', 'heading'],
        baseSeverity: 'moderate',
        sign: 'Diamond-shaped grey-centred lesions; neck rot at the panicle base.',
        control: ['Use a blast-tolerant variety next season', 'Avoid late evening irrigation', 'Fungicide if lesions exceed five per hill'],
      },
      {
        id: 'leaf-blight',
        name: 'Bacterial leaf blight',
        kind: 'disease',
        tempRange: [25, 34],
        humidityMin: 78,
        rainFavoured: true,
        stageIds: ['tillering', 'heading'],
        baseSeverity: 'moderate',
        sign: 'Water-soaked yellow margins running down from the leaf tip.',
        control: ['Stop nitrogen top-dressing until the field drains', 'Drain standing water for three days', 'Do not walk a wet field — it spreads on boots'],
      },
      {
        id: 'stem-borer',
        name: 'Stem borer',
        kind: 'pest',
        tempRange: [22, 32],
        humidityMin: 70,
        rainFavoured: false,
        stageIds: ['tillering', 'heading'],
        baseSeverity: 'moderate',
        sign: 'Dead hearts in tillering, white heads after heading.',
        control: ['Clip seedling tips before transplanting', 'Pheromone traps at five per acre', 'Treat only if dead hearts exceed 5 %'],
      },
    ],
    marketPricePerTonne: 420,
    marketVolatility: 0.2,
    storageLifeDays: 180,
    rotationNote: 'Continuous flooded rice builds a plough pan and carries stem borer forward; a break to a legume or an oilseed restores structure and breaks the cycle.',
    handlingNote: 'Dry paddy to 14 % moisture before storage; above that, mould risk climbs within three weeks.',
  },
  {
    id: 'maize',
    name: 'Maize (grain)',
    category: 'cereal',
    rotationGroup: 'cereal-maize',
    season: 'spring',
    durationDays: 145,
    varieties: [
      { name: 'Grain hybrid, full-season', durationDays: 145, note: 'Highest yield potential; heavy nitrogen feeder.', yieldTonnesPerAcre: 5.4 },
      { name: 'Grain hybrid, early', durationDays: 125, note: 'Useful where the autumn sowing must follow.', yieldTonnesPerAcre: 4.6 },
    ],
    stages: [
      { id: 'establishment', label: 'Emergence', fromDay: 0, toDay: 20, kc: 0.4, waterCritical: false, note: 'Thin to a uniform stand; do not thin in dry weather.' },
      { id: 'vegetative', label: 'Vegetative', fromDay: 20, toDay: 55, kc: 0.9, waterCritical: false, note: 'Knee-high top-dress; the stem is storing sugar now.' },
      { id: 'stem-elongation', label: 'Stem elongation', fromDay: 55, toDay: 80, kc: 1.15, waterCritical: true, note: 'Water demand peaks; do not let the soil crack.' },
      { id: 'heading', label: 'Tasselling & silking', fromDay: 80, toDay: 105, kc: 1.2, waterCritical: true, note: 'The most yield-critical fortnight of the season.' },
      { id: 'grain-filling', label: 'Grain filling', fromDay: 105, toDay: 135, kc: 1.05, waterCritical: true, note: 'Steady moisture to dent stage for cob weight.' },
      { id: 'maturity', label: 'Maturity', fromDay: 135, toDay: 999, kc: 0.7, waterCritical: false, note: 'Harvest at black layer, around 20 % moisture.' },
    ],
    plantingMonths: [4, 5],
    zoneWindows: {
      NW: 'Sow 20 April – 15 May; later sowings meet the summer drought gap.',
      N: 'Sow early May once the soil reaches 10 °C.',
      SC: 'Sow late April to finish grain fill before the autumn rain.',
    },
    nutrientNeed: { n: 52, p: 18, k: 24, s: 6, zn: 0.8 },
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
        control: ['Scout twice a week until tasselling', 'Spray into the whorl in the evening', 'Hand-pick larvae in small blocks'],
      },
      {
        id: 'northern-leaf-blight',
        name: 'Northern leaf blight',
        kind: 'disease',
        tempRange: [18, 27],
        humidityMin: 80,
        rainFavoured: true,
        stageIds: ['stem-elongation', 'heading'],
        baseSeverity: 'moderate',
        sign: 'Long cigar-shaped grey-green lesions starting on the lower leaves.',
        control: ['Rotate away from maize stubble for one season', 'Fungicide at first lesions above the ear leaf'],
      },
    ],
    marketPricePerTonne: 210,
    marketVolatility: 0.28,
    storageLifeDays: 150,
    rotationNote: 'Maize takes potassium heavily and carries armyworm and blight over in the stubble; alternate it with soybean or a small grain.',
    handlingNote: 'Dry to 14 % before sale; feed buyers penalise wet grain by 10–15 % on price.',
  },
  {
    id: 'soybean',
    name: 'Soybean',
    category: 'pulse',
    rotationGroup: 'legume',
    season: 'spring',
    durationDays: 125,
    varieties: [
      { name: 'Group II maturity', durationDays: 125, note: 'Broad adaptation, good standing ability.', yieldTonnesPerAcre: 1.5 },
      { name: 'Group I maturity, early', durationDays: 110, note: 'Finishes earlier, useful before a winter cereal.', yieldTonnesPerAcre: 1.3 },
    ],
    stages: [
      { id: 'establishment', label: 'Emergence', fromDay: 0, toDay: 20, kc: 0.4, waterCritical: false, note: 'Inoculate seed with rhizobium where the field has not grown soybean before.' },
      { id: 'vegetative', label: 'Vegetative', fromDay: 20, toDay: 55, kc: 0.8, waterCritical: false, note: 'Weed control in the first month decides the yield more than anything else.' },
      { id: 'stem-elongation', label: 'Flowering begins', fromDay: 55, toDay: 80, kc: 1.05, waterCritical: true, note: 'Water stress at flowering sheds flowers and pods.' },
      { id: 'podding', label: 'Pod fill', fromDay: 80, toDay: 110, kc: 1.1, waterCritical: true, note: 'The nitrogen the plant fixes now goes into the seed.' },
      { id: 'maturity', label: 'Maturity', fromDay: 110, toDay: 999, kc: 0.7, waterCritical: false, note: 'Harvest at 13 % seed moisture to avoid split beans.' },
    ],
    plantingMonths: [5, 6],
    zoneWindows: {
      SC: 'Sow late May once the soil is above 12 °C.',
      N: 'Sow early June; soybeans are sensitive to cold, wet seedbeds.',
    },
    nutrientNeed: { n: 10, p: 14, k: 22, s: 6, zn: 0.4 },
    nitrogenSplits: [{ atStage: 'vegetative', share: 1 }],
    totalWaterMm: 480,
    optimalPh: [6.0, 7.0],
    phTolerance: [5.6, 7.6],
    salinityLimitDsm: 5.0,
    pests: [
      {
        id: 'soybean-aphid',
        name: 'Soybean aphid',
        kind: 'pest',
        tempRange: [18, 28],
        humidityMin: 60,
        rainFavoured: false,
        stageIds: ['vegetative', 'stem-elongation', 'podding'],
        baseSeverity: 'moderate',
        sign: 'Colonies on the growing tip and undersides; leaves curl and shine.',
        control: ['Scout weekly from early flowering', 'Treat at threshold with an aphid-specific product to protect predators'],
      },
      {
        id: 'sudden-death',
        name: 'Sudden death syndrome',
        kind: 'disease',
        tempRange: [15, 24],
        humidityMin: 75,
        rainFavoured: true,
        stageIds: ['podding', 'maturity'],
        baseSeverity: 'low',
        sign: 'Interveinal yellowing with the veins still green; roots dark at the crown.',
        control: ['Choose a variety with resistance or tolerance', 'Improve drainage in the wetter parts of the field'],
      },
    ],
    marketPricePerTonne: 480,
    marketVolatility: 0.3,
    storageLifeDays: 240,
    rotationNote: 'Soybean fixes 60–90 kg of nitrogen per acre for the next crop and breaks the cereal disease cycle — the highest-value rotation slot on most farms.',
    handlingNote: 'Handle gently at harvest; cracked beans are docked at the elevator.',
  },
  {
    id: 'potato',
    name: 'Potato',
    category: 'tuber',
    rotationGroup: 'tuber',
    season: 'autumn',
    durationDays: 100,
    varieties: [
      { name: 'Maincrop, chipping type', durationDays: 100, note: 'Good dry matter and storage; needs blight management.', yieldTonnesPerAcre: 12 },
      { name: 'Second-crop, red skin', durationDays: 95, note: 'Good for fresh market; shorter dormancy.', yieldTonnesPerAcre: 11 },
    ],
    stages: [
      { id: 'establishment', label: 'Emergence', fromDay: 0, toDay: 25, kc: 0.45, waterCritical: false, note: 'Keep the ridge moist but never saturated; seed pieces rot in wet soil.' },
      { id: 'vegetative', label: 'Canopy growth', fromDay: 25, toDay: 50, kc: 0.85, waterCritical: false, note: 'Earthing up now keeps tubers shallow and out of the light.' },
      { id: 'tuber-bulking', label: 'Tuber bulking', fromDay: 50, toDay: 85, kc: 1.15, waterCritical: true, note: 'Water stress here cuts marketable size, not tuber number.' },
      { id: 'maturity', label: 'Maturity', fromDay: 85, toDay: 999, kc: 0.8, waterCritical: false, note: 'Stop irrigation ten days before haulm destruction to set the skin.' },
    ],
    plantingMonths: [3, 4, 8],
    zoneWindows: {
      NW: 'Plant the maincrop in April; the second crop goes in during August.',
      SC: 'August planting carries the crop to a November harvest before frost risk.',
      N: 'Plant mid-April once the soil has dried enough to work.',
    },
    nutrientNeed: { n: 44, p: 20, k: 34, s: 6, zn: 0.6 },
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
        tempRange: [10, 20],
        humidityMin: 85,
        rainFavoured: true,
        stageIds: ['vegetative', 'tuber-bulking'],
        baseSeverity: 'high',
        sign: 'Water-soaked leaf patches with a white fringe underneath; a sweet rotting smell in the field.',
        control: ['Preventive protectant sprays every seven days in wet weather', 'Switch to a systemic product once lesions appear', 'Never irrigate in the evening before a still, humid night'],
      },
      {
        id: 'colorado-beetle',
        name: 'Colorado potato beetle',
        kind: 'pest',
        tempRange: [18, 30],
        humidityMin: 40,
        rainFavoured: false,
        stageIds: ['vegetative', 'tuber-bulking'],
        baseSeverity: 'moderate',
        sign: 'Skeletonised leaves; striped adults and orange larvae on the underside.',
        control: ['Rotate at least two years away from potato and tomato', 'Hand-check the field edges where populations build first'],
      },
    ],
    marketPricePerTonne: 190,
    marketVolatility: 0.55,
    storageLifeDays: 150,
    rotationNote: 'Potato after potato multiplies late blight, eelworm and scab; follow with a cereal to break all three.',
    handlingNote: 'Cure for 12–14 days in the shade before cold storage — rushed storage loses 8–10 % to rot.',
  },
  {
    id: 'tomato',
    name: 'Tomato',
    category: 'vegetable',
    rotationGroup: 'solanaceae',
    season: 'summer',
    durationDays: 120,
    varieties: [
      { name: 'Protected crop, truss type', durationDays: 120, note: 'Grown under cover on the vine; premium grade.', yieldTonnesPerAcre: 34 },
      { name: 'Field processing type', durationDays: 115, note: 'Determinate, firm, good for sauce and paste.', yieldTonnesPerAcre: 22 },
      { name: 'Field fresh-market', durationDays: 118, note: 'Thin-skinned and sweet; needs careful transport.', yieldTonnesPerAcre: 20 },
    ],
    stages: [
      { id: 'establishment', label: 'Transplant shock', fromDay: 0, toDay: 14, kc: 0.55, waterCritical: false, note: 'Water daily for the first week to hold establishment.' },
      { id: 'vegetative', label: 'Vegetative', fromDay: 14, toDay: 45, kc: 0.95, waterCritical: false, note: 'Stringing and the first truss pruning decide fruit quality.' },
      { id: 'flowering', label: 'Flowering', fromDay: 45, toDay: 75, kc: 1.1, waterCritical: true, note: 'Uneven irrigation now causes cracked fruit and blossom-end rot.' },
      { id: 'podding', label: 'Fruiting', fromDay: 75, toDay: 105, kc: 1.15, waterCritical: true, note: 'Fruit borer and blight turn a good crop into seconds in this window.' },
      { id: 'maturity', label: 'Harvest', fromDay: 105, toDay: 999, kc: 0.9, waterCritical: false, note: 'Pick at light pink for the market; full colour only for local sale.' },
    ],
    plantingMonths: [5, 6, 9],
    zoneWindows: {
      SC: 'Transplant under cover in September for winter trusses; field crops go out in May.',
      NW: 'Transplant late May after the last frost; a tunnel earlier gains three weeks of price.',
      SW: 'Field planting in May; irrigate with drip to keep the foliage dry.',
    },
    nutrientNeed: { n: 38, p: 18, k: 34, s: 5, zn: 0.5 },
    nitrogenSplits: [
      { atStage: 'vegetative', share: 0.4 },
      { atStage: 'flowering', share: 0.35 },
      { atStage: 'podding', share: 0.25 },
    ],
    totalWaterMm: 520,
    optimalPh: [6.0, 6.8],
    phTolerance: [5.5, 7.5],
    salinityLimitDsm: 2.5,
    pests: [
      {
        id: 'tomato-fruit-borer',
        name: 'Tomato fruit borer',
        kind: 'pest',
        tempRange: [24, 33],
        humidityMin: 60,
        rainFavoured: false,
        stageIds: ['flowering', 'podding'],
        baseSeverity: 'high',
        sign: 'Small entry holes near the calyx with frass; fruit rots from the inside.',
        control: ['Pheromone traps at eight per acre', 'Spray in the evening, not at midday', 'Remove infested fruit twice a week'],
      },
      {
        id: 'tomato-late-blight',
        name: 'Late blight',
        kind: 'disease',
        tempRange: [12, 21],
        humidityMin: 85,
        rainFavoured: true,
        stageIds: ['vegetative', 'flowering'],
        baseSeverity: 'moderate',
        sign: 'Greasy grey-brown leaf patches spreading fast after a humid night.',
        control: ['Preventive protectant sprays through wet spells', 'Keep rows open to the wind — 60 cm spacing minimum', 'Ventilate the tunnel at sunrise'],
      },
      {
        id: 'leaf-mould',
        name: 'Leaf mould and leaf curl virus',
        kind: 'disease',
        tempRange: [24, 34],
        humidityMin: 60,
        rainFavoured: false,
        stageIds: ['vegetative', 'flowering'],
        baseSeverity: 'moderate',
        sign: 'Pale yellow patches on the upper leaf with a grey-brown underside; or upward curling with no fruit set.',
        control: ['Control whitefly with yellow sticky traps', 'Remove infected plants early — there is no cure', 'Use a tolerant variety next season'],
      },
    ],
    marketPricePerTonne: 900,
    marketVolatility: 0.7,
    storageLifeDays: 14,
    rotationNote: 'Tomato after tomato, or after another solanaceous crop, multiplies soil-borne wilt and blight; rotate with a cereal or a legume for two seasons.',
    handlingNote: 'Grade by size on the day of picking — mixed lots sell at the seconds price.',
  },
  {
    id: 'canola',
    name: 'Winter canola',
    category: 'oilseed',
    rotationGroup: 'oilseed',
    season: 'autumn',
    durationDays: 290,
    varieties: [
      { name: 'Hybrid winter type', durationDays: 290, note: 'Highest yield potential; needs early drilling.', yieldTonnesPerAcre: 1.5 },
      { name: 'Open-pollinated winter type', durationDays: 280, note: 'Cheaper seed, more flexible drilling window.', yieldTonnesPerAcre: 1.2 },
    ],
    stages: [
      { id: 'establishment', label: 'Establishment', fromDay: 0, toDay: 35, kc: 0.4, waterCritical: false, note: 'Thin to a uniform stand; thick patches invite disease.' },
      { id: 'vegetative', label: 'Rosette (overwinter)', fromDay: 35, toDay: 150, kc: 0.6, waterCritical: false, note: 'The rosette must be big enough to survive frost but not so big it runs to stem.' },
      { id: 'stem-elongation', label: 'Stem elongation', fromDay: 150, toDay: 185, kc: 1.05, waterCritical: true, note: 'Nitrogen top-dress belongs at the start of stem extension.' },
      { id: 'flowering', label: 'Flowering', fromDay: 185, toDay: 225, kc: 1.1, waterCritical: true, note: 'Pollen beetle and sclerotinia both strike in this window.' },
      { id: 'podding', label: 'Pod filling', fromDay: 225, toDay: 265, kc: 1.0, waterCritical: true, note: 'Moisture now decides oil content, not pod number.' },
      { id: 'maturity', label: 'Maturity', fromDay: 265, toDay: 999, kc: 0.6, waterCritical: false, note: 'Swath or direct-harvest at 35 % seed moisture on the stems.' },
    ],
    plantingMonths: [8, 9],
    zoneWindows: {
      NW: 'Drill 20 August – 10 September; the crop must have six true leaves before frost.',
      N: 'Drill by 5 September; later crops suffer winter kill.',
      SW: 'Drill from early September after the cereal stubble is worked.',
    },
    nutrientNeed: { n: 34, p: 14, k: 16, s: 8, zn: 0.3 },
    nitrogenSplits: [
      { atStage: 'establishment', share: 0.3 },
      { atStage: 'stem-elongation', share: 0.7 },
    ],
    totalWaterMm: 480,
    optimalPh: [6.0, 7.0],
    phTolerance: [5.4, 7.6],
    salinityLimitDsm: 2.8,
    pests: [
      {
        id: 'pollen-beetle',
        name: 'Pollen beetle',
        kind: 'pest',
        tempRange: [12, 22],
        humidityMin: 50,
        rainFavoured: false,
        stageIds: ['stem-elongation', 'flowering'],
        baseSeverity: 'moderate',
        sign: 'Black beetles in the green buds; buds fail to open and pods are lost.',
        control: ['Check the crop twice a week from bud stage', 'Treat only at threshold — the spray also kills pollinators', 'Spray in the late afternoon'],
      },
      {
        id: 'sclerotinia',
        name: 'Sclerotinia stem rot',
        kind: 'disease',
        tempRange: [15, 24],
        humidityMin: 85,
        rainFavoured: true,
        stageIds: ['flowering'],
        baseSeverity: 'moderate',
        sign: 'Grey-white bleached stems with hard black bodies inside, usually in patches.',
        control: ['Widen the rotation away from canola and sunflower', 'Fungicide at early flowering in a wet season', 'Avoid excessive plant density'],
      },
    ],
    marketPricePerTonne: 520,
    marketVolatility: 0.32,
    storageLifeDays: 300,
    rotationNote: 'Canola is the classic break crop for cereals: it dries the soil profile, breaks take-all, and leaves a workable seedbed for wheat.',
    handlingNote: 'Test seed moisture before delivery; oil buyers reject loads above 9 %.',
  },
  {
    id: 'lentil',
    name: 'Winter lentil',
    category: 'pulse',
    rotationGroup: 'legume',
    season: 'winter',
    durationDays: 230,
    varieties: [
      { name: 'Small-seeded winter lentil', durationDays: 230, note: 'Hardy through winter; good for dryland blocks.', yieldTonnesPerAcre: 1.0 },
      { name: 'Large-seeded winter lentil', durationDays: 240, note: 'Higher market grade, needs a kinder winter.', yieldTonnesPerAcre: 1.2 },
    ],
    stages: [
      { id: 'establishment', label: 'Establishment', fromDay: 0, toDay: 40, kc: 0.45, waterCritical: false, note: 'Rainfed establishment is fine; irrigate only if the soil cracks.' },
      { id: 'vegetative', label: 'Vegetative (overwinter)', fromDay: 40, toDay: 140, kc: 0.7, waterCritical: false, note: 'Keep it weed-free — lentil does not compete in the first month.' },
      { id: 'flowering', label: 'Flowering', fromDay: 140, toDay: 180, kc: 1.05, waterCritical: true, note: 'One irrigation at flowering can add a quarter to pod set.' },
      { id: 'podding', label: 'Pod filling', fromDay: 180, toDay: 210, kc: 0.9, waterCritical: true, note: 'Excess water now causes flower drop and root rot.' },
      { id: 'maturity', label: 'Maturity', fromDay: 210, toDay: 999, kc: 0.65, waterCritical: false, note: 'Harvest when the lowest pods turn pale brown.' },
    ],
    plantingMonths: [10, 11, 3],
    zoneWindows: {
      NW: 'Sow 5 October – 10 November; seed at 30 kg/ha with a rhizobium treatment.',
      N: 'Sow by the end of October so the plants have four leaves before hard frost.',
      SW: 'Sow late October once the cereal stubble has been worked.',
    },
    nutrientNeed: { n: 8, p: 12, k: 14, s: 4, zn: 0.3 },
    nitrogenSplits: [{ atStage: 'vegetative', share: 1 }],
    totalWaterMm: 260,
    optimalPh: [6.0, 7.0],
    phTolerance: [5.5, 7.4],
    salinityLimitDsm: 1.8,
    pests: [
      {
        id: 'ascochyta',
        name: 'Ascochyta blight',
        kind: 'disease',
        tempRange: [15, 25],
        humidityMin: 82,
        rainFavoured: true,
        stageIds: ['flowering', 'podding'],
        baseSeverity: 'moderate',
        sign: 'Tan blotches spreading upward through the canopy in wet weather; seed staining.',
        control: ['Use treated seed and a tolerant variety', 'Two sprays from early flowering if the season is wet', 'Do not sow above 40 plants per square metre'],
      },
      {
        id: 'lentil-root-rot',
        name: 'Root rot and fusarium wilt',
        kind: 'disease',
        tempRange: [18, 28],
        humidityMin: 70,
        rainFavoured: true,
        stageIds: ['establishment', 'vegetative'],
        baseSeverity: 'low',
        sign: 'Patches of wilting plants with dark, rotted roots.',
        control: ['Rotate out of lentil for two seasons', 'Improve drainage at the bottom of the field'],
      },
    ],
    marketPricePerTonne: 700,
    marketVolatility: 0.34,
    storageLifeDays: 240,
    rotationNote: 'As a legume, lentil fixes 60–70 kg of nitrogen per acre for the next crop; putting it before a cereal cuts the nitrogen bill measurably.',
    handlingNote: 'Thresh gently and grade by size; large-seeded lots sell 15–20 % above the small-seeded grade.',
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

/** Season length used for progress bars (variety duration, else species default). */
export function seasonLength(species: Species, varietyName: string): number {
  return varietyOf(species.id, varietyName).durationDays || species.durationDays
}