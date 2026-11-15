import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { chromium } from 'playwright'

const MOCK = process.env.FARMO_MOCK_URL ?? 'http://127.0.0.1:5174'
const LIVE = process.env.FARMO_LIVE_URL ?? 'http://localhost:5173'
const executablePath = [process.env.CHROME_PATH,
  'C:/Users/damie/AppData/Local/hermes/tools/chromium-1208/chrome-win64/chrome.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => p && existsSync(p))
const browser = await chromium.launch({ executablePath })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
page.setDefaultTimeout(20000)
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
await page.addInitScript(() => {
  window.appModule = (path) => import(performance.getEntriesByType('resource').find((entry) => new URL(entry.name).pathname === path)?.name ?? path)
})
const stamp = Date.now()
const email = `bugfix.${stamp}@example.com`
const password = 'Regression1234'
const ok = (text) => console.log(`PASS ${text}`)
const evaluateApi = (method, ...args) => page.evaluate(async ({ method, args }) => {
  const { api } = await window.appModule('/src/mock/api.ts')
  return api[method](...args)
}, { method, args })
const check = async (fn) => { assert.equal(await page.evaluate(fn), true) }

async function signup(base, address) {
  await page.goto(`${base}/signup`)
  await page.getByLabel('Full name', { exact: true }).fill('Regression Grower')
  await page.getByLabel('Email', { exact: true }).fill(address)
  await page.getByLabel('Mobile number', { exact: true }).fill('+15550123456')
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Confirm password', { exact: true }).fill(password)
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await page.waitForURL('**/verify')
  await page.getByRole('region', { name: 'Notifications', exact: true }).getByText('Verification code sent', { exact: true }).waitFor()
}

async function deleteSelf(base) {
  await page.goto(`${base}/account`)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Delete my account', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('input').fill('delete')
  await dialog.getByRole('button', { name: 'Delete account', exact: true }).click()
  await page.waitForURL('**/login')
}

try {
  await page.goto(`${MOCK}/login`)
  await page.evaluate(async () => {
    const { getState } = await window.appModule('/src/mock/api.ts')
    const state = structuredClone(getState())
    state.version = 5
    state.users.push({ ...state.users[0], id: 'legacy-user', email: 'legacy@example.com' })
    state.projects.push({ ...state.projects[0], id: 'legacy-project', ownerId: 'legacy-user', farmIds: [] })
    delete state.credentials
    localStorage.setItem('farmo.demo.state.v3', JSON.stringify(state))
  })
  await page.reload()
  await check(async () => {
    const { api, getState, resetDemoData } = await window.appModule('/src/mock/api.ts')
    const kept = getState().users.some((u) => u.id === 'legacy-user') && getState().projects.some((p) => p.id === 'legacy-project')
    let rejected = false
    try { await api.login('legacy@example.com', 'farmo1234') } catch (e) { rejected = e.status === 401 }
    resetDemoData()
    return kept && rejected
  })
  ok('existing demo accounts and projects survive the credential migration')
  await signup(MOCK, email)
  await check(async () => (await window.appModule('/src/store/ui.ts')).useUi.getState().toasts.length === 1)
  await page.getByRole('button', { name: 'continue without verifying' }).click()
  await page.waitForURL('**/projects')
  assert.equal((await evaluateApi('listProjects')).length, 0)
  await check(async () => (await window.appModule('/src/store/ui.ts')).useUi.getState().toasts.length === 1)
  ok('signup starts empty and skipping verification does not duplicate notifications')
  const wrong = await page.evaluate(async (email) => {
    const { api } = await window.appModule('/src/mock/api.ts')
    try { await api.login(email, 'farmo1234'); return false } catch (e) { return e.status === 401 }
  }, email)
  assert.equal(wrong, true)
  await evaluateApi('login', email, password)
  ok('new account rejects the seeded default password')

  await page.getByRole('button', { name: /New project/ }).first().click()
  const projectDialog = page.getByRole('dialog')
  await projectDialog.getByLabel('Programme name', { exact: true }).fill('Sidebar regression')
  await projectDialog.getByRole('button', { name: 'Create project', exact: true }).click()
  await page.waitForURL(/\/projects\/[^/]+$/)
  await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'Sidebar regression', exact: true }).waitFor()
  const project = (await evaluateApi('listProjects'))[0].project
  ok('new project appears in sidebar before adding a farm')

  const farm = await page.evaluate(async (projectId) => {
    const { api, getState } = await window.appModule('/src/mock/api.ts')
    const { id, createdAt, updatedAt, ...fields } = getState().farms[0]
    return api.createFarm({ ...fields, projectId, name: 'Regression farm' })
  }, project.id)
  await page.goto(`${MOCK}/farms/${farm.id}/plants`)
  for (let count = 1; count <= 2; count++) {
    await page.getByRole('button', { name: count === 1 ? 'Add a plant' : 'Add plant', exact: true }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Add plant', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    assert.equal((await evaluateApi('getFarmBundle', farm.id)).plants.length, count)
  }
  await page.screenshot({ path: 'screenshots/bugfix-two-plants.png', fullPage: true })
  ok('two plants added consecutively through the UI')
  await check(async () => {
    const { farmWeather } = await window.appModule('/src/mock/engine.ts')
    const { getState } = await window.appModule('/src/mock/api.ts')
    const farm = getState().farms[0], now = new Date('2026-11-15T12:00:00')
    return JSON.stringify(farmWeather(farm, now)) === JSON.stringify(farmWeather({ ...farm, id: 'another-record', name: 'another-name' }, now))
  })
  ok('same location produces identical weather across farm records')

  await page.goto(`${MOCK}/account`)
  await page.getByRole('radio', { name: 'Farmer', exact: true }).click()
  assert.equal(await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'Developer API', exact: true }).count(), 0)
  await page.goto(`${MOCK}/developers`)
  await page.getByText('The developer API is a researcher tool', { exact: true }).waitFor()
  await page.goto(`${MOCK}/farms/${farm.id}/overview`)
  assert.equal(await page.getByRole('tab', { name: /Teams/ }).count(), 0)
  await page.goto(`${MOCK}/account`)
  await page.getByRole('radio', { name: 'Researcher', exact: true }).click()
  await page.goto(`${MOCK}/farms/${farm.id}/overview`)
  await page.getByRole('tab', { name: /Teams/ }).waitFor()
  ok('experience mode changes navigation, farm tabs, and direct-route access')

  const viewer = await page.evaluate(async ({ email, password, farmId }) => {
    const { api, getState } = await window.appModule('/src/mock/api.ts')
    const owner = await api.currentUser()
    const { user } = await api.signup({ name: 'Regression Viewer', email: `viewer.${email}`, phone: '+15550987654', password })
    if ((await api.listProjects()).length !== 0 || await api.getProject(getState().farms.find((f) => f.id === farmId).projectId)) throw new Error('Cross-account project exposure')
    getState().memberships.push({ id: 'regression-membership', farmId, email: user.email, name: user.name, userId: user.id,
      role: 'agronomist', status: 'accepted', invitedById: owner.id, invitedAt: new Date().toISOString(), respondedAt: null, message: null })
    await api.login(email, password)
    await api.changeMemberRole('regression-membership', 'viewer')
    const { useSession } = await window.appModule('/src/store/session.ts')
    await useSession.getState().login(user.email, password)
    return user
  }, { email, password, farmId: farm.id })
  await page.goto(`${MOCK}/farms/${farm.id}/plants`)
  await page.getByText(/read.only/i).first().waitFor()
  assert.equal(await page.getByRole('button', { name: 'Add plant', exact: true }).count(), 0)
  const denied = await page.evaluate(async ({ farmId, projectId }) => {
    const { api } = await window.appModule('/src/mock/api.ts')
    const bundle = await api.getFarmBundle(farmId)
    const actions = [() => api.updateFarm(farmId, { name: 'Not allowed' }), () => api.updatePlant(bundle.plants[0].id, { soilPh: 8 }),
      () => api.deletePlant(bundle.plants[0].id), () => api.updateProject(projectId, { name: 'Not allowed' }), () => api.deleteProject(projectId)]
    for (const action of actions) {
      try { await action(); return false } catch (e) { if (e.status !== 403) throw e }
    }
    return true
  }, { farmId: farm.id, projectId: project.id })
  assert.equal(denied, true)
  ok('viewer role hides edit controls and rejects writes in the API')
  await deleteSelf(MOCK)
  assert.equal((await evaluateApi('listUsers')).some((u) => u.id === viewer.id), false)
  ok('account removal clears account switcher entry')
  await page.evaluate(async ({ email, password }) => (await window.appModule('/src/store/session.ts')).useSession.getState().login(email, password), { email, password })
  await page.goto(`${MOCK}/projects`)
  await page.getByRole('button', { name: 'Actions for Sidebar regression' }).click()
  await page.getByRole('menuitem', { name: 'Delete project' }).click()
  await page.getByRole('dialog').locator('input').fill('delete')
  await page.getByRole('dialog').getByRole('button', { name: 'Delete project', exact: true }).click()
  await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'Sidebar regression', exact: true }).waitFor({ state: 'hidden' })
  ok('project deletion removes sidebar link without reload')
  await deleteSelf(MOCK)

  const liveEmail = `live.${email}`
  await signup(LIVE, liveEmail)
  await check(async () => !(await (await window.appModule('/src/lib/backend.ts')).backendApi.currentUser()).emailVerified)
  const code = await page.evaluate(async () => (await window.appModule('/src/store/ui.ts')).useUi.getState().toasts.find((t) => t.code)?.code)
  assert.match(code, /^\d{6}$/)
  for (let i = 0; i < code.length; i++) await page.getByLabel(`Digit ${i + 1} of 6`, { exact: true }).fill(code[i])
  await page.waitForURL('**/projects')
  assert.equal((await evaluateApi('currentUser')).emailVerified, true)
  ok('live signup verification updates the database through the UI')
  const liveFarm = await page.evaluate(async () => {
    const { api, getState } = await window.appModule('/src/mock/api.ts')
    const project = await api.createProject({ name: 'Live regression programme', summary: '', region: 'Cedar Valley', climateZone: 'NW', budgetUsd: 10000 })
    const updated = await api.updateProject(project.id, { budgetUsd: 12000 })
    if (updated.name !== project.name || updated.budgetUsd !== 12000) throw new Error('Partial project update failed')
    const { id, createdAt, updatedAt, ...fields } = getState().farms[0]
    return api.createFarm({ ...fields, projectId: project.id, name: 'Live regression farm' })
  })
  await page.goto(`${LIVE}/farms/${liveFarm.id}/plants`)
  for (let count = 1; count <= 2; count++) {
    await page.getByRole('button', { name: count === 1 ? 'Add a plant' : 'Add plant', exact: true }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Add plant', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    assert.equal((await evaluateApi('getFarmBundle', liveFarm.id)).plants.length, count)
  }
  ok('live project updates and consecutive plant creation work without unsupported team routes')
  await page.goto(`${LIVE}/account`)
  await page.getByRole('button', { name: 'Send code', exact: true }).click()
  await page.getByText('Mobile verification code', { exact: true }).waitFor()
  const sms = await page.evaluate(async () => (await window.appModule('/src/store/ui.ts')).useUi.getState().toasts.find((t) => t.title === 'Mobile verification code')?.code)
  assert.match(sms, /^\d{6}$/)
  await page.getByLabel('Six-digit code', { exact: true }).fill(sms)
  await page.getByRole('button', { name: 'Confirm code', exact: true }).click()
  await page.getByText('Mobile number verified', { exact: true }).waitFor()
  ok('live phone verification persists using explicit development delivery')
  await evaluateApi('signOut')
  await page.goto(`${LIVE}/forgot`)
  await page.getByLabel('Email', { exact: true }).fill(liveEmail)
  await page.getByRole('button', { name: 'Send reset code', exact: true }).click()
  await page.getByText('Password reset code', { exact: true }).waitFor()
  const reset = await page.evaluate(async () => (await window.appModule('/src/store/ui.ts')).useUi.getState().toasts.find((t) => t.title === 'Password reset code')?.code)
  for (let i = 0; i < reset.length; i++) await page.getByLabel(`Digit ${i + 1} of 6`, { exact: true }).fill(reset[i])
  await page.getByLabel('New password', { exact: true }).fill('ChangedPassword123')
  await page.getByLabel('Confirm password', { exact: true }).fill('ChangedPassword123')
  await page.getByRole('button', { name: 'Update password', exact: true }).click()
  await page.waitForURL('**/login')
  await page.getByLabel('Email', { exact: true }).fill(liveEmail)
  await page.getByLabel('Password', { exact: true }).fill('ChangedPassword123')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.waitForURL('**/projects')
  ok('live password reset and sign-in work through the UI')
  await deleteSelf(LIVE)
  assert.equal(await evaluateApi('currentUser'), null)
  ok('live account deletion clears the session')
  assert.deepEqual(errors, [])
  ok('no browser console or runtime errors')
} finally {
  if (page.url().startsWith(LIVE)) {
    const me = await evaluateApi('currentUser').catch(() => null)
    if (me?.email === `live.${email}`) await evaluateApi('deleteAccount', me.id)
  }
  await browser.close()
}
