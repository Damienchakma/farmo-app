# Farmo — Decision Log

Every judgement call made while running unattended, with the reasoning. Newest at the bottom.

## Step 0 — tooling

**D1. Project directory: `C:\Users\damie\farmo-app`.**
The home directory already contains `farmo-film/`, a separate video project of the user's. A new
sibling directory keeps this build isolated and avoids touching their work.

**D2. git binary is not on PATH.** Not found via `where.exe`; a portable build exists at
`%LOCALAPPDATA%\hermes\tools\git-2.53.0+3-win32-x64\cmd`. Rather than modify the user's machine
PATH, each build command prepends it for that process only.

**D3. `npm.ps1` is blocked by the machine execution policy.** Use `npm.cmd` / `npx.cmd`
everywhere. Documented in README so a fresh clone knows.

**D4. No design-token or icon MCP is installable in this environment** (neither is a
design-specific skill). Fallbacks: design tokens are authored by hand in `src/app.css` +
`src/design/tokens.ts` (single source of truth, exported to TS for charts), and icons come from
`lucide-react`. Logged instead of blocking.

**D5. Screenshots: browser MCP first, Playwright fallback.** The `browser` MCP is available, but
whether it can reach this machine's `localhost` is unknown. A `scripts/shots.mjs` Playwright
fallback is installed that drives the Chromium already on disk at
`%LOCALAPPDATA%\hermes\tools\chromium-1208\chrome-win64\chrome.exe`, so screenshotting never
depends on one path working.

**D6. Tailwind v4 with a CSS-first theme, default palette erased.**
`@theme { --color-*: initial; ... }` removes every stock Tailwind color so no stray `blue-500`
can leak in. Tokens are declared once in `@theme` and re-exported as CSS variables for the chart
layer and for hand-written CSS.

## Build

**D7. Charts: Recharts 3** over visx. Rationale: responsive container, tooltips, legends and
accessibility props out of the box; visx would need hand-assembly of the same primitives and time
is the binding constraint. Chart styling is fully overridden (hairline grid, tabular axis
numbers, flat series colors from the design palette) so nothing about it reads as a default
library chart.

**D8. Radix primitives, restyled from zero.** Used for dialog, dropdown, popover, select,
tooltip, switch, checkbox, radio-group — chosen for keyboard behaviour and focus management,
with every visual property replaced by design tokens.

**D9. State: Zustand** rather than Context. The mock API is async with real latency, and several
screens need the same cache with optimistic writes; a store with explicit actions is clearer than
nested providers and avoids a Context waterfall.

**D10. Determinism instead of randomness.** `src/mock/engine.ts` derives every number from a
string hash of stable identifiers (plant id + relevant properties). The same properties always
produce the same advice, risk and chart series — required for "edit a property, see charts
change" to be demonstrable and for screenshots to be reproducible. Pseudo-weather is seeded by
(farm id, date) so it is stable per day but different across farms.

**D11. Recalculation is modelled as an async job.** A property edit writes a *property
operation* (before/after), then the farm enters `recalculating` for the mock API's latency, then
new Advice and Risk versions are committed together with the list of operations that caused them.
That is why the UI can say "Updated because: soil pH 6.2 → 5.6" honestly rather than faking it.

**D12. Advice/Risk versioning keeps full history** (last 12 versions) with the driving
operations and a short diff summary, so the version history panel is real data, not decoration.

**D13. The Developer API console calls the same mock handlers as the UI.** `api.request(method,
path, body)` routes to the same functions the app uses, so "Try it" returns genuine payloads
(and genuine errors) rather than canned JSON. API keys and rate-limit counters are simulated per
key with a sliding 60-minute window.

**D14. Auth is a mock with a visible dev affordance.** OTP codes are surfaced in a toast labelled
as a developer aid; OAuth providers run through a fake consent screen. Sessions persist to
localStorage so a reload keeps you signed in.

**D15. Two seeded users + invitee personas.** The dev menu's "Demo: switch user" swaps the
session between the farm owner, a teammate, and an invitee with a pending invite, so the Teams
inbox can be demonstrated end to end without a second browser.

**D16. Responsive from 360px.** Sidebar collapses to an overlay drawer under 1024px; the farm tab
bar becomes horizontally scrollable with edge fade and keeps its keyboard contract; ledgers
switch to stacked definition rows under 640px rather than shrinking to unreadable columns.

**D17. No dedicated test framework.** Time budget is spent on the visual/interaction review loop
(browser screenshots + critique rounds) required by the mission. TypeScript strict + a real
`npm run build` gate every milestone; `scripts/shots.mjs` doubles as a smoke test because it
fails loudly on console errors and page exceptions.
