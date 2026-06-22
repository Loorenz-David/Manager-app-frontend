# PLAN_celebration_overlay_20260622

## Metadata

- Plan ID: `PLAN_celebration_overlay_20260622`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-22T00:00:00Z`
- Last updated at (UTC): `2026-06-22T13:33:18Z`
- Related issue/ticket: `-`
- Intention plan: `-`

## Goal and intent

- Goal: Create a shared `@beyo/celebration` package that renders a fullscreen overlay animation when a worker completes a task step. Phase 1 delivers confetti + Duolingo-style scale-up text + a celebration sound. The foundation is designed to accept future animation types (Lottie, Rive avatars) without structural changes.
- Business/user intent: Make task completion feel rewarding and entertaining — giving workers the same kind of positive feedback loop that keeps Duolingo users engaged. The foundation must scale to avatar animations and level-of-achievement variants in the future.
- Non-goals: Lottie frame animations, Rive avatar state machines, achievement-level logic, backend persistence of celebration state. All are explicitly deferred to future plans.

## Scope

- In scope:
  - New shared package `packages/celebration/` exported as `@beyo/celebration`
  - Zustand celebration store (trigger/dismiss/config)
  - `CelebrationOverlay` component — React Portal to `document.body`, AnimatePresence, tap-to-dismiss, 5-second auto-dismiss
  - `ConfettiRenderer` — wraps `canvas-confetti`; supports `low`, `medium`, `high` intensity
  - `MessageLayer` — Framer Motion scale-up text ("Great job\n{username}" Duolingo-style)
  - `useCelebrationSound` hook — plays a sound URL on trigger via native `Audio`
  - `useCelebration` hook — exposes `trigger(config)` and `dismiss()`
  - `presets.ts` — `TASK_COMPLETE(username, soundUrl)` preset factory
  - Mount `<CelebrationOverlay />` once at app root in the workers app
  - Sound file placeholder added to workers app at `public/sounds/celebration.mp3`

- Out of scope:
  - Wiring the trigger to the complete task step button — deferred to a separate step once the button and action behind it are finalised (see "Wiring guide" below)
  - Lottie / DotLottie renderer (`{ type: 'lottie' }` variant is typed but unimplemented)
  - Rive avatar renderer (`{ type: 'avatar' }` variant is typed but unimplemented)
  - Achievement-level condition resolver (caller passes the config directly)
  - Backend API involvement of any kind
  - Playlist / multiple sequential sounds

- Assumptions:
  - `canvas-confetti` will be added as a direct `dependency` of `packages/celebration/package.json`; the workspace resolves it through the monorepo
  - A celebration sound file (`celebration.mp3`) will be provided separately and placed at `apps/workers-app/ManagerBeyo-app-workers/public/sounds/celebration.mp3`; if missing, the sound is silently skipped
  - The workers app's `providers.tsx` wraps content in `<LazyMotion features={domAnimation}>` and `<MotionConfig reducedMotion="user">` — these are confirmed present in `src/app/providers.tsx` and the package relies on them being set up by the consuming app

## Clarifications required

None blocking implementation.

## Acceptance criteria

1. `@beyo/celebration` builds and is importable from the workers app with zero TypeScript errors.
2. `<CelebrationOverlay />` is mounted once at the workers app root.
3. Calling `useCelebration().trigger(celebrationPresets.TASK_COMPLETE('Test User'))` from anywhere in the app renders the fullscreen overlay with confetti and scale-up text.
4. A celebration sound plays on trigger (unless the file is missing, in which case it is silently skipped).
5. Tapping the overlay dismisses it immediately.
6. The overlay auto-dismisses after 5 seconds if not tapped.
7. Adding a new animation variant requires only: (a) a new renderer component, (b) adding the variant discriminant to `CelebrationVariant`, (c) a new case in `AnimationRenderer`. No other files change.
8. `reducedMotion` is respected: when the user has enabled OS-level reduced motion, confetti is skipped and the text fades in (no scale animation).

## Contracts and skills

### Contracts loaded

- `architecture/31_animations.md`: Framer Motion is the animation tool; use `m` (not `motion`) with `LazyMotion`; variants live near the component; `MotionConfig reducedMotion="user"` is mandatory; never animate layout-heavy properties
- `architecture/06_client_state.md`: Zustand for shared cross-component state; selector pattern; no derived state in stores; store holds raw state only; no server data in Zustand
- `architecture/28_surfaces.md` + `28_surfaces_local.md`: Overlay is NOT a surface — it does not use the surface manager, surface shells, or `SurfaceProvider`. It is a portal to `document.body` that lives completely outside the surface stack.
- `architecture/15_feature_structure.md`: The `index.ts` is the public API boundary; internal components are not exported

### Local extensions loaded

- `architecture/28_surfaces_local.md`: Confirms surface types are `slide`, `sheet`, `modal` — the celebration overlay is none of these and must not be registered in the surface registry

### File read intent — pattern vs. relational

Permitted reads for codex:
- `src/app/providers.tsx` — to confirm `LazyMotion` and `MotionConfig` are already set up (relational: what exists)
- `src/app/App.tsx` or `src/app/AppShell.tsx` — to confirm the correct root mount point for `<CelebrationOverlay />` (relational: what exists)
- `packages/ui/package.json` — to replicate the package scaffold pattern (relational: what exists)
- `packages/ui/tsconfig.json` — to replicate the tsconfig pattern (relational: what exists)
- `packages/lib/src/animation.ts` — to import existing `transitions` and `durations` tokens (relational: what exists)
- `src/features/task_steps/controllers/use-task-step-detail.controller.ts` — to confirm `handleComplete` and `transitionStepState` call site (relational: what exists)

Prohibited:
- Reading another Zustand store to understand store structure → `06_client_state.md` covers this
- Reading another Framer Motion component to understand animation patterns → `31_animations.md` covers this

### Skill selection

- Primary skill: `architecture/06_client_state.md` (Zustand store), `architecture/31_animations.md` (Framer Motion)
- Excluded alternatives: Surface manager — this is not a navigational overlay

## Implementation plan

### Step 1 — Package scaffold

Create `packages/celebration/` with the following files:

**`packages/celebration/package.json`**
```json
{
  "name": "@beyo/celebration",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "canvas-confetti": "^1.9.3"
  },
  "devDependencies": {
    "@types/canvas-confetti": "^1.6.4"
  },
  "peerDependencies": {
    "@beyo/lib": "*",
    "framer-motion": ">=12.0.0",
    "react": ">=19.0.0",
    "react-dom": ">=19.0.0",
    "zustand": ">=5.0.0"
  }
}
```

**`packages/celebration/tsconfig.json`** — copy exactly from `packages/ui/tsconfig.json`, changing `"include": ["src"]` (same value, keep as-is).

**`packages/celebration/src/`** — empty directory structure to be populated in steps below.

After creating the package, run `pnpm install` at the workspace root to link the package.

---

### Step 2 — Types (`src/types.ts`)

```ts
// CelebrationVariant uses a discriminated union so new animation types
// are added without breaking the renderer switch.
export type CelebrationVariant =
  | { type: 'confetti'; intensity: 'low' | 'medium' | 'high' }
  | { type: 'none' }
