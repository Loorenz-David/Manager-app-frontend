# PLAN_task_post_handling_slide_ui_20260703

## Metadata

- Plan ID: `PLAN_task_post_handling_slide_ui_20260703`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-07-03T02:00:00Z`
- Last updated at (UTC): `2026-07-03T09:52:03Z`
- Related issue/ticket: `—`
- Intention plan: `—`

## Goal and intent

- Goal: Four changes to the post-handling slide and its components:
  (A) Move `PostHandlingIcon.svg` from the managers-app assets into the `@beyo/tasks` package;
      export it so both the slide page (internal) and managers-app (external) can import from
      the package — no surface-props injection needed.
  (B) Task list cards in `TaskPostHandlingSlidePage` render `PostHandlingIcon` in the type-icon
      slot by passing it directly from the slide page (which now owns the asset).
  (C) The bottom-action label when `state === "pending"` reads **"Complete - pending"**
      (was "Pending - review").
  (D) Filter pills in `TaskPostHandlingHeader` are evenly distributed and fill the full header
      width (no horizontal scroll, equal flex share per pill).
- Business/user intent: The icon belongs to the post-handling domain, so the package should own
  it. This removes the indirection of injecting it through surface props and makes the slide page
  self-contained. The managers-app consumes the icon directly from `@beyo/tasks` for the home
  button.
- Non-goals: Do not add `typeIcon` to `TaskPostHandlingSlideSurfaceProps` — the page imports
  the icon itself. Do not change pill colors (corrections plan Stage 1). Do not touch
  `PostHandlingBottomAction`'s `NotepadText` icon (that is the action-strip icon, not the card
  type icon).

## Scope

- In scope:
  - `packages/tasks/src/vite-env.d.ts` — new file adding `vite-plugin-svgr/client` types so
    the package can use `*.svg?react` imports.
  - Move `PostHandlingIcon.svg` from
    `apps/managers-app/ManagerBeyo-app-managers/src/assets/icons/PostHandlingIcon.svg` →
    `packages/tasks/src/assets/PostHandlingIcon.svg` (new `assets/` directory in the package).
  - `packages/tasks/src/index.ts` — export `PostHandlingIcon` as a named re-export from the
    moved SVG.
  - `packages/tasks/src/components/TaskListCard.tsx` — add optional `typeIcon?` override prop
    (NOTE: also modified by `PLAN_task_list_card_state_pill_override_20260703` Step 2 — apply
    `statePill` and `typeIcon` in a single edit pass).
  - `packages/tasks/src/pages/TaskPostHandlingSlidePage.tsx` — import `PostHandlingIcon`
    directly from `"../assets/PostHandlingIcon.svg?react"` and pass as `typeIcon` to each card.
  - `apps/managers-app/.../features/home/components/HomeView.tsx` — update the `PostHandlingIcon`
    import to come from `@beyo/tasks` instead of the local asset path.
  - `packages/tasks/src/components/PostHandlingBottomAction.tsx` — label string change only.
  - `packages/tasks/src/components/TaskPostHandlingHeader.tsx` — pill layout: full-width, equal
    distribution.
- Out of scope:
  - `surface-ids.ts` — `TaskPostHandlingSlideSurfaceProps` does NOT receive `typeIcon`; the page
    handles the icon internally.
  - Pill color tokens (corrections plan Stage 1).
  - Workers-app.
  - Any page other than `TaskPostHandlingSlidePage`.
- Assumptions:
  - `vite-plugin-svgr` is installed at the repo root `node_modules` (confirmed) and is
    available for Vite to process `?react` SVG imports from any source package.
  - The tasks package tsconfig already declares `"vite/client"` in its `types` array; only the
    `vite-plugin-svgr/client` overlay is missing.
  - `HomeView.tsx` already imports `PostHandlingIcon` from the local asset path (confirmed at
    line 32) — Step 6 updates that import to the package, no new import line needed.

## Clarifications required

_(none — scope fully determined)_

## Acceptance criteria

1. `PostHandlingIcon.svg` no longer exists in
   `apps/managers-app/.../src/assets/icons/`; it lives in `packages/tasks/src/assets/`.
2. `import { PostHandlingIcon } from "@beyo/tasks"` resolves and types correctly in the
   managers-app.
3. Each task card in the post-handling slide shows `PostHandlingIcon` in the type-icon slot.
4. `TaskPostHandlingSlideSurfaceProps` has no `typeIcon` field.
5. When `activeInstance.state === "pending"` the action button reads **"Complete - pending"**.
6. The 3 filter pills are equal-width and together fill the full header row.
7. `npm run typecheck` passes with zero errors.
8. No other `TaskListCard` consumer is affected (`typeIcon` is optional, falls back to
   `TASK_TYPE_ICON[task.task_type]` when absent).

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md`: asset moved into the package that owns the domain;
  package exports it as a named export; app-layer imports are updated accordingly.
