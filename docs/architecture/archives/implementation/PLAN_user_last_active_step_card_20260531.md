# PLAN_user_last_active_step_card_20260531

## Metadata

- Plan ID: `PLAN_user_last_active_step_card_20260531`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-05-31T00:00:00Z`
- Last updated at (UTC): `2026-05-31T08:22:08Z`
- Related handoffs:
  - `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_user_last_active_step_record_20260529.md`
  - `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_working_section_steps_enhancements_20260529.md`
  - `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_auto_pause_on_working_transition_20260529.md`
- Intention plan: `docs/architecture/under_construction/intention/building_workers_app.md`

---

## Domain schemas consulted

- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/types.ts`: `TaskStep`, `TaskStepSchema`, `LastStateRecord`, `LastStateRecordSchema`, `StepState`, `UserRefSchema`, `ListWorkingSectionStepsParams`, `TaskStepCardViewModel`, `toTaskStepCardViewModel`, `STEP_QUICK_TRANSITION`, `STEP_TERMINAL_STATES`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/api/task-step-keys.ts`: `taskStepKeys` factory — `all`, `sectionLists()`, `sectionList(params)`, `sectionListsBySection(sectionId)`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surface-ids.ts`: `TASK_STEP_DETAIL_SURFACE_ID = "task-step-detail-slide"`, `TaskStepDetailSurfaceProps { stepId, taskId, workingSectionId }`, `IMAGE_VIEWER_SURFACE_ID` from `@beyo/images`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/actions/use-transition-step-state.ts`: existing mutation structure — `patchStepStateInSectionCache`, `buildOptimisticStateRecord`, `TransitionInput` type
- `apps/workers-app/ManagerBeyo-app-workers/src/app/AppShell.tsx`: `flex h-dvh flex-col overflow-hidden bg-background` layout, `TabBadgeCountsProvider`, `main#main-content`, `BottomTabBar`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/WorkingSectionStepsView.tsx`: `scrollRef` from `useRef<HTMLDivElement>` passed to `PullToRefresh scrollRef`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/TaskStepActionButton.tsx`: `TickingTimer` from `@beyo/ui`, `Pause`/`Play` from `lucide-react`, `STEP_QUICK_TRANSITION`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/detail/TaskStepCircularActionButton.tsx`: circular button pattern — `size-24 rounded-full`, `bg-[var(--color-soft-container)]` / `bg-primary text-card`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/api/fetch-working-section-steps.ts`: `ApiEnvelopeSchema` from `@beyo/lib`, `apiClient` from `@beyo/api-client`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/index.ts`: current public API exports
- `packages/ui/src/components/primitives/scroll-visibility/`: `ScrollVisibilityProvider { scrollElement: HTMLElement | null, children }`, `useScrollVisibilityContext()`, `useScrollVisibility()`, `ScrollVisibilityContext` (throws if called outside provider)

---

## Selected contracts

Read order (canonical first, local extension second):

- `architecture/01_architecture.md` + `01_architecture_local.md`: layer map, hard dependency rules, folder structure, `route-entry.tsx` pattern for primary tab routes
- `architecture/02_types.md`: TypeScript strict mode, Zod at every data boundary, `z.infer` rule
- `architecture/04_api_client.md` + `04_api_client_local.md`: `apiClient` usage, `ApiEnvelopeSchema` pattern, flat error shape override
- `architecture/05_server_state.md`: query key factories, query hooks, optimistic update lifecycle (`onMutate → onSuccess → onError → onSettled`), cache invalidation rules
- `architecture/08_hooks.md`: action hook pattern (one `useMutation`, full optimistic lifecycle), controller hook pattern (aggregate queries + actions → typed object)
- `architecture/14_styling.md`: `cn()`, `cva`, Tailwind utility classes, CSS variables (`--color-primary`, `--color-card`)
- `architecture/15_feature_structure.md`: folder layout, `index.ts` public API boundary
- `architecture/16_feature_workflow.md`: build order — Types → Keys → API → Actions → Controllers → Providers → Components
- `architecture/23_providers.md`: provider exports `Provider` component + context consumer hook; context initialized to `null`; consumer throws if called outside provider
- `architecture/24_dto.md`: Response DTO parsed in API function with Zod; View Model computed in controller; never parsed in component
- `architecture/07_components.md`: feature components consume context hook only; no logic layer imports; named exports only; no nested component definitions
- `architecture/31_animations.md`: `m` from `framer-motion`, `AnimatePresence`, animation tokens from `@/lib/animation`, `reducedMotion="user"` mandatory

Applied precedence: local extensions (`_local.md`) override canonical for this app.

---

## Goal and intent

- **Goal:** Add `user_last_active_step_record` query infrastructure, extend the state transition mutation to optimistically update it, and render a persistent floating card in `AppShell` that shows the user's currently active step.
- **Business/user intent:** Workers can instantly see which step they're actively working on from any tab without navigating back to the Tasks view. They can pause/resume from the card and tap through to the detail page.
- **Non-goals:** WebSocket integration (the backend emits `task:step-state-changed` events but there is no existing WebSocket implementation in this app; correctness is achieved via `onSettled` refetch). No new backend endpoints — the backend already delivers the full `TaskStep` shape from `GET /api/v1/working-sections/steps/user-last-active`.

---

## Scope

