# Farmo — Design System

> Governing rule: if a screen disagrees with this document, the screen is wrong.
> Every value below exists as a CSS variable in `src/app.css` and as a Tailwind token.

## 1. Identity

**Concept: the agronomist's ledger.** Farmo is a decision-support tool used in the field and in
the office. The interface borrows from paper field notebooks: warm uncoated stock, ruled
dividers, index tabs, stamped labels, hand-ruled tables. It should read as *instrument*, not
*marketing site*: dense, calm, legible, unafraid of long-form text.

**Three adjectives:** grounded · editorial · precise.

**Not this:** dashboard-SaaS with rounded gradient cards, glass panels, emoji, cheerful blob
illustrations, purple anything. No gradients as decoration. No shadows as decoration.

Motion is a tool, not a costume: a tab underline that slides, a 12px fade-up when a recalculation
lands, charts that draw in once. Nothing else moves.

## 2. Palette

Warm paper base, deep field green as the working color, soil browns as the neutral ramp, and
exactly one sharp accent: **marigold**. Clay red is reserved for genuine danger; it is not a
second accent.

| Token | Hex | Role | Contrast on paper |
|---|---|---|---|
| `--paper` | `#FAF6EC` | App canvas | — |
| `--paper-raised` | `#FFFDF7` | Cards, panels, dialogs | — |
| `--paper-sunken` | `#F2ECDD` | Sidebar, table heads, inset wells | — |
| `--paper-deep` | `#E8DFC9` | Hover on sunken surfaces | — |
| `--ink` | `#1B1A14` | Primary text | 15.9:1 ✔ |
| `--ink-2` | `#4A4534` | Secondary text | 8.5:1 ✔ |
| `--ink-3` | `#6B6650` | Muted labels, captions | 5.2:1 ✔ |
| `--line` | `#E3DBC7` | Hairline borders, rules | — |
| `--line-strong` | `#C9BC9B` | Input borders, emphasis rules | — |
| `--green-700` | `#24502F` | Primary hover / dark fills | 8.9:1 ✔ |
| `--green-600` | `#2E5F3A` | **Primary** (buttons, links, active) | 7.2:1 ✔ |
| `--green-100` | `#E3ECE0` | Primary tint fills | — |
| `--soil-800` | `#3E2F20` | Deep brown text on tinted fills | — |
| `--soil-600` | `#6E5335` | Brown accents, chart neutrals | 7.0:1 ✔ |
| `--soil-300` | `#BCA27B` | Chart grid neutrals, disabled | — |
| `--soil-200` | `#DCCBAF` | Tints, chart fills | — |
| `--soil-100` | `#EFE6D4` | Warm tint surfaces | — |
| `--marigold-700` | `#97590A` | Accent **text** and icons | 5.0:1 ✔ |
| `--marigold-500` | `#DE9A1E` | Accent fills, active underline, focused figures | 2.2:1 (fills only, always with `--ink`) |
| `--marigold-100` | `#FAE9C9` | Accent tint | — |
| `--clay-700` | `#8C2F21` | Critical severity, destructive | 7.4:1 ✔ |
| `--clay-600` | `#A83A28` | Danger text / High severity | 6.3:1 ✔ |
| `--clay-100` | `#F6E1DA` | Danger tint | — |

Semantic mapping (no extra hues): success = `--green-600`; warn = `--marigold-700`;
danger = `--clay-600`; critical = solid `--clay-700` with `--paper-raised` text.

Severity ladder for Risk: Low → green tint, Moderate → marigold tint, High → clay tint,
Critical → solid clay. Severity is also always spelled out in text — never color alone.

Data viz sequence (charts, in order): `#2E5F3A` green, `#DE9A1E` marigold, `#6E5335` soil,
`#A83A28` clay, `#4C7C57` light green, `#BCA27B` sand.

## 3. Typography

| Role | Family | Notes |
|---|---|---|
| Display | **Fraunces** (variable, `opsz` 9→144, `SOFT` 0, `WONK` 0) | Headings, page titles, hero figures, the wordmark. Set at 500–600 weight, optical size ≈ text size. |
| Text | **Inter Tight** (variable) | Everything else. 400/450 body, 500 emphasis, 600 labels. |
| Data / code | **JetBrains Mono** (variable) | API payloads, keys, and anywhere digits must align. |

Type scale (px, 4px-grid multiples at the low end):

```
--t-micro 11  uppercase, tracking .08em, weight 600   → section eyebrows, table heads
--t-xs    12  captions, meta, axis labels
--t-sm    13  dense UI, table cells, helper text
--t-base  15  body copy, UI default
--t-md    17  lede paragraphs, card titles
--t-lg    20  h3 / panel titles           (Fraunces 600)
--t-xl    24  h2 / section titles         (Fraunces 600)
--t-2xl   30  h1 / page titles            (Fraunces 600)
--t-3xl   38  big stat figures            (Fraunces 500)
--t-4xl   48  hero figures, auth headline (Fraunces 500–600)
```

Numeric discipline: every figure in a table, stat, chart axis, tooltip or metric row uses
`font-variant-numeric: tabular-nums lining-nums` and right-aligned columns. Units are set one
step smaller and in `--ink-3`, separated by a thin space (e.g. `62 mm`, `5.9 pH`, `৳ 84,500`).