// Stubs for future phases — typed now so callsites don't need to change:
// | { type: 'lottie'; src: string }
// | { type: 'avatar'; action: string }

export type MessageConfig = {
  headline: string
  subline?: string
}

export type CelebrationConfig = {
  variant: CelebrationVariant
  message?: MessageConfig
  soundUrl?: string        // URL of the audio file; omit to skip sound
  duration?: number        // ms before auto-dismiss; default 5000
}
```

---

### Step 3 — Zustand store (`src/store/celebration.store.ts`)

Follow `06_client_state.md` store pattern exactly: one file, named actions, selector-friendly state.

```ts
import { create } from 'zustand'
import type { CelebrationConfig } from '../types'

type CelebrationState = {
  config: CelebrationConfig | null
  trigger: (config: CelebrationConfig) => void
  dismiss: () => void
}

export const useCelebrationStore = create<CelebrationState>((set) => ({
  config: null,
  trigger: (config) => set({ config }),
  dismiss: () => set({ config: null }),
}))

export const selectConfig   = (s: CelebrationState) => s.config
export const selectTrigger  = (s: CelebrationState) => s.trigger
export const selectDismiss  = (s: CelebrationState) => s.dismiss
```

---

### Step 4 — Presets (`src/lib/presets.ts`)

```ts
import type { CelebrationConfig } from '../types'

