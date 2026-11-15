import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { chromium } from 'playwright'

const BASE = process.env.FARMO_URL ?? 'http://127.0.0.1:5173'
const executablePath = [process.env.CHROME_PATH,
  'C:/Users/damie/AppData/Local/hermes/tools/chromium-1208/chrome-win64/chrome.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((path) => path && existsSync(path))
const browser = await chromium.launch({ executablePath })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
page.setDefaultTimeout(20000)
const errors = [], requests = []
page.on('pageerror', (error) => errors.push(error.message))
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
page.on('request', (request) => { if (request.url().includes('/api/v1/')) requests.push(request.url()) })
await context.route('**/api/v1/**', (route) => route.fulfill({
  status: route.request().url().endsWith('/auth/me') ? 200 : 404,
  contentType: 'application/json',
  body: JSON.stringify({ data: { id: 'saved-user', name: 'Saved account', email: 'saved@example.com', auth_providers: ['password'] } }),
}))
await context.addInitScript(() => {
  window.appModule = (path) => import(performance.getEntriesByType('resource')
    .find((entry) => new URL(entry.name).pathname === path)?.name ?? path)
})
const api = (method, ...args) => page.evaluate(async ({ method, args }) =>
  (await window.appModule('/src/mock/api.ts')).api[method](...args), { method, args })
const localData = () => page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))
const ok = (label) => console.log(`PASS ${label}`)
async function enterGuest() {
  await page.getByRole('button', { name: 'Try demo as guest', exact: true }).click()
  await page.waitForURL('**/projects')
  await page.getByRole('region', { name: 'Guest demo', exact: true }).waitFor()
  await page.locator('aside nav').getByRole('link', { name: 'Northern Rotation Programme', exact: true, includeHidden: true }).waitFor({ state: 'attached' })
}
async function exited() {
  await page.waitForURL('**/login')
  await page.getByRole('button', { name: 'Try demo as guest', exact: true }).waitFor()
  assert.deepEqual(await page.evaluate(() => Object.keys(sessionStorage).filter((key) => key.startsWith('farmo.guest.'))), [])
}

