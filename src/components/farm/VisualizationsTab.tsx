import { Download, FileSpreadsheet, LineChart, Table2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart as RLineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button, Segmented } from '@/components/ui/controls'
import { Ledger, Stamp, Td, Th } from '@/components/ui/data'
import { EmptyState, Skeleton } from '@/components/ui/feedback'
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from '@/components/ui/overlays'
import { Panel, PanelBody, PanelHead } from '@/components/ui/surfaces'
import { GraphIllustration } from '@/components/brand/brand'
import { formatDate, formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { FarmAnalysis } from '@/mock/types'
import { useFarm } from '@/store/farm'
import { toast } from '@/store/ui'

/* Chart palette from DESIGN.md §2 (data viz sequence). */
const C = {
  green: '#2e5f3a',
  marigold: '#de9a1e',
  soil: '#6e5335',
  clay: '#a83a28',
  lightGreen: '#4c7c57',
  sand: '#bca27b',
}
const SERIES = [C.green, C.marigold, C.soil, C.clay, C.lightGreen, C.sand]

const axisProps = {
  tick: { fontSize: 11, fill: '#6b6650' },
  tickLine: false as const,
  axisLine: { stroke: '#c9bc9b' },
}

interface TipPayload {
  name?: string | number
  value?: number | string
  unit?: string
  color?: string
}

function ChartTooltip({
  active,
  payload,
  label,
  unit,
  labelFormatter,
}: {
  active?: boolean
  payload?: TipPayload[]
  label?: string | number
  unit?: string
  labelFormatter?: (label: string | number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-sm border border-line-strong bg-paper-raised px-2.5 py-2 shadow-[var(--shadow-pop)]">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        {labelFormatter && label !== undefined ? labelFormatter(label) : label}
      </p>
      <ul className="space-y-0.5">
        {payload.map((entry, index) => (
          <li key={`${entry.name}-${index}`} className="flex items-center gap-2 text-xs">
            <span className="h-[3px] w-[10px] flex-none rounded-full" style={{ background: entry.color }} aria-hidden />
            <span className="text-ink-2">{entry.name}</span>
            <span className="tnum ml-auto font-semibold text-ink">
              {typeof entry.value === 'number' ? formatNumber(entry.value, entry.value < 10 ? 2 : 1) : entry.value}
              {unit ? ` ${unit}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ------------------------------------------------------------- frame ------- */

function ChartFrame({
  title,
  unit,
  description,
  actions,
  children,
  data,
  csvName,
  height = 260,
  note,
}: {
  title: string
  unit?: string
  description: string
  actions?: React.ReactNode
  children: React.ReactNode
  data: Array<Record<string, string | number>>
  csvName: string
  height?: number
  note?: string
}) {
  const [showData, setShowData] = useState(false)

  const columns = useMemo(() => (data.length ? Object.keys(data[0]) : []), [data])

  const downloadCsv = () => {
    const header = columns.join(',')
    const rows = data.map((row) => columns.map((key) => `${row[key] ?? ''}`).join(','))
    const blob = new Blob([`${header}\n${rows.join('\n')}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${csvName}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast({ tone: 'success', title: 'CSV exported', body: `${csvName}.csv downloaded.` })
  }

  const downloadPng = () => {
    const svg = document.querySelector<SVGSVGElement>(`[data-chart="${title}"] svg`)
    if (!svg) {
      toast({ tone: 'warning', title: 'Nothing to export yet' })
      return
    }
    const clone = svg.cloneNode(true) as SVGSVGElement
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    const box = svg.getBoundingClientRect()
    clone.setAttribute('width', `${Math.round(box.width)}`)
    clone.setAttribute('height', `${Math.round(box.height)}`)
    const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    background.setAttribute('width', '100%')
    background.setAttribute('height', '100%')
    background.setAttribute('fill', '#fffdf7')
    clone.insertBefore(background, clone.firstChild)
    const serialized = new XMLSerializer().serializeToString(clone)
    const image = new Image()
    const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    image.onload = () => {
      const canvas = document.createElement('canvas')
      const scale = 2
      canvas.width = Math.round(box.width) * scale
      canvas.height = Math.round(box.height) * scale
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#fffdf7'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      }
      const pngUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = pngUrl
      link.download = `${csvName}.png`
      link.click()
      URL.revokeObjectURL(url)
      toast({ tone: 'success', title: 'PNG exported', body: `${csvName}.png downloaded.` })
    }
    image.src = url
  }

  return (
    <Panel>
      <PanelHead
        title={title}
        meta={description}
        actions={
          <>
            <Button
              size="sm"
              variant="quiet"
              icon={<Table2 />}
              aria-pressed={showData}
              onClick={() => setShowData((v) => !v)}
            >
              {showData ? 'Hide data' : 'Show data'}
            </Button>
            {actions}
            <Dropdown>
              <DropdownTrigger asChild>
                <Button size="sm" variant="outline" icon={<Download />} aria-label={`Export ${title}`}>
                  Export
                </Button>
              </DropdownTrigger>
              <DropdownContent>
                <DropdownItem icon={<LineChart />} onSelect={downloadPng}>
                  Export chart as PNG
                </DropdownItem>
                <DropdownItem icon={<FileSpreadsheet />} onSelect={downloadCsv}>
                  Export data as CSV
                </DropdownItem>
              </DropdownContent>
            </Dropdown>
          </>
        }
      />
      <PanelBody className="pt-3">
        {unit && <p className="eyebrow mb-2">Y axis · {unit}</p>}
        <div data-chart={title} style={{ height }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            {children as React.ReactElement}
          </ResponsiveContainer>
        </div>
        {note && <p className="mt-2.5 text-xs leading-relaxed text-ink-3">{note}</p>}
        {showData && (
          <div className="mt-3 max-h-[260px] overflow-auto rounded-sm border border-line">
            <Ledger responsive={false}>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <Th key={column} numeric={column !== 'date' && column !== 'series' && column !== 'stage' && column !== 'nutrient' && column !== 'metric'}>
                      {column}
                    </Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={index}>
                    {columns.map((column) => (
                      <Td
                        key={column}
                        numeric={column !== 'date' && column !== 'series' && column !== 'stage' && column !== 'nutrient' && column !== 'metric'}
                      >
                        {row[column]}
                      </Td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Ledger>
          </div>
        )}
      </PanelBody>
    </Panel>
  )
}

/* ---------------------------------------------------------------- tab ----- */

type Range = '30' | '60' | 'season'

export function VisualizationsTab() {
  const bundle = useFarm((s) => s.bundle)
  const [range, setRange] = useState<Range>('60')
  const [activePlot, setActivePlot] = useState<string>('all')

  if (!bundle) return null
  const charts: FarmAnalysis['charts'] = bundle.analysis.charts
  const conditions = bundle.analysis.conditions

  if (!charts.growth.length) {
    return (
      <Panel>
        <EmptyState
          illustration={<GraphIllustration />}
          title="Nothing to plot yet"
          description="Charts are built from the plant record: growth curves from species and planting date, water use from weather and stage, and fertiliser requirement from the soil test. Add a plant to begin."
        />
      </Panel>
    )
  }

  const growthSeries = activePlot === 'all' ? charts.growth : charts.growth.filter((g) => g.plantId === activePlot)
  const windowDays = range === '30' ? 30 : range === '60' ? 60 : 9999
  const waterPoints = charts.water.labels
    .map((label, index) => ({ label, index }))
    .filter(({ index }) => charts.water.labels.length - index <= windowDays)
  const waterData = waterPoints.map(({ label, index }) => {
    const row: Record<string, string | number> = { date: label }
    for (const series of charts.water.perPlant) row[series.label] = series.values[index] ?? 0
    row['Cumulative m³'] = charts.water.cumulativeM3[index] ?? 0
    return row
  })

  const daysSincePlanting = new Map(conditions.perPlant.map((row) => [row.plantId, row.daysSincePlanting]))
  const growthRows = growthSeries.map((series) => {
    const today = daysSincePlanting.get(series.plantId) ?? 0
    const window = windowDays === 9999 ? Number.POSITIVE_INFINITY : windowDays
    const points = series.points.filter((point) => point.day <= today + 21 && point.day >= today - window)
    return { series, points, today }
  })

  // Long-form rows for the export/table, and a date-keyed pivot for the chart.
  const growthData = growthRows.flatMap(({ series, points }) =>
    points.map((point) => ({
      date: point.date,
      series: `${series.speciesLabel} ${series.label}`,
      day: point.day,
      actual: point.actual,
      potential: point.potential,
      stage: point.stage,
    })),
  )

  const growthByDate = useMemo(() => {
    const map = new Map<string, Record<string, string | number>>()
    for (const { series, points } of growthRows) {
      const key = `${series.speciesLabel} ${series.label}`
      for (const point of points) {
        const entry = map.get(point.date) ?? { date: point.date }
        entry[`${key} · actual`] = point.actual
        entry[`${key} · potential`] = point.potential
        map.set(point.date, entry)
      }
    }
    return Array.from(map.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)))
  }, [growthRows])

  const growthKeys = useMemo(
    () =>
      growthRows.flatMap(({ series }) => {
        const key = `${series.speciesLabel} ${series.label}`
        return [`${key} · actual`, `${key} · potential`]
      }),
    [growthRows],
  )

  const fertilizerData = charts.fertilizer.map((row) => ({
    nutrient: row.nutrient,
    required: row.cropNeedKgPerAcre,
    available: Math.min(row.soilSupplyKgPerAcre, row.cropNeedKgPerAcre),
    gap: row.gapKgPerAcre,
    product: row.productKgPerAcre,
  }))

  const soilData = charts.soil.map((metric) => ({
    metric: metric.label.replace('Available ', '').replace('Exchangeable ', ''),
    index: metric.index,
    value: metric.value,
  }))

  const weatherData = charts.weather
    .filter((day) => charts.weather.length - charts.weather.indexOf(day) <= Math.min(windowDays, 45))
    .map((day) => ({
      date: day.date,
      rainfall: day.rainfallMm,
      tMax: day.tMax,
      tMin: day.tMin,
      humidity: day.humidity,
    }))

  const soilRows = charts.soil.map((m) => ({
    metric: m.label,
    value: m.value,
    unit: m.unit || '—',
    optimal: `${m.optimalLow}–${m.optimalHigh}`,
    index: m.index,
    verdict: m.verdict,
  }))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-[62ch]">
          <p className="eyebrow mb-1.5">Series</p>
          <h2 className="font-display text-xl text-ink">Field data for {bundle.farm.name}</h2>
          <p className="mt-1.5 text-sm text-ink-2">
            Every series is computed from the property record — change a soil value or a planting date and the curves move.
            Each chart exports as PNG or CSV, and the underlying numbers are one click away.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Date range"
            value={range}
            onChange={setRange}
            size="md"
            options={[
              { value: '30', label: '30 days' },
              { value: '60', label: '60 days' },
              { value: 'season', label: 'Season' },
            ]}
          />
        </div>
      </div>

      {charts.growth.length > 1 && (
        <Segmented
          label="Plot filter"
          value={activePlot}
          onChange={setActivePlot}
          options={[{ value: 'all', label: `All plots (${charts.growth.length})` }, ...charts.growth.map((g) => ({ value: g.plantId, label: `${g.speciesLabel} · ${g.label}` }))]}
        />
      )}

      <ChartFrame
        title="Crop growth"
        unit="Share of potential biomass, %"
        description="Logistic growth model against the potential for the species. A solid line is the modelled crop, a dashed line of the same colour is the potential for that plot."
        data={growthData.slice(0, 400)}
        csvName={`${bundle.farm.id}-growth`}
        height={280}
        note="Potential follows the species growth curve over the season length of the variety. The modelled line is that potential scaled by the current field-health index — pH, moisture, nutrient balance and organic matter, weighted for this crop. The gap between the two is the accumulated stress. The data table carries the stage of each point."
      >
        <RLineChart data={growthByDate} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
          <CartesianGrid stroke="#e3dbc7" vertical={false} />
          <XAxis dataKey="date" {...axisProps} minTickGap={38} tickFormatter={(value: string) => formatDate(value, 'dayMonth')} />
          <YAxis {...axisProps} domain={[0, (dataMax: number) => Math.max(10, Math.ceil((dataMax * 1.2) / 5) * 5)]} width={44} />
          <RTooltip content={<ChartTooltip unit="%" labelFormatter={(label) => formatDate(String(label))} />} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#6b6650' }} />
          {growthKeys.map((key, index) => {
            const isPotential = key.endsWith('· potential')
            return (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={key.replace(' · ', ' — ')}
                stroke={SERIES[Math.floor(index / 2) % SERIES.length]}
                strokeWidth={isPotential ? 1.3 : 2}
                strokeDasharray={isPotential ? '4 4' : undefined}
                dot={false}
                connectNulls
              />
            )
          })}
        </RLineChart>
      </ChartFrame>

      <ChartFrame
        title="Water use"
        unit="mm per day"
        description={`Crop water use from ET₀ and the stage coefficient. Rainfall over the window: ${charts.water.effectiveRainfallMm} mm effective; irrigation requirement ${charts.water.irrigationNeedMm} mm. Cumulative cubic metres per plot are in the data table.`}
        data={waterData}
        csvName={`${bundle.farm.id}-water`}
        height={280}
      >
        <AreaChart data={waterData} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
          <defs>
            {charts.water.perPlant.map((series, index) => (
              <linearGradient key={series.plantId} id={`waterFill-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES[index % SERIES.length]} stopOpacity={0.28} />
                <stop offset="100%" stopColor={SERIES[index % SERIES.length]} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="#e3dbc7" vertical={false} />
          <XAxis dataKey="date" {...axisProps} minTickGap={38} tickFormatter={(value: string) => formatDate(value, 'dayMonth')} />
          <YAxis {...axisProps} width={44} />
          <RTooltip content={<ChartTooltip labelFormatter={(label) => formatDate(String(label))} />} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#6b6650' }} />
          {charts.water.perPlant.map((series, index) => (
            <Area
              key={series.plantId}
              type="monotone"
              dataKey={series.label}
              name={series.label}
              stroke={SERIES[index % SERIES.length]}
              strokeWidth={1.6}
              fill={`url(#waterFill-${index})`}
            />
          ))}
          <ReferenceLine x={charts.water.labels[charts.water.todayIndex]} stroke="#183018" strokeDasharray="3 4" label={{ value: 'today', fontSize: 10, fill: '#6b6650', position: 'insideTopRight' }} />
        </AreaChart>
      </ChartFrame>

      <ChartFrame
        title="Fertilizer requirement"
        unit="kg per acre, elemental"
        description="Crop requirement against measured soil supply, with the balance to apply. Product weights (urea, TSP, MoP) follow the gap."
        data={fertilizerData}
        csvName={`${bundle.farm.id}-fertilizer`}
        height={260}
        actions={<Stamp tone="plain" className="border-line-strong text-ink-3">basal plus splits</Stamp>}
      >
        <BarChart data={fertilizerData} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
          <CartesianGrid stroke="#e3dbc7" vertical={false} />
          <XAxis dataKey="nutrient" {...axisProps} />
          <YAxis {...axisProps} width={44} />
          <RTooltip content={<ChartTooltip unit="kg/acre" />} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#6b6650' }} />
          <Bar dataKey="available" name="Soil supply" stackId="a" fill={C.sand} radius={[0, 0, 0, 0]} />
          <Bar dataKey="gap" name="Still to apply" stackId="a" fill={C.green} radius={[2, 2, 0, 0]} />
          <Bar dataKey="required" name="Crop requirement" fill={C.marigold} fillOpacity={0.35} barSize={9} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ChartFrame>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartFrame
          title="Soil index"
          unit="Index, 0–100 against the optimum band"
          description="Each soil property mapped to an index so a single radar can show the shape of the test."
          data={soilData}
          csvName={`${bundle.farm.id}-soil-index`}
          height={280}
        >
          <RadarChart data={soilData} outerRadius="72%">
            <PolarGrid stroke="#e3dbc7" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#6b6650' }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: '#bca27b' }} axisLine={false} />
            <Radar name="Index" dataKey="index" stroke={C.green} fill={C.green} fillOpacity={0.22} strokeWidth={1.8} />
            <RTooltip content={<ChartTooltip unit="/100" />} />
          </RadarChart>
        </ChartFrame>

        <Panel>
          <PanelHead title="Soil test against optimum" meta="Values, optimum band and verdict per property" display />
          <div className="overflow-x-auto">
            <Ledger>
              <thead>
                <tr>
                  <Th>Property</Th>
                  <Th numeric>Value</Th>
                  <Th numeric>Optimum</Th>
                  <Th numeric>Index</Th>
                  <Th>Verdict</Th>
                </tr>
              </thead>
              <tbody>
                {soilRows.map((row) => (
                  <tr key={row.metric}>
                    <Td label="Property" className="strong">
                      {row.metric}
                    </Td>
                    <Td numeric label="Value">
                      <span className="tnum">{row.value}</span> <span className="text-[11px] text-ink-3">{row.unit}</span>
                    </Td>
                    <Td numeric label="Optimum">
                      {row.optimal}
                    </Td>
                    <Td numeric label="Index">
                      {row.index}
                    </Td>
                    <Td label="Verdict">
                      <Stamp
                        tone={
                          row.verdict === 'optimal' ? 'green' : row.verdict === 'excess' || row.verdict === 'deficient' ? 'clay' : 'marigold'
                        }
                      >
                        {row.verdict}
                      </Stamp>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Ledger>
          </div>
        </Panel>
      </div>

      <ChartFrame
        title="Weather and soil moisture context"
        unit="°C, mm and %"
        description={`Observed and forecast weather for ${bundle.farm.district}. Rainfall in the last seven days: ${conditions.rainfall7dMm} mm; the next seven: ${conditions.rainfallNext7dMm} mm.`}
        data={weatherData}
        csvName={`${bundle.farm.id}-weather`}
        height={260}
        note="Bars are daily rainfall on the right axis; the lines are daily maximum and minimum temperature. Humidity is in the data table."
      >
        <AreaChart data={weatherData} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
          <defs>
            <linearGradient id="rainFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.marigold} stopOpacity={0.55} />
              <stop offset="100%" stopColor={C.marigold} stopOpacity={0.06} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e3dbc7" vertical={false} />
          <XAxis dataKey="date" {...axisProps} minTickGap={34} tickFormatter={(value: string) => formatDate(value, 'dayMonth')} />
          <YAxis yAxisId="temp" {...axisProps} width={38} />
          <YAxis yAxisId="rain" orientation="right" {...axisProps} width={38} />
          <RTooltip content={<ChartTooltip labelFormatter={(label) => formatDate(String(label))} />} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#6b6650' }} />
          <Area yAxisId="rain" type="monotone" dataKey="rainfall" name="Rainfall (mm)" stroke={C.marigold} fill="url(#rainFill)" strokeWidth={1.4} />
          <Line yAxisId="temp" type="monotone" dataKey="tMax" name="Max °C" stroke={C.clay} strokeWidth={1.8} dot={false} />
          <Line yAxisId="temp" type="monotone" dataKey="tMin" name="Min °C" stroke={C.soil} strokeWidth={1.8} dot={false} />
        </AreaChart>
      </ChartFrame>

      <p className="text-xs text-ink-3">
        Series are drawn with SVG and carry a data table for screen readers. Colours come from the design sequence, and every
        series also differs by marker or line style, so meaning never rests on colour alone.
      </p>
    </div>
  )
}

export function ChartsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-[30%]" />
      <Skeleton className="h-[260px] w-full" />
      <Skeleton className="h-[260px] w-full" />
    </div>
  )
}

export function ChartLegendKey({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <ul className="flex flex-wrap gap-3">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-xs text-ink-2">
          <span className={cn('h-[3px] w-[12px] rounded-full')} style={{ background: item.color }} aria-hidden />
          {item.label}
        </li>
      ))}
    </ul>
  )
}
