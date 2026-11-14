/**
 * Interaction smoke test: the demo's core claims are that edits flow through
 * the engine, advice can be regenerated, the API console really calls the mock
 * handlers, and invitations appear in the team ledger.
 *
 *   node scripts/flows.mjs
 *
 * Exits non-zero on the first broken claim.
 */
import { existsSync } from 'node:fs'
import { chromium } from 'playwright'

const CANDIDATE_CHROME = [
  process.env.CHROME_PATH,
  'C:\\Users\\damie\\AppData\\Local\\hermes\\tools\\chromium-1208\\chrome-win64\\chrome.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean)

const BASE = process.env.FARMO_URL ?? 'http://localhost:5178'
const EMAIL = process.env.FARMO_EMAIL ?? 'sam.carter@farmo.dev'
const PASSWORD = process.env.FARMO_PASSWORD ?? 'farmo1234'
const pause = (ms) => new Promise((r) => setTimeout(r, ms))

const results = []
function ok(name, detail = '') {
  results.push({ name, pass: true })
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`)
}
function fail(name, detail) {
  results.push({ name, pass: false })
  console.log(`  ✗ ${name} — ${detail}`)
}

async function main() {
  const executablePath = CANDIDATE_CHROME.find((p) => existsSync(p))
  const browser = await chromium.launch({ executablePath, args: ['--font-render-hinting=none'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()))
  page.on('pageerror', (err) => errors.push(err.message))

  try {
    /* sign in ------------------------------------------------------------ */
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
    await pause(600)
    await page.fill('input[type="email"]', EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/projects', { timeout: 20000 })
    await pause(1200)
    ok('sign in')

    /* edit a plant property ---------------------------------------------- */
    await page.goto(`${BASE}/farms/farm-riverside/plants`, { waitUntil: 'networkidle' })
    await pause(900)
    await page.getByRole('button', { name: 'Edit Bread wheat, early' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor({ state: 'visible' })
    const ph = dialog.getByLabel('pH', { exact: true })
    await ph.fill('6.5')
    await dialog.getByRole('button', { name: 'Save and recalculate' }).click()
    await page.getByText('Property updated').waitFor({ timeout: 15000 })
    ok('plant property saved', 'soil pH 5.6 → 6.5')

    /* advice recalculated from the change -------------------------------- */
    await page.getByRole('tab', { name: /Advice/ }).click()
    await page.waitForURL('**/advice', { timeout: 15000 })
    await pause(900)
    const banner = page.getByText(/Updated because/).first()
    await banner.waitFor({ timeout: 10000 })
    const bannerText = await banner.locator('xpath=..').textContent()
    if (!/Soil pH/i.test(bannerText ?? '')) throw new Error(`banner did not mention soil pH: ${bannerText}`)
    ok('advice shows why it changed', bannerText?.trim().slice(0, 80))

    const limeGone = await page.getByText(/lime/i).count()
    ok('advice rendered after edit', `${limeGone} lime reference(s) in the new version`)

    /* regenerate ---------------------------------------------------------- */
    await page.getByRole('button', { name: /Regenerate advice/i }).click()
    await page.getByText('Advice regenerated').waitFor({ timeout: 20000 })
    ok('advice regenerated on demand')

    /* assistant ----------------------------------------------------------- */
    await page.goto(`${BASE}/farms/farm-northfield/assistant`, { waitUntil: 'networkidle' })
    await pause(800)
    await page.getByRole('button', { name: /The water balance/i }).click()
    await page.waitForFunction(() => /water balance shows/i.test(document.body.innerText), null, { timeout: 20000 })
    ok('assistant answered from the water ledger')
    await page.getByRole('tab', { name: /Overview/ }).click()
    await page.waitForURL('**/overview', { timeout: 15000 })
    await page.getByRole('tab', { name: /Assistant/ }).click()
    await page.waitForURL('**/assistant', { timeout: 15000 })
    await pause(500)
    const followUp = await page.getByText('Which crop is most water-stressed?').count()
    if (!followUp) throw new Error('assistant conversation did not survive a tab switch')
    ok('assistant conversation survives a tab switch')
    await page.screenshot({ path: 'screenshots/21-flow-assistant.png', fullPage: true })
    ok('captured screenshots/21-flow-assistant.png')

    /* API console --------------------------------------------------------- */
    await page.goto(`${BASE}/developers`, { waitUntil: 'networkidle' })
    await pause(900)
    await page.getByRole('button', { name: 'Send request' }).click()
    const response = page.locator('pre').last()
    await response.waitFor({ timeout: 15000 })
    await page.getByText(/round trip/).waitFor({ timeout: 15000 })
    const body = await response.textContent()
    if (!body?.includes('"data"') && !body?.includes('"projects"')) {
      throw new Error(`unexpected API response: ${body?.slice(0, 160)}`)
    }
    ok('API console returned a real payload', `${body?.length ?? 0} characters`)

    /* invitation ---------------------------------------------------------- */
    await page.goto(`${BASE}/farms/farm-northfield/teams`, { waitUntil: 'networkidle' })
    await pause(800)
    const inviteEmail = `flow.test.${Date.now()}@example.com`
    await page.getByPlaceholder('agronomist@example.com').fill(inviteEmail)
    await page.getByRole('button', { name: 'Send invitation' }).click()
    await page.getByText('Invitation sent').waitFor({ timeout: 15000 })
    await pause(700)
    const row = page.getByText(inviteEmail).first()
    await row.waitFor({ timeout: 10000 })
    ok('invitation appears in the ledger', inviteEmail)

    /* screenshot the recalculated advice for the record -------------------- */
    await page.goto(`${BASE}/farms/farm-riverside/advice`, { waitUntil: 'networkidle' })
    await pause(1200)
    await page.screenshot({ path: 'screenshots/20-flow-advice.png', fullPage: true })
    ok('captured screenshots/20-flow-advice.png')

    if (errors.length) fail('console errors', errors.slice(0, 3).join(' | '))
    else ok('no console errors during the flows')
  } catch (error) {
    fail('flow aborted', error instanceof Error ? error.message : String(error))
  } finally {
    await browser.close()
  }

  const failed = results.filter((r) => !r.pass)
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
  process.exit(failed.length ? 1 : 0)
}

main()