export const celebrationPresets = {
  TASK_COMPLETE: (username: string, soundUrl?: string): CelebrationConfig => ({
    variant: { type: 'confetti', intensity: 'medium' },
    message: { headline: 'Great job', subline: username },
    soundUrl,
    duration: 5000,
  }),
} as const
```

---

### Step 5 — `useCelebration` hook (`src/hooks/use-celebration.ts`)

```ts
import { useCelebrationStore, selectTrigger, selectDismiss } from '../store/celebration.store'
import type { CelebrationConfig } from '../types'

export function useCelebration() {
  const trigger = useCelebrationStore(selectTrigger)
  const dismiss = useCelebrationStore(selectDismiss)
  return { trigger, dismiss }
}
```

---

### Step 6 — `useCelebrationSound` hook (`src/hooks/use-celebration-sound.ts`)

Use native `Audio` — no library dependency. The trigger is always a user gesture (button tap) so mobile audio unlock is not a concern.

```ts
import { useCallback, useRef } from 'react'

export function useCelebrationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const play = useCallback((url: string) => {
    try {
      audioRef.current = new Audio(url)
      void audioRef.current.play().catch(() => {
        // Silent fail — missing file or policy block should not throw
      })
    } catch {
      // Silent fail
    }
  }, [])

  return { play }
}
```

---

### Step 7 — `ConfettiRenderer` (`src/components/renderers/ConfettiRenderer.tsx`)

`canvas-confetti` manages its own canvas; call it imperatively in `useEffect` on mount. Respect reduced motion by skipping when `useReducedMotion()` returns true.

```tsx
import { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { useReducedMotion } from 'framer-motion'

const intensityMap = {
  low:    { particleCount: 60,  spread: 50, startVelocity: 30 },
  medium: { particleCount: 130, spread: 70, startVelocity: 40 },
  high:   { particleCount: 250, spread: 100, startVelocity: 55 },
} as const

type Props = {
  intensity: 'low' | 'medium' | 'high'
}

export function ConfettiRenderer({ intensity }: Props) {
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (reduceMotion) return
    const opts = intensityMap[intensity]
    void confetti({ ...opts, origin: { y: 0.55 } })
    return () => { confetti.reset() }
  }, [intensity, reduceMotion])

  return null
}
```

---

### Step 8 — `MessageLayer` (`src/components/MessageLayer.tsx`)

Duolingo-style: headline scales up from 0.6 → 1.0 with an emphasized spring. Subline fades in slightly after. Respect reduced motion — use opacity-only when `reduceMotion` is true.

Use `m` from framer-motion (not `motion`) — the consuming app's `LazyMotion` context provides the features.

```tsx
import { m, useReducedMotion } from 'framer-motion'
import { transitions } from '@beyo/lib'
import type { MessageConfig } from '../types'

type Props = {
  message: MessageConfig
}

