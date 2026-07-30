# 05 — Kiosk components & visual system (`@beyo/clock-kiosk` kit + tokens)

Last verified: 2026-07-30 · commit `e8a35e19`

## Ownership rule (from the completed master — still binding)

Component files under `src/components/` are **design-owned (Claude)**:
DOM structure, Tailwind classes, motion. Logic sessions treat them as
read-only — **additive optional props only**; restyling/restructuring goes
through a design session. They are pure: no fetching, no timers, no matching
— data in, callbacks out, `data-testid` on everything feature-critical.

## Prop contracts

The authoritative per-component contract tables live in
**`packages/clock-kiosk/README.md`** (Phase 3 / Phase 4 / Phase 6 sections) —
kept there because host integrators need them; NOT duplicated here. This doc
adds what the README doesn't: interconnection and design intent.

## Component inventory by screen

| Screen | Components (`src/components/`) | Notes |
|---|---|---|
| Chrome (every screen) | `chrome/KioskFrame`, `chrome/KioskHeader` | Paper column (max 760px) with header/middle/footer slots; header identity block takes `identitySlotProps` (host attaches the settings long-press). |
| Keypad (idle) | `keypad/KeypadScreen`, `keypad/CodeCells`, `keypad/Keypad` | Cells show typed digits; shake via `.kiosk-shake` on `error` rising edge; **"Clock with email"** pill toggles email mode; `statusNotice` renders the quiet tertiary terminal-offline line (never combined with `error`); `lg:` sizes step DOWN (100px keys) so desktop/iPad-landscape fit 900px — tablet portrait keeps 120px. |
| Confirm | `confirm/IdentityConfirmScreen` | `@beyo/ui Avatar` (initials fallback); ONE primary action (`success` green in / `accent` blue out); nullable context row (scheduled gap). |
| Results | `result/ResultScreen`, `CheckHero`, `DarkTimePlate`, `AutoReturnFooter` | Plate = the screen's single most important number (mono); `right` column = scheduled gap; `AutoReturnFooter` variant `muted` (plain) / `accent` (summary). Plates use phone-scale heroes (40px base → 58/64px `sm:`) and `flex-wrap` so the right/IN-OUT columns drop below instead of overlapping on narrow viewports (operator finding 2026-07-30). |
| Summary | `summary/SummaryScreen` + `SummaryHeader`, `WorkedTodayPlate`, `ItemsCompletedCarousel`, `WeekBarChart`, `RateTile`, `InsightRow` | Adapter-gated sections; responsive ORDER swap (phone: hours→insights→items→week/rate; sm+: hours→items→week+rate grid→insights) via `order-*` classes; stays balanced with everything empty. |
| Announcements | `announcements/AnnouncementsList` | Max 3, dated (pre-formatted string), accent dots. |
| Device | `device/DeviceSignInCard`, `device/DeviceSettingsPanel(+Row)` | Chrome only; host injects forms/controls. |
| Shared | `shared/KioskButton`, `shared/KioskSurfaceSkeleton` | Button variants success/accent/muted/danger/ghost × xl(88px)/md; skeleton variants confirm/result/summary on kiosk paper (used by the host's in-frame Suspense). |
| Dev | `showcase/KioskKitShowcase` (`@beyo/clock-kiosk/showcase` subpath) | Full mock flow, demo codes 4271/8306. Never import from real pages. |

## Visual system

- **Tokens** (in `@beyo/styles`, namespace shared to any host):
  `--color-kiosk-{canvas,surface,card,ink,secondary,tertiary,key,line,accent,
  success,success-soft,error,plate,plate-label}` + `--font-kiosk-{sans,mono}`.
  `.kiosk-shake` keyframes also live there. NEVER touch non-kiosk tokens.
- **Fonts**: Instrument Sans (UI) + IBM Plex Mono (ALL times/counts/deltas) —
  self-hosted by the host app (`floor-app/public/fonts` + `@font-face`).
- **Design ground truth**: the 5 images + `design_readme.md` (palette hex,
  radii, 44px minimum touch targets, keypad 72→120px scale, copy voice
  "factual, not motivational").
- **Rise surface** (`@beyo/ui RiseSurface`, type `"rise"`): fade-in slide-up /
  fade-out slide-down; accessible name via `SurfaceHeaderContext.setTitle`
  (fallback "Screen"); shells force no colors — kiosk pages are made opaque by
  the HOST's `withFloorKioskFrame` wrapper, not by the shell.
- **A11y state** (fidelity pass, recorded in the archived Phase 7 plan):
  everything interactive ≥44px, named, focus-visible; reduced-motion honored
  (MotionConfig + CSS); contrast — all primary pairs ≥4.5:1; `secondary`
  3.53:1 / `tertiary` 2.62:1 pass only as large/decorative text — accepted
  design palette; darken toward `#767061` if AA body-text ever required.

## Scrolling

All four flow screens (`KeypadScreen`, `IdentityConfirmScreen`,
`ResultScreen`, `SummaryScreen`) scroll through `@beyo/ui`'s
`VerticalScrollArea` (hairline custom scrollbar; kiosk-tinted via
`trackClassName="bg-kiosk-key"` / `thumbClassName="bg-kiosk-tertiary/40"`),
not native `overflow-y-auto`. Pattern: the primitive's OUTER div gets
`style={{flex:'1 1 0%', minHeight:0}}` + the screen's `data-testid`; children
are wrapped in a `min-h-full flex-col` div carrying the screen's padding so
`mt-auto` footers still pin. Keep new scrollable kiosk screens on this
pattern.

## Rules for changing this zone

- Visual changes: run the showcase (`/showcase` subpath mounted on a dev
  route) and compare against the design images; then update the README
  contract table if props changed, and this doc if inventory/intent changed.
- New component → add here + README table + barrel export + `data-testid`s.
- Never let a component learn to fetch/time/match — that moves to zone 04.

## Verification pointers

- `packages/clock-kiosk/README.md` (contracts), `src/index.ts` (exports),
  `packages/styles/src/index.css` (tokens + shake),
  `packages/ui/src/components/surfaces/RiseSurface.tsx`.
