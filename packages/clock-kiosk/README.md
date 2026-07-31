# @beyo/clock-kiosk

The shop-floor clock-in/out kiosk experience. It is a host-mounted page, not an
application shell: a host owns floor authentication, device configuration,
surface registration, and any endpoint-backed adapter data.

> **Agents: before ANY work on this capability, read
> `clock-kiosk-documentation/frontend/INDEX.md`** — it routes your intention
> to the right zone docs and defines the update protocol (every modification
> updates the affected docs + CHANGELOG in the same session).

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
| `KioskSurfaceSkeleton` | `{ variant?: "confirm"·"result"·"summary" }` — loading fallback that stays inside `KioskFrame`; host uses variant-matched `Suspense` fallbacks while kiosk surfaces lazy-load. |
| `KioskKitShowcase` | zero props; dev-only review harness with the design's mock data. Import from **`@beyo/clock-kiosk/showcase`** (kept off the main barrel — C11); never import from a real page. |

## Kit prop contracts (Phase 4 — core flow screens)

| Component | Contract |
|---|---|
| `KeypadScreen` | `{ code, error, errorMessage?, statusNotice?, mode: "code"·"email", emailValue, pending?, onDigit, onDelete, onSubmit, onModeChange, onEmailChange, onEmailSubmit, onRefresh }` — code cells display the typed digits (user decision 2026-07-29). `onRefresh` is the pull-to-refresh handler (roster refetch); the screen IS a `PullToRefresh`. `statusNotice` is the quiet roster/offline line (tertiary, no shake, no red cells), distinct from the no-match `error` signal. The email fallback affordance is labeled **"Clock with email"**. Auto-submit-on-4th, matching, and physical-keyboard events are controller concerns. |
| `CodeCells` | `{ length, value, error }` — each filled cell shows its digit; plays the shake once on every false→true `error` transition (`.kiosk-shake` in `@beyo/styles`). |
| `Keypad` | `{ onDigit, onDelete, onSubmit }` — 3×4 circles (72px phone → 120px iPad, 100px `lg:`). Bottom row is **submit · 0 · delete** (delete bottom-right, phone/PIN-pad convention); delete uses lucide's `Delete` icon, submit is the accent circle. |
| `IdentityConfirmScreen` | `{ user: {name, roleLine, avatarUrl}, context: {label, value} \| null, action: "clock_in"·"clock_out", pending, onAction, onBack }` — exactly one primary action; context row hidden when null (scheduled-shift gap). Uses `@beyo/ui` `Avatar` (initials fallback). |
| `ResultScreen` | `{ variant: "in"·"out", greeting, subtitle, plate: {label, time, right?} \| null, notice?, announcementsSlot?, countdownSeconds, onDone, doneLabel? }` — covers clock-in success and the plain clock-out; Phase 6 replaces the "out" body with the analytics summary. |
| `CheckHero` | `{ tone?: "success"·"accent", autoReturnSeconds?: number \| null }` — with `autoReturnSeconds` a depleting ring runs around the circle for that many seconds (the visual auto-return countdown); the first value seen sets the duration. |
| `DarkTimePlate` | `{ label, time, right? }` — the screen's single most important number; mono numerals; `right` is the scheduled column (adapter-gated). |
| `AutoReturnFooter` | `{ secondsLeft, onDone, label?, variant?: muted·accent }` — countdown ticks in the store; this renders it. Summary uses `variant="accent"`. |

## Kit prop contracts (Phase 6 — clock-out summary + announcements)

