# PLAN_pwa_mobile_root_scroll_lock_20260519

## Metadata

- Plan ID: `PLAN_pwa_mobile_root_scroll_lock_20260519`
- Status: `archived`
- Owner agent: `codex-gpt-5`
- Created at (UTC): `2026-05-19T00:00:00Z`
- Last updated at (UTC): `2026-05-19T18:29:38Z`
- Related issue/ticket: `—`
- Intention plan: `—`

---

## Goal and intent

- **Goal:** Establish the correct PWA-native scroll baseline so the app behaves like a native mobile app from day one: no browser pull-to-refresh on swipe-down, no root-level scrolling (each surface/page owns its own scroll container), and proper safe-area insets so content never hides behind the iPhone notch or home indicator.
- **User intent:** The app will be deployed as a full-screen PWA (`display: standalone`). Accidental pull-to-refresh causes a full reload; accidental root scrolling shifts the entire viewport. Both must be impossible. Safe-area handling is required from the start so no future component accidentally sits under the notch or home indicator.
- **Non-goals:** Adding a Service Worker, Web App Manifest, push notifications, offline caching, or any JS-level touch-event interception. These are pure CSS + HTML changes.

---

## Scope

- **In scope:**
  1. Prevent pull-to-refresh (Android Chrome) and over-scroll bounce (iOS Safari) via CSS.
  2. Lock the root viewport so no scrolling can happen outside of explicitly scrollable containers.
  3. Extend the viewport to cover the full screen on iPhone (`viewport-fit=cover`) and expose CSS custom properties for safe-area insets.
  4. Apply safe-area insets to: the `AppShell` container (status bar), `BottomTabBar` (home indicator), `SlidePageSurface` (status bar — fixed full-screen overlay), and `BottomSheetSurface` content area (home indicator — content can scroll behind it).
  5. Prevent user-pinch-zoom (`user-scalable=no`) — appropriate for a native-app-like PWA.

- **Out of scope:**
  - `ModalSurface` safe-area handling — modals are centered and not full-bleed; defer.
  - `SurfaceRouteFrame` safe-area handling — no URI surfaces exist yet.
  - Service Worker, manifest, splash screens, icons.
  - Any runtime JS touch-event handlers.

- **Assumptions:**
  - `AppShell` already uses `h-dvh` (dynamic viewport height), which correctly handles iOS browser chrome retraction. No change to that class.
  - `BottomSheetSurface` renders via `Drawer.Portal` (a React portal onto `document.body`). Portal elements with `position: fixed` escape the `overflow: hidden` on `body` — they are positioned relative to the viewport, not the body scroll container. This is verified CSS behavior.
  - `SlidePageSurface` is `position: fixed; inset: 0` — same viewport-relative positioning applies.
  - `overscroll-behavior: none` on `html` + `body` is supported on Android Chrome ≥ 63 and iOS Safari ≥ 16. For older iOS in standalone mode, `overflow: hidden` on body is the effective fallback.

---

## Clarifications required

*(None — all decisions resolved.)*

---

## Acceptance criteria

1. On Chrome (Android device or DevTools mobile emulation): pulling down on the root page does **not** trigger the pull-to-refresh spinner.
2. On Safari (iOS device or simulator) in standalone PWA mode: there is no over-scroll bounce on the root.
3. The root page (`/`) does not scroll as a whole — only the `<main>` element inside `AppShell` scrolls its content.
4. On an iPhone with notch/Dynamic Island: the "Surface Test Lab" page content does NOT overlap the status bar area; the `BottomTabBar` does NOT overlap the home indicator.
5. The `SlidePageSurface` header (‹ button + title) is visible and not obscured by the notch when the slide surface opens.
6. The `BottomSheetSurface` scrollable content does not have its last item hidden behind the home indicator.
7. `npm run typecheck`: zero errors.
8. `npm run build`: clean.

---

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: folder structure and component locations
- `architecture/28_surfaces_local.md`: surface type map; `SlidePageSurface` and `BottomSheetSurface` implementations

### File read intent — pattern vs. relational

Permitted relational reads (to verify exact class lists before editing):
- `src/index.css` — to see the current `html, body, #root` block before adding properties
- `apps/managers-app/ManagerBeyo-app-managers/index.html` — to see the exact viewport meta content before replacing it
- `src/app/AppShell.tsx` — to see the exact className before adding `pt-[var(--safe-top)]`
- `src/components/shell/BottomTabBar.tsx` — to see the nav structure before modifying
- `src/components/surfaces/SlidePageSurface.tsx` — to see the `m.div` className before adding `pt-[var(--safe-top)]`
- `src/components/surfaces/BottomSheetSurface.tsx` — to see the scrollable div className before adding `pb-[var(--safe-bottom)]`

Prohibited:
- Reading other apps' PWA setup to understand viewport-fit → the pattern is standard and documented in this plan.

---

## Implementation plan

### Step 1 — Update viewport meta in `index.html`

File: `apps/managers-app/ManagerBeyo-app-managers/index.html`

Replace the existing `<meta name="viewport">` line:
```html
<!-- BEFORE -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<!-- AFTER -->
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
/>
```

