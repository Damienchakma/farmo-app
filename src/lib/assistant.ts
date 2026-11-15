/**
 * Farmo field assistant — a deterministic, grounded answer layer.
 *
 * There is no external model here. Every answer is assembled from the same
 * farm bundle that feeds Advice and Risk, so a number in the chat can always be
 * traced back to the record (and the source chips say where to look).
 */

import { formatArea, formatDate, formatNumber, SEVERITY_LABELS, titleCase, areaIn } from '@/lib/format'
import { getSpecies } from '@/mock/catalog'
import { limeRequirement, nextCropFor, severityRank } from '@/mock/engine'
import type { AdviceSection, AdviceSectionId, FarmBundle, RiskItem } from '@/mock/types'

export type AssistantTabId = 'overview' | 'plants' | 'advice' | 'risk' | 'visualizations'

export interface AssistantAction {
  label: string
  tab: AssistantTabId
}

export interface AssistantReply {
  text: string
  bullets?: string[]
  /** Shown only when the question asks why — the record behind the answer. */
  why?: string
  sources: string[]
  action?: AssistantAction
  followUps?: string[]
}

export interface AssistantPrompt {
  id: string
  label: string
  description: string
  question: string
}

/* ------------------------------------------------------------------ helpers */

function section(bundle: FarmBundle, id: AdviceSectionId): AdviceSection | undefined {
  return bundle.analysis.advice.sections.find((s) => s.id === id)
}

function listItems(section: AdviceSection | undefined): string[] {
  const block = section?.blocks.find((b) => b.kind === 'list')
  return block?.kind === 'list' ? block.items : []
}

function topRisks(bundle: FarmBundle, count: number): RiskItem[] {
  return [...bundle.analysis.risk.items]
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.likelihood - a.likelihood)
    .slice(0, count)
}

function totalAcres(bundle: FarmBundle): number {
  const planted = bundle.plants.reduce((sum, plant) => sum + areaIn(plant.area, 'acre'), 0)
  return planted || areaIn(bundle.farm.area, 'acre')
}