| Component | Contract |
|---|---|
| `SummaryScreen` | `{ title, subtitle, name, avatarUrl, worked: {worked, in, out}, items \| null, week \| null, rate \| null, insights, notice?, countdownSeconds, onDone }` — `items`/`week`/`rate` render only when non-null; `insights` is always `[]` as of the NEW analytics contract (handoff §5.1 dropped `insights[]` — the section stays wired as dormant UI, gated on non-empty, in case a future source feeds it). With everything empty it is hero (+ notice). Phone order hours→items→week/rate; sm+ hours→items→week+rate grid (design readme rule, insights row omitted). Footer is `AutoReturnFooter` accent "Done · See you tomorrow". |
| `SummaryHeader` | `{ title, subtitle, name, avatarUrl }` — compact identity row, Avatar initials fallback. |
| `WorkedTodayPlate` | `{ worked: "8h 12m", in: "06:58", out: "15:00", autoReturnSeconds?: number \| null }` — pre-formatted strings from the analytics view model, built from the controller's client-captured `clockedInAt`/`clockedOutAt` (the backend gives neither a segments drill-down nor a clock-out timestamp — handoff §5.1). Dark hero, mono numerals. `autoReturnSeconds` runs the depleting auto-return border around the plate. |
| `ItemsCompletedCarousel` | `{ items: {id, reference: string \| null, imageUrl, units}[], totalUnits, lineCount }` — `reference` is the backend's article_number/sku label (no product-name entity; falls back to "Item" in the UI when null). Horizontal snap scroll, `BackendImage` with placeholder fallback. GAP: `SummaryExtrasAdapter.items` — defaults to a real mapping off `analytics.completed_items` (`lib/summary-extras-adapters.ts`), not null. |
| `WeekBarChart` | `{ days: {label, workedSeconds, isToday}[], targetSeconds, loggedSeconds }` — CSS bars, today accent-filled; hour formatting is display-local. `targetSeconds` is client hard-coded (`DEFAULT_WEEKLY_TARGET_HOURS` in `lib/summary-extras-adapters.ts`) — the backend has no scheduling concept (handoff §5.1: "no `scheduled_seconds`, ever"). GAP: `SummaryExtrasAdapter.week` — defaults to a real mapping off `analytics.week`. |
| `RateTile` | `{ unitsPerHour, baseline: number \| null, baselineDays }` — mono rate figures; `baseline` null renders "Not enough history yet" instead of the N-day-average line (backend sends `baseline_units_per_hour: null` when `baseline_days` is 0). GAP: `SummaryExtrasAdapter.rate` — defaults to a real mapping off `analytics.rate`. |
| `InsightRow` | `{ text, delta: {value: "+9%", polarity: positive·negative·neutral} }` — component kept for future use; nothing currently feeds it (see `SummaryScreen` row). |
| `AnnouncementsList` | `{ items: {title, body, accent: info·success·neutral}[] }` — "TODAY ON THE FLOOR", max 3 rendered; lives on the clock-in result's `announcementsSlot`. GAP: `AnnouncementsAdapter`. |

Surface loaders and registrations are also public: `loadClockKioskPage()`
for route mounting, `clockKioskSurfaces` for host `SurfaceProvider`
registration, and `preloadClockKioskSurfaces()` for eagerly warming the
confirm/result lazy chunks.

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

## Host Integration

### 1. Install and register styling

Add the package and its peers to the host app, import `@beyo/styles`, and make
Tailwind scan the kiosk source. The following `@source` lines are required when
the host uses the corresponding packages:

```css
@import "tailwindcss";
@import "@beyo/styles";
@source "../../../../packages/clock-kiosk/src";
@source "../../../../packages/ui/src";
@source "../../../../packages/hooks/src";
@source "../../../../packages/auth/src";
@source "../../../../packages/lib/src";
```

The kiosk consumes the namespaced `--color-kiosk-*` palette and
`--font-kiosk-sans` / `--font-kiosk-mono` tokens. Register both self-hosted
faces in the host's global CSS before mounting a kiosk page:

```css
@font-face {
	font-family: "Instrument Sans";
	font-style: normal;
	font-weight: 400 700;
	font-display: swap;
	src: url("/fonts/InstrumentSans-Variable.ttf") format("truetype");
}

@font-face {
	font-family: "IBM Plex Mono";
	font-style: normal;
	font-weight: 400;
	font-display: swap;
	src: url("/fonts/IBMPlexMono-Regular.ttf") format("truetype");
}

@font-face {
	font-family: "IBM Plex Mono";
	font-style: normal;
	font-weight: 500;
	font-display: swap;
	src: url("/fonts/IBMPlexMono-Medium.ttf") format("truetype");
}

@font-face {
	font-family: "IBM Plex Mono";
	font-style: normal;
	font-weight: 600;
	font-display: swap;
	src: url("/fonts/IBMPlexMono-SemiBold.ttf") format("truetype");
}
```