- **In scope:**
  - Update `LastStateRecordSchema` with new additive fields (`last_action_by`, `first_started_at`)
  - Update `ListWorkingSectionStepsParams` with new query param (`record_step_state`)
  - New query key `taskStepKeys.userLastActive()`
  - New API function + query hook for `GET /api/v1/working-sections/steps/user-last-active`
  - Extend `useTransitionStepState` mutation to also optimistically patch + roll back + invalidate the `userLastActive` cache
  - New controller `useLastActiveStepCardController`
  - New provider `LastActiveStepCardProvider` + `useLastActiveStepCardContext`
  - New floating card component `LastActiveStepCard`
  - AppShell wiring: `AppScrollElementProvider` (new) + `LastActiveStepCardProvider` + `LastActiveStepCard`
  - `WorkingSectionStepsView` registers its scroll element so the card reacts to scroll
  - Update `index.ts` to export new provider

- **Out of scope:**
  - Filtering the step list by `record_step_state` in the existing UI (the param is declared in types for future use)
  - Using `last_action_by` / `first_started_at` in the step list UI (declared in schema, UI usage deferred)
  - WebSocket listener for cross-tab auto-pause events

- **Assumptions:**
  - `@beyo/lib` exports `ApiEnvelopeSchema` — same as used in `fetch-working-section-steps.ts`
  - `@beyo/api-client` exports `apiClient` — same as all existing API functions
  - `@beyo/ui` exports `TickingTimer`, `ImagePlaceholder`, `ScrollVisibilityProvider`, `useScrollVisibilityContext`
  - `@beyo/images` exports `IMAGE_VIEWER_SURFACE_ID`, `ImageAnnotationSvgLayer`, `ImageAnnotationSchema`, `toImageAnnotationViewModels`
  - `@beyo/hooks` exports `useSurface`
  - The `PullToRefresh` component in `WorkingSectionStepsView` attaches the scroll listener to the element at `scrollRef.current` — that element is the one to register for scroll visibility

---

## Clarifications required

_(none — all required information resolved in pre-plan research)_

---

## Acceptance criteria

1. `GET /api/v1/working-sections/steps/user-last-active` is called once on first page load and its result is in the TanStack Query cache under `taskStepKeys.userLastActive()`.
2. When the user taps any step's play/pause button, the `LastActiveStepCard` updates its displayed state within the same render frame (optimistic update), before the network response returns.
3. When the user taps a DIFFERENT step to `working`, the floating card switches to show that step immediately (optimistic), then settles on the server-confirmed state after `onSettled` refetch.
4. On mutation error, both the section list and the `userLastActive` cache roll back to their previous state and a toast error appears.
5. The `LastActiveStepCard` is visible above the `BottomTabBar` on all five tabs when the user has an active step (`working`, `paused`, or `ended_shift`).
6. The card is absent when `user_last_active_step_record` is `null`.
7. Scrolling down in the Tasks step list slides the card down behind the tab bar; scrolling up reveals it again.
8. Tapping the card body opens the task detail slide surface.
9. Tapping the image opens the image viewer surface with the first image.
10. Tapping the circular pause/play button fires the state transition without opening the detail page.
11. `npm run typecheck` passes with zero errors.

---

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: query key factory pattern, optimistic update four-hook lifecycle
- `architecture/08_hooks.md`: action hook rules, controller hook rules
- `architecture/23_providers.md`: provider + context consumer hook pattern
- `architecture/07_components.md`: feature component rules — consume context only, no logic layer imports
- `architecture/31_animations.md`: `m.div`, `AnimatePresence`, animation tokens

### File read intent — pattern vs. relational

Permitted reads (relational — understanding what already exists):

- `types.ts`: field names and Zod schemas (required to match)
- `api/task-step-keys.ts`: existing key structure to extend
- `actions/use-transition-step-state.ts`: existing mutation callbacks to extend
- `surface-ids.ts`: exact surface ID constants
- `index.ts`: current exports to extend
- `app/AppShell.tsx`: current layout structure
- `components/WorkingSectionStepsView.tsx`: where `scrollRef` lives
- `components/TaskStepActionButton.tsx` / `TaskStepCircularActionButton.tsx`: icon, timer, button pattern to replicate
- `packages/ui/.../scroll-visibility/*`: exact API of `ScrollVisibilityProvider` and `useScrollVisibilityContext`

Prohibited (pattern reads — contract already covers):

- Reading another query hook to understand TanStack Query setup → `05_server_state.md`
- Reading another action hook to understand `onMutate` shape → `08_hooks.md`
- Reading another provider to understand context shell → `23_providers.md`
- Reading another controller to understand aggregation shape → `08_hooks.md`

---

## Implementation plan

### Step 1 — Extend `types.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/types.ts`

**1a. Extend `LastStateRecordSchema`** — add two optional fields that the backend now returns on every `last_state_record`. These are additive; no existing consumers break.

Replace the current `LastStateRecordSchema` definition:

```ts
// BEFORE
export const LastStateRecordSchema = z.object({
  state: StepStateSchema,
  entered_at: z.string(),
  exited_at: z.string().nullable(),
});
export type LastStateRecord = z.infer<typeof LastStateRecordSchema>;
```

With:

```ts
// AFTER
export const LastStateRecordSchema = z.object({
  state: StepStateSchema,
  entered_at: z.string(),
  exited_at: z.string().nullable(),
  last_action_by: UserRefSchema.nullable().optional(), // NEW — user who created this record
  first_started_at: z.string().nullable().optional(), // NEW — earliest entered_at across all records for this step
});
export type LastStateRecord = z.infer<typeof LastStateRecordSchema>;
```

**1b. Extend `ListWorkingSectionStepsParams`** — add the new optional filter param.