export function MessageLayer({ message }: Props) {
  const reduceMotion = useReducedMotion()

  return (
    <div className="flex flex-col items-center gap-2 px-6 text-center">
      <m.p
        className="text-4xl font-extrabold text-white drop-shadow-lg"
        initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={reduceMotion ? transitions.base : {
          type: 'spring',
          damping: 12,
          stiffness: 200,
          delay: 0.05,
        }}
      >
        {message.headline}
      </m.p>

      {message.subline ? (
        <m.p
          className="text-xl font-semibold text-white/90 drop-shadow"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transitions.base, delay: 0.2 }}
        >
          {message.subline}
        </m.p>
      ) : null}
    </div>
  )
}
```

---

### Step 9 — `AnimationRenderer` (`src/components/AnimationRenderer.tsx`)

Registry switch — adding a new variant is only one new `case` here plus a new renderer file.

```tsx
import type { CelebrationVariant } from '../types'
import { ConfettiRenderer } from './renderers/ConfettiRenderer'

type Props = {
  variant: CelebrationVariant
}

export function AnimationRenderer({ variant }: Props) {
  switch (variant.type) {
    case 'confetti':
      return <ConfettiRenderer intensity={variant.intensity} />
    case 'none':
      return null
    // future cases added here
    default:
      return null
  }
}
```

---

### Step 10 — `CelebrationOverlay` (`src/components/CelebrationOverlay.tsx`)

This is the root component — a React Portal to `document.body`. It:
- Subscribes to the Zustand store
- Renders nothing when `config` is null
- Uses `AnimatePresence` for enter/exit of the full overlay
- Auto-dismisses after `config.duration` (default 5000ms)
- Plays sound on enter via `useCelebrationSound`
- Tapping anywhere on the overlay calls `dismiss()`

```tsx
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, m } from 'framer-motion'
import { transitions } from '@beyo/lib'
import { useCelebrationStore, selectConfig, selectDismiss } from '../store/celebration.store'
import { AnimationRenderer } from './AnimationRenderer'
import { MessageLayer } from './MessageLayer'
import { useCelebrationSound } from '../hooks/use-celebration-sound'

const OVERLAY_Z = 9999  // above all surfaces (surface stack starts at z-50)

function CelebrationOverlayInner() {
  const config  = useCelebrationStore(selectConfig)
  const dismiss = useCelebrationStore(selectDismiss)
  const { play } = useCelebrationSound()

  useEffect(() => {
    if (!config) return
    if (config.soundUrl) play(config.soundUrl)
    const duration = config.duration ?? 5000
    const timer = setTimeout(dismiss, duration)
    return () => clearTimeout(timer)
  }, [config, play, dismiss])

  return (
    <AnimatePresence>
      {config ? (
        <m.div
          key="celebration-overlay"
          className="fixed inset-0 flex flex-col items-center justify-center"
          style={{ zIndex: OVERLAY_Z }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transitions.base}
          onClick={dismiss}
          aria-modal="true"
          aria-label="Celebration"
          role="dialog"
        >
          <AnimationRenderer variant={config.variant} />
          {config.message ? <MessageLayer message={config.message} /> : null}
        </m.div>
      ) : null}
    </AnimatePresence>
  )
}

export function CelebrationOverlay() {
  return createPortal(<CelebrationOverlayInner />, document.body)
}
```

---

### Step 11 — Public API (`src/index.ts`)

Export only what consumers need — the overlay component, the trigger hook, the presets, and the config types.

```ts
export { CelebrationOverlay } from './components/CelebrationOverlay'
export { useCelebration } from './hooks/use-celebration'
export { celebrationPresets } from './lib/presets'
export type { CelebrationConfig, CelebrationVariant, MessageConfig } from './types'
```

Do NOT export store internals, individual renderers, or `MessageLayer` — those are private to the package.

---

### Step 12 — Mount overlay in workers app

Add `@beyo/celebration` to the workers app's workspace dependencies in `apps/workers-app/ManagerBeyo-app-workers/package.json`:

```json
"@beyo/celebration": "*"
```

Then mount `<CelebrationOverlay />` once at the root of the workers app. Read `src/app/App.tsx` or `src/app/AppShell.tsx` to find the correct single mount point — it must be inside `AppProviders` (so `LazyMotion` and `MotionConfig` are in scope) but outside any surface or route. Add it as the last child of `AppProviders` or directly in `AppShell`:

```tsx
import { CelebrationOverlay } from '@beyo/celebration'

