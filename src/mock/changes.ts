/** Labels and value formatting shared by the mock and remote change logs. */

export function formatValue(field: string, value: unknown): string {
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

export const FIELD_LABELS: Record<string, string> = {
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
  locality: 'Locality',
  soilType: 'Soil type',
  landType: 'Land type',
  waterSource: 'Water source',
  establishedYear: 'Established',
  summary: 'Summary',
  region: 'Region',
  climateZone: 'Climate zone',
  budgetUsd: 'Budget',
  equipment: 'Equipment',
  latitude: 'Latitude',
  longitude: 'Longitude',
  farmerPriority: 'Your priority',
  waterAvailability: 'Water availability',
  equipmentLimitation: 'Equipment limits',
  marketPreference: 'Market preference',
}