# Stock Report — UI phase (session 1 of 2)

You are building the **complete user interface** of a new feature, and nothing but the interface.
A second session (Codex) runs after you and wires your components to the API, state, realtime and
the three apps. Work in plan mode first: produce a plan for this whole phase, get it approved, then
execute it.

Repo root: `/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend`
Feature folder: `docs/architecture/under_construction/implementation/stock_report/`

## The goal

The authority is **`planning/intention.md` (status RATIFIED)**. It describes a shared package
`@beyo/stock-report` giving the managers, sellers and workers apps the same two screens — a board of
"stock needs" shown one priority bucket at a time, and a detail page for one stock need — plus a
match-warning bottom sheet used while adding an item. Your phase delivers every visual piece of that,
matching the customer-confirmed mockup.

Reading the intention: §12A and §12B are later amendments and **win over earlier sections** where
they differ. Sections you need most: §1, §4 (what each field means), §5 (roles), §6 (screens,
including §6.3 — the owner's deliberate departures from the mockup), §12, §12A (A2, A4–A7), and §12B
rows B7, B10, B12, B17, B19.

## Read first, in this order

1. `planning/intention.md`
2. `ui_design_documentation/README.md`, then `01`–`08`, and both images in
   `ui_design_documentation/snapshot/`. This is the visual authority — sizes, colours, radii, states.
   Where the mockup and intention §6.3 disagree, the intention wins (no sort button, no filter button,
   drag handle only in reorganise mode, no mocked back-arrow bar, category picture instead of the
   CSS-drawn icons).
3. `task_system/frontend_contract_goal_mapping_guide.md` — then resolve and read the contracts it
   routes you to. At minimum: `07_components`, `14_styling`, `27_responsive`, `28_surfaces` (+`_local`),
   `31_animations`, `32_loading_skeletons`, `33_vaul_drawer`, `35_shared_packages`, `17_testing`.
   **Pattern-authority rule:** contracts tell you how to write code; open implementation files only
   to learn what already exists.
4. What exists and you will reuse (read for props, do not copy their internals):
   `packages/ui/src/components/primitives/box-slide-picker/`, `.../search-bar/`,
   `.../confirm-action-button/`, `BackendImage` / `ImagePlaceholder` / `StatePill` / `PullToRefresh`
   in `@beyo/ui`; `packages/tasks/src/components/TaskListCard.tsx` (the assignment card — reuse it
   as-is); `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/TaskCreationFab.tsx`
   (the interaction language your `FabMenu` must reproduce);
   `packages/images/src/components/ImageSortableGrid.tsx` and
   `packages/upholstery/src/pages/UpholsteryReorderSheetPage.tsx` (existing dnd-kit usage).

## What you build

**A. In `@beyo/ui`**
- `FabMenu` primitive: a floating button that expands into action buttons, same motion and
  positioning language as `TaskCreationFab`. Props-driven (`actions[]`, open state handled inside,
  `data-testid`s). Do **not** migrate the two existing FABs.
- If — and only if — `BoxSlidePicker` cannot already express it: an option to render the selected
  value **without** the active fill (the "Unset" pill must look unselected even when active; design
  `03`/`05` state D3). Extend the primitive; never fork it locally.

**B. New package `packages/stock-report/`** — scaffold per `35_shared_packages.md` (package.json
with peers only, tsconfig, `vitest.config.ts`, `src/index.ts`), root `test:stock-report` script and
the root `typecheck` chain entry. Inside it, **pure, prop-driven components** with their prop types
defined beside them (the logic session maps its view models onto your props — intention §12B B17):

- Board: bucket picker row, search row (`SearchBar`, sort **and** filter hidden, placeholder
  `Search stock need...`, value held but inert), divider, `StockNeedCard` (quantity panel with the
  category picture via `BackendImage` + `ImagePlaceholder`, title, property tags, fulfilment bar),
  the list, empty state, card-shaped skeleton, error state. A `StockReportBoardView` composing them,
  wrapped in `<PullToRefresh>` **without** a `scrollRef`, `disabled` when reorganise mode is on.
- Fulfilment bar: the width arithmetic is a **pure function with unit tests** covering design states
  A1–A6 and the clamp (A7): inputs `requested`, `fulfilled`, `inProgress`; remaining floored at 0;
  14 % minimum per coloured segment; 84 % budget while remaining > 0; zero segments absent.
  (The mapping from backend quantities to `fulfilled`/`inProgress` is the logic session's — you take
  the three numbers as props.)
- Property tags: take an already-formatted `string[]`. Do not format criteria yourself.
- Reorganise mode visuals: the drag handle (top-right, touch target ≥ 44 × 44 px), the dragging look
  (accent border, reduced opacity, accent on the picture frame), live reflow with no drop line, and
  the per-card bottom button "Set priority". Build the sortable list **with dnd-kit** — sensors,
  handle-only activation, vertical axis, keyboard sensor — so the *feel* is yours: a touch that starts
  anywhere but the handle must scroll the page, never drag. Expose one callback
  (`onReorder(activeId, toIndex)`), a `disabled` prop (drag off while a reorder is pending), and
  `sortable={false}` for the Unset bucket (no handles there, only "Set priority").
- The FAB on the board (one action today: enter/leave reorganise mode) using `FabMenu`.
- Priority sheet content: four choices (Unset · High · Medium · Low), current one marked.
- Detail: `StockReportDetailView` — summary card (same anatomy as the list card at header scale),
  legend, dashed "Add item" button (rendered only when a `canAssign` prop is true), divider,
  "Selected items · N items" (singular/plural), the assignment list rendering `TaskListCard`, empty
  state, loading skeleton, error state, and the "this stock need no longer exists" notice. **No
  back-arrow header bar** — the slide surface supplies the header. The ⋮ is shown only when an
  `onTapActions` handler is provided (sellers get none).
- This page's actions sheet content: one action, "Remove from stock need", as a
  `ConfirmActionButton` ("Tap again to remove").
- Match-warning sheet content (intention §12A A2, A6, A7; §8.5): a **blocked** view (reason text,
  one button: *Change item*) and a **warning** view (list of `{label, explanation}` lines, two
  buttons: *Change item* / *Continue*), plus the optional note "Checked against the item already
  registered". It receives ready-made text — no reason-code mapping in your components.
- Match status row (rendered later inside the task-creation form by the logic session): three looks —
  checking (spinner + "Checking stock need match…", per `32_loading_skeletons.md` a spinner is right
  here), "mismatch accepted" (quiet, tappable), and nothing.
- A generic "Created — Add another / Done" prompt is **not** yours; leave it to the logic session.
- A fixtures file covering every state in `ui_design_documentation/05-ui-states.md`, and component
  tests for the states that carry logic (bar segments, singular/plural, Unset pill look, handle
  presence by mode, ⋮ presence, Add-item presence).
- `data-testid` on every feature-critical control (`17_testing.md`, `34_runtime_validation_local.md`).

**C. A temporary preview** so the owner can judge the result on a phone: export
`StockReportFixturePreview` from the package (board + a way to open the detail and both sheets' content,
all on fixtures) and mount it as a More-tab page **in the managers app only**, following the six
tab edits in intention §2.1. Mark it clearly temporary in code comments; the logic session replaces
it with the real route entry. Add the package's `@source` line to the managers app `index.css`
(without it the components render unstyled, silently).

## Boundaries — do not cross them

- No data fetching, no query/mutation hooks, no API functions, no Zod response schemas, no socket
  code, no reading of the user's role, no `openSurface` / `useSurface` calls, no controllers or
  providers holding server state. Everything arrives through props; every interaction leaves through
  a callback.
- Do **not** touch `@beyo/task-creation`, `@beyo/tasks`, `@beyo/api-client`, `@beyo/realtime`, the
  workers app or the sellers app. In the managers app touch only what the temporary preview needs.
- Do not register surfaces. Build sheet **content** components; the logic session wraps them in
  surface pages.
- Do not restyle or fork existing primitives; extend them in `@beyo/ui` when the design needs it.
- Use the design tokens from `@beyo/styles` wherever an equivalent of a mockup value exists; keep the
  mockup's literal value only where no token matches, and list those in your handoff.
- Never start a dev server — ask the owner to start it when you need to look at the preview.
- After any `npm install`, if Vite reports "Cannot find native binding", that is the known rolldown /
  lightningcss lockfile issue — report it, do not improvise.

## Done means

1. Everything in A–C exists, typed, exported from `packages/stock-report/src/index.ts` (named exports;
   page-level components only via loaders when the logic session adds them — you export components).
2. `npm run typecheck`, `npm run test:stock-report` and `npm run test:ui` pass from the repo root.
   Report the actual output; if something fails, say so.
3. The checklist in `ui_design_documentation/08-implementation-checklist.md` is walked item by item
   against the preview, with every deliberate deviation traced to intention §6.3.
4. You write **`handoffs/UI_PHASE_HANDOFF.md`** in the feature folder for the logic session:
   every component with its prop type and callbacks, every `data-testid`, the fixtures file, what each
   callback is expected to cause, literal values kept without a token, anything in the design you could
   not express and why, and the exact files of the temporary preview to remove.
5. No commit unless the owner asks.

If the intention and the design documents leave a visual question genuinely open, ask the owner — do
not decide product behaviour. Visual polish decisions inside the documented system are yours.
