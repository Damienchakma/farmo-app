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

/** Stable value in [min,max] with 2-decimal resolution. */
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

/** Start of the current week (Monday). */
export function startOfWeek(d: Date): Date {
  const copy = new Date(d)
  const day = (copy.getDay() + 6) % 7
  copy.setDate(copy.getDate() - day)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/* ---------------------------------------------------------------- weather */

const MONTH_RAIN_SHARE = [
  0.005, 0.02, 0.04, 0.12, 0.16, 0.19, 0.21, 0.16, 0.07, 0.05, 0.01, 0.005,
]

/**
 * Pseudo-weather: a smooth seasonal temperature curve plus clustered monsoon
 * rainfall, seeded by (district, seedKey, date) so a farm's history and
 * forecast are stable across reloads and identical for every viewer.
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

  const dayCount = daysBack + daysForward + 1
  const start = addDays(reference, -daysBack)

  for (let i = 0; i < dayCount; i += 1) {
    const date = addDays(start, i)
    const key = `${district.id}|${seedKey}|${isoDate(date)}`
    const r = rngFor(key)
    const r2 = rngFor(`${key}|b`)
    const r3 = rngFor(`${key}|c`)
    const doy = dayOfYear(date)

    // Temperature: peak around 15 May (doy 135), trough around 12 January (doy 12).
    const seasonal = Math.cos(((doy - 135) / 365) * Math.PI * 2)
    const tMean = base + amp * seasonal + (r() - 0.5) * 2.4
    const spread = 7 + (r2() - 0.5) * 2.5
    let tMin = tMean - spread / 2
    const tMax = tMean + spread / 2

    const month = date.getMonth()
    const share = MONTH_RAIN_SHARE[month]
    const monsoon = clamp((share - 0.05) / 0.16, 0, 1)
    const dailyTarget = district.rainfallMm * share / 30

    // Cluster rain: a wet day is more likely if the previous day was wet.
    const prevKey = `${district.id}|${seedKey}|${isoDate(addDays(date, -1))}`
    const prevWet = rngFor(`${prevKey}|w`)() < 0.28 + monsoon * 0.35 ? 1 : 0
    const wetChance = clamp(0.04 + monsoon * 0.5 + prevWet * 0.22, 0, 0.9)
    let rainfall = 0
    if (r2() < wetChance) {
      const intensity = 0.35 + r3() * 2.4 + prevWet * 0.5
      rainfall = round(dailyTarget * intensity, 1)
      if (monsoon > 0.7 && r3() > 0.93) rainfall = round(rainfall * 2.1, 1) // cloudburst
    }
    // Winter fog drizzle in the north.
    if (month === 11 || month === 0) {
      const fogRoll = rngFor(`${key}|fog`)()
      if (fogRoll > 0.86) rainfall = Math.max(rainfall, round(0.4 + fogRoll * 1.6, 1))
      if (fogRoll > 0.7) tMin = tMin + 0.6
    }
    // Cold snap in the north-west.
    if (district.zone === 'NW' && (month === 0 || month === 11) && r3() > 0.88) {
      tMin = round(tMin - 3.2, 1)
    }

    const humidity = clamp(
      62 + monsoon * 26 - (tMax - tMin) * 1.1 + (rainfall > 0 ? 12 : 0) + (r3() - 0.5) * 8,
      32,
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
 * Ra is scaled for 23.8°N: about 24 MJ/m² in December, 40 MJ/m² in June.
 */
export function referenceEt0(day: WeatherDay): number {
  const tMean = (day.tMax + day.tMin) / 2
  const range = Math.max(day.tMax - day.tMin, 2)
  const doy = dayOfYear(parseISO(day.date))
  const raMJ = 32 + 8 * Math.cos(((doy - 172) / 365) * Math.PI * 2)
  const raMm = raMJ * 0.408
  const et0 = 0.0023 * (tMean + 17.8) * Math.sqrt(range) * raMm
  // Humidity and cloud cover trim demand on damp days.
  const dampTrim = day.rainfallMm > 1 ? 0.85 : day.humidity > 78 ? 0.92 : 1
  return round(clamp(et0 * dampTrim, 0.5, 9.5), 2)
}