Line length: long-form Advice/Risk prose is clamped to **68ch**; data tables are full-width.

## 4. Space, shape, surface

- **Spacing:** 4px base. Component padding steps: 8 / 12 / 16 / 20 / 24 / 32 / 48.
  Page gutter: 20px mobile, 32px desktop. Vertical rhythm between sections: 32–40px.
- **Radius:** one radius only — `--r: 6px` for every button, input, card, panel, tag and chart
  frame. Avatars and status dots are circles; nothing else is round. No `rounded-3xl`.
- **Surfaces are flat.** Depth comes from 1px `--line` borders and background tone shifts
  (paper → raised → sunken), never from shadows. Exactly two exceptions, both for floating
  layers only (dialogs, popovers, dropdowns, toasts): `--shadow-pop`, a restrained double
  shadow that reads as paper lifted off the desk.
- **Rules over boxes.** Dividers (`border-bottom: 1px --line`) separate list rows and form
  sections rather than wrapping each row in a card. Nested cards are banned. When a card is
  needed it is a `panel`: raised surface, 1px border, 6px radius, no shadow, 16–20px padding.
- Grid: 12 columns desktop, 8 tablet, 4 mobile. Content max width 1240px; prose max 68ch.

## 5. Components (canonical)

- **Button** — solid green (primary), outline (secondary), quiet text (tertiary), danger
  (outline clay → solid on confirm). Heights: 32 (sm) / 36 (md) / 44 (lg). One icon max, leading.
- **Field** — label above (13px, weight 500), 36px input, `--line-strong` border, 6px radius,
  helper text below in `--ink-3`; error swaps border to clay, helper to clay, adds `role="alert"`.
- **Tag / Stamp** — 11px uppercase, 1px border, 6px radius, tinted background. Used for
  status, severity, stage, and seasons. Never as a button.
- **Table / Ledger** — sunken header row, 11px uppercase heads, hairline row rules, tabular
  numbers, right-aligned numerics, row hover tint, inline actions revealed on hover *and*
  always focusable.
- **Tab bar (farm)** — index tabs sitting on a 1px rule; active tab has a 2px marigold
  underline that slides via a measured indicator; inactive tabs are `--ink-3`.
- **Stat** — label (11px uppercase) over figure (Fraunces 30–38, tabular) over delta
  (12px, green/clay + arrow glyph). No card chrome unless grouped in a `panel`.
- **Empty state** — 96–140px hand-drawn SVG line illustration in `--soil-300`, one sentence of
  guidance in `--ink-2`, one primary action. Never a cartoon mascot.
- **Skeleton** — `--paper-sunken` blocks with a 1.4s opacity pulse, shaped like the content
  they replace (never generic bars for prose).
- **Toast** — bottom-left, paper-raised, 1px border, 3px left color bar per tone, 6px radius,
  max width 380px, dismiss in 6s.

## 6. Motion

| Token | Value | Use |
|---|---|---|
| `--m-instant` | 90ms `ease-out` | hover/press color and border |
| `--m-quick` | 160ms `ease-out` | dropdown open, tag swap, banner in |
| `--m-move` | 220ms `cubic-bezier(.2,.7,.2,1)` | tab underline slide, panel swap |
| `--m-draw` | 640ms `ease-out` | chart series draw-in, `stroke-dashoffset` |

Content swaps fade 8px up over `--m-quick`; recalculation results fade 12px up over `--m-move`.
Under `prefers-reduced-motion: reduce` all of the above collapse to `1ms` and chart draw-in is
disabled (series render complete).

## 7. Accessibility contract

- Body text ≥ 4.5:1, large/display ≥ 3:1, chart lines ≥ 3:1 against their surface.
- Focus: `2px` solid `--marigold-500` outline with `2px` offset on every interactive element.
  Focus is never removed; `:focus-visible` styling is required, never optional.
- Every input has a real `<label>`; errors use `role="alert"`; groups use `fieldset/legend`.
- Tab bar is a real `role="tablist"` with arrow-key navigation, `aria-selected`, and roving tabindex.
- Charts carry `<title>`/`<desc>`, an accompanying data table (toggled by "Show data"), and
  never encode meaning by color alone (series also differ by line style/marker).
- Live regions announce recalculation start and completion.
- Touch targets ≥ 44px on mobile; body copy never below 13px.

## 8. Voice & content

Agronomist voice: specific, numeric, actionable, and reasoned. Every recommendation carries a
*why* ("lime now, because exchangeable acidity blocks P uptake at pH 5.6").

- Crops, districts, and units are local and real: aman/boro rice, jute, potato, tomato,
  mustard, lentil, maize; Rajshahi, Bogura, Mymensingh, Jessore, Dinajpur; decimals, bigha,
  acres; mm rainfall; °C; ৳ (BDT); maund for market prices.
- Buttons are verbs ("Add plant", "Regenerate advice"), never "Submit" or "Continue".
- No Lorem ipsum, no "John Doe", no marketing superlatives. Empty states say what to do next.