```ts
// AFTER
export type ListWorkingSectionStepsParams = {
  working_section_id: WorkingSectionId;
  q?: string;
  upholstery_search?: boolean;
  limit?: number;
  offset?: number;
  record_step_state?: string; // NEW — comma-separated StepState values, e.g. "working,paused"
};
```

**1c. Fix `patchStepStateInSectionCache` parameter type** — after the schema extension, the inline `stateRecord` parameter type must be updated to accept the full `LastStateRecord` type (which now includes optional fields). Change the inline type to `LastStateRecord`:

```ts
// BEFORE (in use-transition-step-state.ts — addressed in Step 4, but caused by types change here)
stateRecord: {
  state: StepState;
  entered_at: string;
  exited_at: string | null;
}

// AFTER
stateRecord: LastStateRecord;
```

> Note: this change happens in `use-transition-step-state.ts` (Step 4), not in `types.ts`. Documenting here to clarify the downstream effect.

**No other changes in `types.ts`** — the `user_last_active_step_record` response shape is exactly `TaskStep | null`, so no new schema is needed here. The existing `TaskStepSchema` covers it.

---

### Step 2 — Extend `task-step-keys.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/api/task-step-keys.ts`

Add one new key entry for the `user-last-active` endpoint. This key has no parameters because the endpoint has none — it returns a per-authenticated-user result.

```ts
// AFTER
export const taskStepKeys = {
  all: ["task-steps"] as const,
  sectionLists: () => [...taskStepKeys.all, "section-list"] as const,
  sectionList: (params: ListWorkingSectionStepsParams) =>
    [
      ...taskStepKeys.sectionLists(),
      params.working_section_id,
      { q: params.q, limit: params.limit, offset: params.offset },
    ] as const,
  sectionListsBySection: (sectionId: WorkingSectionId) =>
    [...taskStepKeys.sectionLists(), sectionId] as const,
  userLastActive: () => [...taskStepKeys.all, "user-last-active"] as const, // NEW
};
```

---

### Step 3 — New API function: `fetch-user-last-active-step.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/api/fetch-user-last-active-step.ts`

Create this file. Follow the same pattern as `fetch-working-section-steps.ts`.

```ts
import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { TaskStepSchema, type TaskStep } from "../types";

const ResponseDataSchema = z.object({
  user_last_active_step_record: TaskStepSchema.nullable(),
});

export async function fetchUserLastActiveStep(): Promise<TaskStep | null> {
  const envelope = await apiClient.get(
    "/api/v1/working-sections/steps/user-last-active",
    ApiEnvelopeSchema(ResponseDataSchema),
  );
  return envelope.data.user_last_active_step_record;
}
```

---

### Step 4 — New query hook: `use-user-last-active-step.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/api/use-user-last-active-step.ts`

Create this file. The query runs unconditionally — always enabled once the user is authenticated (i.e., this hook is called from an authenticated part of the app).

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchUserLastActiveStep } from "./fetch-user-last-active-step";
import { taskStepKeys } from "./task-step-keys";
import type { TaskStep } from "../types";

export function useUserLastActiveStepQuery() {
  return useQuery<TaskStep | null>({
    queryKey: taskStepKeys.userLastActive(),
    queryFn: fetchUserLastActiveStep,
  });
}
```

---

### Step 5 — Extend `use-transition-step-state.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/actions/use-transition-step-state.ts`

This is the most complex change. The existing mutation must now manage two caches simultaneously: the section list cache (already handled) and the `userLastActive` cache (new).

**5a. Update imports** — add `TaskStep` and `taskStepKeys.userLastActive`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notify, type WorkingSectionId } from "@beyo/lib";
import { workerWorkingSectionKeys } from "../../working_sections/api/working-section-keys";
import { transitionStepState } from "../api/transition-step-state";
import { taskStepKeys } from "../api/task-step-keys";
import {
  STEP_TERMINAL_STATES,
  type LastStateRecord,
  type StepState,
  type TaskStep, // NEW
  type TaskStepsPagination,
  type TransitionStepStateInput,
} from "../types";
```

**5b. Update `patchStepStateInSectionCache` parameter type** — change the `stateRecord` inline type to `LastStateRecord` to accommodate the newly optional fields:

```ts
function patchStepStateInSectionCache(
  queryClient: ReturnType<typeof useQueryClient>,
  workingSectionId: WorkingSectionId,
  stepId: string,
  newState: StepState,
  stateRecord: LastStateRecord, // was: { state: StepState; entered_at: string; exited_at: string | null }
) {
  // ... body unchanged
}
```

**5c. Update `buildOptimisticStateRecord` return type** — return `LastStateRecord`. The optional fields are simply absent, which is valid with `exactOptionalPropertyTypes`:

```ts
function buildOptimisticStateRecord(newState: StepState): LastStateRecord {
  return {
    state: newState,
    entered_at: new Date().toISOString(),
    exited_at: null,
    // last_action_by and first_started_at intentionally absent — optional fields
  };
}
```

**5d. Add `patchOptimisticLastActiveStep` helper** — pure function that derives the new `user_last_active_step_record` cache value from the transition inputs. Lives at module level alongside the other helper functions.

