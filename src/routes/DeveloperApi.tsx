import {
  Check,
  Copy,
  KeyRound,
  Play,
  Plus,
  ShieldOff,
  Terminal,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Field, Input, Segmented } from '@/components/ui/controls'
import { Ledger, Stamp, Td, Th } from '@/components/ui/data'
import { EmptyState, Skeleton } from '@/components/ui/feedback'
import { ConfirmDialog, Dialog, Dropdown, DropdownContent, DropdownItem, DropdownTrigger, Tip } from '@/components/ui/overlays'
import { Divider, Panel, PanelBody, PanelHead, SectionHead } from '@/components/ui/surfaces'
import { useAsync, useCopyToClipboard } from '@/lib/hooks'
import { cn } from '@/lib/cn'
import { formatDate, relativeTime } from '@/lib/format'
import { api, apiRequest, apiRequestLog, latencyRange } from '@/mock/api'
import type { ApiKey } from '@/mock/types'
import { toast, useUi } from '@/store/ui'

interface Endpoint {
  id: string
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  summary: string
  notes: string
  body?: string
}

const ENDPOINTS: Endpoint[] = [
  { id: 'list-projects', method: 'GET', path: '/v1/projects', summary: 'List projects', notes: 'Farm and plant counts are computed, not stored.' },
  { id: 'get-project', method: 'GET', path: '/v1/projects/{id}', summary: 'Fetch one project', notes: 'Returns the full project record including equipment and accommodations.' },
  {
    id: 'project-farms',
    method: 'GET',
    path: '/v1/projects/{id}/farms',
    summary: 'Farms in a project',
    notes: 'Convenience endpoint for dashboards that group by programme.',
  },
  {
    id: 'create-project',
    method: 'POST',
    path: '/v1/projects',
    summary: 'Create a project',
    notes: 'name is required; region, climateZone and budgetUsd are optional but change how advice is generated.',
    body: '{\n  "name": "Demo programme",\n  "region": "North County",\n  "climateZone": "NW",\n  "budgetUsd": 120000\n}',
  },
  {
    id: 'patch-project',
    method: 'PATCH',
    path: '/v1/projects/{id}',
    summary: 'Update a project',
    notes: 'Partial update. Changing climateZone re-runs advice for every farm in the project.',
    body: '{\n  "budgetUsd": 95000\n}',
  },
  { id: 'get-farm', method: 'GET', path: '/v1/farms/{id}', summary: 'Fetch a farm', notes: 'Includes the plant count so you can decide whether to fetch plants next.' },
  { id: 'list-plants', method: 'GET', path: '/v1/farms/{id}/plants', summary: 'Plants on a farm', notes: 'The property record that advice, risk and charts are computed from.' },
  {
    id: 'create-plant',
    method: 'POST',
    path: '/v1/farms/{id}/plants',
    summary: 'Add a plant',
    notes: 'speciesId and variety are required; soil test values default to regional averages.',
    body: '{\n  "speciesId": "winter-wheat",\n  "variety": "Bread wheat, mid-season",\n  "area": { "value": 2.5, "unit": "acre" },\n  "soilPh": 6.1,\n  "soilMoisture": 52\n}',
  },
  {
    id: 'patch-plant',
    method: 'PATCH',
    path: '/v1/plants/{id}',
    summary: 'Change a plant property',
    notes: 'Triggers a recalculation; the response reports the new advice and risk version ids.',
    body: '{\n  "soilPh": 5.6,\n  "soilMoisture": 44\n}',
  },
  { id: 'delete-plant', method: 'DELETE', path: '/v1/plants/{id}', summary: 'Remove a plant', notes: 'Advice is recalculated without the plot.' },
  { id: 'get-advice', method: 'GET', path: '/v1/farms/{id}/advice', summary: 'Latest advice', notes: 'Sections, drivers, the model version and a confidence figure.' },
  {
    id: 'post-advice',
    method: 'POST',
    path: '/v1/farms/{id}/advice',
    summary: 'Regenerate advice',
    notes: 'Runs the model again over the current properties and returns a new version.',
  },
  { id: 'get-risk', method: 'GET', path: '/v1/farms/{id}/risk', summary: 'Latest risk register', notes: 'Items with severity, likelihood, drivers and mitigation.' },
  { id: 'get-viz', method: 'GET', path: '/v1/farms/{id}/visualizations', summary: 'Chart series', notes: 'Growth curves, water use, fertiliser requirement and soil indices as JSON.' },
  { id: 'get-operations', method: 'GET', path: '/v1/farms/{id}/operations', summary: 'Change log', notes: 'Every property operation: field, before, after, actor and time.' },
  { id: 'me', method: 'GET', path: '/v1/me', summary: 'Authenticated identity', notes: 'Shows the scopes attached to the key in use.' },
]