### 2. Require floor-scope device auth

Mount the kiosk only inside `AuthProvider appScope="floor"` and a protected
floor route. A floor device token is persisted by `@beyo/auth`; it has no
refresh flow, and any `401` returns the device to sign-in. The signed-in account
must have the floor-scope admin or manager role. Never mount this page under a
worker, seller, or regular manager app token because roster identification
fields are floor-scope only.

### 3. Register the route and rise surfaces

Lazy-load the always-mounted keypad page through the package loader, and merge
the package's two `rise` surface registrations into the host's central surface
registry. Wrap each lazy surface inside host chrome and a `Suspense` fallback so
`KioskSurfaceSkeleton` stays inside `KioskFrame` during a genuinely cold load.

```tsx
import {
	CLOCK_KIOSK_CONFIRM_SURFACE_ID,
	CLOCK_KIOSK_RESULT_SURFACE_ID,
	KioskSurfaceSkeleton,
	clockKioskSurfaces,
	preloadClockKioskSurfaces,
	loadClockKioskPage,
} from '@beyo/clock-kiosk';
import { lazyRoute, lazyWithPreload, type SurfaceRegistrations } from '@beyo/ui';
import { Suspense, createElement, type ComponentType } from 'react';

import { FloorKioskFrame } from '@/components/FloorKioskFrame';

// Protected route:
{ path: '/', element: lazyRoute(loadClockKioskPage) }

function withFloorKioskFrame(
	Component: ComponentType,
	variant: 'confirm' | 'result' | 'summary',
): ComponentType {
	return function FloorComposedKioskSurface(): React.JSX.Element {
		return createElement(
			FloorKioskFrame,
			null,
			createElement(
				Suspense,
				{ fallback: createElement(KioskSurfaceSkeleton, { variant }) },
				createElement(Component),
			),
		);
	};
}

const IdentityConfirm = withFloorKioskFrame(
	clockKioskSurfaces[CLOCK_KIOSK_CONFIRM_SURFACE_ID].component,
	'confirm',
);
const Result = withFloorKioskFrame(
	clockKioskSurfaces[CLOCK_KIOSK_RESULT_SURFACE_ID].component,
	'result',
);
const identityConfirm = lazyWithPreload(() => Promise.resolve({ default: IdentityConfirm }));
const result = lazyWithPreload(() => Promise.resolve({ default: Result }));

// Warm both host wrappers and package-owned kiosk chunks at registry scope.
void identityConfirm.preload();
void result.preload();
void preloadClockKioskSurfaces();

export const surfaceRegistry: SurfaceRegistrations = {
	[CLOCK_KIOSK_CONFIRM_SURFACE_ID]: {
		surface: 'rise',
		component: identityConfirm.Component,
	},
	[CLOCK_KIOSK_RESULT_SURFACE_ID]: {
		surface: 'rise',
		component: result.Component,
	},
};
```

Use a `ClockKioskSurfaceOpeners` implementation backed by the host's
`SurfaceProvider`: open the confirm/result ids and close both ids on return.
The package intentionally never imports `useSurface` or host navigation.

If your host defers surface preloads until after auth, call
`preloadClockKioskSurfaces()` when the floor route becomes eligible; this only
warms package-owned kiosk surface chunks.

### 4. Provide kiosk state and host chrome

Wrap the protected route outlet in `KioskProvider`. Its `timeZone` comes from
the authenticated workspace, and `autoReturnSeconds` comes from host-owned,
persisted device configuration. The host passes the configured terminal label
and workspace name to `KioskHeader`, and supplies an app-owned clock that reads
`new Date()` every tick and resyncs on focus/visibility.

```tsx
<KioskProvider
	adapters={adapters}
	autoReturnSeconds={deviceConfig.autoReturnSeconds}
	surfaceOpeners={surfaceOpeners}
	timeZone={floorUser.timeZone}
>
	<KioskFrame header={<KioskHeader {...headerProps} />}>
		<Outlet />
	</KioskFrame>
</KioskProvider>
```

