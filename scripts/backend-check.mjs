/**
 * End-to-end check that the FastAPI backend satisfies the contract the
 * frontend remote layer relies on.
 *
 *   node scripts/backend-check.mjs        # expects http://localhost:8000
 *
 * Set FARMO_API to point somewhere else. Exits 1 on the first failed check.
 */
const BASE = (process.env.FARMO_API ?? 'http://localhost:8000') + '/api/v1'

let passed = 0
let token = null
let refresh = null
let projectId = null
let farmId = null
let plantId = null

function ok(label, detail = '') {
  passed += 1
  console.log(`  \u2713 ${label}${detail ? ` — ${detail}` : ''}`)
}

function fail(label, detail) {
  console.error(`  \u2717 ${label} — ${detail}`)
  process.exit(1)
}

async function call(method, path, { body, auth = true, tok } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const bearer = tok ?? token
  if (auth && bearer) headers.Authorization = `Bearer ${bearer}`
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let payload = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = text
  }
  return { status: res.status, payload }
}

function expect(label, result, status) {
  if (result.status !== status) {
    fail(label, `expected HTTP ${status}, got ${result.status} ${JSON.stringify(result.payload).slice(0, 200)}`)
  }
  return result.payload?.data ?? result.payload
}

const stamp = Date.now()
const email = `check.${stamp}@farmo.dev`
const password = 'farmo-check-1234'

console.log(`Backend contract check against ${BASE}\n`)

/* health ------------------------------------------------------------------ */
const health = expect('health endpoint', await call('GET', '/health', { auth: false }), 200)
if (health?.status !== 'ok') fail('health payload', JSON.stringify(health))
ok('health endpoint', `version ${health.version ?? '?'}`)

/* register --------------------------------------------------------------- */
const registered = expect(
  'register',
  await call('POST', '/auth/register', {
    auth: false,
    body: { email, password, name: 'Contract Check', phone: '+1 555 0100' },
  }),
  200,
)
token = registered.access_token
refresh = registered.refresh_token
if (!token || !refresh) fail('register tokens', 'no access/refresh token in the response')
ok('register returns a token pair', `user ${registered.user?.email ?? '?'}`)

/* me --------------------------------------------------------------------- */
const me = expect('me', await call('GET', '/auth/me'), 200)
if (me.email !== email) fail('me identity', `expected ${email}, got ${me.email}`)
ok('me returns the registered user')

/* profile patch ---------------------------------------------------------- */
const profile = expect('profile patch', await call('PATCH', '/auth/me', { body: { jobTitle: 'Agronomist' } }), 200)
if (profile.jobTitle !== 'Agronomist') fail('profile patch value', JSON.stringify(profile.jobTitle))
ok('profile patch persists')

/* refresh ---------------------------------------------------------------- */
const refreshed = expect('refresh', await call('POST', '/auth/refresh', { auth: false, body: { refresh_token: refresh } }), 200)
if (!refreshed.access_token || refreshed.access_token === token) fail('refresh rotation', 'access token was not replaced')
token = refreshed.access_token
refresh = refreshed.refresh_token
ok('refresh rotates the token pair')

/* project ---------------------------------------------------------------- */
const project = expect(
  'create project',
  await call('POST', '/projects/', {
    body: {
      name: `Contract Project ${stamp}`,
      description: 'Created by the frontend contract check.',
      summary: 'Contract check project',
      region: 'North County',
      climate_zone: 'NW',
      budget_usd: 12000,
    },
  }),
  200,
)
projectId = project.id
if (!projectId) fail('project id', JSON.stringify(project))
ok('create project', projectId)