try {
  await page.goto(`${BASE}/projects`)
  await page.waitForURL('**/login')
  await page.getByRole('button', { name: 'Try demo as guest', exact: true }).waitFor()
  ok('normal signed-out routes still require authentication')
  await page.evaluate(async () => {
    const { buildSeedState } = await window.appModule('/src/mock/seed.ts')
    const saved = buildSeedState()
    saved.users[0].name = 'Saved account'
    saved.sessionUserId = saved.users[0].id
    saved.projects[0].name = 'Private saved project'
    localStorage.setItem('farmo.demo.state.v3', JSON.stringify(saved))
    localStorage.setItem('farmo.tokens', JSON.stringify({ access: 'test-access', refresh: 'test-refresh' }))
    localStorage.setItem('farmo.backend.index', JSON.stringify({ farms: { private: 'saved-project' }, plants: {} }))
    localStorage.setItem('farmo.mode', 'farmer')
    sessionStorage.setItem('farmo.assistant.farm-northfield', 'saved conversation')
  })
  const saved = await localData()
  await enterGuest()
  assert.equal(await page.evaluate(async () => (await window.appModule('/src/lib/backend.ts')).backendEnabled), false)
  assert.equal((await api('currentUser')).name, 'Sam Carter')
  assert.equal((await api('listProjects')).some(({ project }) => project.name === 'Private saved project'), false)
  ok('one-click guest entry loads sample farms without backend authentication')

  const otherTab = await context.newPage()
  await otherTab.goto(`${BASE}/login`)
  assert.equal(await otherTab.evaluate(async () => (await window.appModule('/src/lib/guest.ts')).isGuestDemo), false)
  await otherTab.close()
  ok('guest mode does not leak into an independently opened tab')

  await page.goto(`${BASE}/farms/farm-riverside/plants`)
  await page.getByRole('button', { name: 'Edit Bread wheat, early', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('pH', { exact: true }).fill('6.5')
  await dialog.getByRole('button', { name: 'Save and recalculate', exact: true }).click()
  await page.getByText('Property updated', { exact: true }).waitFor()
  await page.reload()
  await page.getByRole('button', { name: 'Edit Bread wheat, early', exact: true }).waitFor()
  assert.equal((await api('getFarmBundle', 'farm-riverside')).plants.find((plant) => plant.variety === 'Bread wheat, early').soilPh, 6.5)
  ok('guest edits recalculate and survive a reload within the tab')

  await page.goto(`${BASE}/projects`)
  await page.getByRole('button', { name: /New project/ }).first().click()
  await page.getByRole('dialog').getByLabel('Programme name', { exact: true }).fill('Guest-only project')
  await page.getByRole('dialog').getByRole('button', { name: 'Create project', exact: true }).click()
  await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'Guest-only project', exact: true }).waitFor()
  ok('guests can create projects without touching saved account projects')

  await page.goto(`${BASE}/account`)
  await page.getByRole('radio', { name: 'Farmer', exact: true }).click()
  await page.getByRole('radio', { name: 'Researcher', exact: true }).click()
  await page.goto(`${BASE}/farms/farm-northfield/assistant`)
  await page.getByRole('button', { name: /The water balance/i }).click()
  await page.waitForFunction(() => /water balance shows/i.test(document.body.innerText))
  assert.equal(await page.evaluate(() => sessionStorage.getItem('farmo.assistant.farm-northfield')), 'saved conversation')
  assert.equal(await page.evaluate(() => sessionStorage.getItem('farmo.guest.assistant.farm-northfield') !== null), true)
  assert.deepEqual(await localData(), saved)
  assert.deepEqual(requests, [])
  ok('preferences, assistant conversations, real tokens and saved records remain isolated')

  await page.getByRole('button', { name: 'Developer menu', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Reset demo data and reload', exact: true }).click()
  await page.waitForURL('**/projects')
  await page.getByRole('region', { name: 'Guest demo', exact: true }).waitFor()
  assert.equal((await api('listProjects')).some(({ project }) => project.name === 'Guest-only project'), false)
  assert.equal((await api('getFarmBundle', 'farm-riverside')).plants.find((plant) => plant.variety === 'Bread wheat, early').soilPh, 5.6)
  assert.deepEqual(await localData(), saved)
  assert.deepEqual(requests, [])
  ok('reset restores guest samples without deleting normal browser data')

  await page.screenshot({ path: 'screenshots/guest-projects-desktop.png', fullPage: true })
  await page.getByRole('button', { name: 'Exit guest demo', exact: true }).click()
  await exited()
  assert.deepEqual(await localData(), saved)
  assert.equal(await page.evaluate(() => sessionStorage.getItem('farmo.assistant.farm-northfield')), 'saved conversation')
  const live = await page.evaluate(async () => (await window.appModule('/src/lib/backend.ts')).backendEnabled)
  assert.equal((await api('currentUser')).name, 'Saved account')
  if (live) assert.ok(requests.some((url) => url.endsWith('/auth/me')))
  ok('exit clears only guest data and restores the normal account adapter')

  await enterGuest()
  assert.equal((await api('listProjects')).some(({ project }) => project.name === 'Guest-only project'), false)
  await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('button', { name: 'Sign out', exact: true }).click()
  await exited()
  assert.deepEqual(await localData(), saved)
  ok('normal sign-out also exits guest mode and a new visit starts fresh')

  await enterGuest()
  await page.goto(`${BASE}/account`)
  await page.getByRole('button', { name: 'Delete my account', exact: true }).click()
  await page.getByRole('dialog').locator('input').fill('delete')
  await page.getByRole('dialog').getByRole('button', { name: 'Delete account', exact: true }).click()
  await exited()
  assert.deepEqual(await localData(), saved)
  ok('deleting the sample account exits safely without deleting the real account')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: 'screenshots/guest-login-mobile.png', fullPage: true })
  await enterGuest()
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: 'screenshots/guest-projects-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Exit guest demo', exact: true }).click()
  await exited()
  ok('mobile guest entry and exit work without horizontal overflow')

  const blocked = await browser.newPage()
  await blocked.addInitScript(() => {
    Object.defineProperty(Storage.prototype, 'setItem', { value() { throw new DOMException('Storage blocked', 'SecurityError') } })
  })
  await blocked.goto(`${BASE}/login`)
  await blocked.getByRole('button', { name: 'Try demo as guest', exact: true }).click()
  await blocked.getByText('Guest demo needs browser session storage. Allow site storage and try again.', { exact: true }).waitFor()
  assert.ok(blocked.url().endsWith('/login'))
  await blocked.close()
  ok('blocked session storage shows a useful error rather than opening a live session')
  assert.deepEqual(errors, [])
  ok('no browser console or runtime errors')
} finally {
  await browser.close()
}
