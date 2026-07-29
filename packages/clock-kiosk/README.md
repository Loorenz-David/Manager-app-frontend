# @beyo/clock-kiosk

The shop-floor clock-in/out kiosk experience. Governing plans:
`docs/architecture/under_construction/implementation/clock_in_out_app/`.

**Current state (Phase 3 kit):** presentational chrome only. The kiosk flow
(store/controller/provider/pages/surface registrations) lands in Phase 4.

## Kit prop contracts (Phase 3)

All components are data-in/callbacks-out; none fetches, times, or matches
anything. **Read-only for Codex** (additive optional props only).

| Component | Contract |
|---|---|
| `KioskFrame` | `{ header, children, footer?, className? }` — canvas → centred paper column (max 760px, rounded, safe-area padded): header slot / flexible middle / bottom-pinned footer. |
| `KioskHeader` | `{ workspaceName, terminalLabel, time, date, logo?, identitySlotProps? }` — time/date are pre-formatted strings (the app's `useKioskClock` feeds them). `identitySlotProps` is spread on the identity block: the host attaches its 600ms long-press handlers there to open device settings. |
| `DeviceSignInCard` | `{ title, subtitle, children, footnote? }` — chrome only; host injects the auth form + terminal-label field as children. |
| `DeviceSettingsPanel` / `DeviceSettingsRow` | panel `{ title, subtitle?, children, footer? }`; row `{ label, description?, control }` — host injects controls; the danger footer hosts the device log-out (behind a confirm). |
| `KioskButton` | `{ variant: success·accent·muted·danger·ghost, size?: xl·md } & ButtonHTMLAttributes` — xl is the 88px kiosk primary; success=clock-in green, accent=clock-out blue. |
| `KioskKitShowcase` | zero props; dev-only review harness with the design's mock data. Import from **`@beyo/clock-kiosk/showcase`** (kept off the main barrel — C11); never import from a real page. |

## Kit prop contracts (Phase 4 — core flow screens)

| Component | Contract |
|---|---|
| `KeypadScreen` | `{ code, error, errorMessage?, mode: "code"·"email", emailValue, pending?, onDigit, onDelete, onSubmit, onModeChange, onEmailChange, onEmailSubmit }` — code cells display the typed digits (user decision 2026-07-29). The email fallback affordance is labeled **"Clock with email"**. Auto-submit-on-4th, matching, and physical-keyboard events are controller concerns. |
| `CodeCells` | `{ length, value, error }` — each filled cell shows its digit; plays the shake once on every false→true `error` transition (`.kiosk-shake` in `@beyo/styles`). |
| `Keypad` | `{ onDigit, onDelete, onSubmit }` — 3×4 circles (72px phone → 120px iPad), accent submit key. |
| `IdentityConfirmScreen` | `{ user: {name, roleLine, avatarUrl}, context: {label, value} \| null, action: "clock_in"·"clock_out", pending, onAction, onBack }` — exactly one primary action; context row hidden when null (scheduled-shift gap). Uses `@beyo/ui` `Avatar` (initials fallback). |
| `ResultScreen` | `{ variant: "in"·"out", greeting, subtitle, plate: {label, time, right?} \| null, notice?, announcementsSlot?, countdownSeconds, onDone, doneLabel? }` — covers clock-in success and the plain clock-out; Phase 6 replaces the "out" body with the analytics summary. |
| `CheckHero` | `{ tone?: "success"·"accent" }` |
| `DarkTimePlate` | `{ label, time, right? }` — the screen's single most important number; mono numerals; `right` is the scheduled column (adapter-gated). |
| `AutoReturnFooter` | `{ secondsLeft, onDone, label?, variant?: muted·accent }` — countdown ticks in the store; this renders it. Summary uses `variant="accent"`. |

## Kit prop contracts (Phase 6 — clock-out summary + announcements)

| Component | Contract |
|---|---|
| `SummaryScreen` | `{ title, subtitle, name, avatarUrl, worked: {worked, in, out}, items \| null, week \| null, rate \| null, insights, notice?, countdownSeconds, onDone }` — adapter-gated sections render only when non-null; with all adapters empty it is hero + insights (+ notice), still balanced. Phone order hours→insights→items→week/rate; sm+ hours→items→week+rate grid→insights (design readme rule). Footer is `AutoReturnFooter` accent "Done · See you tomorrow". |
| `SummaryHeader` | `{ title, subtitle, name, avatarUrl }` — compact identity row, Avatar initials fallback. |
| `WorkedTodayPlate` | `{ worked: "8h 12m", in: "06:58", out: "15:00" }` — pre-formatted strings from the analytics view model; dark hero, mono numerals. |
| `ItemsCompletedCarousel` | `{ items: {name, imageUrl, units}[], totalUnits, lineCount }` — horizontal snap scroll, `BackendImage` with placeholder fallback. GAP: `SummaryExtrasAdapter.items`. |
| `WeekBarChart` | `{ days: {label, workedSeconds, isToday}[], targetSeconds, loggedSeconds }` — CSS bars, today accent-filled; hour formatting is display-local. GAP: `SummaryExtrasAdapter.week`. |
| `RateTile` | `{ unitsPerHour, baseline, baselineDays }` — mono rate figures. GAP: `SummaryExtrasAdapter.rate`. |
| `InsightRow` | `{ text, delta: {value: "+9%", polarity: positive·negative·neutral} }` — factual statement + signed mono delta. |
| `AnnouncementsList` | `{ items: {title, body, accent: info·success·neutral}[] }` — "TODAY ON THE FLOOR", max 3 rendered; lives on the clock-in result's `announcementsSlot`. GAP: `AnnouncementsAdapter`. |

> **Barrel note:** the Phase 6 components are intentionally NOT yet exported
> from `src/index.ts` — the Phase 4 Codex session owns barrel edits while it
> runs (concurrent-edit avoidance). The Phase 6 Codex session adds these
> exports when it wires the screen.

The `rise` surface shell lives in `@beyo/ui` (`RiseSurface`) — fade-in
slide-up enter, fade-out slide-down exit, implementing the standard
`SurfaceShellProps` seam. Codex Phase 3 registers it as surface type
`"rise"` in the SurfaceProvider renderer.

## Design system

Tokens are the `--color-kiosk-*` / `--font-kiosk-*` namespace in
`@beyo/styles`. Fonts: Instrument Sans (UI) + IBM Plex Mono (all times,
counts, deltas) — the host app self-hosts both faces (see the floor app's
`index.css`); the tokens fall back to system faces until then. Host apps
consuming this package need `@source "../../../../packages/clock-kiosk/src";`
in their `index.css` (Tailwind v4 does not scan node_modules).

## Host integration

Expanded in Phase 7. Until then: mount chrome via `KioskFrame`/`KioskHeader`,
feed the clock from an app-owned ticking hook, and register device settings
as a `rise` surface in the app's central surface registry.