/* farm with coordinates and farmer constraints --------------------------- */
const farm = expect(
  'create farm',
  await call('POST', `/projects/${projectId}/farms/`, {
    body: {
      name: 'Coordinates Block',
      properties: {
        area: 4.5,
        area_unit: 'acre',
        soil_type: 'silty-clay-loam',
        land_type: 'medium',
        irrigation: 'shallow-tubewell',
        water_source: 'Shared well',
        locality: 'North Ridge',
        notes: 'Backend contract check farm.',
        latitude: 33.6844,
        longitude: 73.0479,
        farmer_priority: 'Keep the wheat crop safe through the dry spell',
        water_availability: 'Limited — two irrigations per season',
        equipment_limitation: 'No seed drill; use broadcast sowing',
        market_preference: 'Sell grain locally after harvest',
      },
    },
  }),
  200,
)
farmId = farm.id
if (farm.properties?.latitude !== 33.6844) fail('farm latitude round-trip', JSON.stringify(farm.properties))
ok('create farm with coordinates and farmer priorities', farmId)

/* plant ------------------------------------------------------------------ */
const plant = expect(
  'create plant',
  await call('POST', `/projects/${projectId}/farms/${farmId}/plants/`, {
    body: {
      name: 'Winter wheat — main plot',
      properties: {
        species: 'winter-wheat',
        variety: 'Bread wheat',
        growth_stage: 'Tillering',
        growth_stage_override: 'Automatic',
        planting_date: '2026-11-01',
        quantity: 1,
        area: 4.5,
        area_unit: 'acre',
        soil_ph: 6.4,
        soil_moisture_percent: 58,
        available_nitrogen_kg_per_ha: 38,
        available_phosphorus_kg_per_ha: 15,
        exchangeable_potassium_kg_per_ha: 52,
        organic_matter: 1.6,
        previous_crop: 'fallow',
        spacing_cm: 19,
        seed_rate_kg_per_acre: 50,
        field_note: 'Backend contract check plant.',
      },
    },
  }),
  200,
)
plantId = plant.id
if (!plantId) fail('plant id', JSON.stringify(plant))
ok('create plant', plantId)

/* reads ------------------------------------------------------------------ */
const farms = expect('list farms', await call('GET', `/projects/${projectId}/farms/`), 200)
if (!Array.isArray(farms) || !farms.some((row) => row.id === farmId)) fail('list farms content', JSON.stringify(farms).slice(0, 200))
ok('list farms returns the new farm')

const plants = expect('list plants', await call('GET', `/projects/${projectId}/farms/${farmId}/plants/`), 200)
if (!Array.isArray(plants) || !plants.some((row) => row.id === plantId)) fail('list plants content', JSON.stringify(plants).slice(0, 200))
ok('list plants returns the new plant')

const projects = expect('list projects', await call('GET', '/projects/'), 200)
if (!Array.isArray(projects) || !projects.some((row) => row.id === projectId)) fail('list projects content', 'project missing')
ok('list projects returns the new project')

/* updates ---------------------------------------------------------------- */
const updatedPlant = expect(
  'update plant',
  await call('PATCH', `/projects/${projectId}/farms/${farmId}/plants/${plantId}`, {
    body: { properties: { soil_ph: 6.1 } },
  }),
  200,
)
if (updatedPlant.properties?.soil_ph !== 6.1) fail('plant update round-trip', JSON.stringify(updatedPlant.properties))
ok('update plant merges properties')

const updatedFarm = expect(
  'update farm',
  await call('PATCH', `/projects/${projectId}/farms/${farmId}`, {
    body: { properties: { latitude: 33.7, longitude: 73.05 } },
  }),
  200,
)
if (updatedFarm.latitude !== 33.7) fail('farm update round-trip', JSON.stringify(updatedFarm))
ok('update farm merges coordinates')

/* cleanup ---------------------------------------------------------------- */
expect('delete plant', await call('DELETE', `/projects/${projectId}/farms/${farmId}/plants/${plantId}`), 200)
expect('delete farm', await call('DELETE', `/projects/${projectId}/farms/${farmId}`), 200)
expect('delete project', await call('DELETE', `/projects/${projectId}`), 200)
ok('delete plant, farm and project')

console.log(`\n${passed} checks passed. Frontend contract satisfied.`)
