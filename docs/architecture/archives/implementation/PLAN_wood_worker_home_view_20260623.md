# PLAN_wood_worker_home_view_20260623

## Metadata

- Plan ID: `PLAN_wood_worker_home_view_20260623`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-23T00:00:00Z`
- Last updated at (UTC): `2026-06-23T08:36:21Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Implement the `WoodWorkerHomeView` for users with the `wood_worker` workspace role. Replace the placeholder component with a fully functional home view that uses the existing `WorkingSectionsHomeProvider` + `WorkingSectionStepsProvider` slide pattern, but renders sections in a custom opinionated layout specific to wood-worker workflows.
- Business/user intent: Wood workers have a predictable set of named sections ("wood fix", "ground oil", "hardwax oil") that should be pinned in a fixed spatial layout for quick access, rather than a generic scrollable list. A "+ New Internal Task" CTA is always present at the top.
- Non-goals: Wiring up the "+ New Internal Task" button interaction (left as a no-op `() => {}`). Creating any new API queries, providers, or route changes.

## Scope

- In scope:
  - Replace the placeholder `WoodWorkerHomeView.tsx` with the full implementation.
  - Add an internal `WoodWorkerSectionsView` component (non-exported) in the same file for the custom layout.
  - Name-based layout classification of sections: "wood fix" → full-width pinned row; "ground oil" / "hardwax oil" → shared two-column row; everything else → standard full-width rows.
- Out of scope:
  - "+ New Internal Task" business logic.
  - Any changes to `WorkingSectionsHomeProvider`, `WorkingSectionStepsProvider`, or `WorkingSectionCard`.
  - Any changes to `HomeInterfaceRouter` or `home-interface-registry.tsx` (already wired).
  - Any new shared components.

- Assumptions:
  - Section name matching is **case-insensitive** (compare `section.name.toLowerCase()`).
  - If only one of the two oil sections is assigned to the user, it renders full-width (single card in a normal row), not in a half-width cell.
  - The oil-section row uses `gap-3` (same as the list gap) with each card filling 50% of the row.
  - `WorkingSectionCard` already accepts `onTap` and renders correctly at any container width — no modifications needed.
  - The `+ New Internal Task` button is always rendered, even when no sections are assigned.

## Clarifications required

_(none — all decisions are captured in Assumptions above)_

## Acceptance criteria

1. Users with `wood_worker` role see the `WoodWorkerHomeView` (verified by `data-testid="home-page-wood-worker"`).
2. `+ New Internal Task` button is visible, full-width, `bg-primary`, `text-card`, `py-3.5`, no crash on tap.
3. If a "wood fix" section is assigned, it appears directly below the button as a full-width card.
4. If both "ground oil" and "hardwax oil" sections are assigned, they share the same row side-by-side (two equal-width cards).
5. If only one oil section is assigned, it renders full-width in its own row.
6. All other sections render in full-width rows below the pinned group.
7. Tapping any `WorkingSectionCard` slides to `WorkingSectionStepsView` (same animation as `StandardWorkerHomeView`).
8. Tapping back in `WorkingSectionStepsView` slides back to the sections list.
9. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/07_components.md`: component conventions, memo, prop naming
- `architecture/14_styling.md`: Tailwind class conventions
- `architecture/23_providers.md`: context provider shell pattern
- `architecture/31_animations.md`: `tabVariants` / `transitions.tab` / `AnimatePresence` slide pattern

### Local extensions loaded

- `architecture/12_auth_local.md`: `WorkspaceRole` enum, `useRole` hook
- `architecture/19_permissions_local.md`: role-based routing conventions

### File read intent — pattern vs. relational

Permitted relational reads:
- `features/home/components/variants/StandardWorkerHomeView.tsx` — understand the slide animation structure to replicate exactly.
- `features/working_sections/components/WorkingSectionsHomeView.tsx` — understand context consumption and scroll registration to reuse the same approach.
- `features/working_sections/components/WorkingSectionCard.tsx` — verify `onTap` prop signature.
- `features/working_sections/types.ts` — verify `WorkingSectionViewModel.name` field type.
- `features/working_sections/providers/WorkingSectionsHomeProvider.tsx` — confirm it is a zero-prop wrapper.
- `features/task_steps/providers/WorkingSectionStepsProvider.tsx` — confirm `sectionId` prop signature.
- `features/task_steps/components/WorkingSectionStepsView.tsx` — confirm `section` + `onBack` prop signatures.

Prohibited pattern reads (contract covers):
- Reading another controller to understand aggregation shape → `08_hooks.md`
- Reading another query hook for TanStack Query setup → `05_server_state.md`

### Skill selection

- Primary skill: `skills/component/SKILL.md`
- Trigger terms: `React component`, `Tailwind`, `framer-motion`
- Excluded alternatives: none

## Implementation plan

### File 1 — `apps/workers-app/ManagerBeyo-app-workers/src/features/home/components/variants/WoodWorkerHomeView.tsx`

**Action:** Full replacement of the placeholder.

**Structure:**

```
WoodWorkerHomeView          ← exported, mirrors StandardWorkerHomeView shell
  WorkingSectionsHomeProvider
    div.relative.h-full.overflow-hidden[data-testid="home-page-wood-worker"]
      AnimatePresence
        when selectedSection === null → m.div key="sections"
          WoodWorkerSectionsView (internal, non-exported)
        when selectedSection !== null → m.div key={`steps-${sectionId}`}
          WorkingSectionStepsProvider
            WorkingSectionStepsView