function stageFor(bundle: FarmBundle, plantId: string) {
  return bundle.analysis.conditions.perPlant.find((row) => row.plantId === plantId)
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function sentence(text: string): string {
  const trimmed = text.trim()
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

/** The register stores mitigation as separate steps, not one sentence. */
function actionLine(item: RiskItem): string {
  const steps = item.mitigation
    .slice(0, 2)
    .map((step, index) => (index === 0 ? step : step.charAt(0).toLowerCase() + step.slice(1)))
    .join('; ')
  return sentence(steps || item.impact)
}

function dateRange(range: string): string {
  const parts = range.split(/\s+[–-]\s+/)
  if (parts.length !== 2) return range
  return `${formatDate(parts[0], 'dayMonth')} – ${formatDate(parts[1], 'dayMonth')}`
}

function windowLabel(isoRange: string): string {
  const [from, to] = isoRange.split(' to ')
  if (!from || !to) return isoRange
  return `${formatDate(from, 'dayMonth')} – ${formatDate(to, 'dayMonth')}`
}

function withWhy(
  reply: AssistantReply,
  drivers: string[] | undefined,
  question: string,
  fallback?: string,
): AssistantReply {
  if (/(why|explain|how do you know|what makes you)/i.test(question)) {
    const detail = drivers?.slice(0, 2).join(' · ') || fallback
    if (detail) reply.why = detail
  }
  return reply
}

function adviceSource(bundle: FarmBundle): string {
  return `Advice ${bundle.analysis.advice.modelVersion}`
}

/** The farmer's own constraints, quoted straight from the farm record. */
function priorityLine(bundle: FarmBundle): string | null {
  const { farm } = bundle
  const parts = [
    farm.farmerPriority && `priority: ${farm.farmerPriority}`,
    farm.waterAvailability && `water: ${farm.waterAvailability}`,
    farm.equipmentLimitation && `equipment: ${farm.equipmentLimitation}`,
    farm.marketPreference && `market: ${farm.marketPreference}`,
  ].filter(Boolean)
  return parts.length ? `**Your priorities:** ${parts.join('; ')}.` : null
}

function riskSource(bundle: FarmBundle): string {
  return `Risk ${bundle.analysis.risk.modelVersion}`
}

function findPlant(question: string, bundle: FarmBundle) {
  const q = question.toLowerCase()
  return bundle.plants.find((plant) => {
    const species = getSpecies(plant.speciesId)
    const words = species.name
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length >= 4 && !['winter', 'spring', 'summer'].includes(word))
    const variety = plant.variety.toLowerCase()
    return (
      words.some((word) => new RegExp(`\\b${word}\\b`).test(q)) || (variety.length > 3 && q.includes(variety))
    )
  })
}

/* --------------------------------------------------------------- the brief */

export function buildBrief(bundle: FarmBundle): AssistantReply {
  const { farm, plants, analysis } = bundle
  const { conditions, charts } = analysis
  const risk = analysis.risk
  const top = topRisks(bundle, 1)[0]

  const plantSentence =
    plants.length === 0
      ? 'There are no plant records yet, so I can only read the land, weather and soil baseline.'
      : plants.length === 1
        ? `One plot is in the record: ${plants
            .map((plant) => `${getSpecies(plant.speciesId).name} — ${stageFor(bundle, plant.id)?.stage ?? 'an unset stage'}`)
            .join(', ')}.`
        : `The record carries ${plants.length} plots: ${plants
            .map((plant) => `${getSpecies(plant.speciesId).name} — ${stageFor(bundle, plant.id)?.stage ?? 'stage unset'}`)
            .join('; ')}.`

  const bullets: string[] = []

  if (charts.water.irrigationNeedMm >= 1) {
    bullets.push(
      `**Water:** ${formatNumber(charts.water.irrigationNeedMm, 0)} mm of irrigation need in the balance, with ${formatNumber(conditions.rainfallNext7dMm, 1)} mm forecast over the next seven days.`,
    )
  } else {
    bullets.push(
      `**Water:** the profile is covering crop use — no irrigation gap is flagged over the water window. ${formatNumber(conditions.rainfallNext7dMm, 1)} mm is forecast in the next seven days.`,
    )
  }

  if (top) {
    bullets.push(
      risk.overall === 'low'
        ? `**Risk:** nothing is above the reporting threshold; “${top.title}” is the first watch item.`
        : `**Risk:** ${SEVERITY_LABELS[risk.overall]} overall, led by “${top.title}” at ${percent(top.likelihood)} likelihood.`,
    )
  } else {
    bullets.push('**Risk:** the register is clear for this run.')
  }

  const timing = section(bundle, 'timing')
  if (timing?.gist) bullets.push(`**Next:** ${timing.gist.replace(/^Next operation: /, '')}`)

  const priorityNote = priorityLine(bundle)
  if (priorityNote) bullets.push(priorityNote)

  return {
    text: `${farm.name} is ${formatArea(farm.area)} of ${titleCase(farm.soilType)} in ${farm.locality}, ${farm.district}. ${plantSentence}`,
    bullets,
    sources: ['Farm record', adviceSource(bundle), riskSource(bundle), '14-day forecast'],
    action:
      top && severityRank(top.severity) >= severityRank('high')
        ? { label: 'Open the risk register', tab: 'risk' }
        : charts.water.irrigationNeedMm > 12
          ? { label: 'See the irrigation call', tab: 'advice' }
          : undefined,
  }
}

/* ---------------------------------------------------------- suggested asks */

export function suggestedPrompts(bundle: FarmBundle): AssistantPrompt[] {
  const { conditions, charts, risk } = bundle.analysis
  const top = topRisks(bundle, 1)[0]
  const need = charts.water.irrigationNeedMm
  const rain = conditions.rainfallNext7dMm
  const lowPh = conditions.averagePh < 5.9
  const highPh = conditions.averagePh > 7.6

  return [
    {
      id: 'priorities',
      label: "This week's priorities",
      description: `${risk.items.length} open ${risk.items.length === 1 ? 'risk' : 'risks'} · ${bundle.plants.length} ${bundle.plants.length === 1 ? 'plot' : 'plots'}`,
      question: 'What should I do this week?',
    },
    {
      id: 'water',
      label: 'The water balance',
      description: `${formatNumber(need, 0)} mm need · ${formatNumber(rain, 1)} mm rain next 7 d`,
      question: 'How much water does the farm need?',
    },
    {
      id: 'soil',
      label: 'Soil & nutrients',
      description: `pH ${conditions.averagePh.toFixed(2)} · fertility ${conditions.fertilityIndex}/100${lowPh || highPh ? ' · amendment due' : ''}`,
      question: 'What is limiting the soil?',
    },
    {
      id: 'risk',
      label: 'The risk register',
      description: top ? `${SEVERITY_LABELS[risk.overall]} · ${top.title}` : 'Nothing above threshold',
      question: 'What is the biggest risk on this farm?',
    },
  ]
}

/* -------------------------------------------------------------- the router */

export function answerQuestion(question: string, bundle: FarmBundle): AssistantReply {
  const q = question.trim().toLowerCase()
  if (!q) return fallback(bundle)

  const isGreeting =
    /^(hi|hey|hello|good (morning|afternoon|evening)|yo)\b/.test(q) && q.split(/\s+/).length <= 5
  if (isGreeting) {
    const brief = buildBrief(bundle)
    return { ...brief, text: `Hello — ${brief.text}` }
  }
  if (/^(thanks|thank you|cheers|much appreciated)\b/.test(q) && q.split(/\s+/).length <= 5) {
    return {
      text: 'Any time. The record is here when you want the next check.',
      sources: ['Farm record'],
      followUps: ['What should I do this week?', 'What is the biggest risk on this farm?'],
    }
  }

  if (/(who are you|what are you|what can you|how can you|what do you do|help|capabilit)/.test(q)) return help(bundle)
  if (/(what|which) model|are you (an? )?(ai|llm|gpt)|do you use (ai|gpt|an? llm)|how do you (work|answer)/.test(q))
    return grounding(bundle)
  if (/(\bwater\b|irrigat|drought|moisture|\brain|dry spell|\bpump|\bwet\b)/.test(q)) return water(bundle, question)
  if (/(fertil|nitrogen|phosph|potassium|\bnpk\b|urea|nutrient|manure|compost|lime|sulph|zinc)/.test(q))
    return nutrients(bundle, question)
  if (/(\bsoil\b|\bph\b|organic|fertility|acid|alkalin)/.test(q)) return soil(bundle, question)
  if (/(pest|disease|blight|rust|borer|aphid|fung|mildew|scout|spray)/.test(q)) return pests(bundle, question)
  if (/(price|market|sell|sale|storage|commodity|income|profit|revenue)/.test(q)) return market(bundle, question)
  if (/(rotation|next crop|next season|follow|break crop|repeat|plant next|crop next)/.test(q))
    return rotation(bundle, question)
  if (/(harvest|ready|matur|when.*(cut|combine)|timing|calendar)/.test(q)) return harvest(bundle)
  if (/(weather|forecast|frost|\bheat\b|temperature|humid)/.test(q)) return weather(bundle, question)
  if (/(risk|danger|threat|worry|worst|exposure|vulnerab)/.test(q)) return riskAnswer(bundle, question)
  if (/(what should|priorit|this week|attention|\bfirst\b|urgent|do now|\bplan\b|act on)/.test(q))
    return priorities(bundle, question)

  const plant = findPlant(question, bundle)
  if (plant) return crop(bundle, plant.id)
  if (/\bplants?\b|\bplots?\b|\bcrops?\b/.test(q)) return plantList(bundle)

  return fallback(bundle)
}

/* ----------------------------------------------------------------- answers */

function help(bundle: FarmBundle): AssistantReply {
  return {
    text: `I read ${bundle.farm.name}'s record and explain what the rule engine already knows. Ask in plain language — I will show the numbers and the ledger they came from.`,
    bullets: [
      '**Water:** irrigation need, the driest plot and the forecast.',
      '**Soil and nutrients:** pH, organic matter and the fertiliser gap.',
      '**Risk and pests:** what the register scores and what to do first.',
      '**Rotation and harvest:** the next crop, timing and the nearest window.',
    ],
    sources: ['Farm record', adviceSource(bundle), riskSource(bundle)],
    followUps: ['What should I do this week?', 'What is limiting the soil?'],
  }
}

function grounding(bundle: FarmBundle): AssistantReply {
  return {
    text: `I am not an external language model. I am a deterministic reply layer over ${bundle.farm.name}'s farm record: your question is matched to a rule, and the answer is assembled from the same advice, risk and chart values you see in the tabs.`,
    bullets: [
      '**Grounded:** every number comes from this farm’s record and the current analysis.',
      '**Auditable:** the source chips name the ledger and model version behind the answer.',
      '**Honest:** if a question falls outside the record, I say so and show the brief instead.',
    ],
    sources: ['Farm record', adviceSource(bundle), riskSource(bundle)],
    followUps: ['What can you do?', 'What should I do this week?'],
  }
}

function water(bundle: FarmBundle, question: string): AssistantReply {
  const { charts, conditions } = bundle.analysis
  const series = charts.water
  const irrigation = section(bundle, 'irrigation')

  const rows = conditions.perPlant.map((row) => {
    const plant = bundle.plants.find((p) => p.id === row.plantId)
    return { ...row, moisture: plant?.soilMoisture ?? 0 }
  })
  const driest = [...rows].sort((a, b) => a.moisture - b.moisture)[0]
  const demand = [...series.perPlant]
    .map((row) => ({ ...row, total: row.values.reduce((sum, value) => sum + value, 0) }))
    .sort((a, b) => b.total - a.total)[0]
  const asksWhich = /which crop|most water|water-stress/.test(question.toLowerCase())

  const bullets: string[] = []
  if (driest && !asksWhich) {
    bullets.push(
      `**Driest plot:** ${driest.label} at ${driest.moisture}% root-zone moisture; stage: ${driest.stage}.`,
    )
  }
  if (demand && demand.plantId !== driest?.plantId) {
    bullets.push(
      `**Highest crop demand:** ${demand.label} at ${formatNumber(demand.total, 0)} mm over the window.`,
    )
  }
  if (irrigation?.gist) bullets.push(`**Engine call:** ${sentence(irrigation.gist)}`)

  const balance =
    series.irrigationNeedMm >= 1
      ? `Across ${windowLabel(series.periodLabel)}, the water balance shows **${formatNumber(series.irrigationNeedMm, 0)} mm of irrigation need**. Effective rain covers ${formatNumber(series.effectiveRainfallMm, 0)} mm over the window, and the next seven days add ${formatNumber(conditions.rainfallNext7dMm, 1)} mm.`
      : `The water balance is closed across ${windowLabel(series.periodLabel)} — effective rain covers crop use, so no irrigation gap is flagged. The next seven days add ${formatNumber(conditions.rainfallNext7dMm, 1)} mm.`
  const text =
    asksWhich && driest
      ? `**${driest.label}** is carrying the least root-zone moisture — ${driest.moisture}% at ${driest.stage}. ${balance}`
      : balance

  return withWhy(
    {
      text,
      bullets,
      sources: ['Water balance', '14-day forecast', adviceSource(bundle)],
      action: { label: 'See the water chart', tab: 'visualizations' },
      followUps: ['Which crop is most water-stressed?', 'What should I do this week?'],
    },
    irrigation?.drivers,
    question,
    'FAO-56 crop water use (ET₀ × stage coefficient) less effective rainfall across the water window.',
  )
}

function nutrients(bundle: FarmBundle, question: string): AssistantReply {
  const rows = bundle.analysis.charts.fertilizer
  const gaps = rows
    .filter((row) => row.gapKgPerAcre > 0.5)
    .sort((a, b) => b.gapKgPerAcre - a.gapKgPerAcre)
  const acres = totalAcres(bundle)
  const plan = section(bundle, 'fertilizer')

  if (!gaps.length) {
    return withWhy(
      {
        text: 'The soil test already covers the crop requirement — the fertiliser plan is a maintenance dose only. Nothing is short enough to change the programme.',
        bullets: plan?.gist ? [`**Plan:** ${plan.gist}`] : undefined,
        sources: ['Soil test', adviceSource(bundle)],
        action: { label: 'Open the advice ledger', tab: 'advice' },
        followUps: ['How do I fix the pH?', 'What should I do this week?'],
      },
      plan?.drivers,
      question,
      'Crop requirement minus measured soil supply, converted to product weight and split by stage.',
    )
  }

  const bullets = gaps.slice(0, 4).map((row) => {
    const total = Math.round(row.productKgPerAcre * acres)
    return `**${row.label}:** ${formatNumber(row.gapKgPerAcre, 0)} kg/acre short — ${formatNumber(row.productKgPerAcre, 0)} kg/acre of ${row.productName}; ${formatNumber(total, 0)} kg across ${formatNumber(acres, 1)} acres.`
  })
  if (gaps.length > 4) bullets.push(`Plus ${gaps.length - 4} smaller ${gaps.length - 4 === 1 ? 'gap' : 'gaps'} in the ledger.`)

  const nitrogen = rows.find((row) => row.nutrient === 'N')
  if (nitrogen?.splits.length) {
    bullets.push(
      `**Split the nitrogen:** ${nitrogen.splits.map((split) => `${split.share} at ${split.when.toLowerCase()}`).join('; ')}.`,
    )
  }

  return withWhy(
    {
      text: `The soil test leaves a gap on **${gaps.length} of ${rows.length} nutrients**. The engine converts the measured gap into product weight; the full split plan is in the advice ledger.`,
      bullets,
      sources: ['Soil test', adviceSource(bundle)],
      action: { label: 'Open the advice ledger', tab: 'advice' },
      followUps: ['How do I fix the pH?', 'What should I do this week?'],
    },
    plan?.drivers,
    question,
    'Crop requirement minus measured soil supply, converted to product weight and split by stage.',
  )
}

function soil(bundle: FarmBundle, question: string): AssistantReply {
  const { conditions, charts } = bundle.analysis
  const metrics = [...charts.soil].sort((a, b) => a.index - b.index)
  const ph = conditions.averagePh
  const acres = totalAcres(bundle)
  const lime = limeRequirement(ph, acres, bundle.farm.soilType)
  const plan = section(bundle, 'soil')
  const asksPh = /\bph\b|lime|acid|alkalin/.test(question.toLowerCase())

  if (!metrics.length) {
    return {
      text: 'There is no soil test yet — the analysis needs at least one plant record before it can read pH, organic matter or nutrients.',
      sources: ['Farm record'],
      action: { label: 'Open the plant records', tab: 'plants' },
      followUps: ['What should I do this week?', 'How much water does the farm need?'],
    }
  }

  const off = metrics.filter((metric) => metric.verdict !== 'optimal')
  const otherOff = off.filter((metric) => metric.key !== 'ph')
  const phMetric = metrics.find((metric) => metric.key === 'ph')
  const phInRange = phMetric?.verdict === 'optimal'
  const unit = (metric: { unit: string }) => (metric.unit ? ` ${metric.unit}` : '')
  const bullets: string[] = []

  if (asksPh) {
    if (lime) {
      bullets.push(
        `**Lime:** ${formatNumber(lime.kgPerAcre, 0)} kg/acre (${formatNumber(lime.totalKg, 0)} kg across the farm) would lift pH toward 5.9.`,
      )
    } else if (!phInRange && ph > 7) {
      bullets.push(
        '**No lime:** the pH is already alkaline, so lime would make the problem worse. Work on organic matter and use an acidifying nitrogen source where the crop allows.',
      )
    } else {
      bullets.push(
        `**No lime due:** the engine scores pH ${ph.toFixed(2)} as inside the working range. Keep the same sampling points and re-test after the next rotation.`,
      )
    }
    if (otherOff.length) {
      bullets.push(
        `**Also outside range:** ${otherOff
          .slice(0, 3)
          .map((metric) => `${metric.label} (${metric.verdict})`)
          .join(', ')}.`,
      )
    }
    if (plan?.gist) bullets.push(`**Soil call:** ${plan.gist}`)
  } else {
    for (const metric of off.slice(0, 3)) {
      bullets.push(
        `**${metric.label}:** ${metric.value}${unit(metric)} — ${metric.verdict} against a target of ${metric.optimalLow}–${metric.optimalHigh}${unit(metric)}.`,
      )
    }
    if (off.length > 3) bullets.push(`Plus ${off.length - 3} more metrics outside their working range.`)
    if (lime) {
      bullets.push(
        `**Lime:** ${formatNumber(lime.kgPerAcre, 0)} kg/acre (${formatNumber(lime.totalKg, 0)} kg across the farm) would lift pH toward 5.9.`,
      )
    }
    if (plan?.gist && !lime) bullets.push(`**Soil call:** ${plan.gist}`)
  }

  const text = asksPh
    ? lime
      ? `Average pH is **${ph.toFixed(2)}** — acidic, below the 5.9 lime trigger used in the ledger. Phosphorus availability and legume nodulation are the first things to suffer.`
      : phInRange
        ? `Average pH is **${ph.toFixed(2)}** — the engine scores it inside the working range, so no amendment is due this season.`
        : ph > 7
          ? `Average pH is **${ph.toFixed(2)}** — alkaline, above the working range. Zinc and boron availability fall first at this reaction.`
          : `Average pH is **${ph.toFixed(2)}** — below the working range. Check the lime trigger before the next application window.`
    : off.length === 0
      ? `The soil test averages **pH ${ph.toFixed(2)}** and a fertility index of **${conditions.fertilityIndex}/100**. Every measured property is inside its working range.`
      : `The soil test averages **pH ${ph.toFixed(2)}** and a fertility index of **${conditions.fertilityIndex}/100**. ${off.length} of ${metrics.length} metrics sit outside their working range.`

  return withWhy(
    {
      text,
      bullets,
      sources: ['Soil test', adviceSource(bundle)],
      action: { label: 'Open the advice ledger', tab: 'advice' },
      followUps: ['What fertiliser does the farm need?', 'Why is pH checked every time?'],
    },
    plan?.drivers,
    question,
    'Averaged across the plant records; pH, organic matter and moisture are re-checked on every property edit.',
  )
}

function riskAnswer(bundle: FarmBundle, question: string): AssistantReply {
  const register = bundle.analysis.risk
  const items = topRisks(bundle, 3)

  if (!items.length) {
    return {
      text: 'The risk register is clear for this run. No drought, flood, pest, nutrient or market item is above the reporting threshold.',
      sources: [riskSource(bundle), '14-day forecast'],
      action: { label: 'Open the risk register', tab: 'risk' },
      followUps: ['What should I do this week?', 'How much water does the farm need?'],
    }
  }

  const bullets = items.map(
    (item) =>
      `**${SEVERITY_LABELS[item.severity]} — ${item.title}:** ${percent(item.likelihood)} likelihood${item.window ? ` — ${item.window}` : ''}. ${actionLine(item)}`,
  )

  return withWhy(
    {
      text: `The register stands at **${SEVERITY_LABELS[register.overall]}** overall. ${items.length === 1 ? 'One item is' : `${items.length} items are`} at the top of the ranking.`,
      bullets,
      sources: [riskSource(bundle), '14-day forecast'],
      action: { label: 'Open the risk register', tab: 'risk' },
      followUps: ['How do I protect the flowering crops?', 'What should I do this week?'],
    },
    register.items[0]?.drivers,
    question,
    'Scored from the risk register; severity and likelihood move with the property record and forecast.',
  )
}

function pests(bundle: FarmBundle, question: string): AssistantReply {
  const register = bundle.analysis.risk
  const forecast = bundle.analysis.conditions.weather.filter((day) => day.kind === 'forecast').slice(0, 14)
  const humidity = forecast.length
    ? forecast.reduce((sum, day) => sum + day.humidity, 0) / forecast.length
    : 0
  const items = register.items
    .filter((item) => item.category === 'pest-disease')
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.likelihood - a.likelihood)

  if (!items.length) {
    return {
      text: `No pest or disease item is above the reporting threshold in this run. Forecast humidity averages ${Math.round(humidity)}% over the next 14 days — ${
        humidity >= 75
          ? 'high enough that scouting should stay on the calendar.'
          : 'below the main disease-favouring window.'
      }`,
      sources: [riskSource(bundle), '14-day forecast'],
      action: { label: 'Open the risk register', tab: 'risk' },
      followUps: ['What is the biggest risk on this farm?', 'What should I do this week?'],
    }
  }

  return withWhy(
    {
      text: `The register carries **${items.length} pest or disease ${items.length === 1 ? 'item' : 'items'}**. Forecast humidity averages ${Math.round(humidity)}% over the next 14 days.`,
      bullets: items.slice(0, 3).map(
        (item) =>
          `**${SEVERITY_LABELS[item.severity]} — ${item.title}:** ${percent(item.likelihood)} likelihood${item.window ? ` — ${item.window}` : ''}. ${actionLine(item)}`,
      ),
      sources: [riskSource(bundle), '14-day forecast'],
      action: { label: 'Open the risk register', tab: 'risk' },
      followUps: ['What is the biggest risk on this farm?', 'What should I do this week?'],
    },
    items[0]?.drivers,
    question,
    'Scored from recent humidity and the 14-day forecast against the crop stages in the record.',
  )
}