| Added attribute | Reason |
|---|---|
| `maximum-scale=1.0, user-scalable=no` | Prevents pinch-zoom in native-app-like PWA |
| `viewport-fit=cover` | Extends the CSS viewport to cover the entire screen including notch/Dynamic Island areas. Required for `env(safe-area-inset-*)` to return real values. Without this, the insets are zero because the browser already insets the viewport. |

---

### Step 2 — Add root scroll lock and safe-area CSS in `index.css`

File: `src/index.css`

Replace the existing `html, body, #root` block and add the `:root` custom properties block:

```css
/* BEFORE */
html,
body,
#root {
  height: 100%;
}

/* AFTER */
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
}

html,
body,
#root {
  height: 100%;
  overflow: hidden;        /* locks the root viewport — no root-level scrolling */
}

html,
body {
  overscroll-behavior: none; /* prevents pull-to-refresh (Chrome) and bounce (Safari) */
}
```

**Why `overflow: hidden` on all three:**
- `html` — locks the document scroll container
- `body` — locks the body scroll container (some browsers treat body as the root scroller)
- `#root` — the React mount point; all app scrolling happens in child elements

**Why `overscroll-behavior: none` on `html` + `body`:**
- Chrome on Android reads this from `html` for the pull-to-refresh trigger
- Applying to both covers browser inconsistencies

**Why `--safe-*` CSS custom properties in `:root`:**
- `env()` is a runtime CSS function; it cannot go inside Tailwind's `@theme` (build-time only)
- Declaring once in `:root` and referencing via `var(--safe-*)` everywhere is the DRY pattern
- Default fallback `0px` ensures no layout shift on desktop

---

### Step 3 — Apply safe-area top to `AppShell`

File: `src/app/AppShell.tsx`

Add `pt-[var(--safe-top)]` to the outer container div:

```tsx
/* BEFORE */
<div
  className="flex h-dvh flex-col overflow-hidden bg-background"
  data-testid="app-shell"
>

/* AFTER */
<div
  className="flex h-dvh flex-col overflow-hidden bg-background pt-[var(--safe-top)]"
  data-testid="app-shell"
>
```

This pushes the app content (route pages + bottom tab bar) below the iPhone status bar / Dynamic Island. The background color fills the notch area seamlessly. No changes to `<main>` or any child element.

**Height math is correct:**
`h-dvh` = full dynamic viewport height. The `pt-[var(--safe-top)]` consumes the notch height. `flex-1` on `<main>` fills the remaining available height. `BottomTabBar` sits at the bottom. Nothing overflows.

---

### Step 4 — Apply safe-area bottom to `BottomTabBar`

File: `src/components/shell/BottomTabBar.tsx`

The tab bar's visual height must extend to fill the home-indicator zone on iPhone. The navigation content stays in the top 60px; the area below it fills with the background color so the home indicator appears against the correct background.

```tsx
/* BEFORE */
<nav
  aria-label="Main navigation"
  className="flex h-[60px] items-stretch border-t bg-background"
  data-testid="bottom-tab-bar"
>
  {TABS.map((tab) => (
    <button
      className="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground"
      ...
    >
      ...
    </button>
  ))}
</nav>

/* AFTER */
<nav
  aria-label="Main navigation"
  className="flex-shrink-0 border-t bg-background"
  data-testid="bottom-tab-bar"
>
  <div className="flex h-[60px] items-stretch">
    {TABS.map((tab) => (
      <button
        className="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground"
        ...
      >
        ...
      </button>
    ))}
  </div>
  <div aria-hidden="true" className="h-[var(--safe-bottom)]" />
</nav>
```

The spacer `<div>` is `aria-hidden` and purely visual. On non-notched devices it has `height: 0` (because `--safe-bottom` defaults to `0px`). On iPhone it expands to fill the home indicator zone.

---

### Step 5 — Apply safe-area top to `SlidePageSurface`

File: `src/components/surfaces/SlidePageSurface.tsx`

`SlidePageSurface` is `position: fixed; inset: 0` — it covers the full screen including the notch area. Without adjustment, the header (‹ button + title) overlaps the status bar on iPhone.

Add `pt-[var(--safe-top)]` to the outermost `m.div`:

```tsx
/* BEFORE */
<m.div
  animate={{ x: 0 }}
  className="fixed inset-0 flex flex-col bg-background focus:outline-none"
  exit={{ x: '100%' }}
  initial={{ x: '100%' }}
  style={{ zIndex }}
  transition={transitions.slide}
>

/* AFTER */
<m.div
  animate={{ x: 0 }}
  className="fixed inset-0 flex flex-col bg-background pt-[var(--safe-top)] focus:outline-none"
  exit={{ x: '100%' }}
  initial={{ x: '100%' }}
  style={{ zIndex }}
  transition={transitions.slide}
>
```

No other changes to this file. The `pt-[var(--safe-top)]` pads the entire flex column down — the header, content, and all children are below the notch. The background fills the notch area. The slide-in animation is unaffected (the `m.div` slides from `x: 100%` to `x: 0` — the padding is internal and does not affect the transform). ✓