Persist one device-local configuration record: `terminalLabel` and an integer
`autoReturnSeconds` from 4 through 120 (default 12). Device settings must be a
host-owned `rise` surface, reachable only through the deliberate long-press
affordance; it is not kiosk business logic.

### 5. Supply optional adapters

All adapters are synchronous presentation seams. `scheduledShift` and
`announcements` are host-owned data sources with graceful-empty production
defaults (no scheduled row, no announcements) — the host owns any endpoint
query and supplies its current values; do not fetch inside those adapter
functions. `summaryExtras.items/week/rate` is different: the backend embeds
`completed_items`/`week`/`rate` directly in the clock-out response (handoff
§5.1), so there is nothing host-specific to fetch — the package ships a real
default mapping (`lib/summary-extras-adapters.ts`) off `context.analytics`
itself. A host may still override any key via `KioskAdaptersInput`, but
doesn't need to for these three.

| Adapter | Context | Default when analytics has no data |
|---|---|---|
| `scheduledShift` | `{ user, timeZone, currentShift }` | `null` — hides confirm/result schedule context |
| `announcements` | `{ user, timeZone }` | `[]` — hides the clock-in announcement section |
| `summaryExtras.items/week/rate` | `{ analytics, user, timeZone }` | derived from `analytics`; gates to hidden only when the underlying array/days is empty (`lib/kiosk-adapters.ts` `gateSummaryExtras`) — `rate` still renders with a null baseline |

## Mock And Live-Flip Runbook

`VITE_FLOOR_MOCKS=1` starts the floor MSW worker in development. Playwright is
always fully mocked by route fixtures. **As of 2026-07-31 the handoff liveness
table shows every v1 endpoint ✅ live**, including populated `analytics`
(`completed_items`/`week`/`rate` — the `segments[]`/`insights[]` shape it used
to carry is retired, see handoff §5.1). `@beyo/worker-shifts` schemas, the MSW
fixtures, the analytics view-model, and the summary GAP adapters were all
updated to the NEW contract in the same pass (2026-07-31 CHANGELOG entry) — but
**the flag has not been flipped yet**: `VITE_API_URL` is still unset in every
floor-app env file and `VITE_FLOOR_MOCKS` is still `1`. Flipping the app onto
the real backend is a separate, deliberate deployment step (below), not implied
by the contract going live.

When ready to point the app at the live backend, perform this checklist:

1. Confirm the handoff liveness table and response contract are current (it is,
   as of this entry — re-check before flipping if time has passed).
2. Set `VITE_API_URL` to the real backend URL and set `VITE_FLOOR_MOCKS=0`
   (turns off both the MSW worker and the showcase adapters — `FloorKioskProvider.tsx`).
3. Since all v1 endpoints are live together, this is a single flip rather than
   a per-endpoint rollout; MSW handlers can stay in the repo for local dev
   (`VITE_FLOOR_MOCKS=1` keeps working offline) but are no longer required in
   any deployed host.
4. Run the fully-mocked Playwright suite once more as a pre-flip baseline, then
   rehearse every kiosk journey (clock-in, clock-out with and without
   analytics, declare-state if enabled, roster offline) against the live
   endpoint without test route interception — the always-on device rehearsal
   below covers this.
5. Record the environment and result in this file's CHANGELOG-equivalent
   entry (`clock-kiosk-documentation/frontend/CHANGELOG.md`) before relying on
   it in production.

## Always-On Device Rehearsal

Run this manual script on the target tablet or floor terminal with development
mocks enabled. It complements automated clock, focus-manager, and visibility
timeout tests.

1. Leave the keypad idle for at least one minute, put the device to sleep, wake
	 it, and verify the header time immediately matches a trusted clock.
2. Background the kiosk for at least two minutes, return to it, and verify the
	 roster refreshes without losing a usable cached roster.
3. Enter a known worker, leave the confirmation screen hidden for at least 30
	 seconds, return, and verify the cleared keypad is shown rather than personal
	 information.
4. Disconnect network after a roster has loaded: verify email/code matching can
	 still reach confirm from the cached roster. Repeat after clearing site data:
	 verify the keypad is unavailable with the terminal-offline state and no
	 personal data is shown.
5. Restore network and verify the next focus or two-minute poll makes the kiosk
	 usable again.