function market(bundle: FarmBundle, question: string): AssistantReply {
  const register = bundle.analysis.risk
  const commodity = section(bundle, 'commodity')
  const items = register.items
    .filter((item) => item.category === 'market')
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.likelihood - a.likelihood)

  if (!items.length) {
    const detail = listItems(commodity).slice(0, 2)
    return withWhy(
      {
        text: `No market item clears the reporting threshold this run. ${commodity?.gist ?? 'The current crop mix fits the district.'}`,
        bullets: detail,
        sources: [riskSource(bundle), adviceSource(bundle)],
        action: { label: 'Open the commodity note', tab: 'advice' },
        followUps: ['What is the biggest risk on this farm?', 'What should follow this season?'],
      },
      commodity?.drivers,
      question,
      'Scored from the crop price record and the farm’s storage and transport options.',
    )
  }

  return withWhy(
    {
      text: `The market side carries **${items.length} ${items.length === 1 ? 'item' : 'items'}** above the threshold. ${commodity?.gist ?? ''}`.trim(),
      bullets: items.slice(0, 3).map(
        (item) =>
          `**${SEVERITY_LABELS[item.severity]} — ${item.title}:** ${sentence(item.impact)} ${actionLine(item)}`,
      ),
      sources: [riskSource(bundle), adviceSource(bundle)],
      action: { label: 'Open the risk register', tab: 'risk' },
      followUps: ['What is the biggest risk on this farm?', 'What should follow this season?'],
    },
    commodity?.drivers,
    question,
    'Scored from the crop price record and the farm’s storage and transport options.',
  )
}