---

### Step 6 — Apply safe-area bottom to `BottomSheetSurface` content

File: `src/components/surfaces/BottomSheetSurface.tsx`

The drawer slides up from the bottom. On iPhone, the home indicator is at the very bottom of the screen. When the user scrolls to the end of the sheet content, the last item can be hidden behind the home indicator. Add `pb-[var(--safe-bottom)]` to the scrollable content container:

```tsx
/* BEFORE */
<div className="flex-1 overflow-y-auto [scrollbar-gutter:stable]">{children}</div>

/* AFTER */
<div className="flex-1 overflow-y-auto pb-[var(--safe-bottom)] [scrollbar-gutter:stable]">
  {children}
</div>
```

This adds bottom padding inside the scroll container so content never disappears behind the home indicator. The padding is part of the scrollable area — when scrolled to the bottom, there is empty space equal to `safe-bottom` below the last item. ✓

---

## File manifest

| Action | Path |
|--------|------|
| **MODIFY** | `apps/managers-app/ManagerBeyo-app-managers/index.html` |
| **MODIFY** | `apps/managers-app/ManagerBeyo-app-managers/src/index.css` |
| **MODIFY** | `apps/managers-app/ManagerBeyo-app-managers/src/app/AppShell.tsx` |
| **MODIFY** | `apps/managers-app/ManagerBeyo-app-managers/src/components/shell/BottomTabBar.tsx` |
| **MODIFY** | `apps/managers-app/ManagerBeyo-app-managers/src/components/surfaces/SlidePageSurface.tsx` |
| **MODIFY** | `apps/managers-app/ManagerBeyo-app-managers/src/components/surfaces/BottomSheetSurface.tsx` |

Zero new files created.

---

## Risks and mitigations

- **Risk:** `overflow: hidden` on `body` is sometimes cited as breaking `position: fixed` elements in older browsers when a CSS `transform` is also applied to a parent.
  **Mitigation:** `overflow: hidden` alone does NOT create a new containing block for fixed elements — only `transform`, `perspective`, `filter`, or `will-change: transform` do. The only element with a transform in this codebase is `SlidePageSurface`'s `m.div` (Framer Motion applies `transform: translateX`). Fixed elements inside this `m.div` would be affected, but there are none — Vaul's portal and `SurfaceRenderer`'s portal both render directly on `document.body`, outside this tree. ✓

- **Risk:** Vaul's `shouldScaleBackground` applies a CSS transform + scale to the `vaul-drawer-wrapper` div in `main.tsx`. If this creates a new stacking context that traps the Vaul portal's fixed elements, the overlay position may break.
  **Mitigation:** Vaul's portal (`Drawer.Portal`) renders outside the `vaul-drawer-wrapper` div at the `document.body` level. The transform on the wrapper only affects the background scaling animation, not the portal. This is Vaul's designed behavior. `overflow: hidden` on `body` does not affect this. ✓

- **Risk:** `user-scalable=no` is discouraged by WCAG 1.4.4 for accessibility (users who need to zoom).
  **Mitigation:** This is a managers' operational tool, not a public-facing site. The intended deployment is a controlled-access PWA. If accessibility requirements change, remove `user-scalable=no` and `maximum-scale=1.0` from the viewport meta.

- **Risk:** `env(safe-area-inset-top)` returns `0px` if `viewport-fit=cover` is not set in the viewport meta. Step 1 must be completed before any safe-area step is validated on a real device.
  **Mitigation:** All steps must be completed together. Running `npm run typecheck` and `npm run build` verifies correctness, but safe-area validation requires a real iPhone or iOS Simulator.

- **Risk:** On Android, `safe-area-inset-*` values are `0px` in most cases (Android does not have a notch safe-area model in the same way). The `var(--safe-*)` approach defaults to `0px` safely.
  **Mitigation:** All CSS using `var(--safe-*)` will apply `0px` padding on Android — no visual difference, no breakage. ✓

---

## Validation plan

- `npm run typecheck`: zero errors (no TypeScript changes in this plan).
- `npm run build`: clean build.
- Manual device validation:
  - **Android (Chrome):** Open the app in Chrome. Pull down from the top. Confirm: the refresh spinner does NOT appear.
  - **iOS Simulator (Safari PWA):** Add to Home Screen, open as standalone. Confirm: no bounce on over-scroll, content is below the Dynamic Island/notch, home indicator area is filled with `BottomTabBar` background.
  - **Desktop browser:** App looks identical to before — all `var(--safe-*)` values are `0px` on desktop.
  - **SlidePageSurface on iPhone:** Open a slide surface. Confirm: the ‹ header is fully visible below the notch.
  - **BottomSheetSurface on iPhone:** Open a bottom sheet. Scroll to the bottom of the content. Confirm: the last item is not hidden behind the home indicator.

---

## Review log

- `2026-05-19` `codex-gpt-5`: Implemented the viewport, root scroll-lock, and safe-area baseline; validated with `npm run typecheck` and `npm run build`.

---

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `codex-gpt-5`