```ts
const LAST_ACTIVE_STATES = new Set<StepState>([
  "working",
  "paused",
  "ended_shift",
]);

function patchOptimisticLastActiveStep(
  current: TaskStep | null | undefined,
  sectionListLookup: (stepId: string) => TaskStep | undefined,
  step_id: string,
  new_state: StepState,
  now: string,
): TaskStep | null {
  if (new_state === "working") {
    // Any step transitioning to `working` becomes the new last active.
    // Prefer data from the section list cache (complete, fresh) over the
    // current last active (may be a different step).
    const base =
      sectionListLookup(step_id) ??
      (current?.client_id === step_id ? current : null);

    if (!base) {
      // Step not found in any cache — can't derive. Let onSettled refetch resolve it.
      return current ?? null;
    }

    return {
      ...base,
      state: "working",
      last_state_record: base.last_state_record
        ? {
            ...base.last_state_record,
            state: "working",
            entered_at: now,
            exited_at: null,
          }
        : {
            state: "working",
            entered_at: now,
            exited_at: null,
          },
    };
  }

  // Transitioning a DIFFERENT step to a non-working state — no change to last active.
  if (current?.client_id !== step_id) {
    return current ?? null;
  }

  // Transitioning the CURRENT last active step to a terminal state.
  // We don't know which paused/ended_shift record becomes the new last active.
  // Keep the current card visible (don't flicker to null); onSettled refetch
  // will replace it with the correct record from the server.
  if (!LAST_ACTIVE_STATES.has(new_state)) {
    return current ?? null;
  }

  // Transitioning the CURRENT last active step to paused or ended_shift.
  return {
    ...current,
    state: new_state,
    last_state_record: current.last_state_record
      ? {
          ...current.last_state_record,
          state: new_state,
          entered_at: now,
          exited_at: null,
        }
      : {
          state: new_state,
          entered_at: now,
          exited_at: null,
        },
  };
}
```

**5e. Update `useTransitionStepState` mutation callbacks** — extend `onMutate`, `onError`, and `onSettled`:

```ts
export function useTransitionStepState() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      working_section_id: _sectionId,
      ...input
    }: TransitionInput) => transitionStepState(input),

    onMutate: async ({ step_id, new_state, working_section_id }) => {
      // ── Cancel in-flight queries for both affected caches ──────────────────
      await queryClient.cancelQueries({
        queryKey: taskStepKeys.sectionListsBySection(working_section_id),
      });
      await queryClient.cancelQueries({
        queryKey: taskStepKeys.userLastActive(),
      });

      // ── Snapshot both caches for rollback ──────────────────────────────────
      const previousSectionLists =
        queryClient.getQueriesData<TaskStepsPagination>({
          queryKey: taskStepKeys.sectionListsBySection(working_section_id),
        });

      const previousLastActive = queryClient.getQueryData<TaskStep | null>(
        taskStepKeys.userLastActive(),
      );

      // ── Patch section list cache (existing logic) ──────────────────────────
      patchStepStateInSectionCache(
        queryClient,
        working_section_id,
        step_id,
        new_state,
        buildOptimisticStateRecord(new_state),
      );

      // ── Patch userLastActive cache (new) ───────────────────────────────────
      const now = new Date().toISOString();

      // Build a lookup function that searches ALL cached section lists,
      // not just the one for working_section_id. This handles the case
      // where the user taps a step in a different section's cached list.
      const sectionListLookup = (
        targetStepId: string,
      ): TaskStep | undefined => {
        const allSectionLists = queryClient.getQueriesData<TaskStepsPagination>(
          {
            queryKey: taskStepKeys.sectionLists(),
          },
        );
        for (const [, data] of allSectionLists) {
          if (!data) continue;
          const found = data.items.find((s) => s.client_id === targetStepId);
          if (found) return found;
        }
        return undefined;
      };

      queryClient.setQueryData<TaskStep | null>(
        taskStepKeys.userLastActive(),
        patchOptimisticLastActiveStep(
          previousLastActive,
          sectionListLookup,
          step_id,
          new_state,
          now,
        ),
      );

      return { previousSectionLists, previousLastActive };
    },

    onSuccess: (data, variables) => {
      // Patch the section list with the authoritative server response
      // (real timestamps, exact state record). Unchanged from before.
      patchStepStateInSectionCache(
        queryClient,
        variables.working_section_id,
        data.step_id,
        data.new_state,
        data.last_state_record,
      );
      // userLastActive is NOT patched here — the mutation response only contains
      // { step_id, new_state, last_state_record }, not the full TaskStep shape
      // the cache holds. onSettled refetch returns the authoritative full step.
    },

    onError: (_err, _input, context) => {
      // Roll back section list (existing)
      context?.previousSectionLists.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });

      // Roll back userLastActive (new)
      queryClient.setQueryData(
        taskStepKeys.userLastActive(),
        context?.previousLastActive ?? null,
      );

      notify.error(
        "Action failed",
        "Step state could not be changed. Your changes have been reverted.",
      );
    },

    onSettled: (_data, _err, { working_section_id }) => {
      void queryClient.invalidateQueries({
        queryKey: taskStepKeys.sectionListsBySection(working_section_id),
      });
      void queryClient.invalidateQueries({
        queryKey: workerWorkingSectionKeys.mine(),
      });
      void queryClient.invalidateQueries({
        // NEW
        queryKey: taskStepKeys.userLastActive(),
      });
    },
  });

  return {
    transitionStepState: mutation.mutate,
    transitionStepStateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    pendingStepId: mutation.isPending ? mutation.variables?.step_id : null,
    error: mutation.error,
  };
}
```

---

### Step 6 — New AppShell-level scroll element provider

The `LastActiveStepCard` needs to react to scroll events inside individual tab views. The `ScrollVisibilityProvider` API requires an `HTMLElement` reference. Because the scroll element lives inside child tab routes (not AppShell), we need a registry pattern: tab views register their scroll element; the AppShell wraps with `ScrollVisibilityProvider` using the registered element.

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/providers/AppScrollElementProvider.tsx`

```tsx
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { ScrollVisibilityProvider } from "@beyo/ui";