function rotation(bundle: FarmBundle, question: string): AssistantReply {
  const plan = section(bundle, 'rotation')
  const targets = bundle.plants.slice(0, 2).map((plant) => {
    const current = getSpecies(plant.speciesId).name
    return { current, next: nextCropFor(plant.speciesId, bundle.farm) }
  })

  const bullets = targets.map(
    ({ current, next }) => `**After ${current}:** ${next.species}. ${sentence(next.reason)} Window: ${next.window}.`,
  )
  if (bundle.plants.length > targets.length) {
    bullets.push(`The ledger carries the same check for the other ${bundle.plants.length - targets.length} plots.`)
  }
  if (!bullets.length) bullets.push('There is no plant in the record yet, so rotation starts from the land and district profile.')

  return withWhy(
    {
      text: `${plan?.gist ?? 'The rotation check looks at what each plot grew last season and what is in the ground now.'} The next crop is chosen from the season window, the previous crop family and the soil you have.`,
      bullets,
      sources: ['Farm record', adviceSource(bundle)],
      action: { label: 'Open the advice ledger', tab: 'advice' },
      followUps: ['Which crop is ready to harvest?', 'What should I do this week?'],
    },
    plan?.drivers,
    question,
    'Driven by the previous-crop record and the district season window.',
  )
}

