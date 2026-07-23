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
| `src/playback/usePresentationPlayback.ts` | Slide advancement over the runtime clock: timed slides use `duration_ms` (default 4000), video slides follow the actual `<video>` element (attach via `attachMediaContainer`), manual mode waits for taps; `onReachedEnd` fires once | Timing/advancement behavior. |
| `src/realtime/presentation-socket-events.ts` | Typed socket events `app_update_presentation:published` / `:archived` (payload `{client_id, logical_client_id, version}`, **no envelope**; room `workspace:{workspace_id}`) + `invalidateActivePresentationQueries` — the invalidation-only helper hosts register (V3 resolution: sockets only invalidate; React Query refetches; provider reacts) | Realtime contract. Host wiring is doc 41. |

## Presentation UI

| File | Role |
|---|---|
| `src/PresentationPlayer.tsx` | The deck: composes playback hook + runtime `SlideCompositionRenderer` + kit chrome, passing each slide's nullable/optional `background_color` through as the renderer background. Parity-tested against the runtime fixture (`PresentationPlayer.parity.test.tsx`). |
| `src/components/player/` | Props-only kit (read-only styling, same rule as doc 22): `PlayerViewport` (render-prop width measurement → renderer scale), `PlayerSegmentedProgress`, `PlayerAffordances` (`PlayerDismissButton` x/skip, `PlayerCtaButton`, `PlayerAcknowledgeFooter`, `PlayerTapZones`), `PlayerFrames` (modal / full-screen frames). Showcase: `src/dev/PlayerKitPreview.tsx` → studio `/kit/player`. |
| `src/surfaces/` | One surface per `presentation_type` + shared `presentation-surface-props.ts` and `usePresentationSurface.ts`. **Dismiss-chrome matrix**: `modal` → X button; `full_screen` → Skip; `slide_page` → the host `SlidePageSurface`'s built-in slide-to-close gesture *is* the dismiss affordance. `is_dismissible: false` → slide-page calls `setSwipeDismissDisabled(true)` and all types show only the acknowledge footer (records `completed`). Tested in `presentation-surfaces.test.tsx`. |
| `src/surface-ids.ts` | Surface id constants, `PresentationsSurfaceOpeners` type (the host-injection contract), and `preload*Surface` loaders — **named exports mapped to `default`** for lazy hosts (9a decision: no default exports in the package itself). |

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