- `architecture/35_shared_packages.md §13`: surface props are for openers/callbacks only, not
  for asset components — the package page directly imports its own icon.

### Local extensions loaded

- `task_system/frontend_contract_goal_mapping_guide.md`: reading `TaskListCard.tsx`,
  `TaskPostHandlingSlidePage.tsx`, and `HomeView.tsx` are relational reads to understand
  existing prop shapes and import patterns.

### File read intent — pattern vs. relational

Permitted reads:
- `packages/tasks/src/components/TaskListCard.tsx` — understand icon render line for the override
  (batch with `statePill` plan edit).
- `packages/tasks/src/pages/TaskPostHandlingSlidePage.tsx` — locate `<TaskListCard>` prop block
  to add `typeIcon`.
- `packages/tasks/src/index.ts` — confirm existing export style before adding the named SVG
  re-export.
- `packages/tasks/src/components/PostHandlingBottomAction.tsx` — confirm current label string.
- `packages/tasks/src/components/TaskPostHandlingHeader.tsx` — understand current pill classes.
- `apps/managers-app/.../features/home/components/HomeView.tsx` — locate line 32 (`PostHandlingIcon`
  import) to update the path.

### Skill selection

- Primary skill: `—` (file moves + surgical edits, no architectural patterns)

## Implementation plan

### Step 1 — Create `packages/tasks/src/vite-env.d.ts`

New file — adds the SVG + React module type so `*.svg?react` imports resolve in the package:

```ts
/// <reference types="vite-plugin-svgr/client" />
```

This file is analogous to `apps/managers-app/.../src/vite-env.d.ts` line 2.

### Step 2 — Move the SVG asset

- Create directory `packages/tasks/src/assets/`.
- Copy `apps/managers-app/ManagerBeyo-app-managers/src/assets/icons/PostHandlingIcon.svg`
  → `packages/tasks/src/assets/PostHandlingIcon.svg`.
- Delete the original file at the managers-app path.

### Step 3 — `packages/tasks/src/index.ts`

Add a named re-export so the managers-app (and any future package) can import the icon:

```ts
export { default as PostHandlingIcon } from "./assets/PostHandlingIcon.svg?react";
```

Place it alongside existing component exports (not with type-only exports). No other changes.

### Step 4 — `packages/tasks/src/components/TaskListCard.tsx`

Add `typeIcon` to `TaskListCardProps` alongside `statePill` (apply both in one edit pass with
the companion plan `PLAN_task_list_card_state_pill_override_20260703` Step 2):

```ts
typeIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
```

Destructure it in the component function.

Override the icon selection:

```tsx
const ResolvedTypeIcon: React.ComponentType<React.SVGProps<SVGSVGElement>> =
  (typeIcon as React.ComponentType<React.SVGProps<SVGSVGElement>> | undefined)
  ?? TASK_TYPE_ICON[task.task_type]
  ?? ShoppingBag;
```