function harvest(bundle: FarmBundle): AssistantReply {
  const rows = bundle.analysis.conditions.perPlant
    .filter((row) => row.daysToHarvest !== null)
    .sort((a, b) => (a.daysToHarvest ?? 0) - (b.daysToHarvest ?? 0))
  const growth = new Map(bundle.analysis.charts.growth.map((series) => [series.plantId, series]))
  const timing = section(bundle, 'timing')

  if (!rows.length) {
    return {
      text: 'No plant is inside a harvest countdown right now. The growth model needs a stage and a planting date before it can open a window.',
      bullets: timing?.gist ? [`**Calendar:** ${timing.gist}`] : undefined,
      sources: ['Growth model', adviceSource(bundle)],
      action: { label: 'Open the plant records', tab: 'plants' },
      followUps: ['What should I do this week?', 'How much water does the farm need?'],
    }
  }

  const bullets = rows.slice(0, 3).map((row) => {
    const series = growth.get(row.plantId)
    return `**${row.label}:** about ${row.daysToHarvest} days — harvest window ${series ? dateRange(series.harvestWindow) : 'shown in the growth chart'}. Stage: ${row.stage}.`
  })
  if (timing?.gist) bullets.push(`**Calendar:** ${timing.gist.replace(/^Next operation: /, '')}`)

  return {
    text: `The nearest harvest window is **${rows[0].label}** in **${rows[0].daysToHarvest} days**.`,
    bullets,
    sources: ['Growth model', adviceSource(bundle)],
    action: { label: 'Open the plant records', tab: 'plants' },
    followUps: ['What should I do this week?', 'How much water does the farm need?'],
  }
}