type AppScrollElementContextValue = {
  registerScrollElement: (el: HTMLElement | null) => void;
};

const AppScrollElementContext =
  createContext<AppScrollElementContextValue | null>(null);

export function AppScrollElementProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);

  const registerScrollElement = useCallback((el: HTMLElement | null) => {
    setScrollElement(el);
  }, []);

  const contextValue = useMemo(
    () => ({ registerScrollElement }),
    [registerScrollElement],
  );

  return (
    <AppScrollElementContext.Provider value={contextValue}>
      <ScrollVisibilityProvider scrollElement={scrollElement}>
        {children}
      </ScrollVisibilityProvider>
    </AppScrollElementContext.Provider>
  );
}

export function useRegisterScrollElement(): (el: HTMLElement | null) => void {
  const ctx = useContext(AppScrollElementContext);
  if (!ctx) {
    throw new Error(
      "useRegisterScrollElement must be used within <AppScrollElementProvider>",
    );
  }
  return ctx.registerScrollElement;
}
```

---

### Step 7 — Register scroll element in `WorkingSectionStepsView`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/WorkingSectionStepsView.tsx`

The view already has `const scrollRef = useRef<HTMLDivElement>(null)` which is passed to `PullToRefresh`. After the `PullToRefresh` mounts, `scrollRef.current` is the scrollable div. Register it with the app-level provider.

Add the following import and effect. The `useRegisterScrollElement` import comes from the app's providers — not from `@beyo/ui` or the feature internals. Import path: `"@/providers/AppScrollElementProvider"`.

```tsx
// Add to imports at top of WorkingSectionStepsView.tsx
import { useEffect } from "react";
import { useRegisterScrollElement } from "@/providers/AppScrollElementProvider";
```

Inside `WorkingSectionStepsView` component body, after `const scrollRef = useRef<HTMLDivElement>(null)`:

```tsx
const registerScrollElement = useRegisterScrollElement();

useEffect(() => {
  const el = scrollRef.current;
  if (!el) return;
  registerScrollElement(el);
  return () => {
    registerScrollElement(null);
  };
  // scrollRef.current is stable after mount — lint-ignore exhaustive-deps is correct here
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [registerScrollElement]);
```

> **Why:** `scrollRef.current` is set by React after the first render when the DOM element mounts. The effect runs after render, so `scrollRef.current` is non-null at that point. Cleanup deregisters when the user navigates away from the Tasks tab.

---

### Step 8 — New controller: `use-last-active-step-card.controller.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-last-active-step-card.controller.ts`

The controller aggregates the `userLastActive` query, the transition action, and surface navigation into a single typed object for the floating card.

```ts
import { useCallback, useMemo } from "react";
import { useSurface } from "@beyo/hooks";
import type { TaskId, TaskStepId } from "@beyo/lib";
import {
  IMAGE_VIEWER_SURFACE_ID,
  ImageAnnotationSchema,
  toImageAnnotationViewModels,
  toImageAnnotationViewModel,
  type ImageLinkEntityType,
  type ImageUploadState,
  type ImageViewModel,
} from "@beyo/images";
import { useTransitionStepState } from "../actions/use-transition-step-state";
import { useUserLastActiveStepQuery } from "../api/use-user-last-active-step";
import {
  TASK_STEP_DETAIL_SURFACE_ID,
  type TaskStepDetailSurfaceProps,
} from "../surface-ids";
import { toTaskStepCardViewModel, type StepState } from "../types";

export function useLastActiveStepCardController() {
  const query = useUserLastActiveStepQuery();
  const step = query.data ?? null;

  const vm = useMemo(
    () => (step ? toTaskStepCardViewModel(step) : null),
    [step],
  );

  const {
    transitionStepState,
    isPending: isTransitioning,
    pendingStepId,
  } = useTransitionStepState();

  const { open: openSurface } = useSurface();

  const handleTransition = useCallback(
    (stepId: TaskStepId, taskId: TaskId, nextState: StepState) => {
      if (!step) return;
      transitionStepState({
        task_id: taskId,
        step_id: stepId,
        new_state: nextState,
        working_section_id: step.working_section_id,
      });
    },
    [step, transitionStepState],
  );

  const handleOpenDetail = useCallback(() => {
    if (!step) return;
    openSurface(TASK_STEP_DETAIL_SURFACE_ID, {
      stepId: step.client_id,
      taskId: step.task_id,
      workingSectionId: step.working_section_id,
    } as TaskStepDetailSurfaceProps);
  }, [step, openSurface]);

  const handleOpenImageViewer = useCallback(() => {
    if (!step || step.item_images.length === 0) return;

    const entityClientId = step.item?.client_id ?? null;
    const images: ImageViewModel[] = step.item_images.map((img, index) => {
      const rawAnnotation =
        "image_annotation" in img ? img.image_annotation : undefined;
      const parsed = ImageAnnotationSchema.nullable().safeParse(rawAnnotation);
      const parsedAnnotation =
        parsed.success && parsed.data ? parsed.data : null;
      const annotation = parsedAnnotation
        ? toImageAnnotationViewModel(parsedAnnotation)
        : null;
      const annotations = toImageAnnotationViewModels(
        parsedAnnotation ?? undefined,
        undefined,
      );

      return {
        clientId: img.client_id,
        linkClientId: null,
        entityType: "item" as ImageLinkEntityType,
        entityClientId,
        imageUrl: img.image_url,
        localObjectUrl: null,
        displayOrder: index,
        widthPx: img.width_px,
        heightPx: img.height_px,
        fileSizeBytes: img.file_size_bytes,
        createdAt: null,
        uploadState: "uploaded" as ImageUploadState,
        isOptimistic: false,
        isDeleted: false,
        pendingUploadClientId: null,
        uploadError: null,
        annotation,
        annotations,
        isFullyLoaded: "image_annotation" in img,
      };
    });

    openSurface(IMAGE_VIEWER_SURFACE_ID, {
      images,
      initialImageClientId: images[0]?.clientId ?? "",
      entityType: "item" as ImageLinkEntityType,
      entityClientId: entityClientId ?? "",
      mode: "preview-only",
      enableOnDemandImageLoad: false,
    });
  }, [step, openSurface]);

  return {
    step,
    vm,
    isPending: query.isPending,
    isTransitioning: isTransitioning && pendingStepId === step?.client_id,
    handleTransition,
    handleOpenDetail,
    handleOpenImageViewer,
  };
}

export type LastActiveStepCardController = ReturnType<
  typeof useLastActiveStepCardController
>;
```