// inside the root component, after all other providers:
<CelebrationOverlay />
```

---

### Step 13 — Sound file

Add a sound file at:
```
apps/workers-app/ManagerBeyo-app-workers/public/sounds/celebration.mp3
```

The file is played via `new Audio('/sounds/celebration.mp3')`. If the file is absent, `useCelebrationSound` silently swallows the error. Use any short (< 2s) celebration/chime sound. This file must be obtained separately — it is not generated by this plan.

---

## Wiring guide (deferred — do this when the complete task step button is ready)

When the complete task step button and action are finalised, wire the trigger with these two changes:

**1. In `use-task-step-detail.controller.ts`** — add imports and call `trigger` in the `onSuccess` callback of `handleComplete`:

```ts
import { useCelebration, celebrationPresets } from '@beyo/celebration'
import { decodeTokenClaims } from '@beyo/api-client'

// inside useTaskStepDetailController:
const { trigger: triggerCelebration } = useCelebration()

const handleComplete = useCallback(() => {
  if (!vm || STEP_TERMINAL_STATES.has(vm.state)) return
  transitionStepState(
    {
      task_id: resolvedTaskId,
      step_id: resolvedStepId,
      new_state: 'completed',
      working_section_id: resolvedWorkingSectionId,
    },
    {
      onSuccess: (data) => {
        if (data.kind === 'pending_completion') return
        const claims = decodeTokenClaims()
        triggerCelebration(
          celebrationPresets.TASK_COMPLETE(
            claims?.username ?? '',
            '/sounds/celebration.mp3',
          ),
        )
      },
    },
  )
}, [vm, resolvedTaskId, resolvedStepId, resolvedWorkingSectionId, transitionStepState, triggerCelebration])
```

**2. Verify `data.kind`** — the guard `data.kind === 'pending_completion'` matches the pattern already used in `use-transition-step-state.ts` line 237. Confirm the return type of `transitionStepState` hasn't changed.

**Note on sound and async**: The `onSuccess` callback fires after the network round-trip, which may fall outside the browser's user-gesture window on some mobile browsers. If sound is blocked, the feature degrades gracefully — confetti and text still play. If sound must work reliably, move `triggerCelebration` to the top of `handleComplete` (before `transitionStepState`), accepting it fires even if the mutation fails.

---

## Risks and mitigations

- Risk: `canvas-confetti` fires on component mount — if the overlay mounts/unmounts rapidly, multiple confetti instances could stack.
  Mitigation: `confetti.reset()` is called in the `useEffect` cleanup. The store sets `config: null` on dismiss, which unmounts the renderer.

- Risk: `OVERLAY_Z = 9999` might not clear a future surface with very high z-index.
  Mitigation: The surface stack starts at z-50 and increments by 10 per layer (see `28_surfaces.md`). 9999 is safe for any realistic stack depth. Document this constant so future surface z-index changes are aware of it.

- Risk: The workers app's `providers.tsx` already has `MotionConfig` and `LazyMotion` — if another app wants to use `@beyo/celebration`, it must also set these up.
  Mitigation: The consuming app must provide `LazyMotion` and `MotionConfig` — this is a peer dependency contract.

## Validation plan

- `pnpm typecheck` (or equivalent workspace typecheck command): zero TypeScript errors across all packages
- Manual smoke test: call `useCelebration().trigger(celebrationPresets.TASK_COMPLETE('Test'))` from a temporary button → confetti fires, text scales up, overlay auto-dismisses after 5s
- Manual test: tap the overlay → dismisses immediately
- Manual test with OS reduced motion enabled: confetti is skipped, text fades in without scaling

## Review log

- `2026-06-22` `david`: Initial plan approved for codex implementation

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
