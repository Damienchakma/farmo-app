/**
 * Screenshot + smoke-test harness.
 *
 *   node scripts/shots.mjs tour                 # every screen, desktop + mobile
 *   node scripts/shots.mjs shot <name> <path>   # one screen, desktop
 *   node scripts/shots.mjs shot <name> <path> --mobile --full
 *
 * Fails (exit 1) if the page logs a console error or throws, so it doubles as a
 * smoke test after each milestone.
 */
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const outDir = join(root, 'screenshots')

const CANDIDATE_CHROME = [
  process.env.CHROME_PATH,
  'C:\\Users\\damie\\AppData\\Local\\hermes\\tools\\chromium-1208\\chrome-win64\\chrome.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean)

const BASE = process.env.FARMO_URL ?? 'http://localhost:5178'
const DEMO_EMAIL = process.env.FARMO_EMAIL ?? 'sam.carter@farmo.dev'
const DEMO_PASSWORD = process.env.FARMO_PASSWORD ?? 'farmo1234'

const args = process.argv.slice(2)
const mode = args[0] ?? 'tour'
const flags = new Set(args.filter((a) => a.startsWith('--')))

function browserExecutable() {
  return CANDIDATE_CHROME.find((p) => existsSync(p))
}

async function launch() {
  const executablePath = browserExecutable()
  return chromium.launch({ executablePath, args: ['--font-render-hinting=none'] })
}

/** Collects console errors and uncaught exceptions for one page. */
function instrument(page, label) {
  const problems = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(`[console.error] ${msg.text()}`)
  })
  page.on('pageerror', (err) => problems.push(`[pageerror] ${err.message}`))
  page.on('requestfailed', (req) => {
    const reason = req.failure()?.errorText ?? ''
    // ERR_ABORTED is what a navigation away from a page looks like; not a bug.
    if (reason.includes('ERR_ABORTED')) return
    if (!req.url().includes('favicon')) problems.push(`[requestfailed] ${req.url()} ${reason}`)
  })
  return {
    problems,
    report() {
      if (!problems.length) {
        console.log(`  ✓ ${label} — no console errors`)
        return 0
      }
      console.log(`  ✗ ${label} — ${problems.length} problem(s):`)
      for (const p of problems.slice(0, 12)) console.log(`      ${p}`)
      return problems.length
    },
  }
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms))

async function signIn(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await pause(900)
  await page.fill('input[type="email"]', DEMO_EMAIL)
  await page.fill('input[type="password"]', DEMO_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/projects', { timeout: 20000 })
  await pause(1600)
}

async function shoot(page, name, { mobile = false, full = true } = {}) {
  const file = join(outDir, mobile ? `${name}-mobile.png` : `${name}.png`)
  await page.screenshot({ path: file, fullPage: full })
  console.log(`  → screenshots/${mobile ? `${name}-mobile.png` : `${name}.png`}`)
}

async function setViewport(page, mobile) {
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 })
  await pause(450)
}

const TOUR = [
  { name: '01-projects', path: '/projects' },
  { name: '02-project-detail', path: '/projects/prj-north' },
  { name: '03-farm-overview', path: '/farms/farm-northfield/overview' },
  { name: '04-farm-plants', path: '/farms/farm-northfield/plants' },
  { name: '04b-farm-assistant', path: '/farms/farm-northfield/assistant' },
  { name: '05-farm-advice', path: '/farms/farm-northfield/advice' },
  { name: '06-farm-risk', path: '/farms/farm-riverside/risk' },
  { name: '07-farm-visualizations', path: '/farms/farm-northfield/visualizations' },
  { name: '08-farm-teams', path: '/farms/farm-northfield/teams' },
  { name: '09-farm-settings', path: '/farms/farm-northfield/settings' },
  { name: '10-developer-api', path: '/developers' },
  { name: '11-account', path: '/account' },
  { name: '12-not-found', path: '/this/does/not/exist' },
]

async function runTour(browser) {
  let failures = 0
  mkdirSync(outDir, { recursive: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  const clean = instrument(page, 'tour')

  // Public screens first (no session).
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await pause(900)
  await shoot(page, '00-landing')
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await pause(900)
  await shoot(page, '00-login')
  for (const name of ['google', 'facebook', 'yahoo']) {
    await page.goto(`${BASE}/oauth/${name}`, { waitUntil: 'networkidle' })
    await pause(500)
    await shoot(page, `00-oauth-${name}`)
  }
  await page.goto(`${BASE}/signup`, { waitUntil: 'networkidle' })
  await pause(600)
  await shoot(page, '00-signup')

  await signIn(page)

  for (const target of TOUR) {
    await page.goto(`${BASE}${target.path}`, { waitUntil: 'networkidle' })
    // Mock latency is 200–700 ms per call plus a 1.4 s recalculation.
    await pause(1800)
    await shoot(page, target.name)
    const report = instrument(page, target.name)
    failures += report.report()
    // Give async rendering a beat to surface any late errors.
    await page.waitForTimeout(400)
    failures += clean.problems.length ? 0 : 0
  }

  // Mobile pass over the same screens.
  await setViewport(page, true)
  for (const target of TOUR) {
    await page.goto(`${BASE}${target.path}`, { waitUntil: 'networkidle' })
    await pause(1600)
    await shoot(page, target.name, { mobile: true })
  }

  await context.close()
  const cleanFailures = clean.report()
  failures += cleanFailures
  return failures
}

async function runSingle(browser) {
  const name = args[1] ?? 'shot'
  const path = args[2] ?? '/projects'
  mkdirSync(outDir, { recursive: true })
  const mobile = flags.has('--mobile')
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  const watcher = instrument(page, name)
  await signIn(page)
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
  await pause(1800)
  await shoot(page, name, { mobile, full: !flags.has('--viewport') })
  const failures = watcher.report()
  await context.close()
  return failures
}

const browser = await launch()
let failures = 0
try {
  failures = mode === 'tour' ? await runTour(browser) : await runSingle(browser)
} finally {
  await browser.close()
}

console.log(failures ? `\n${failures} console problem(s) across the run.` : '\nAll screens clean.')
process.exit(failures ? 1 : 0)