---

### Step 9 — New provider: `LastActiveStepCardProvider.tsx`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/providers/LastActiveStepCardProvider.tsx`

Standard provider pattern from `23_providers.md`.

```tsx
import { createContext, useContext } from "react";
import {
  useLastActiveStepCardController,
  type LastActiveStepCardController,
} from "../controllers/use-last-active-step-card.controller";

const LastActiveStepCardContext =
  createContext<LastActiveStepCardController | null>(null);

export function LastActiveStepCardProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const controller = useLastActiveStepCardController();
  return (
    <LastActiveStepCardContext.Provider value={controller}>
      {children}
    </LastActiveStepCardContext.Provider>
  );
}

export function useLastActiveStepCardContext(): LastActiveStepCardController {
  const ctx = useContext(LastActiveStepCardContext);
  if (!ctx) {
    throw new Error(
      "useLastActiveStepCardContext must be used within <LastActiveStepCardProvider>",
    );
  }
  return ctx;
}
```

---

### Step 10 — New component: `LastActiveStepCard.tsx`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/LastActiveStepCard.tsx`

The floating card rendered above the `BottomTabBar`. It is positioned `fixed` at the bottom of the viewport, just above the tab bar. The tab bar's higher DOM-order (rendered after) gives it natural z-stacking priority, so the card slides behind it when `isHidden`.

#### Layout & visual spec

- Background: `bg-primary`
- Rounded corners: top-left and top-right only — `rounded-tl-2xl rounded-tr-2xl`
- Left zone: image thumbnail (square, same dimensions as `StepThumbnail` in TaskStepCard — `w-16 aspect-square`, with annotation layer and quantity pill)
- Center zone: article label (bold, truncated) + `TickingTimer` below it (only when `state === "working"`)
- Right zone: circular pause/play button (`size-14 rounded-full bg-card`) with `Pause`/`Play` icon (`size-6`)
- Tap card body → `handleOpenDetail()` (stops propagation from button/image taps)
- Tap image → `handleOpenImageViewer()` (stops propagation)
- Tap circular button → `handleTransition()` (stops propagation)

#### Scroll-hide behavior

- Reads `isHidden` from `useScrollVisibilityContext()`
- Uses `AnimatePresence` for mount/unmount animation (card appears when step becomes non-null, disappears when null)
- Uses `m.div` with `style={{ translateY: isHidden ? "100%" : "0%" }}` and a CSS `transition` on `transform` for the scroll-hide sliding — **not** `framer-motion` animate prop for the slide, because it's a continuous tracking motion tied to scroll state, not a one-shot animation. Use `transition-transform duration-200 ease-out` Tailwind classes instead of framer motion for the scroll-driven hide.

> **Why CSS transition instead of Framer Motion for scroll-hide:** `isHidden` changes state discretely (hidden / visible) in sync with scroll position changes. CSS transitions on `transform` are GPU-composited, don't block the main thread, and are the correct tool for this (per `31_animations.md`: "CSS handles simple state transitions"). Framer Motion is used for the entry/exit `AnimatePresence` animation (card appearing/disappearing from DOM).