const METHOD_TONE: Record<Endpoint['method'], string> = {
  GET: 'text-green-700',
  POST: 'text-marigold-700',
  PATCH: 'text-soil-700',
  DELETE: 'text-clay-700',
}

export function DeveloperApiRoute() {
  const keys = useAsync(() => api.listApiKeys(), [])
  const [activeEndpoint, setActiveEndpoint] = useState<Endpoint>(ENDPOINTS[0])
  const [createOpen, setCreateOpen] = useState(false)
  const [revoking, setRevoking] = useState<ApiKey | null>(null)
  const [createdKey, setCreatedKey] = useState<ApiKey | null>(null)
  const { copied, copy } = useCopyToClipboard()
  const mode = useUi((s) => s.mode)
  const setMode = useUi((s) => s.setMode)
  const navigate = useNavigate()

  const activeKeys = (keys.data ?? []).filter((k) => k.status === 'active')

  if (mode === 'farmer') {
    return (
      <div className="mx-auto max-w-[680px] py-8">
        <Panel>
          <EmptyState
            title="The developer API is a researcher tool"
            description="Farmer mode keeps the interface focused on the field. Switch to researcher mode to manage API keys and call Farmo from your own tools."
            actions={
              <>
                <Button variant="primary" icon={<Terminal />} onClick={() => setMode('researcher')}>
                  Switch to researcher mode
                </Button>
                <Button variant="quiet" onClick={() => navigate('/projects')}>
                  Back to projects
                </Button>
              </>
            }
          />
        </Panel>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1240px]">
      <SectionHead
        eyebrow="Developer API"
        title="Read and change project data from your own tools"
        description="The demo exposes the same handlers the interface uses. Keys, rate limits and errors behave like the production API, and the console below makes real calls against the mock layer."
        actions={
          <Button variant="primary" icon={<Plus />} onClick={() => setCreateOpen(true)}>
            Create API key
          </Button>
        }
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        {/* Keys */}
        <Panel>
          <PanelHead
            title="API keys"
            meta={`${activeKeys.length} active · ${latencyRange()[0]}–${latencyRange()[1]} ms simulated latency per call`}
            display
          />
          {keys.loading && (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          )}
          {keys.data && keys.data.length === 0 && (
            <EmptyState
              compact
              title="No keys yet"
              description="Create a key to call the API from a dashboard, a spreadsheet script or a weather ingest job."
              actions={
                <Button variant="primary" icon={<Plus />} onClick={() => setCreateOpen(true)}>
                  Create the first key
                </Button>
              }
            />
          )}
          {keys.data && keys.data.length > 0 && (
            <div className="overflow-x-auto">
              <Ledger>
                <thead>
                  <tr>
                    <Th>Label</Th>
                    <Th>Key</Th>
                    <Th>Last used</Th>
                    <Th className="col-actions">
                      <span className="sr-only">Actions</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {keys.data.map((key) => (
                    <tr key={key.id}>
                      <Td label="Label" className="strong">
                        <span className="flex items-center gap-2">
                          {key.label}
                          <Stamp tone={key.status === 'active' ? 'green' : 'neutral'}>{key.status}</Stamp>
                        </span>
                        <span className="mt-0.5 block text-[11px] text-ink-3">
                          created {formatDate(key.createdAt, 'dayMonth')} · {key.rateLimitPerHour}/h ·{' '}
                          {key.requestCount.toLocaleString('en-US')} requests · {key.scopes.length} scope
                          {key.scopes.length === 1 ? '' : 's'}
                        </span>
                      </Td>
                      <Td label="Key">
                        <span className="font-mono text-[11px] text-ink-2">{key.secretPreview}</span>
                      </Td>
                      <Td label="Last used">{key.lastUsedAt ? relativeTime(key.lastUsedAt) : 'never'}</Td>
                      <Td className="col-actions">
                        <span className="actions-inner">
                          <Tip content={copied === key.id ? 'Copied' : 'Copy key'}>
                            <Button
                              size="sm"
                              variant="quiet"
                              icon={copied === key.id ? <Check /> : <Copy />}
                              aria-label={`Copy ${key.label}`}
                              onClick={() => {
                                copy(key.secret, key.id)
                                toast({ tone: 'info', title: 'Key copied', body: 'Treat it like a password.' })
                              }}
                            />
                          </Tip>
                          <Dropdown>
                            <DropdownTrigger asChild>
                              <button type="button" className="btn btn-sm btn-quiet btn-icon" aria-label={`More actions for ${key.label}`}>
                                <Terminal aria-hidden />
                              </button>
                            </DropdownTrigger>
                            <DropdownContent>
                              <DropdownItem
                                icon={<Play />}
                                onSelect={() => {
                                  setActiveEndpoint(ENDPOINTS[0])
                                  document.getElementById('api-console')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                  toast({ tone: 'info', title: 'Key selected in the console', body: key.label })
                                }}
                              >
                                Use in the console
                              </DropdownItem>
                              <DropdownItem
                                icon={<ShieldOff />}
                                danger
                                disabled={key.status === 'revoked'}
                                onSelect={() => setRevoking(key)}
                              >
                                Revoke key
                              </DropdownItem>
                            </DropdownContent>
                          </Dropdown>
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Ledger>
            </div>
          )}
          <PanelBody className="border-t border-line">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="eyebrow">Base URL</p>
                <p className="mt-1 font-mono text-xs text-ink-2">https://api.farmo.dev</p>
              </div>
              <div>
                <p className="eyebrow">Auth header</p>
                <p className="mt-1 font-mono text-xs text-ink-2">X-API-Key: fm_live_…</p>
              </div>
              <div>
                <p className="eyebrow">Rate limit</p>
                <p className="mt-1 text-xs text-ink-2">
                  600 requests per hour per key, reported in <span className="font-mono">X-RateLimit-Remaining</span>.
                </p>
              </div>
            </div>
          </PanelBody>
        </Panel>

        {/* Console */}
        <Panel id="api-console" className="lg:sticky lg:top-[76px] lg:self-start">
          <PanelHead title="Try it" meta="Requests hit the same mock handlers the app uses" display />
          <ApiConsole endpoint={activeEndpoint} onChooseEndpoint={setActiveEndpoint} apiKey={activeKeys[0]?.secret} />
        </Panel>
      </div>

      {/* Reference */}
      <div className="mt-8">
        <SectionHead
          eyebrow="Reference"
          title="Endpoints"
          description="Select an endpoint to load its example into the console. All paths are relative to https://api.farmo.dev."
        />
        <div className="mt-4 space-y-2.5">
          {ENDPOINTS.map((endpoint) => (
            <EndpointRow
              key={endpoint.id}
              endpoint={endpoint}
              selected={endpoint.id === activeEndpoint.id}
              onSelect={() => {
                setActiveEndpoint(endpoint)
                document.getElementById('api-console')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }}
              copied={copied}
              onCopy={copy}
            />
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <Panel>
          <PanelHead title="Errors" display />
          <PanelBody className="space-y-2 text-sm text-ink-2">
            <p><span className="font-mono text-xs text-clay-700">401 invalid_api_key</span> — no key, or a key that does not exist.</p>
            <p><span className="font-mono text-xs text-clay-700">403 key_revoked</span> — the key was revoked.</p>
            <p><span className="font-mono text-xs text-clay-700">404 not_found</span> — unknown path or missing resource.</p>
            <p><span className="font-mono text-xs text-clay-700">422 validation_error</span> — the body is missing a required field.</p>
            <p><span className="font-mono text-xs text-clay-700">429 rate_limited</span> — the hourly limit for that key is spent.</p>
          </PanelBody>
        </Panel>
        <Panel>
          <PanelHead title="Recalculation behaviour" display />
          <PanelBody className="space-y-2 text-sm text-ink-2">
            <p>
              A <span className="font-mono text-xs">PATCH</span> on a plant returns after the model has re-run (about 1.4 s in
              the demo, longer in production). The response carries the new advice and risk version ids so you can decide
              whether to refetch.
            </p>
            <p className="text-xs text-ink-3">
              Advice and risk are versioned; history is retained and readable through the same endpoints the interface uses.
            </p>
          </PanelBody>
        </Panel>
        <Panel>
          <PanelHead title="Recent requests" meta="This browser session" display />
          <RequestLog />
        </Panel>
      </div>

      <CreateKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(key) => {
          keys.reload()
          setCreatedKey(key)
        }}
      />

      <Dialog
        open={Boolean(createdKey)}
        onOpenChange={(open) => !open && setCreatedKey(null)}
        title="Copy your key now"
        description="The full secret is shown once. Store it in your secret manager — the list only keeps a preview."
        width="md"
        footer={
          <>
            <Button variant="quiet" onClick={() => setCreatedKey(null)}>
              Close
            </Button>
            <Button
              variant="primary"
              icon={<Copy />}
              onClick={() => {
                if (createdKey) {
                  copy(createdKey.secret, createdKey.id)
                  toast({ tone: 'success', title: 'Key copied to the clipboard' })
                }
              }}
            >
              Copy key
            </Button>
          </>
        }
      >
        <p className="break-all rounded-sm border border-line bg-paper-sunken px-3 py-2.5 font-mono text-xs text-ink">{createdKey?.secret}</p>
        <p className="mt-3 text-xs text-ink-3">
          Scopes: {createdKey?.scopes.join(', ')}. Rate limit {createdKey?.rateLimitPerHour} requests per hour.
        </p>
      </Dialog>

      <ConfirmDialog
        open={Boolean(revoking)}
        onOpenChange={(open) => !open && setRevoking(null)}
        title={`Revoke “${revoking?.label}”?`}
        description="Any integration using this key starts receiving 403 responses immediately. This cannot be undone."
        confirmLabel="Revoke key"
        tone="danger"
        onConfirm={() => {
          if (!revoking) return
          void api.revokeApiKey(revoking.id).then(() => {
            toast({ tone: 'info', title: 'Key revoked', body: revoking.label })
            setRevoking(null)
            keys.reload()
          })
        }}
      />
    </div>
  )
}

/* ------------------------------------------------------------- endpoint -- */

function EndpointRow({
  endpoint,
  selected,
  onSelect,
  copied,
  onCopy,
}: {
  endpoint: Endpoint
  selected: boolean
  onSelect: () => void
  copied: string | null
  onCopy: (value: string, key?: string) => void
}) {
  const [open, setOpen] = useState(false)
  const curl = useMemo(
    () =>
      [
        `curl -X ${endpoint.method} https://api.farmo.dev${endpoint.path} \\`,
        `  -H "X-API-Key: $FARMO_API_KEY" \\`,
        endpoint.body ? `  -H "Content-Type: application/json" \\\n  -d '${endpoint.body.replace(/\n\s*/g, ' ')}'` : `  -H "Accept: application/json"`,
      ].join('\n'),
    [endpoint],
  )
  const js = useMemo(
    () =>
      [
        `const res = await fetch("https://api.farmo.dev${endpoint.path}", {`,
        `  method: "${endpoint.method}",`,
        `  headers: { "X-API-Key": process.env.FARMO_API_KEY },`,
        endpoint.body ? `  body: JSON.stringify(${endpoint.body.replace(/\n\s*/g, ' ')}),` : null,
        `});`,
        `const { data } = await res.json();`,
      ]
        .filter(Boolean)
        .join('\n'),
    [endpoint],
  )

  return (
    <div className={cn('panel', selected && 'border-green-600')}>
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
        <span className={cn('w-[52px] flex-none font-mono text-[11px] font-semibold', METHOD_TONE[endpoint.method])}>{endpoint.method}</span>
        <button type="button" onClick={onSelect} className="font-mono text-xs text-ink hover:underline">
          {endpoint.path}
        </button>
        <span className="min-w-0 flex-1 truncate text-sm text-ink-2">{endpoint.summary}</span>
        <div className="flex flex-none items-center gap-1.5">
          <Button size="sm" variant="quiet" onClick={() => setOpen((v) => !v)}>
            {open ? 'Hide examples' : 'cURL / JS'}
          </Button>
          <Button size="sm" variant="outline" icon={<Play />} onClick={onSelect}>
            Try it
          </Button>
        </div>
      </div>
      {open && (
        <div className="grid gap-3 border-t border-line bg-paper-sunken/50 p-4 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="eyebrow">cURL</p>
              <Button size="sm" variant="quiet" icon={copied === `${endpoint.id}-curl` ? <Check /> : <Copy />} onClick={() => onCopy(curl, `${endpoint.id}-curl`)} aria-label="Copy cURL example">
                Copy
              </Button>
            </div>
            <pre className="overflow-x-auto rounded-sm border border-line bg-paper-raised p-3 font-mono text-[11px] leading-relaxed text-ink-2">{curl}</pre>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="eyebrow">JavaScript</p>
              <Button size="sm" variant="quiet" icon={copied === `${endpoint.id}-js` ? <Check /> : <Copy />} onClick={() => onCopy(js, `${endpoint.id}-js`)} aria-label="Copy JavaScript example">
                Copy
              </Button>
            </div>
            <pre className="overflow-x-auto rounded-sm border border-line bg-paper-raised p-3 font-mono text-[11px] leading-relaxed text-ink-2">{js}</pre>
          </div>
          <p className="text-xs text-ink-3 sm:col-span-2">{endpoint.notes}</p>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------- console -- */

function ApiConsole({
  endpoint,
  onChooseEndpoint,
  apiKey,
}: {
  endpoint: Endpoint
  onChooseEndpoint: (endpoint: Endpoint) => void
  apiKey?: string
}) {
  const [path, setPath] = useState(endpoint.path)
  const [body, setBody] = useState(endpoint.body ?? '')
  const [method, setMethod] = useState<Endpoint['method']>(endpoint.method)
  const [response, setResponse] = useState<{ status: number; ms: number; headers: Record<string, string>; body: unknown } | null>(null)
  const [running, setRunning] = useState(false)

  const [id] = useState(() => {
    // Fill {id} placeholders with a real record so the first click works.
    return ''
  })
  void id

  const run = async () => {
    setRunning(true)
    try {
      let resolved = path
      if (resolved.includes('{id}')) {
        // Resolve a plausible id from the current data so "Try it" always works.
        const projects = await api.listProjects()
        const farmId = projects[0]?.project.farmIds[0]
        const plantBundle = farmId ? await api.getFarmBundle(farmId) : null
        const plantId = plantBundle?.plants[0]?.id
        resolved = resolved
          .replace('/projects/{id}', `/projects/${projects[0]?.project.id ?? 'prj-north'}`)
          .replace('/farms/{id}', `/farms/${farmId ?? 'farm-northfield'}`)
          .replace('/plants/{id}', `/plants/${plantId ?? 'plant-nf-wheat'}`)
        setPath(resolved)
      }
      const payload = body.trim() ? (JSON.parse(body) as unknown) : undefined
      const result = await apiRequest(method, resolved, { body: payload, apiKey })
      setResponse({ status: result.status, ms: result.ms, headers: result.headers, body: result.body })
      requestLogBump()
    } catch (error) {
      setResponse({
        status: 400,
        ms: 0,
        headers: {},
        body: { error: 'client_error', message: error instanceof Error ? error.message : 'Request failed' },
      })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div>
      <PanelBody className="space-y-3">
        <div className="flex items-center gap-2">
          <Segmented
            label="HTTP method"
            value={method}
            onChange={(value) => setMethod(value as Endpoint['method'])}
            options={(['GET', 'POST', 'PATCH', 'DELETE'] as const).map((m) => ({ value: m as Endpoint['method'], label: m }))}
          />
          <select
            aria-label="Load an endpoint"
            className="select h-[26px] flex-1 text-xs"
            value={endpoint.id}
            onChange={(event) => {
              const next = ENDPOINTS.find((e) => e.id === event.target.value)
              if (!next) return
              onChooseEndpoint(next)
              setMethod(next.method)
              setPath(next.path)
              setBody(next.body ?? '')
              setResponse(null)
            }}
          >
            {ENDPOINTS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.method} {e.path}
              </option>
            ))}
          </select>
        </div>

        <Field label="Path" hint="Relative to https://api.farmo.dev. {id} is resolved to a real record on send.">
          {({ id: fieldId, ...aria }) => (
            <Input id={fieldId} className="font-mono text-xs" value={path} onChange={(event) => setPath(event.target.value)} {...aria} />
          )}
        </Field>

        {(method === 'POST' || method === 'PATCH') && (
          <Field label="JSON body" hint="Validated by the same schema the interface uses.">
            {({ id: fieldId, ...aria }) => (
              <textarea
                id={fieldId}
                rows={6}
                className="textarea font-mono text-xs"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                spellCheck={false}
                {...aria}
              />
            )}
          </Field>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" icon={<Play />} loading={running} onClick={() => void run()}>
            Send request
          </Button>
          <span className="text-xs text-ink-3">
            {apiKey ? (
              <>
                using key <span className="font-mono">{apiKey.slice(0, 12)}…</span>
              </>
            ) : (
              'no active key — create one first'
            )}
          </span>
        </div>

        {response && (
          <div className="fade-up">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Stamp tone={response.status < 400 ? 'green' : 'clay'}>{response.status}</Stamp>
              <span className="tnum text-xs text-ink-3">{response.ms} ms round trip</span>
              <span className="text-xs text-ink-3">
                remaining {response.headers['X-RateLimit-Remaining']}/{response.headers['X-RateLimit-Limit']}
              </span>
            </div>
            <pre
              aria-live="polite"
              className="max-h-[320px] overflow-auto rounded-sm border border-line bg-paper-sunken p-3 font-mono text-[11px] leading-relaxed text-ink-2"
            >
              {JSON.stringify(response.body, null, 2)}
            </pre>
          </div>
        )}

        {!response && !running && (
          <p className="text-xs leading-relaxed text-ink-3">
            The console resolves <span className="font-mono">{'{id}'}</span> to a real project, farm or plant from the demo
            data, then calls the mock handler and shows the raw JSON, the status code and the round-trip time.
          </p>
        )}
      </PanelBody>
    </div>
  )
}

let logNonce = 0
const logListeners = new Set<() => void>()
function requestLogBump() {
  logNonce += 1
  logListeners.forEach((listener) => listener())
}

function RequestLog() {
  const [, force] = useState(0)
  useMemo(() => {
    const listener = () => force((n) => n + 1)
    logListeners.add(listener)
    return () => logListeners.delete(listener)
  }, [])
  const entries = apiRequestLog()
  if (!entries.length) {
    return (
      <PanelBody>
        <p className="text-sm text-ink-3">No requests yet from this session. Send one from the console and it will appear here.</p>
      </PanelBody>
    )
  }
  return (
    <ul className="divide-y divide-line">
      {entries.slice(0, 8).map((entry) => (
        <li key={entry.id} className="flex items-center gap-2.5 px-4 py-2">
          <span className={cn('w-[42px] flex-none font-mono text-[11px] font-semibold', entry.status < 400 ? 'text-green-700' : 'text-clay-700')}>
            {entry.status}
          </span>
          <span className="w-[52px] flex-none font-mono text-[11px] text-ink-3">{entry.method}</span>
          <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink-2">{entry.path}</span>
          <span className="tnum flex-none text-[11px] text-ink-3">{entry.ms} ms</span>
        </li>
      ))}
    </ul>
  )
}

function CreateKeyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (key: ApiKey) => void
}) {
  const [label, setLabel] = useState('')
  const [labelError, setLabelError] = useState<string | null>(null)
  const [scopes, setScopes] = useState<string[]>(['projects:read', 'farms:read', 'plants:read', 'advice:read', 'risk:read'])
  const [busy, setBusy] = useState(false)

  const ALL_SCOPES = [
    { id: 'projects:read', label: 'projects:read', detail: 'List and read projects' },
    { id: 'farms:read', label: 'farms:read', detail: 'Read farm records' },
    { id: 'plants:read', label: 'plants:read', detail: 'Read plant properties' },
    { id: 'plants:write', label: 'plants:write', detail: 'Change plant properties (triggers recalculation)' },
    { id: 'advice:read', label: 'advice:read', detail: 'Read advice versions' },
    { id: 'risk:read', label: 'risk:read', detail: 'Read risk registers' },
  ]

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create an API key"
      description="Give each integration its own key so you can revoke one without breaking the others."
      footer={
        <>
          <Button variant="quiet" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<KeyRound />}
            loading={busy}
            onClick={() => {
              if (label.trim().length < 3) {
                setLabelError('Give the key a label so you can recognise it later.')
                return
              }
              setLabelError(null)
              setBusy(true)
              void api
                .createApiKey(label, scopes)
                .then((key) => {
                  onCreated(key)
                  onOpenChange(false)
                  setLabel('')
                  toast({ tone: 'success', title: 'API key created', body: `${key.label} · ${key.rateLimitPerHour} requests per hour` })
                })
                .finally(() => setBusy(false))
            }}
          >
            Create key
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Label" error={labelError} hint="Something like “Irrigation dashboard” or “Research export”.">
          {({ id, ...aria }) => (
            <Input id={id} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Irrigation dashboard" {...aria} />
          )}
        </Field>
        <fieldset>
          <legend className="field-label">Scopes</legend>
          <div className="grid gap-2">
            {ALL_SCOPES.map((scope) => {
              const checked = scopes.includes(scope.id)
              return (
                <label key={scope.id} className="flex items-start gap-2.5 rounded-sm border border-line px-2.5 py-2 hover:bg-paper-sunken">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setScopes((current) => (checked ? current.filter((s) => s !== scope.id) : [...current, scope.id]))}
                    className="mt-[3px] h-[15px] w-[15px] accent-[#2e5f3a]"
                  />
                  <span>
                    <span className="block font-mono text-xs text-ink">{scope.label}</span>
                    <span className="block text-xs text-ink-3">{scope.detail}</span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>
        <Divider />
        <p className="text-xs text-ink-3">
          Keys are scoped to read by default. A write scope lets an integration change plant properties, which triggers a
          recalculation exactly as an edit in the interface would.
        </p>
      </div>
    </Dialog>
  )
}

export function DevApiSkeleton() {
  return <Skeleton className="h-[300px] w-full" />
}

