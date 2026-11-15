import type { WeatherDay } from './types'
import type { District } from './catalog/geography'

/* ------------------------------------------------------- deterministic rng */

/** FNV-1a — stable string hash so every derived number is reproducible. */
export function hashString(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Random source keyed by any number of stable parts. */
export function rngFor(...parts: Array<string | number>): () => number {
  return mulberry32(hashString(parts.join('|')))
}

/** Stable value in [min,max] with fixed decimal resolution. */
export function stableBetween(parts: Array<string | number>, min: number, max: number, decimals = 2): number {
  const r = rngFor(...parts)()
  const v = min + r * (max - min)
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

export function round(v: number, decimals = 1): number {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

/* --------------------------------------------------------------- date math */

export function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function addDays(date: Date | string, days: number): Date {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function daysBetween(a: Date | string, b: Date | string): number {
  const d1 = typeof a === 'string' ? parseISO(a) : a
  const d2 = typeof b === 'string' ? parseISO(b) : b
  const ms = d2.getTime() - d1.getTime()
  return Math.round(ms / 86400000)
}

export function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0)
  return Math.floor((d.getTime() - start.getTime()) / 86400000)
}

export function startOfWeek(d: Date): Date {
  const copy = new Date(d)
  const day = (copy.getDay() + 6) % 7
  copy.setDate(copy.getDate() - day)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/* ---------------------------------------------------------------- weather */

/** Share of the annual rainfall that lands in the four wettest months. */
export function monthlyRainShares(district: District): number[] {
  const shares = Array.from({ length: 12 }, () => 0.012)
  const wet = district.wetMonths.filter((m) => m >= 1 && m <= 12)
  const wetWeight = district.wetSeasonShare
  const dryWeight = 1 - wetWeight
  const dryMonths = 12 - wet.length
  for (let i = 0; i < 12; i += 1) {
    const month = i + 1
    shares[i] = wet.includes(month) ? wetWeight / Math.max(1, wet.length) : dryWeight / Math.max(1, dryMonths)
  }
  return shares
}

/**
 * Pseudo-weather for a district: a smooth seasonal temperature curve with
 * frost snap and a rainfall pattern built from the district's wet season,
 * seeded by (district, seedKey, date) so a farm's history and forecast are
 * stable across reloads and identical for every viewer.
 */
export function generateWeather(
  district: District,
  seedKey: string,
  daysBack: number,
  daysForward: number,
  reference: Date = new Date(),
): WeatherDay[] {
  const out: WeatherDay[] = []
  const [winterLo, winterHi] = district.winterTempC
  const [summerLo, summerHi] = district.summerTempC
  const winterMid = (winterLo + winterHi) / 2
  const summerMid = (summerLo + summerHi) / 2
  const amp = (summerMid - winterMid) / 2
  const base = (summerMid + winterMid) / 2
  const rainShares = monthlyRainShares(district)

  const dayCount = daysBack + daysForward + 1
  const start = addDays(reference, -daysBack)

  for (let i = 0; i < dayCount; i += 1) {
    const date = addDays(start, i)
    const key = `${district.id}|${seedKey}|${isoDate(date)}`
    const r = rngFor(key)
    const r2 = rngFor(`${key}|b`)
    const r3 = rngFor(`${key}|c`)
    const doy = dayOfYear(date)
    const month = date.getMonth()

    // Temperature peaks around 18 July (doy 199), bottoms around 15 January.
    const seasonal = Math.cos(((doy - 199) / 365) * Math.PI * 2)
    const tMean = base + amp * seasonal + (r() - 0.5) * 2.6
    const spread = 6.5 + (r2() - 0.5) * 2.4
    let tMin = tMean - spread / 2
    const tMax = tMean + spread / 2

    const share = rainShares[month]
    const wettest = Math.max(...rainShares)
    const wetness = clamp(share / (wettest || 1), 0, 1)
    const dailyTarget = (district.rainfallMm * share) / 30

    // Rain clusters: a wet day makes the next one likelier, as real fronts do.
    const prevKey = `${district.id}|${seedKey}|${isoDate(addDays(date, -1))}`
    const prevWet = rngFor(`${prevKey}|w`)() < 0.16 + wetness * 0.4 ? 1 : 0
    const wetChance = clamp(0.06 + wetness * 0.44 + prevWet * 0.24, 0, 0.9)
    let rainfall = 0
    if (r2() < wetChance) {
      const intensity = 0.4 + r3() * 2.2 + prevWet * 0.4
      rainfall = round(dailyTarget * intensity, 1)
      if (wetness > 0.6 && r3() > 0.94) rainfall = round(rainfall * 1.9, 1) // cloudburst
    }
    // Hard frost in the coldest districts.
    const frostChance = district.zone === 'N' || district.zone === 'NW' ? 0.24 : 0.12
    if ((month <= 1 || month === 11) && r3() > 1 - frostChance) {
      tMin = round(tMin - 3.4, 1)
    }
    // Muggy, low-cloud days trim the temperature range in the wet season.
    if (rainfall > 3) tMin += 0.4

    const humidity = clamp(
      60 + wetness * 22 - (tMax - tMin) * 1.2 + (rainfall > 0 ? 12 : 0) + (r3() - 0.5) * 8 - Math.max(0, tMin) * 0.2,
      30,
      98,
    )

    out.push({
      date: isoDate(date),
      tMax: round(tMax, 1),
      tMin: round(tMin, 1),
      rainfallMm: rainfall,
      humidity: Math.round(humidity),
      kind: i < daysBack ? 'observed' : 'forecast',
    })
  }
  return out
}

/** Sum of rainfall across a slice of days. */
export function rainfallSum(days: WeatherDay[]): number {
  return round(
    days.reduce((acc, d) => acc + d.rainfallMm, 0),
    1,
  )
}

/**
 * Reference evapotranspiration (Hargreaves–Samani), mm/day.
 * Ra is scaled for a ~50°N temperate latitude: about 8 MJ/m² in December and
 * 42 MJ/m² in June.
 */
export function referenceEt0(day: WeatherDay): number {
  const tMean = (day.tMax + day.tMin) / 2
  const range = Math.max(day.tMax - day.tMin, 2)
  const doy = dayOfYear(parseISO(day.date))
  const raMJ = 25 + 17 * Math.cos(((doy - 172) / 365) * Math.PI * 2)
  const raMm = raMJ * 0.408
  const et0 = 0.0023 * Math.max(tMean + 17.8, 2) * Math.sqrt(range) * raMm
  const dampTrim = day.rainfallMm > 1 ? 0.85 : day.humidity > 78 ? 0.92 : 1
  return round(clamp(et0 * dampTrim, 0.2, 9.5), 2)
}