function weather(bundle: FarmBundle, question: string): AssistantReply {
  const forecast = bundle.analysis.conditions.weather.filter((day) => day.kind === 'forecast').slice(0, 7)
  const rain = forecast.reduce((sum, day) => sum + day.rainfallMm, 0)
  const high = forecast.length ? Math.max(...forecast.map((day) => day.tMax)) : 0
  const low = forecast.length ? Math.min(...forecast.map((day) => day.tMin)) : 0
  const hot = forecast.filter((day) => day.tMax >= 30).length
  const frost = forecast.filter((day) => day.tMin <= 0).length
  const timing = section(bundle, 'timing')

  const bullets: string[] = []
  if (timing?.gist) bullets.push(`**Next operation:** ${sentence(timing.gist.replace(/^Next operation: /, ''))}`)
  if (hot) bullets.push(`${hot} ${hot === 1 ? 'day reaches' : 'days reach'} 30 °C; keep any flowering or grain-filling crop watered in the early morning.`)
  if (frost) bullets.push(`${frost} ${frost === 1 ? 'night falls' : 'nights fall'} to 0 °C or below; hold nitrogen until the frost passes.`)

  return withWhy(
    {
      text: `The next seven days bring **${formatNumber(rain, 1)} mm** of rain, a high of **${formatNumber(high, 1)} °C** and a low of **${formatNumber(low, 1)} °C**.`,
      bullets,
      sources: ['14-day forecast', adviceSource(bundle)],
      action: { label: 'Open the farm overview', tab: 'overview' },
      followUps: ['What should I do this week?', 'How much water does the farm need?'],
    },
    timing?.drivers,
    question,
    'The 14-day forecast, cross-checked against the crop stages in the record.',
  )
}