Replace the existing `<TypeIcon ...>` JSX to use `<ResolvedTypeIcon ...>`.

If TypeScript raises an assignability error between `LucideIcon` and
`ComponentType<SVGProps<SVGSVGElement>>`, use a conditional render instead:

```tsx
{typeIcon
  ? <typeIcon aria-hidden="true" className="size-4 shrink-0" />  // lowercase alias
  : <TypeIcon aria-hidden="true" className="size-4 shrink-0" />}
```

where `const typeIcon = props.typeIcon` (lowercase alias avoids JSX capitalisation rule).

### Step 5 — `packages/tasks/src/pages/TaskPostHandlingSlidePage.tsx`

Import `PostHandlingIcon` directly at the top of the file (package-relative, no surface props):

```ts
import PostHandlingIcon from "../assets/PostHandlingIcon.svg?react";
```

Inside `controller.tasks.map(...)`, pass `typeIcon` to `<TaskListCard>`:

```tsx
<TaskListCard
  ...
  typeIcon={PostHandlingIcon}
  ...
/>
```

No changes to `useSurfaceProps` or `TaskPostHandlingSlideSurfaceProps`.

### Step 6 — `apps/managers-app/.../features/home/components/HomeView.tsx`

Update line 32: replace the local asset import with the package export:

```ts
// before
import PostHandlingIcon from "@/assets/icons/PostHandlingIcon.svg?react";

// after
import { PostHandlingIcon } from "@beyo/tasks";
```

No other changes to this file.

### Step 7 — `packages/tasks/src/components/PostHandlingBottomAction.tsx`

Change the `isPendingReview` label:

```ts
// before
? "Pending - review"

// after
? "Complete - pending"
```

No other changes to this file.

### Step 8 — `packages/tasks/src/components/TaskPostHandlingHeader.tsx`

**Container div** — remove `overflow-x-auto`:

```tsx
// before
className="flex gap-2 overflow-x-auto pb-1"

// after
className="flex gap-2 pb-1"
```

**Each pill button** — remove `shrink-0`, add `flex-1` and `text-center`:

```tsx
// before
"shrink-0 rounded-full border px-4 py-2 text-sm font-medium capitalize transition"

// after
"flex-1 rounded-full border px-4 py-2 text-center text-sm font-medium capitalize transition"
```

The conditional color classes are intentionally left unchanged — corrections plan Stage 1
replaces them with design tokens separately.

## Risks and mitigations

- Risk: `vite-plugin-svgr/client` not resolvable from the tasks package tsconfig.
  Mitigation: the package's node_modules resolution walks to the root where `vite-plugin-svgr`
  lives; if resolution still fails, add `"vite-plugin-svgr"` to the tsconfig `types` array as
  an alternative.
- Risk: TypeScript assignability clash between `LucideIcon` and
  `ComponentType<SVGProps<SVGSVGElement>>` in `TaskListCard`.
  Mitigation: Step 4 provides a lowercase-alias conditional render fallback that avoids the
  union entirely.
- Risk: Other parts of the managers-app reference `@/assets/icons/PostHandlingIcon.svg` directly.
  Mitigation: search for the path before deleting the original; update any additional import
  sites found.
- Risk: Overlap with `PLAN_task_list_card_state_pill_override_20260703` both editing
  `TaskListCard.tsx`.
  Mitigation: Step 4 is explicitly batched — read the file once, apply `statePill` + `typeIcon`
  together.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual smoke (A): `import { PostHandlingIcon } from "@beyo/tasks"` resolves in the
  managers-app without error.
- Manual smoke (B): each card in the post-handling slide shows `PostHandlingIcon` in the
  icon row.
- Manual smoke (C): a pending-state card bottom button reads "Complete - pending".
- Manual smoke (D): the 3 filter pills are equal-width and fill the header row.

## Review log

_(empty)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `Claude`
