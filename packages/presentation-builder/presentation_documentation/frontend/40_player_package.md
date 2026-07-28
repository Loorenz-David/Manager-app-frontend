# 40 — `@beyo/presentations` (phone player)

`packages/presentations/` — everything a phone app needs to receive, show, and record
an announcement. Consumes runtime (doc 10) for schemas + rendering; knows **nothing**
about which app hosts it (the host injects `appKey`, `canAutoShow`, surface openers,
and `navigate` — doc 41).

## Orchestration core

| File | Role | Touch when… |
|---|---|---|
| `src/ActivePresentationProvider.tsx` | **The brain.** Watches `useActivePresentation(appKey)`; when a presentation exists, `canAutoShow` is true, nothing is currently open, and it isn't suppressed → picks the opener by `presentation_type` and opens the surface. Owns the view-state choreography (`shown` on open, `progressed` per furthest slide — monotonic via ref, terminal `dismissed`/`completed` exactly once) and suppression (a failed/closed presentation id won't reopen until it leaves `/active`). Dedupe/terminal guards are all refs — read them before touching. | Auto-show policy, reopen rules, view-state semantics. Its test file covers deferral / home-release / mid-show / boot-race — extend it. |
| `src/api/active-presentation.ts` | `GET /active?app_key=…` query + `activePresentationKeys` (invalidation target for realtime and focus refresh) | Fetch/caching of the active announcement. |
| `src/actions/useRecordViewState.ts` | `POST view-state` (`recordPresentationViewState`) — actions `shown`/`progressed`/`dismissed`/`completed` | Recording payloads. Loop integration test: `src/api/view-state-loop.test.tsx`. |
| `src/types.ts` | Consumer Zod schemas (`ConsumerPresentationSchema`, envelopes). **Lenient by contract**: `category` nullable, slide `sequence_order` nonnegative, and slide `background_color` nullable + optional so older/cached payloads may omit it. A parse failure here is *silent* — the player just never opens — so any schema tightening needs a live-payload check first. | Backend consumer payload changes. |
| `src/playback/usePresentationPlayback.ts` | Slide advancement over the runtime clock. **The deck loops until the user quits**: the last slide wraps to the first and bumps `loopCount`; the callback (`onFirstLoopComplete`) fires exactly once, when the first pass wraps. Every slide auto-advances on `duration_ms` — authored `manual` slides and null/0 durations fall back to `DEFAULT_SLIDE_DURATION_MS` (4000), because a slide that waits for a tap would stall the loop and never unlock the exits. `media_driven` slides still follow the real `<video>` (attach via `attachMediaContainer`). Owns `isPaused`/`togglePause` (holds clock *and* video; survives slide navigation) and `previous`, which restarts the current slide on index 0 rather than leaving the deck. Playhead state is `{index, loop, seq}` — `seq` increments on every move so a one-slide deck still re-arms its clock. | Timing/advancement, loop, pause behavior. |
| `src/realtime/presentation-socket-events.ts` | Typed socket events `app_update_presentation:published` / `:archived` (payload `{client_id, logical_client_id, version}`, **no envelope**; room `workspace:{workspace_id}`) + `invalidateActivePresentationQueries` — the invalidation-only helper hosts register (V3 resolution: sockets only invalidate; React Query refetches; provider reacts) | Realtime contract. Host wiring is doc 41. |

## Presentation UI

| File | Role |
|---|---|
| `src/PresentationPlayer.tsx` | The deck: composes playback hook + runtime `SlideCompositionRenderer` + kit chrome, passing each slide's nullable/optional `background_color` through as the renderer background. Owns the **exit matrix** (below) and the CTA/footer stacking (once the footer is up, the slide CTA renders inside it via `above`). Parity-tested against the runtime fixture (`PresentationPlayer.parity.test.tsx`). |
| `src/components/player/` | Props-only kit (read-only styling, same rule as doc 22): `PlayerViewport` (render-prop width measurement → renderer scale), `PlayerSegmentedProgress`, `PlayerAffordances` (`PlayerDismissButton` x/skip, `PlayerCtaButton`, `PlayerAcknowledgeFooter` + `above` slot, `PlayerTapZones` 30/40/30 prev–pause–next, `PlayerPausedIndicator`), `PlayerFrames` (modal / full-screen frames). Showcase: `src/dev/PlayerKitPreview.tsx` → studio `/kit/player`. |
| `src/surfaces/` | One surface per `presentation_type` + shared `presentation-surface-props.ts` and `usePresentationSurface.ts`. **Dismiss-chrome matrix**: `modal` → X button; `full_screen` → Skip; `slide_page` → the host `SlidePageSurface`'s built-in slide-to-close gesture *is* the dismiss affordance. `is_dismissible: false` → slide-page calls `setSwipeDismissDisabled(true)` **until the first loop completes**, then unlocks it with a plain-close interceptor. Tested in `presentation-surfaces.test.tsx`. |
| `src/surface-ids.ts` | Surface id constants, `PresentationsSurfaceOpeners` type (the host-injection contract), and `preload*Surface` loaders — **named exports mapped to `default`** for lazy hosts (9a decision: no default exports in the package itself). |

## Loop & exit matrix (the page behaviour)

The deck plays **Instagram-style and loops forever**; the user leaves it deliberately.

| Moment | Tap left 30% | Tap centre 40% | Tap right 30% | Ways out |
|---|---|---|---|---|
| During loop 1 | previous slide (restarts slide 0) | pause / resume | next slide | `modal` X and `full_screen` Skip **only if `is_dismissible`** → records `dismissed`, closes. Non-dismissible decks have **no exit at all**. |
| Loop 1 wraps | — | — | — | `completed` is recorded **once, in the background** — it must not close the surface. |
| After loop 1 | same | same | same | Footer **Close** button (all three types) + slide-page swipe + the existing X/Skip — all now **plain closes that record nothing**. |

Why `completed` can't be re-used as the exit: it's terminal backend-side, so a later
`dismissed` returns `409`. The player therefore separates `onComplete` (record only) from
`onClose` (close only); only `onDismiss` still does both. A surface that wires `onComplete`
back into `closeAfter` re-breaks the loop.

## Upstream / downstream

- **Upstream:** runtime (schemas/renderer/clock), `@beyo/api`, backend consumer
  contract, `@beyo/ui` `SlidePageSurface` capabilities (swipe-dismiss controller).
- **Downstream:** the three phone apps' four glue files each (doc 41). The package
  index (`src/index.ts`) is the contract line — hosts import nothing deeper.

## Invariants

- The frontend implements **zero eligibility logic** — no audience, priority, or
  seen-filtering here, ever. `/active` returns at most one; the provider shows it.
- `canAutoShow` is a reactive prop; the provider must handle it flipping mid-flight
  (deferral then release) — that's tested behavior, not incidental.
- View-state actions are monotonic and terminal-once.