function priorities(bundle: FarmBundle, question: string): AssistantReply {
  const { charts } = bundle.analysis
  const top = topRisks(bundle, 1)[0]
  const timing = section(bundle, 'timing')

  const bullets: string[] = []
  if (top && top.severity !== 'low') {
    bullets.push(`**First:** ${top.title} — ${actionLine(top)}`)
  } else {
    bullets.push('**Risk:** nothing above the reporting threshold; keep the routine scouting pass and the change log current.')
  }

  if (charts.water.irrigationNeedMm > 5) {
    const rows = bundle.analysis.conditions.perPlant.map((row) => {
      const plant = bundle.plants.find((p) => p.id === row.plantId)
      return { ...row, moisture: plant?.soilMoisture ?? 0 }
    })
    const driest = [...rows].sort((a, b) => a.moisture - b.moisture)[0]
    bullets.push(
      `**Water:** ${formatNumber(charts.water.irrigationNeedMm, 0)} mm of irrigation need${driest ? `; start with ${driest.label} at ${driest.moisture}% root-zone moisture` : ''}.`,
    )
  } else {
    bullets.push('**Water:** the balance is covered; hold irrigation unless a plot dries below its target.')
  }

  if (timing?.gist) {
    bullets.push(`**Calendar:** ${sentence(timing.gist.replace(/^Next operation: /, ''))}`)
  }

  const priorityNote = priorityLine(bundle)
  if (priorityNote) bullets.push(priorityNote)

  return withWhy(
    {
      text: `If this week only fits three jobs, the record points here. The full reasoning sits in the risk register and advice ledger behind each line.`,
      bullets,
      sources: [riskSource(bundle), 'Water balance', adviceSource(bundle)],
      action: { label: 'Open the risk register', tab: 'risk' },
      followUps: ['What is the biggest risk on this farm?', 'How much water does the farm need?'],
    },
    timing?.drivers,
    question,
    'Ranked from the risk register, the water balance and the field calendar.',
  )
}

