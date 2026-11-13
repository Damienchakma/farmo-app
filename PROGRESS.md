# Farmo — Progress Log

Working log for the demo frontend build. Newest entries at the top of each section.
Update rule: after every milestone, move finished items to **Done** with a date, and reset
**In progress** / **Next**.

## Step 0 — Tooling (2026-11-12)

**Inventory of what is available in this environment**

| Thing | Status | Note |
|---|---|---|
| MCP: `browser` (Playwright-class desktop browser) | Available | tabs, snapshot, click/fill, screenshot, console, evaluate, network. Used for real screenshots + interaction checks. |
| MCP: `rea` (reverse-engineering suite) | Available | Not needed for this task. |
| MCP: `Roblox_Studio` | Available, unused | No Roblox instance connected; irrelevant. |
| MCP: design-tokens / icon MCP | **Not available** | Fallback: tokens live in CSS + `src/design/tokens.ts`; icons via `lucide-react`. Logged in DECISIONS. |
| Skill `game-ui-ux` | Read | Anchor/container layout, focus management, screen-stack flow, event-driven UI. Applied to tab bar + shell. |
| Skill `create-game-assets` | Read (skim) | Style-bible discipline + validation loop applied to the design system. |
| No frontend-design or React skill exists in this install | — | Used the design brief in the mission + `DESIGN.md` as the authority. |
| node | v26.12.1 | available |
| npm | 11.20.0 (`npm.cmd`; `npm.ps1` blocked by execution policy) | scripts run with `npm.cmd` |
| git | 2.53.0 | not on PATH; binary at `%LOCALAPPDATA%\hermes\tools\git-2.53.0+3-win32-x64\cmd\git.exe` |
| chromium | present at `%LOCALAPPDATA%\hermes\tools\chromium-1208\chrome-win64\chrome.exe` | fallback screenshot engine if the browser MCP cannot reach `localhost` |
| Playwright npm package | installed as devDependency | `scripts/shots.mjs`; uses the bundled chromium via `executablePath` |

**Decisions made in Step 0** → see `DECISIONS.md` (D1–D6).

## Status board

### Done
- [x] Tool inventory + fallbacks (D1–D6 in DECISIONS.md)
- [x] git repo initialised, identity set
- [x] Vite + React 19 + TS strict scaffold; deps installed
- [x] `DESIGN.md` — palette, type, spacing, motion, a11y contract, voice
- [x] `PROGRESS.md`, `DECISIONS.md`
- [x] Mock layer: types, catalogue, deterministic engine, seed, persisted API
- [x] UI primitives: controls, surfaces, data, feedback, overlays, OTP input
- [x] App shell: sidebar, breadcrumbs, command palette, dev menu, inbox
- [x] Auth routes: sign in, sign up, verify, forgot password, OAuth consent
- [x] Projects list, project detail with farm CRUD, farm view (2026-11-13)
- [x] Farm tabs: Overview, Plants, Advice, Risk, Visualizations, Teams, Settings
- [x] Developer API page with working console against the mock handlers
- [x] Account page: profile, verification, providers, user switching
- [x] International content pass: temperate crops, neutral districts, USD, acres (2026-11-13)

### In progress
- Final review pass over screenshots (desktop + mobile) before the demo

### Next
- Optional: code-split the charts bundle (recharts) and add the remaining polish noted in DESIGN.md


### Known issues
- `npm.ps1` cannot run under the machine execution policy; use `npm.cmd`.
- The `farmo-film` folder in the home directory is the user's separate video project — untouched.
