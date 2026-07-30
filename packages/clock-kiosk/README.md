# @beyo/clock-kiosk

The shop-floor clock-in/out kiosk experience. It is a host-mounted page, not an
application shell: a host owns floor authentication, device configuration,
surface registration, and any endpoint-backed adapter data.

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
| `KeypadScreen` | `{ code, error, errorMessage?, statusNotice?, mode: "code"·"email", emailValue, pending?, onDigit, onDelete, onSubmit, onModeChange, onEmailChange, onEmailSubmit }` — code cells display the typed digits (user decision 2026-07-29). `statusNotice` is the quiet roster/offline line (tertiary, no shake, no red cells), distinct from the no-match `error` signal. The email fallback affordance is labeled **"Clock with email"**. Auto-submit-on-4th, matching, and physical-keyboard events are controller concerns. |
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

All adapters are synchronous presentation seams. The host owns any endpoint
query and supplies its current values; do not fetch inside adapter functions.
Production defaults are graceful empties: no scheduled row, no announcements,
and no items/week/rate summary tiles.

| Adapter | Context | Empty result |
|---|---|---|
| `scheduledShift` | `{ user, timeZone, currentShift }` | hides confirm/result schedule context |
| `announcements` | `{ user, timeZone }` | hides the clock-in announcement section |
| `summaryExtras.items/week/rate` | `{ analytics, user, timeZone }` | hides the matching summary tile |

## Mock And Live-Flip Runbook

`VITE_FLOOR_MOCKS=1` starts the floor MSW worker in development. Playwright is
always fully mocked by route fixtures. As of 2026-07-30, none of the endpoints
used by v1 are live; do not remove their handlers or flip the flag in a deployed
host. Pause reasons are live but are not a v1 kiosk dependency because declared
states are shelved.

When a backend phase changes an endpoint to live, perform this checklist for
that endpoint only:

1. Confirm the handoff liveness table and response contract are updated to ✅.
2. Start the host without `VITE_FLOOR_MOCKS=1` and configure its live API URL.
3. Remove or gate only that endpoint's MSW handler; retain all still-❌ handlers.
4. Run the affected fully mocked Playwright journey, then rehearse the same
	 journey against the live endpoint without test route interception.
5. Record the backend phase, environment, endpoint, and result in the capability
	 review log before making the next endpoint live.

| Backend phase | Endpoint(s) | Affected journey |
|---|---|---|
| 5 | `POST /auth/sign-in`, `POST /auth/logout` | floor bootstrap, revoked device, all kiosk journeys |
| 6 | `GET /users?role=worker&compact=true&limit=200` | keypad code/email match, focus roster refresh |
| 4 | `GET /worker-shifts/current`, `POST /clock-in`, `POST /clock-out` | `clock-kiosk` clock-in, clock-out, 409, timeout journeys |
| 7 | populated `clock-out.analytics` | `kiosk-summary` journeys; retain null-analytics coverage |

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