```

**`WoodWorkerHomeView` implementation:**

Copy the state + animation shell from `StandardWorkerHomeView` verbatim:
- `useState<WorkingSectionViewModel | null>(null)` for `selectedSection`
- `useState(0)` for `direction`
- `handleSelectSection` sets direction 1, sets section
- `handleBack` sets direction -1, clears section
- `AnimatePresence custom={direction} initial={false}` with `tabVariants` / `transitions.tab`

Replace the `WorkingSectionsHomeView` in the first panel with `<WoodWorkerSectionsView onSelectSection={handleSelectSection} />`.

**`WoodWorkerSectionsView` implementation (internal component, same file):**

Props: `{ onSelectSection: (section: WorkingSectionViewModel) => void }`

Consumes `useWorkingSectionsHomeContext()` (same as `WorkingSectionsHomeView`).
Registers scroll element via `useRegisterScrollElement()` (same as `WorkingSectionsHomeView`).
Wraps content in `PullToRefresh` (same as `WorkingSectionsHomeView`).

Layout logic (applied only when `!isPending && !isError && sections.length > 0`):

```ts
const WOOD_FIX = "wood fix";
const OIL_NAMES = ["ground oil", "hardwax oil"];

const woodFixSection   = sections.find(s => s.name.toLowerCase() === WOOD_FIX) ?? null;
const oilSections      = sections.filter(s => OIL_NAMES.includes(s.name.toLowerCase()));
const remainderSections = sections.filter(
  s => s.name.toLowerCase() !== WOOD_FIX && !OIL_NAMES.includes(s.name.toLowerCase())
);
```

Render order inside the scrollable content:

1. **`+ New Internal Task` button** — always first, above any section cards:
   ```tsx
   <div className="px-4 pt-2">
     <button
       className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-card"
       type="button"
       onClick={() => {}}
     >
       + New Internal Task
     </button>
   </div>
   ```

2. **"wood fix" pinned row** — only rendered when `woodFixSection !== null`:
   ```tsx
   <WorkingSectionCard section={woodFixSection} onTap={onSelectSection} />
   ```
   Rendered inside the same `flex flex-col gap-3 py-2` container as the rest — `WorkingSectionCard` already applies `mx-4` so it spans full width naturally.

3. **Oil sections row** — only rendered when `oilSections.length > 0`:
   - If `oilSections.length === 2`: wrap both cards in `<div className="flex gap-3 px-4">` with each card in a `<div className="flex-1 min-w-0">`. Because `WorkingSectionCard` applies `mx-4` internally, the oil row cards must **not** use `WorkingSectionCard` directly with its default margin — instead wrap with a container that cancels the mx-4. 

   **Important implementation note:** `WorkingSectionCard` has a hardcoded `mx-4` class. For the two-column oil row, each card needs to sit flush inside its half-width container. Use a wrapper with `overflow-hidden` and negative margin trick, or — simpler — note that the `mx-4` only adds horizontal margin and the card will still be visible, just slightly narrower. Accept this as the current behavior; the `WorkingSectionCard` layout contract is not to be modified in this plan. The outer `px-4 gap-3 flex` row is omitted; instead use `gap-3 mx-4 flex` so the cards themselves contribute their own internal padding:

   ```tsx
   // when oilSections.length === 2
   <div className="mx-4 flex gap-3">
     {oilSections.map(section => (
       <div key={section.sectionId} className="flex-1 min-w-0 overflow-hidden rounded-xl">
         <WorkingSectionCard section={section} onTap={onSelectSection} />
       </div>
     ))}
   </div>
   ```
   Note: `WorkingSectionCard` has `mx-4` which will conflict inside a flex-1 container. To avoid this, wrap each card in a container and use CSS `transform` — but the cleanest approach given the non-modification constraint: render the cards in the `mx-4 flex gap-3` wrapper and let the `mx-4` on each card be negated by adding `-mx-4` wrapper around the inner div. Final approach:

   ```tsx
   // when oilSections.length === 2
   <div className="flex gap-3 px-4">
     {oilSections.map(section => (
       <div key={section.sectionId} className="flex-1 min-w-0">
         {/* WorkingSectionCard has mx-4; we override by wrapping in -mx-4 */}
         <div className="-mx-4">
           <WorkingSectionCard section={section} onTap={onSelectSection} />
         </div>
       </div>
     ))}
   </div>
   ```
   This means each oil card's `mx-4` is cancelled by the `-mx-4` on the wrapper, so the card fills its `flex-1` cell edge-to-edge.

   - If `oilSections.length === 1`: render the single card normally (no wrapper div needed — it falls through to the standard single-row rendering in `remainderSections` pre-filter, but since we've already separated it out, render it as a standalone full-width card using the normal `WorkingSectionCard` call).

4. **Remainder sections** — one `WorkingSectionCard` per row, same as `WorkingSectionsHomeView`.

Full pending/error/empty states mirror `WorkingSectionsHomeView` exactly (same class names, same `data-testid` values).

**Imports needed (same file):**

```ts
import { useState, useEffect, useRef } from "react";
import { AnimatePresence, m } from "framer-motion";
import { tabVariants, transitions } from "@beyo/lib";
import { PullToRefresh } from "@beyo/ui";
import { useRegisterScrollElement } from "@/providers/AppScrollElementProvider";
import {
  WorkingSectionsHomeProvider,
  useWorkingSectionsHomeContext,
} from "../../../working_sections";
import type { WorkingSectionViewModel } from "../../../working_sections";
import { WorkingSectionCard } from "../../../working_sections/components/WorkingSectionCard";
import {
  WorkingSectionStepsProvider,
  WorkingSectionStepsView,
} from "../../../task_steps";
```

> Verify `WorkingSectionCard` is exported from `../../../working_sections/components/WorkingSectionCard` and not re-exported from the feature index. If it is in the index, prefer the index import.

## Risks and mitigations

- Risk: `WorkingSectionCard` has a hardcoded `mx-4` class that creates layout tension inside the two-column oil row.
  Mitigation: Use a `-mx-4` wrapper div around each card in the oil row to cancel the built-in margin. This is a one-off layout trick local to this component — no modification to `WorkingSectionCard` required.

- Risk: Section name matching is fragile (server-supplied string).
  Mitigation: Use `.toLowerCase()` comparison. Document the assumption in a code comment on the constants. Out of scope for this plan: lifting the names to an enum or server-supplied category field.

- Risk: Oil section count assumptions (always 0, 1, or 2 — never 3).
  Mitigation: `filter` by the two specific names; the array can only ever have 0–2 entries given those names are unique.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual: navigate to home as `wood_worker` user — confirm pinned layout renders correctly.
- Manual: tap "wood fix" card → slides to `WorkingSectionStepsView` → back button returns to sections list.
- Manual: tap any oil card → same slide behavior.
- Manual: tap "+ New Internal Task" → no crash.

## Review log

- `2026-06-23T08:36:21Z`: Implemented the wood-worker home view, wrote summary, and verified `npm run typecheck` passes.

## Lifecycle transition

- Current state: `archived`
- Next state: —
- Transition owner: Codex