```tsx
import { memo } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { ImageAnnotationSvgLayer } from "@beyo/images";
import {
  ImagePlaceholder,
  TickingTimer,
  useScrollVisibilityContext,
} from "@beyo/ui";
import type { TaskId, TaskStepId } from "@beyo/lib";
import { cn } from "@/lib/utils";
import { transitions } from "@/lib/animation";
import { useLastActiveStepCardContext } from "../providers/LastActiveStepCardProvider";
import { STEP_QUICK_TRANSITION, type StepState } from "../types";

// ─── Thumbnail sub-component (private) ───────────────────────────────────────

type CardThumbnailProps = {
  stepId: TaskStepId;
  src: string | null;
  annotations: { x: number; y: number; label?: string }[]; // ImageAnnotationViewModel[]
  widthPx: number | null;
  heightPx: number | null;
  quantityPillLabel: string | null;
  onTap: () => void;
};

function CardThumbnail({
  stepId,
  src,
  annotations,
  widthPx,
  heightPx,
  quantityPillLabel,
  onTap,
}: CardThumbnailProps): React.JSX.Element {
  return (
    <button
      aria-label="View item image"
      className="relative aspect-square w-16 shrink-0 overflow-hidden rounded-tl-2xl bg-primary-foreground/10"
      data-testid={`last-active-card-image-${stepId}`}
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onTap();
      }}
    >
      {src ? (
        <img
          alt=""
          className="size-full object-cover"
          decoding="async"
          draggable={false}
          loading="eager"
          src={src}
        />
      ) : (
        <ImagePlaceholder iconClassName="size-5 text-primary-foreground/50" />
      )}
      <ImageAnnotationSvgLayer
        annotations={annotations}
        coverMode
        heightPx={heightPx}
        widthPx={widthPx}
      />
      {quantityPillLabel ? (
        <span className="absolute bottom-1 right-1 rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">
          {quantityPillLabel}
        </span>
      ) : null}
    </button>
  );
}

// ─── Circular action button sub-component (private) ───────────────────────────

type CardActionButtonProps = {
  stepId: TaskStepId;
  taskId: TaskId;
  state: StepState;
  isTransitioning: boolean;
  onTransition: (
    stepId: TaskStepId,
    taskId: TaskId,
    nextState: StepState,
  ) => void;
};

function CardActionButton({
  stepId,
  taskId,
  state,
  isTransitioning,
  onTransition,
}: CardActionButtonProps): React.JSX.Element | null {
  const nextState = STEP_QUICK_TRANSITION[state];
  if (nextState === undefined) return null;

  const isWorking = state === "working";
  const Icon = isWorking ? Pause : Play;
  const label = isWorking ? "Pause" : "Resume";

  return (
    <button
      aria-label={label}
      className="flex size-14 shrink-0 items-center justify-center rounded-full bg-card text-foreground shadow-md transition-opacity disabled:opacity-60"
      data-testid={`last-active-card-action-${stepId}`}
      disabled={isTransitioning}
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onTransition(stepId, taskId, nextState);
      }}
    >
      <Icon aria-hidden="true" className="size-6 shrink-0" />
    </button>
  );
}

// ─── Main card (exported) ─────────────────────────────────────────────────────

export const LastActiveStepCard = memo(
  function LastActiveStepCard(): React.JSX.Element | null {
    const {
      step,
      vm,
      isTransitioning,
      handleTransition,
      handleOpenDetail,
      handleOpenImageViewer,
    } = useLastActiveStepCardContext();

    const { isHidden } = useScrollVisibilityContext();

    if (!vm || !step) return null;

    const isWorking = vm.state === "working";

    return (
      <AnimatePresence initial={false}>
        {vm ? (
          <m.div
            key="last-active-step-card"
            className={cn(
              "fixed bottom-[60px] left-0 right-0 z-[49]", // z-[49]: sits below BottomTabBar
              "flex items-stretch overflow-hidden",
              "rounded-tl-2xl rounded-tr-2xl bg-primary",
              "transition-transform duration-200 ease-out",
              isHidden && "translate-y-full",
            )}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={transitions.base}
            data-testid="last-active-step-card"
            role="button"
            tabIndex={0}
            onClick={handleOpenDetail}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleOpenDetail();
              }
            }}
          >
            {/* Image thumbnail */}
            <CardThumbnail
              annotations={vm.firstImageAnnotations}
              heightPx={vm.firstImageHeightPx}
              quantityPillLabel={vm.quantityPillLabel}
              src={vm.firstImageUrl}
              stepId={vm.stepId}
              widthPx={vm.firstImageWidthPx}
              onTap={handleOpenImageViewer}
            />

            {/* Center content: article label + timer */}
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3">
              <span
                className="truncate text-sm font-semibold text-primary-foreground"
                data-testid="last-active-card-label"
              >
                {vm.articleLabel}
              </span>
              <div className="h-4">
                {isWorking && vm.lastStateRecord ? (
                  <TickingTimer
                    className="font-mono text-xs text-primary-foreground/80"
                    data-testid="last-active-card-timer"
                    startedAtIso={vm.lastStateRecord.entered_at}
                  />
                ) : null}
              </div>
            </div>

            {/* Circular action button */}
            <div className="flex items-center pr-3">
              <CardActionButton
                isTransitioning={isTransitioning}
                state={vm.state}
                stepId={vm.stepId}
                taskId={vm.taskId}
                onTransition={handleTransition}
              />
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>
    );
  },
);
```

> **`z-[49]` and `bottom-[60px]`:** The `BottomTabBar` has `h-[60px]` and no explicit `z-index`. The card uses `z-[49]` to stay below the tab bar's natural stacking order (later in DOM). When `isHidden` adds `translate-y-full`, the card slides down, disappearing behind the tab bar. The arbitrary `z-[49]` and `bottom-[60px]` values are required because there are no tokens for these layout measurements — each needs a comment per `14_styling.md`.
>
> **`rounded-tl-2xl rounded-tr-2xl bg-primary`:** Matches the design spec exactly — rounded top corners, primary background.
>
> **`transition-transform duration-200 ease-out` combined with `isHidden && "translate-y-full"`:** CSS handles the scroll-driven show/hide (continuous, frequent state changes). Framer Motion handles the entry/exit animation when the card mounts/unmounts from DOM (`AnimatePresence`). These two mechanisms are independent and do not conflict.

---

### Step 11 — Wire up `AppShell.tsx`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/app/AppShell.tsx`

Add three things:

1. `AppScrollElementProvider` wrapping the whole shell (so `ScrollVisibilityProvider` covers everything including `LastActiveStepCard` and `BottomTabBar`)
2. `LastActiveStepCardProvider` inside the auth/surface provider tree (it calls `useSurface`, which requires `SurfaceProvider` in its ancestor — this is already satisfied by the root route)
3. `LastActiveStepCard` component rendered inside the shell, above the BottomTabBar in DOM (but using `position: fixed` so it doesn't affect layout)

```tsx
import { useEffect } from "react";
import { TabOutlet } from "@/app/TabOutlet";
import { BottomTabBar } from "@/components/shell/BottomTabBar";
import { preloadPrimaryTabRoutes } from "@/lib/primary-tab-preload";
import { TabBadgeCountsProvider } from "@/providers/TabBadgeCountsProvider";
import { AppScrollElementProvider } from "@/providers/AppScrollElementProvider"; // NEW
import {
  LastActiveStepCardProvider,
  LastActiveStepCard,
} from "@/features/task_steps"; // see index.ts update in Step 12

export function AppShell(): React.JSX.Element {
  useEffect(() => {
    preloadPrimaryTabRoutes();
  }, []);

  return (
    <AppScrollElementProvider>
      {" "}
      {/* NEW: wraps everything so ScrollVisibilityContext covers all descendants */}
      <TabBadgeCountsProvider>
        <LastActiveStepCardProvider>
          {" "}
          {/* NEW: runs the controller once for the whole shell */}
          <div
            className="flex h-dvh flex-col overflow-hidden bg-background pt-[var(--safe-top)]"
            data-testid="app-shell"
          >
            <main className="relative flex-1 overflow-hidden" id="main-content">
              <TabOutlet />
            </main>
            <LastActiveStepCard />{" "}
            {/* NEW: fixed-positioned, does not affect layout */}
            <BottomTabBar />
          </div>
        </LastActiveStepCardProvider>
      </TabBadgeCountsProvider>
    </AppScrollElementProvider>
  );
}
```

> **Provider order:** `AppScrollElementProvider` must be the outermost of the three because it provides `ScrollVisibilityContext` which `LastActiveStepCard` (inside `LastActiveStepCardProvider`) consumes.

> **`LastActiveStepCard` placement in DOM:** Rendered before `BottomTabBar` so it naturally sits behind the tab bar in stacking order when both have no explicit `z-index`. The card uses `position: fixed` via `fixed bottom-[60px]` so it does not participate in the flex column layout — `main` always fills the full available height.

---

### Step 12 — Update `index.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/index.ts`

Export the new provider, context hook, and card component so `AppShell` can import from the feature's public API boundary.

```ts
// ADDITIONS to existing exports
export {
  LastActiveStepCardProvider,
  useLastActiveStepCardContext,
} from "./providers/LastActiveStepCardProvider";
export { LastActiveStepCard } from "./components/LastActiveStepCard";
```

---

## Risks and mitigations

- **Risk:** `sectionListLookup` in `onMutate` iterates all cached section lists. If many sections are cached this could be slow.
  **Mitigation:** The cache holds at most a handful of section lists (the user only visits a small number of sections per session). The iteration is synchronous in-memory array scan — negligible cost.

- **Risk:** `scrollRef.current` in `WorkingSectionStepsView`'s `useEffect` may be null if `PullToRefresh` defers mounting the inner div.
  **Mitigation:** The effect has `scrollRef.current` check gated — if null, it registers nothing and the `ScrollVisibilityProvider` receives `null` (its documented safe state: no scroll tracking, `isHidden` stays `false`). The card remains visible.

- **Risk:** `z-[49]` for the card and no explicit z-index on `BottomTabBar` relies on DOM order for stacking. A future change to the tab bar's z-index could break the hide-behind behavior.
  **Mitigation:** Document the dependency with a comment in `LastActiveStepCard.tsx`. If the tab bar ever gains a z-index, the card's z-index must be lower than it.

- **Risk:** The `LastStateRecordSchema` update (adding `last_action_by` and `first_started_at` as optional) changes the TypeScript type. Existing code that spreads `last_state_record` into new objects (in `use-transition-step-state.ts`) may need to explicitly handle the new optional fields.
  **Mitigation:** Since the fields are optional, spread operations (`{ ...record, state: newState }`) will naturally carry them through if present. Optimistic records that omit them are valid (optional in the type).

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors across `features/task_steps/`, `providers/`, `app/AppShell.tsx`
- Manual smoke test — floating card visible:
  - Sign in as a worker
  - On the Tasks tab, start working on a step → card appears above the tab bar with correct article label, timer ticking, play/pause button
  - Navigate to Cases, Home, Stats, Settings tabs → card persists on all tabs
- Manual smoke test — optimistic transition:
  - Tap the card's circular button to pause → card switches to Play icon instantly (before network)
  - Tap Play → card switches to Pause icon instantly
  - On network error (disable network in devtools) → card reverts state, error toast appears
- Manual smoke test — different step working:
  - Working on Step A (card shows Step A)
  - Navigate to Tasks, tap Play on Step B → card immediately switches to Step B (optimistic), Step A shows paused in list
  - After `onSettled` refetch: card still shows Step B (server confirms)
- Manual smoke test — scroll hide:
  - On Tasks tab with card visible, scroll down in the step list → card slides down behind the tab bar
  - Scroll up → card slides back up into view
- Manual smoke test — tap card:
  - Tapping the card body → task detail slide page opens for the correct step
  - Tapping the image → image viewer opens
  - Tapping the circular button → does NOT open detail page, fires transition
- Manual smoke test — null state:
  - Complete the last active step → card disappears (or stays visible until refetch resolves to null)

---

## Review log

_(empty — awaiting first review)_

---

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `github-copilot-gpt-5.3-codex`