function crop(bundle: FarmBundle, plantId: string): AssistantReply {
  const plant = bundle.plants.find((p) => p.id === plantId)
  if (!plant) return fallback(bundle)

  const species = getSpecies(plant.speciesId)
  const stage = stageFor(bundle, plantId)
  const growth = bundle.analysis.charts.growth.find((series) => series.plantId === plantId)
  const risk = bundle.analysis.risk
  const matches = risk.items.filter((item) => {
    const haystack = [item.title, item.impact, ...item.blocks.map((block) => (block.kind === 'p' ? block.text : ''))]
      .join(' ')
      .toLowerCase()
    return haystack.includes(species.name.toLowerCase())
  })

  const bullets = [
    `**Soil:** pH ${plant.soilPh.toFixed(2)}, ${plant.soilMoisture}% moisture, N ${plant.nitrogen} · P ${plant.phosphorus} · K ${plant.potassium} kg/ha.`,
    growth ? `**Harvest window:** ${dateRange(growth.harvestWindow)}; current stage: ${growth.currentStage}.` : undefined,
    matches.length
      ? `**In the risk register:** ${matches.map((item) => `${item.title} (${SEVERITY_LABELS[item.severity].toLowerCase()})`).join('; ')}.`
      : `**In the risk register:** no item names ${species.name} directly; farm-level risks still apply.`,
  ].filter((bullet): bullet is string => Boolean(bullet))

  const daysToHarvest = stage?.daysToHarvest
  return {
    text: `**${species.name}**${plant.variety ? ` (${plant.variety})` : ''} is at **${stage?.stage ?? 'an unset stage'}**, day ${stage?.daysSincePlanting ?? '—'}${daysToHarvest !== null && daysToHarvest !== undefined ? `, with about ${daysToHarvest} days to harvest` : ''}. Health index ${stage?.healthIndex ?? '—'}/100.`,
    bullets,
    sources: ['Plant record', 'Growth model', riskSource(bundle)],
    action: { label: 'Open the plant record', tab: 'plants' },
    followUps: ['What should I do this week?', 'How much water does the farm need?'],
  }
}

function plantList(bundle: FarmBundle): AssistantReply {
  const rows = bundle.analysis.conditions.perPlant
  if (!rows.length) {
    return {
      text: 'There are no plant records yet. Add a plant and the assistant can read its stage, soil test, water balance and harvest clock.',
      sources: ['Farm record'],
      action: { label: 'Open the plant records', tab: 'plants' },
      followUps: ['What should I do this week?', 'What is limiting the soil?'],
    }
  }

  const bullets = rows.slice(0, 4).map((row) => {
    const harvest = row.daysToHarvest !== null ? `, ${row.daysToHarvest} days to harvest` : ''
    return `**${row.label}:** ${row.stage}, day ${row.daysSincePlanting}${harvest}. Health ${row.healthIndex}/100.`
  })
  if (rows.length > 4) bullets.push(`Plus ${rows.length - 4} more ${rows.length - 4 === 1 ? 'plot' : 'plots'} in the record.`)

  return {
    text: `The record carries **${rows.length} ${rows.length === 1 ? 'plot' : 'plots'}**. Each one keeps its own soil test, water balance and harvest clock — ask about any crop by name for its detail.`,
    bullets,
    sources: ['Plant record', 'Growth model'],
    action: { label: 'Open the plant records', tab: 'plants' },
    followUps: ['Which crop is most water-stressed?', 'Which crop is ready to harvest?'],
  }
}

function fallback(bundle: FarmBundle): AssistantReply {
  const brief = buildBrief(bundle)
  return {
    ...brief,
    text: `I don't have an answer pattern for that one, and I don't reach outside this farm's record. Here is the current brief instead.\n\n${brief.text}`,
    followUps: ['What should I do this week?', 'What is the biggest risk on this farm?'],
  }
}
