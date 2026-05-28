# PLAN_workers_home_working_sections_steps_20260528

## Metadata

- Plan ID: `PLAN_workers_home_working_sections_steps_20260528`
- Status: `under_construction`
- Owner agent: GitHub Copilot
- Created at (UTC): `2026-05-28T00:00:00Z`
- Last updated at (UTC): `2026-05-28T00:00:00Z`
- Related issue/ticket: N/A
- Backend handoff: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_route_transition_step_state_contract_20260528.md`

## Goal and intent

- **Goal:** Build the workers app home page as a two-panel internal slide system (working sections list → working section steps list), including the `TaskStepCard` with its interactive state-transition button, a centralized `TickingTimer` primitive, and optimistic step state transitions.
- **Business/user intent:** Workers open the app, see their assigned working sections with step counts, tap a section to see the step cards for that section, and quickly Start / Pause / Switch tasks without leaving the list. Timer shows elapsed working time even after page reload.
- **Non-goals:** Task detail page body (stub only), realtime WebSocket layer (wired later), Create Case action (button rendered but no navigation wired), sort/filter on the steps search bar (noop handlers for now).

## Scope

- **In scope:**
  - `packages/lib`: `useTickingElapsed` hook (singleton interval, `useSyncExternalStore`)
  - `packages/ui`: `TickingTimer` display component
  - Workers app `features/working_sections/`: full feature (types → API → controller → provider → components)
  - Workers app `features/task_steps/`: full feature (types → API → action → controller → provider → components → surfaces)
  - Workers app `features/home/route-entry.tsx`: replace placeholder with internal slide panel system
  - Workers app `pages/task_steps/TaskStepActionsSheetPage.tsx`: sheet with Create Case button (no navigation)
  - Workers app `pages/task_steps/TaskDetailSlidePage.tsx`: stub slide page
  - Workers app `app/surface-registry.ts`: register task step surfaces
  - Playwright spec: `tests/playwright/features/home/working-sections.spec.ts`

- **Out of scope:**
  - Task detail page content
  - Sort / filter UX on the steps search bar
  - WebSocket / realtime invalidation (cache invalidation hooks already planned for future)
  - Create Case action navigation
  - Workers app `src/index.css` (no new `@source` needed — new features live under `src/`)

- **Assumptions:**
  - `@beyo/lib` exports `WorkingSectionId`, `TaskStepId`, `TaskId`, `UserId` branded types.
  - `@beyo/hooks` exports `useSurface`, `useSurfaceHeader`, `useSurfaceProps`.
  - `@beyo/ui` exports `SearchBar`, `ImagePlaceholder`, `SlidePageSurface`, `lazyWithPreload`, `useSurfaceStore`.
  - CSS variable `--color-soft-container` is defined in `@beyo/styles` (confirmed: `#f8f9fa`).
  - TanStack Query v5 is installed and `QueryClientProvider` is already wired above `AppShell`.
  - Framer Motion `m` and `AnimatePresence` are available via `framer-motion`.

## Clarifications required

_None — all ambiguities resolved during planning._

## Acceptance criteria

1. Home page loads and renders a list of working sections with correct count chips.
2. Tapping a section slides the panel left and shows the steps list for that section with header (back, image, name, counts, search bar).
3. Back arrow slides the panel right back to the sections list.
4. Search bar filters the steps list by `q` param (debounced 300 ms).
5. Each `TaskStepCard` renders with the correct action button variant based on step state.
6. Tapping the action button transitions the step state immediately (optimistic) with rollback on error.
7. `TickingTimer` in the Pause button shows elapsed `hh:mm:ss` based on `last_state_record.entered_at`, continuing correctly after page reload.
8. Three-dot menu opens the task actions bottom sheet; sheet shows "Create Case" button.
9. Tapping the card body opens a stub slide page.
10. `npm run typecheck` passes with zero TypeScript errors.
11. Playwright spec passes on `--project=mobile` and `--project=desktop`.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture_local.md`: route-entry pattern for primary tab routes; feature must own `route-entry.tsx`
- `architecture/05_server_state.md`: TanStack Query patterns; query key factories; query hooks in `api/`
- `architecture/08_hooks.md`: 4-hook lifecycle for action hooks; optimistic snapshot/rollback/seed/invalidate pattern
- `architecture/15_feature_structure.md`: feature folder layout; layer responsibilities; import rules
- `architecture/23_providers.md`: provider + context consumer hook pattern; `createContext(null)` + throw on misuse
- `architecture/24_dto.md`: Zod response schemas; `z.infer` types; `toXxxViewModel()` in controller
- `architecture/28_surfaces_local.md`: surface types: `slide`, `sheet`, `modal`; surface registration in `surfaces.ts`
- `architecture/31_animations.md`: `tabVariants` + `transitions.tab` for slide direction animation
- `architecture/34_runtime_validation_local.md`: Playwright bootstrapped; fixture imports; `data-testid` naming

### Local extensions loaded

- `architecture/01_architecture_local.md`: `route-entry.tsx` file must compose providers only; must NOT be exported from `index.ts`
- `architecture/28_surfaces_local.md`: `drawer` type excluded; use `sheet` for bottom overlays, `slide` for page-depth navigation
- `architecture/34_runtime_validation_local.md`: `auth.signIn()` for authenticated tests; import `test` from `../../fixtures/app-fixture`

### File read intent — pattern vs. relational

Permitted reads before coding:
- `packages/cases/src/surface-ids.ts` — exact surface-id constant + props shape pattern
- `packages/cases/src/controllers/use-case-conversation.controller.ts` — how `useSurface().open(id, props)` is called in a controller
- `apps/managers-app/.../features/tasks/components/TaskListCard.tsx` — existing card design to replicate
- `apps/managers-app/.../features/working_sections/api/working-section-keys.ts` — key factory naming reference

Prohibited (pattern reads — contract already covers):
- Reading another action hook to understand cache snapshot / rollback shape → `08_hooks.md`
- Reading another query hook to understand TanStack Query setup → `05_server_state.md`
- Reading another controller to understand aggregation shape → `08_hooks.md`
- Reading another provider to understand context shell → `23_providers.md`

### Skill selection

- Primary skill: `architecture/16_feature_workflow.md`
- Trigger terms: new feature, CRUD, animation, surface, optimistic update, realtime-ready
- Excluded alternatives: `architecture/18_performance.md` — not needed for this scope

## Domain schemas consulted

- `packages/lib/src/types/common.ts`: `WorkingSectionId`, `TaskStepId`, `TaskId`, `UserId` — branded string types used in all schemas below
- Backend handoff: exact response shapes for both Endpoint A and B; transition request/response

## Implementation plan

Build in strict bottom-up order: packages first, then features (types → API → actions → controllers → providers → components → surfaces), then pages, then route-entry, then surface registry, then tests.

---

### Step 1 — `packages/lib`: `useTickingElapsed` hook

**File:** `packages/lib/src/hooks/use-ticking-elapsed.ts` (create new)

Implement a singleton-interval ticking store using `useSyncExternalStore`. This design ensures:
- Only ONE `setInterval(fn, 1000)` ever runs, regardless of how many `TickingTimer` components are mounted.
- Only the component that calls `useTickingElapsed` re-renders on each tick (not its parent).
- The interval is torn down when the last subscriber unmounts (no leak).

```ts
import { useSyncExternalStore } from 'react';

type Listener = () => void;

let tickInterval: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<Listener>();
let lastTickMs = Date.now();

function subscribe(callback: Listener): () => void {
  listeners.add(callback);
  if (listeners.size === 1) {
    tickInterval = setInterval(() => {
      lastTickMs = Date.now();
      for (const fn of listeners) fn();
    }, 1000);
  }
  return () => {
    listeners.delete(callback);
    if (listeners.size === 0 && tickInterval !== null) {
      clearInterval(tickInterval);
      tickInterval = null;
    }
  };
}

function getSnapshot(): number {
  return lastTickMs;
}

/**
 * Returns elapsed milliseconds since `startedAtMs`, ticking every second.
 * Efficient: shares a single global interval across all callers.
 */
export function useTickingElapsed(startedAtMs: number): number {
  const now = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return Math.max(0, now - startedAtMs);
}
```

**File:** `packages/lib/src/index.ts` (update — append export)

Add:
```ts
export { useTickingElapsed } from './hooks/use-ticking-elapsed';
```

---

### Step 2 — `packages/ui`: `TickingTimer` component

**File:** `packages/ui/src/components/primitives/ticking-timer/TickingTimer.tsx` (create new)

```tsx
import { useMemo } from 'react';
import { useTickingElapsed } from '@beyo/lib';

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hh = Math.floor(totalSeconds / 3600);
  const mm = Math.floor((totalSeconds % 3600) / 60);
  const ss = totalSeconds % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export type TickingTimerProps = {
  /** ISO 8601 string — the moment the timer started (e.g. last_state_record.entered_at). */
  startedAtIso: string;
  className?: string;
  'data-testid'?: string;
};

export function TickingTimer({ startedAtIso, className, 'data-testid': testId }: TickingTimerProps): React.JSX.Element {
  const startedAtMs = useMemo(() => new Date(startedAtIso).getTime(), [startedAtIso]);
  const elapsed = useTickingElapsed(startedAtMs);
  return (
    <span className={className} data-testid={testId}>
      {formatElapsed(elapsed)}
    </span>
  );
}
```

**File:** `packages/ui/src/components/primitives/ticking-timer/index.ts` (create new)

```ts
export { TickingTimer } from './TickingTimer';
export type { TickingTimerProps } from './TickingTimer';
```

**File:** `packages/ui/src/index.ts` (update — append export before the last line or after `working-section-shortcut-bar`)

Add:
```ts
export * from './components/primitives/ticking-timer';
```

---

### Step 3 — `features/working_sections/types.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/working_sections/types.ts` (create new)

Define Zod schemas for Endpoint A response shapes and the view model:

```ts
import { z } from 'zod';
import type { WorkingSectionId } from '@beyo/lib';

export const TaskStepStateCountsSchema = z.object({
  pending: z.number(),
  working: z.number(),
  paused: z.number(),
  ended_shift: z.number(),
  blocked: z.number(),
  completed: z.number(),
  skipped: z.number(),
  failed: z.number(),
});
export type TaskStepStateCounts = z.infer<typeof TaskStepStateCountsSchema>;

export const WorkerWorkingSectionSchema = z.object({
  client_id: z.string() as z.ZodType<WorkingSectionId>,
  name: z.string(),
  image: z.string().nullable(),
  task_steps_counts: TaskStepStateCountsSchema,
});
export type WorkerWorkingSection = z.infer<typeof WorkerWorkingSectionSchema>;

export const WorkerWorkingSectionsResponseSchema = z.object({
  working_sections: z.array(WorkerWorkingSectionSchema),
});

export type WorkingSectionViewModel = {
  sectionId: WorkingSectionId;
  name: string;
  imageUrl: string | null;
  counts: TaskStepStateCounts;
  activeCount: number;    // pending + working + paused + ended_shift + blocked
  todayDoneCount: number; // completed + skipped + failed (today only, from API)
};

export function toWorkingSectionViewModel(section: WorkerWorkingSection): WorkingSectionViewModel {
  const c = section.task_steps_counts;
  return {
    sectionId: section.client_id,
    name: section.name,
    imageUrl: section.image,
    counts: c,
    activeCount: c.pending + c.working + c.paused + c.ended_shift + c.blocked,
    todayDoneCount: c.completed + c.skipped + c.failed,
  };
}
```

---

### Step 4 — `features/working_sections/api/working-section-keys.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/working_sections/api/working-section-keys.ts` (create new)

```ts
export const workerWorkingSectionKeys = {
  all: ['worker-working-sections'] as const,
  mine: () => [...workerWorkingSectionKeys.all, 'mine'] as const,
};
```

---

### Step 5 — `features/working_sections/api/fetch-worker-working-sections.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/working_sections/api/fetch-worker-working-sections.ts` (create new)

```ts
import { apiClient } from '@beyo/api-client';
import { ApiEnvelopeSchema } from '@beyo/lib';
import { WorkerWorkingSectionsResponseSchema, type WorkerWorkingSection } from '../types';

function getTodayStartIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

export async function fetchWorkerWorkingSections(): Promise<WorkerWorkingSection[]> {
  const response = await apiClient.get('/api/v1/working-sections/me', {
    params: { today_start: getTodayStartIso() },
  });
  const envelope = ApiEnvelopeSchema(WorkerWorkingSectionsResponseSchema).parse(response.data);
  return envelope.data.working_sections;
}
```

---

### Step 6 — `features/working_sections/api/use-worker-working-sections.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/working_sections/api/use-worker-working-sections.ts` (create new)

```ts
import { useQuery } from '@tanstack/react-query';
import { fetchWorkerWorkingSections } from './fetch-worker-working-sections';
import { workerWorkingSectionKeys } from './working-section-keys';

export function useWorkerWorkingSectionsQuery() {
  return useQuery({
    queryKey: workerWorkingSectionKeys.mine(),
    queryFn: fetchWorkerWorkingSections,
  });
}
```

---

### Step 7 — `features/working_sections/controllers/use-working-sections-home.controller.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/working_sections/controllers/use-working-sections-home.controller.ts` (create new)

```ts
import { useMemo } from 'react';
import { useWorkerWorkingSectionsQuery } from '../api/use-worker-working-sections';
import { toWorkingSectionViewModel, type WorkingSectionViewModel } from '../types';

export type WorkingSectionsHomeController = {
  sections: WorkingSectionViewModel[];
  isPending: boolean;
  isError: boolean;
};

export function useWorkingSectionsHomeController(): WorkingSectionsHomeController {
  const query = useWorkerWorkingSectionsQuery();

  const sections = useMemo(
    () => (query.data ?? []).map(toWorkingSectionViewModel),
    [query.data],
  );

  return {
    sections,
    isPending: query.isPending,
    isError: query.isError,
  };
}
```

---

### Step 8 — `features/working_sections/providers/WorkingSectionsHomeProvider.tsx`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/working_sections/providers/WorkingSectionsHomeProvider.tsx` (create new)

```tsx
import { createContext, useContext } from 'react';
import {
  useWorkingSectionsHomeController,
  type WorkingSectionsHomeController,
} from '../controllers/use-working-sections-home.controller';

const WorkingSectionsHomeContext = createContext<WorkingSectionsHomeController | null>(null);

export function WorkingSectionsHomeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const controller = useWorkingSectionsHomeController();
  return (
    <WorkingSectionsHomeContext.Provider value={controller}>
      {children}
    </WorkingSectionsHomeContext.Provider>
  );
}

export function useWorkingSectionsHomeContext(): WorkingSectionsHomeController {
  const ctx = useContext(WorkingSectionsHomeContext);
  if (!ctx) throw new Error('useWorkingSectionsHomeContext must be used within <WorkingSectionsHomeProvider>');
  return ctx;
}
```

---

### Step 9 — `features/working_sections/components/WorkingSectionCard.tsx`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/working_sections/components/WorkingSectionCard.tsx` (create new)

Visually similar to `TaskListCard` but for working sections. Tappable card with section image, name, and count badges.

```tsx
import { memo } from 'react';
import { ImagePlaceholder } from '@beyo/ui';
import type { WorkingSectionViewModel } from '../types';

type WorkingSectionCardProps = {
  section: WorkingSectionViewModel;
  onTap: (sectionId: string) => void;
};

export const WorkingSectionCard = memo(function WorkingSectionCard({
  section,
  onTap,
}: WorkingSectionCardProps): React.JSX.Element {
  return (
    <div
      className="mx-4 flex cursor-pointer items-center overflow-hidden rounded-xl bg-card shadow-sm"
      data-testid={`working-section-card-${section.sectionId}`}
      role="button"
      tabIndex={0}
      onClick={() => onTap(section.sectionId)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onTap(section.sectionId);
        }
      }}
    >
      {/* Section image */}
      <div className="relative aspect-square w-20 shrink-0 overflow-hidden bg-muted">
        {section.imageUrl ? (
          <img
            alt=""
            className="size-full object-cover"
            decoding="async"
            draggable={false}
            loading="lazy"
            src={section.imageUrl}
          />
        ) : (
          <ImagePlaceholder iconClassName="size-5 text-muted-foreground/60" />
        )}
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-3 py-3">
        <span className="truncate text-sm font-semibold text-foreground">
          {section.name}
        </span>
        <div className="flex items-center gap-2">
          {section.activeCount > 0 ? (
            <span
              className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
              data-testid={`working-section-card-active-count-${section.sectionId}`}
            >
              {section.activeCount} active
            </span>
          ) : null}
          {section.todayDoneCount > 0 ? (
            <span
              className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
              data-testid={`working-section-card-done-count-${section.sectionId}`}
            >
              {section.todayDoneCount} done today
            </span>
          ) : null}
        </div>
      </div>

      {/* Chevron */}
      <div className="pr-3 text-muted-foreground">
        <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
});
```

---

### Step 10 — `features/working_sections/components/WorkingSectionsHomeView.tsx`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/working_sections/components/WorkingSectionsHomeView.tsx` (create new)

The visible panel 1 of the home route. Uses context from `WorkingSectionsHomeProvider`.

```tsx
import { useWorkingSectionsHomeContext } from '../providers/WorkingSectionsHomeProvider';
import { WorkingSectionCard } from './WorkingSectionCard';
import type { WorkingSectionViewModel } from '../types';

type WorkingSectionsHomeViewProps = {
  onSelectSection: (section: WorkingSectionViewModel) => void;
};

export function WorkingSectionsHomeView({ onSelectSection }: WorkingSectionsHomeViewProps): React.JSX.Element {
  const { sections, isPending, isError } = useWorkingSectionsHomeContext();

  return (
    <div className="flex h-full flex-col" data-testid="working-sections-home-view">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-semibold text-foreground">My Sections</h1>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          Under construction
        </span>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {isPending ? (
          <div className="flex flex-col gap-3 px-0 py-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="mx-4 h-20 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : isError ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground" data-testid="working-sections-error">
            Could not load sections. Pull to refresh.
          </div>
        ) : sections.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground" data-testid="working-sections-empty">
            No working sections assigned.
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-2" data-testid="working-sections-list">
            {sections.map((section) => (
              <WorkingSectionCard
                key={section.sectionId}
                section={section}
                onTap={() => onSelectSection(section)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### Step 11 — `features/working_sections/index.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/working_sections/index.ts` (create new)

Export only what other layers need (types + provider + view for use from home route-entry):

```ts
export type { WorkingSectionViewModel } from './types';
export { WorkingSectionsHomeProvider, useWorkingSectionsHomeContext } from './providers/WorkingSectionsHomeProvider';
export { WorkingSectionsHomeView } from './components/WorkingSectionsHomeView';
```

---

### Step 12 — `features/task_steps/types.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/types.ts` (create new)

Define all Zod schemas for Endpoint B response and the view model. Pay close attention to the `item_images` array: the first image has the full shape, remaining images have the light shape. Use a union schema to handle both.

```ts
import { z } from 'zod';
import type { TaskId, TaskStepId, WorkingSectionId, UserId } from '@beyo/lib';

// ─── Step State ───────────────────────────────────────────────────────────────

export const StepStateSchema = z.enum([
  'pending',
  'working',
  'paused',
  'ended_shift',
  'blocked',
  'completed',
  'skipped',
  'failed',
  'cancelled',
]);
export type StepState = z.infer<typeof StepStateSchema>;

export const STEP_TERMINAL_STATES = new Set<StepState>([
  'completed', 'skipped', 'failed', 'cancelled',
]);

// Map: state → next state for quick action button (undefined = no quick action)
export const STEP_QUICK_TRANSITION: Partial<Record<StepState, StepState>> = {
  pending: 'working',
  working: 'paused',
  paused: 'working',
  ended_shift: 'working',
};

// ─── Sub-shapes ───────────────────────────────────────────────────────────────

export const LastStateRecordSchema = z.object({
  state: StepStateSchema,
  entered_at: z.string(),
  exited_at: z.string().nullable(),
});
export type LastStateRecord = z.infer<typeof LastStateRecordSchema>;

export const TaskSnapshotSchema = z.object({
  client_id: z.string() as z.ZodType<TaskId>,
  task_type: z.enum(['return', 'pre_order', 'internal']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  state: z.string(),
  return_source: z.enum(['after_purchase', 'before_purchase', 'store_return']).nullable(),
  item_location: z.string().nullable(),
  ready_by_at: z.string().nullable(),
  return_method: z.string().nullable(),
});
export type TaskSnapshot = z.infer<typeof TaskSnapshotSchema>;

export const UserRefSchema = z.object({
  client_id: z.string() as z.ZodType<UserId>,
  username: z.string(),
  profile_picture: z.string().nullable(),
});

export const UpholsteryRequirementSchema = z.object({
  client_id: z.string(),
  item_upholstery_id: z.string(),
  state: z.string(),
  source: z.string(),
  amount_meters: z.number(),
});

export const ItemSnapshotSchema = z.object({
  client_id: z.string(),
  article_number: z.string().nullable(),
  sku: z.string().nullable(),
  state: z.string(),
  item_category_id: z.string().nullable(),
  quantity: z.number(),
  item_position: z.string().nullable(),
  upholstery_requirement: z.array(UpholsteryRequirementSchema),
}).nullable();

// Light image shape (remaining images after first)
export const ItemImageLightSchema = z.object({
  client_id: z.string(),
  image_url: z.string(),
  width_px: z.number().nullable(),
  height_px: z.number().nullable(),
  file_size_bytes: z.number().nullable(),
});

// Full image shape (first image in display order)
export const ItemImageFullSchema = ItemImageLightSchema.extend({
  storage_provider: z.string(),
  source_type: z.string(),
  source_reference: z.string().nullable(),
  created_at: z.string(),
  last_event: z.unknown().nullable(),
  events: z.array(z.unknown()),
  image_annotation: z.unknown().nullable(),
});

export const ItemImageSchema = z.union([ItemImageFullSchema, ItemImageLightSchema]);
export type ItemImage = z.infer<typeof ItemImageSchema>;

// ─── Task Step ────────────────────────────────────────────────────────────────

export const TaskStepSchema = z.object({
  client_id: z.string() as z.ZodType<TaskStepId>,
  task_id: z.string() as z.ZodType<TaskId>,
  state: StepStateSchema,
  readiness_status: z.enum(['ready', 'blocked', 'pending']),
  sequence_order: z.number(),
  working_section_id: z.string() as z.ZodType<WorkingSectionId>,
  assigned_worker_id: z.string().nullable(),
  total_dependencies: z.number(),
  completed_dependencies: z.number(),
  working_section_name_snapshot: z.string(),
  assigned_worker_display_name_snapshot: z.string().nullable(),
  created_at: z.string(),
  closed_at: z.string().nullable(),
  updated_at: z.string(),
  created_by: UserRefSchema,
  updated_by: UserRefSchema,
  last_state_record: LastStateRecordSchema.nullable(),
  task: TaskSnapshotSchema,
  item: ItemSnapshotSchema,
  item_images: z.array(ItemImageSchema),
});
export type TaskStep = z.infer<typeof TaskStepSchema>;

export const TaskStepsPaginationSchema = z.object({
  items: z.array(TaskStepSchema),
  limit: z.number(),
  offset: z.number(),
  has_more: z.boolean(),
});
export type TaskStepsPagination = z.infer<typeof TaskStepsPaginationSchema>;

// ─── Transition Input/Output ──────────────────────────────────────────────────

export const StepTransitionReasonSchema = z.enum([
  'waiting_for_upholstery',
  'pause_lunch_break',
  'pause_coffee_break',
  'pause_ended_shift',
  'pause_meeting',
  'pause_other_task_priority',
]);
export type StepTransitionReason = z.infer<typeof StepTransitionReasonSchema>;

export type TransitionStepStateInput = {
  task_id: TaskId;
  step_id: TaskStepId;
  new_state: StepState;
  credited_user_id?: UserId;
  reason?: StepTransitionReason;
  description?: string;
};

export type TransitionStepStateOutput = {
  step_id: TaskStepId;
  new_state: StepState;
};

// ─── Query Params ─────────────────────────────────────────────────────────────

export type ListWorkingSectionStepsParams = {
  working_section_id: WorkingSectionId;
  q?: string;
  upholstery_search?: boolean;
  limit?: number;
  offset?: number;
};

// ─── View Model ───────────────────────────────────────────────────────────────

export type TaskStepCardViewModel = {
  stepId: TaskStepId;
  taskId: TaskId;
  state: StepState;
  isTerminal: boolean;
  hasQuickAction: boolean;
  nextState: StepState | undefined;
  articleLabel: string;
  task: TaskSnapshot;
  firstImageUrl: string | null;
  quantityPillLabel: string | null;
  lastStateRecord: LastStateRecord | null;
};

export function toTaskStepCardViewModel(step: TaskStep): TaskStepCardViewModel {
  const item = step.item;
  const articleLabel = item
    ? item.article_number
      ? `#${item.article_number}`
      : (item.sku ?? 'Article number missing')
    : 'No item linked';

  const quantityPillLabel =
    item && item.quantity > 1 ? `#${item.quantity}` : null;

  const firstImage = step.item_images[0] ?? null;
  const firstImageUrl = firstImage ? firstImage.image_url : null;

  const isTerminal = STEP_TERMINAL_STATES.has(step.state);
  const nextState = STEP_QUICK_TRANSITION[step.state];

  return {
    stepId: step.client_id,
    taskId: step.task_id,
    state: step.state,
    isTerminal,
    hasQuickAction: nextState !== undefined,
    nextState,
    articleLabel,
    task: step.task,
    firstImageUrl,
    quantityPillLabel,
    lastStateRecord: step.last_state_record,
  };
}

// ─── NonTerminal Counts (derived from loaded steps) ──────────────────────────

export type NonTerminalStepCounts = {
  pending: number;
  working: number;
  paused: number;
  ended_shift: number;
  blocked: number;
};

export function computeNonTerminalCounts(steps: TaskStep[]): NonTerminalStepCounts {
  return steps.reduce(
    (acc, step) => {
      if (!STEP_TERMINAL_STATES.has(step.state) && step.state !== 'cancelled') {
        (acc as Record<string, number>)[step.state] =
          ((acc as Record<string, number>)[step.state] ?? 0) + 1;
      }
      return acc;
    },
    { pending: 0, working: 0, paused: 0, ended_shift: 0, blocked: 0 },
  );
}
```

---

### Step 13 — `features/task_steps/api/task-step-keys.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/api/task-step-keys.ts` (create new)

```ts
import type { WorkingSectionId } from '@beyo/lib';
import type { ListWorkingSectionStepsParams } from '../types';

export const taskStepKeys = {
  all: ['task-steps'] as const,
  sectionLists: () => [...taskStepKeys.all, 'section-list'] as const,
  sectionList: (params: ListWorkingSectionStepsParams) =>
    [...taskStepKeys.sectionLists(), params] as const,
  sectionListsBySection: (sectionId: WorkingSectionId) =>
    [...taskStepKeys.sectionLists(), sectionId] as const,
};
```

---

### Step 14 — `features/task_steps/api/fetch-working-section-steps.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/api/fetch-working-section-steps.ts` (create new)

```ts
import { apiClient } from '@beyo/api-client';
import { ApiEnvelopeSchema } from '@beyo/lib';
import { TaskStepsPaginationSchema, type ListWorkingSectionStepsParams, type TaskStepsPagination } from '../types';
import { z } from 'zod';

const ResponseDataSchema = z.object({
  steps_pagination: TaskStepsPaginationSchema,
});

export async function fetchWorkingSectionSteps(
  params: ListWorkingSectionStepsParams,
): Promise<TaskStepsPagination> {
  const { working_section_id, ...queryParams } = params;
  const response = await apiClient.get(
    `/api/v1/working-sections/${working_section_id}/steps`,
    { params: queryParams },
  );
  const envelope = ApiEnvelopeSchema(ResponseDataSchema).parse(response.data);
  return envelope.data.steps_pagination;
}
```

---

### Step 15 — `features/task_steps/api/use-working-section-steps.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/api/use-working-section-steps.ts` (create new)

```ts
import { useQuery } from '@tanstack/react-query';
import { fetchWorkingSectionSteps } from './fetch-working-section-steps';
import { taskStepKeys } from './task-step-keys';
import type { ListWorkingSectionStepsParams } from '../types';

export function useWorkingSectionStepsQuery(params: ListWorkingSectionStepsParams) {
  return useQuery({
    queryKey: taskStepKeys.sectionList(params),
    queryFn: () => fetchWorkingSectionSteps(params),
    enabled: Boolean(params.working_section_id),
  });
}
```

---

### Step 16 — `features/task_steps/api/transition-step-state.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/api/transition-step-state.ts` (create new)

```ts
import { apiClient } from '@beyo/api-client';
import { ApiEnvelopeSchema } from '@beyo/lib';
import { z } from 'zod';
import type { TransitionStepStateInput, TransitionStepStateOutput } from '../types';
import { StepStateSchema } from '../types';

const TransitionResponseDataSchema = z.object({
  step_id: z.string(),
  new_state: StepStateSchema,
});

export async function transitionStepState(
  input: TransitionStepStateInput,
): Promise<TransitionStepStateOutput> {
  const { task_id, step_id, ...body } = input;
  const response = await apiClient.post(
    `/api/v1/tasks/${task_id}/steps/${step_id}/transition`,
    body,
  );
  const envelope = ApiEnvelopeSchema(TransitionResponseDataSchema).parse(response.data);
  return envelope.data as TransitionStepStateOutput;
}
```

---

### Step 17 — `features/task_steps/actions/use-transition-step-state.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/actions/use-transition-step-state.ts` (create new)

Implement the standard 4-hook optimistic action pattern from `08_hooks.md`.

The optimistic update:
- Cancel all step list queries for the affected section
- Snapshot all matching query data
- Optimistically update the step's `state` and `last_state_record` in cache
- On success: seed the updated state into cache
- On error: rollback all snapshots
- On settled: invalidate `sectionListsBySection` for the affected section AND `workerWorkingSectionKeys.mine()` (count refresh)

The action must receive the `working_section_id` so it knows which section list cache to update.

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notify } from '@beyo/lib';
import { transitionStepState } from '../api/transition-step-state';
import { taskStepKeys } from '../api/task-step-keys';
import { workerWorkingSectionKeys } from '../../working_sections/api/working-section-keys';
import {
  STEP_TERMINAL_STATES,
  type TransitionStepStateInput,
  type TaskStepsPagination,
  type StepState,
} from '../types';

type TransitionInput = TransitionStepStateInput & {
  working_section_id: string; // needed for cache targeting
};

function buildOptimisticStateRecord(newState: StepState) {
  return {
    state: newState,
    entered_at: new Date().toISOString(),
    exited_at: null,
  };
}

export function useTransitionStepState() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ working_section_id: _wsi, ...input }: TransitionInput) =>
      transitionStepState(input),

    onMutate: async ({ task_id, step_id, new_state, working_section_id }) => {
      // Cancel in-flight queries for this section
      await queryClient.cancelQueries({
        queryKey: taskStepKeys.sectionListsBySection(working_section_id as any),
      });

      // Snapshot
      const previousSectionLists = queryClient.getQueriesData<TaskStepsPagination>({
        queryKey: taskStepKeys.sectionListsBySection(working_section_id as any),
      });

      // Optimistically apply
      queryClient.setQueriesData<TaskStepsPagination>(
        { queryKey: taskStepKeys.sectionListsBySection(working_section_id as any) },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((step) => {
              if (step.client_id !== step_id) return step;
              return {
                ...step,
                state: new_state,
                last_state_record: buildOptimisticStateRecord(new_state),
                closed_at: STEP_TERMINAL_STATES.has(new_state)
                  ? new Date().toISOString()
                  : null,
              };
            }),
          };
        },
      );

      return { previousSectionLists };
    },

    onError: (_err, _input, context) => {
      // Rollback
      context?.previousSectionLists.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      notify.error(
        'Action failed',
        'Step state could not be changed. Your changes have been reverted.',
      );
    },

    onSettled: (_data, _err, { working_section_id }) => {
      void queryClient.invalidateQueries({
        queryKey: taskStepKeys.sectionListsBySection(working_section_id as any),
      });
      void queryClient.invalidateQueries({
        queryKey: workerWorkingSectionKeys.mine(),
      });
    },
  });

  return {
    transitionStepState: mutation.mutate,
    transitionStepStateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

export type TransitionStepStateAction = ReturnType<typeof useTransitionStepState>;
```

---

### Step 18 — `features/task_steps/controllers/use-working-section-steps.controller.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-working-section-steps.controller.ts` (create new)

```ts
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSurface } from '@beyo/hooks';
import type { WorkingSectionId } from '@beyo/lib';
import { useWorkingSectionStepsQuery } from '../api/use-working-section-steps';
import { useTransitionStepState } from '../actions/use-transition-step-state';
import {
  toTaskStepCardViewModel,
  computeNonTerminalCounts,
  type TaskStepCardViewModel,
  type NonTerminalStepCounts,
  type StepState,
  type TaskStepId,
  type TaskId,
} from '../types';
import {
  TASK_STEP_ACTIONS_SHEET_SURFACE_ID,
  type TaskStepActionsSheetSurfaceProps,
} from '../surface-ids';
import {
  TASK_STEP_DETAIL_SURFACE_ID,
  type TaskStepDetailSurfaceProps,
} from '../surface-ids';

// Debounce helper — avoids a dependency on an external hook
function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timerRef.current);
  }, [value, delayMs]);

  return debounced;
}

export type WorkingSectionStepsController = {
  steps: TaskStepCardViewModel[];
  nonTerminalCounts: NonTerminalStepCounts;
  isPending: boolean;
  isError: boolean;
  hasMore: boolean;
  search: string;
  setSearch: (value: string) => void;
  handleTransition: (stepId: TaskStepId, taskId: TaskId, nextState: StepState) => void;
  handleOpenTaskActions: (stepId: TaskStepId, taskId: TaskId) => void;
  handleOpenTaskDetail: (stepId: TaskStepId, taskId: TaskId) => void;
  isTransitioning: boolean;
};

export function useWorkingSectionStepsController(
  sectionId: WorkingSectionId,
): WorkingSectionStepsController {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 300);

  const query = useWorkingSectionStepsQuery({
    working_section_id: sectionId,
    q: debouncedSearch || undefined,
    limit: 50,
    offset: 0,
  });

  const { transitionStepState, isPending: isTransitioning } = useTransitionStepState();
  const surface = useSurface();

  const steps = useMemo(
    () => (query.data?.items ?? []).map(toTaskStepCardViewModel),
    [query.data?.items],
  );

  const nonTerminalCounts = useMemo(
    () => computeNonTerminalCounts(query.data?.items ?? []),
    [query.data?.items],
  );

  function handleTransition(stepId: TaskStepId, taskId: TaskId, nextState: StepState) {
    transitionStepState({
      task_id: taskId,
      step_id: stepId,
      new_state: nextState,
      working_section_id: sectionId,
    });
  }

  function handleOpenTaskActions(stepId: TaskStepId, taskId: TaskId) {
    surface.open<TaskStepActionsSheetSurfaceProps>(TASK_STEP_ACTIONS_SHEET_SURFACE_ID, {
      stepId,
      taskId,
    });
  }

  function handleOpenTaskDetail(stepId: TaskStepId, taskId: TaskId) {
    surface.open<TaskStepDetailSurfaceProps>(TASK_STEP_DETAIL_SURFACE_ID, {
      stepId,
      taskId,
    });
  }

  return {
    steps,
    nonTerminalCounts,
    isPending: query.isPending,
    isError: query.isError,
    hasMore: query.data?.has_more ?? false,
    search,
    setSearch,
    handleTransition,
    handleOpenTaskActions,
    handleOpenTaskDetail,
    isTransitioning,
  };
}
```

> **Note on types for `TaskId` / `TaskStepId` in types.ts:** The branded types are already imported from `@beyo/lib` into `types.ts`. The controller imports them from `'../types'` not directly from `@beyo/lib` to avoid duplication — but since they're re-exported from `types.ts`, add them to the `types.ts` re-exports or import directly from `@beyo/lib` in the controller. Prefer importing branded types directly from `@beyo/lib` in the controller.

---

### Step 19 — `features/task_steps/surface-ids.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surface-ids.ts` (create new)

```ts
import type { TaskStepId, TaskId } from '@beyo/lib';

export const TASK_STEP_ACTIONS_SHEET_SURFACE_ID = 'task-step-actions-sheet';
export const TASK_STEP_DETAIL_SURFACE_ID = 'task-step-detail-slide';

export type TaskStepActionsSheetSurfaceProps = {
  stepId: TaskStepId;
  taskId: TaskId;
};

export type TaskStepDetailSurfaceProps = {
  stepId: TaskStepId;
  taskId: TaskId;
};
```

---

### Step 20 — `features/task_steps/providers/WorkingSectionStepsProvider.tsx`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/providers/WorkingSectionStepsProvider.tsx` (create new)

```tsx
import { createContext, useContext } from 'react';
import type { WorkingSectionId } from '@beyo/lib';
import {
  useWorkingSectionStepsController,
  type WorkingSectionStepsController,
} from '../controllers/use-working-section-steps.controller';

const WorkingSectionStepsContext = createContext<WorkingSectionStepsController | null>(null);

export function WorkingSectionStepsProvider({
  sectionId,
  children,
}: {
  sectionId: WorkingSectionId;
  children: React.ReactNode;
}): React.JSX.Element {
  const controller = useWorkingSectionStepsController(sectionId);
  return (
    <WorkingSectionStepsContext.Provider value={controller}>
      {children}
    </WorkingSectionStepsContext.Provider>
  );
}

export function useWorkingSectionStepsContext(): WorkingSectionStepsController {
  const ctx = useContext(WorkingSectionStepsContext);
  if (!ctx) throw new Error('useWorkingSectionStepsContext must be used within <WorkingSectionStepsProvider>');
  return ctx;
}
```

---

### Step 21 — `features/task_steps/components/TaskStepActionButton.tsx`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/TaskStepActionButton.tsx` (create new)

Three visual states based on current step state. No button rendered for terminal or blocked states.

Button variant logic:
- `pending` → variant 1: "Start Task" | Play icon | `bg-primary text-primary-foreground`
- `working` → variant 2: "Pause Task" | Pause icon | `bg-primary text-primary-foreground` + `TickingTimer`
- `paused` | `ended_shift` → variant 3: "Switch to Start" | Play icon | `bg-[var(--color-soft-container)] text-foreground`

```tsx
import { Pause, Play } from 'lucide-react';
import { TickingTimer } from '@beyo/ui';
import type { StepState, TaskStepId, TaskId, LastStateRecord } from '../types';
import { STEP_QUICK_TRANSITION } from '../types';

type TaskStepActionButtonProps = {
  stepId: TaskStepId;
  taskId: TaskId;
  state: StepState;
  lastStateRecord: LastStateRecord | null;
  onTransition: (stepId: TaskStepId, taskId: TaskId, nextState: StepState) => void;
  isTransitioning: boolean;
};

export function TaskStepActionButton({
  stepId,
  taskId,
  state,
  lastStateRecord,
  onTransition,
  isTransitioning,
}: TaskStepActionButtonProps): React.JSX.Element | null {
  const nextState = STEP_QUICK_TRANSITION[state];
  if (nextState === undefined) return null;

  const isWorking = state === 'working';
  const isPending = state === 'pending';

  const label = isPending ? 'Start Task' : isWorking ? 'Pause Task' : 'Switch to Start';
  const Icon = isWorking ? Pause : Play;
  const bgClass = isPending || isWorking
    ? 'bg-primary text-primary-foreground'
    : 'bg-[var(--color-soft-container)] text-foreground';

  const showTimer = isWorking && lastStateRecord !== null;

  return (
    <button
      aria-label={label}
      className={`flex w-full items-center justify-between border-t border-border/50 px-4 py-3 transition-opacity ${bgClass} disabled:opacity-60`}
      data-testid={`task-step-action-button-${stepId}`}
      disabled={isTransitioning}
      type="button"
      onClick={() => onTransition(stepId, taskId, nextState)}
    >
      <span className="flex items-center gap-2">
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        <span className="text-sm font-medium">{label}</span>
      </span>
      {showTimer ? (
        <TickingTimer
          className="font-mono text-xs opacity-90"
          data-testid={`task-step-timer-${stepId}`}
          startedAtIso={lastStateRecord!.entered_at}
        />
      ) : null}
    </button>
  );
}
```

---

### Step 22 — `features/task_steps/components/TaskStepCard.tsx`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/TaskStepCard.tsx` (create new)

Adapts the manager app's `TaskListCard` design. The outer container is `flex flex-col`. The upper section mirrors `TaskListCard`; the action button sits below in the same rounded container.

```tsx
import { memo } from 'react';
import { Calendar, RotateCcw, ShoppingBag, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ImagePlaceholder } from '@beyo/ui';
import type { TaskStepCardViewModel, StepState } from '../types';
import type { TaskId, TaskStepId, LastStateRecord } from '../types';
import { TaskStepActionButton } from './TaskStepActionButton';

const TYPE_ICON: Record<string, LucideIcon> = {
  return: RotateCcw,
  pre_order: ShoppingBag,
  internal: Wrench,
};

const TYPE_LABEL: Record<string, string> = {
  return: 'Return',
  pre_order: 'Pre-order',
  internal: 'Internal',
};

const RETURN_SOURCE_LABEL: Record<string, string> = {
  after_purchase: 'After purchase',
  before_purchase: 'Before purchase',
  store_return: 'Store return',
};

function ThreeDotIcon(): React.JSX.Element {
  return (
    <span className="flex flex-col items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1 rounded-full bg-current" />
      ))}
    </span>
  );
}

type TaskStepCardProps = {
  card: TaskStepCardViewModel;
  onTapImage: (stepId: TaskStepId) => void;
  onTapActions: (stepId: TaskStepId, taskId: TaskId) => void;
  onTapCard: (stepId: TaskStepId, taskId: TaskId) => void;
  onTransition: (stepId: TaskStepId, taskId: TaskId, nextState: StepState) => void;
  isTransitioning: boolean;
};

export const TaskStepCard = memo(function TaskStepCard({
  card,
  onTapImage,
  onTapActions,
  onTapCard,
  onTransition,
  isTransitioning,
}: TaskStepCardProps): React.JSX.Element {
  const { stepId, taskId, task, firstImageUrl, articleLabel, quantityPillLabel, lastStateRecord } = card;
  const TypeIcon = TYPE_ICON[task.task_type] ?? Wrench;
  const typeLabel = TYPE_LABEL[task.task_type] ?? task.task_type;
  const returnSourceLabel = task.return_source ? RETURN_SOURCE_LABEL[task.return_source] : null;
  const readyByLabel = task.ready_by_at
    ? new Date(task.ready_by_at).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      })
    : null;

  return (
    <div
      className="mx-4 flex flex-col overflow-hidden rounded-xl bg-card shadow-sm"
      data-testid={`task-step-card-${stepId}`}
    >
      {/* Upper section — mirrors TaskListCard */}
      <div className="flex">
        {/* Image */}
        <button
          aria-label="View item image"
          className="relative aspect-square w-28 shrink-0 overflow-hidden bg-muted"
          data-testid={`task-step-card-image-${stepId}`}
          type="button"
          onClick={() => onTapImage(stepId)}
        >
          {firstImageUrl ? (
            <img
              alt=""
              className="size-full object-cover"
              decoding="async"
              draggable={false}
              loading="lazy"
              src={firstImageUrl}
            />
          ) : (
            <ImagePlaceholder iconClassName="size-6 text-muted-foreground/60" />
          )}
          {quantityPillLabel ? (
            <span className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium text-white">
              {quantityPillLabel}
            </span>
          ) : null}
        </button>

        {/* Body */}
        <div
          className="flex min-w-0 flex-1 cursor-pointer flex-col justify-start px-3 py-2.5"
          data-testid={`task-step-card-body-${stepId}`}
          role="button"
          tabIndex={0}
          onClick={() => onTapCard(stepId, taskId)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onTapCard(stepId, taskId);
            }
          }}
        >
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {articleLabel}
            </span>
            {/* Three-dot menu */}
            <button
              aria-label="Task actions"
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground"
              data-testid={`task-step-card-actions-${stepId}`}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onTapActions(stepId, taskId);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.stopPropagation();
                }
              }}
            >
              <ThreeDotIcon />
            </button>
          </div>

          <div className="mt-2 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <TypeIcon aria-hidden="true" className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              {typeLabel}
              {returnSourceLabel ? ` • ${returnSourceLabel}` : ''}
            </span>
          </div>

          {readyByLabel ? (
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar aria-hidden="true" className="size-3.5 shrink-0" />
              <span>{readyByLabel}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Action button row */}
      <TaskStepActionButton
        isTransitioning={isTransitioning}
        lastStateRecord={lastStateRecord}
        state={card.state}
        stepId={stepId}
        taskId={taskId}
        onTransition={onTransition}
      />
    </div>
  );
});
```

---

### Step 23 — `features/task_steps/components/WorkingSectionStepsView.tsx`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/WorkingSectionStepsView.tsx` (create new)

Header + body for panel 2. Receives the selected section ViewModel (for image + name) and `onBack` from the parent. Reads everything else from `WorkingSectionStepsContext`.

```tsx
import { ArrowLeft } from 'lucide-react';
import { SearchBar, ImagePlaceholder } from '@beyo/ui';
import { useWorkingSectionStepsContext } from '../providers/WorkingSectionStepsProvider';
import { TaskStepCard } from './TaskStepCard';
import type { WorkingSectionViewModel } from '../../working_sections/types';

type WorkingSectionStepsViewProps = {
  section: WorkingSectionViewModel;
  onBack: () => void;
};

export function WorkingSectionStepsView({
  section,
  onBack,
}: WorkingSectionStepsViewProps): React.JSX.Element {
  const {
    steps,
    nonTerminalCounts,
    isPending,
    isError,
    search,
    setSearch,
    handleTransition,
    handleOpenTaskActions,
    handleOpenTaskDetail,
    isTransitioning,
  } = useWorkingSectionStepsContext();

  const nonTerminalEntries = Object.entries(nonTerminalCounts).filter(([, count]) => count > 0);

  return (
    <div className="flex h-full flex-col" data-testid="working-section-steps-view">
      {/* Header row 1: back + image + name */}
      <header className="flex flex-col gap-2 px-4 pb-2 pt-3">
        <div className="flex items-center gap-3">
          <button
            aria-label="Back"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            data-testid="working-section-steps-back"
            type="button"
            onClick={onBack}
          >
            <ArrowLeft className="size-5" />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            {/* Section image */}
            <div className="relative size-8 shrink-0 overflow-hidden rounded-full bg-muted">
              {section.imageUrl ? (
                <img
                  alt=""
                  className="size-full object-cover"
                  decoding="async"
                  draggable={false}
                  src={section.imageUrl}
                />
              ) : (
                <ImagePlaceholder iconClassName="size-3.5 text-muted-foreground/60" />
              )}
            </div>
            <span className="truncate text-base font-semibold text-foreground" data-testid="working-section-steps-title">
              {section.name}
            </span>
          </div>
        </div>

        {/* Header row 2: non-terminal state count chips */}
        {nonTerminalEntries.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pl-12" data-testid="working-section-steps-counts">
            {nonTerminalEntries.map(([state, count]) => (
              <span
                key={state}
                className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground capitalize"
              >
                {count} {state.replace('_', ' ')}
              </span>
            ))}
          </div>
        ) : null}

        {/* Header row 3: search bar */}
        <SearchBar
          activeFilterCount={0}
          data-testid="working-section-steps-search"
          placeholder="Search by article, SKU…"
          value={search}
          wrapperClassName="pl-12"
          onChange={setSearch}
          onFilterPress={() => {/* noop — filters not implemented yet */}}
          onSortPress={() => {/* noop — sort not implemented yet */}}
        />
      </header>

      {/* Body: step cards */}
      <div className="flex-1 overflow-y-auto">
        {isPending ? (
          <div className="flex flex-col gap-3 py-2">
            {[0, 1, 2, 4].map((i) => (
              <div key={i} className="mx-4 h-32 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : isError ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground" data-testid="working-section-steps-error">
            Could not load steps. Pull to refresh.
          </div>
        ) : steps.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground" data-testid="working-section-steps-empty">
            No steps found
            {search ? ` matching "${search}"` : ''}.
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-2" data-testid="working-section-steps-list">
            {steps.map((card) => (
              <TaskStepCard
                key={card.stepId}
                card={card}
                isTransitioning={isTransitioning}
                onTapActions={(stepId, taskId) => handleOpenTaskActions(stepId, taskId)}
                onTapCard={(stepId, taskId) => handleOpenTaskDetail(stepId, taskId)}
                onTapImage={(stepId) => {
                  // Image tap: open fullscreen viewer (from @beyo/images)
                  // TODO: wire to image surface when images feature is connected
                }}
                onTransition={(stepId, taskId, nextState) =>
                  handleTransition(stepId, taskId, nextState)
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### Step 24 — `features/task_steps/surfaces.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surfaces.ts` (create new)

```ts
import { lazyWithPreload, type SurfaceRegistrations } from '@beyo/ui';
import {
  TASK_STEP_ACTIONS_SHEET_SURFACE_ID,
  TASK_STEP_DETAIL_SURFACE_ID,
} from './surface-ids';

function loadTaskStepActionsSheetPage() {
  return import('@/pages/task_steps/TaskStepActionsSheetPage').then((module) => ({
    default: module.TaskStepActionsSheetPage,
  }));
}

function loadTaskDetailSlidePage() {
  return import('@/pages/task_steps/TaskDetailSlidePage').then((module) => ({
    default: module.TaskDetailSlidePage,
  }));
}

const taskStepActionsSheet = lazyWithPreload(loadTaskStepActionsSheetPage);
const taskDetailSlide = lazyWithPreload(loadTaskDetailSlidePage);

export const taskStepSurfaces: SurfaceRegistrations = {
  [TASK_STEP_ACTIONS_SHEET_SURFACE_ID]: {
    surface: 'sheet',
    component: taskStepActionsSheet.Component,
  },
  [TASK_STEP_DETAIL_SURFACE_ID]: {
    surface: 'slide',
    component: taskDetailSlide.Component,
  },
};
```

---

### Step 25 — `features/task_steps/index.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/index.ts` (create new)

```ts
export type { TaskStepCardViewModel, StepState, NonTerminalStepCounts } from './types';
export { STEP_TERMINAL_STATES, STEP_QUICK_TRANSITION } from './types';
export { WorkingSectionStepsProvider, useWorkingSectionStepsContext } from './providers/WorkingSectionStepsProvider';
export { WorkingSectionStepsView } from './components/WorkingSectionStepsView';
export { taskStepSurfaces } from './surfaces';
export {
  TASK_STEP_ACTIONS_SHEET_SURFACE_ID,
  TASK_STEP_DETAIL_SURFACE_ID,
} from './surface-ids';
```

---

### Step 26 — `pages/task_steps/TaskStepActionsSheetPage.tsx`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskStepActionsSheetPage.tsx` (create new)

Bottom sheet content for a task step's action menu. For now, renders one "Create Case" button (UI only — no navigation wired).

```tsx
import { useEffect } from 'react';
import { Briefcase } from 'lucide-react';
import { useSurfaceHeader, useSurfaceProps } from '@beyo/hooks';
import type { TaskStepActionsSheetSurfaceProps } from '@/features/task_steps/surface-ids';

export function TaskStepActionsSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { stepId: _stepId, taskId: _taskId } =
    useSurfaceProps<TaskStepActionsSheetSurfaceProps>();

  useEffect(() => {
    header?.setTitle('Actions');
    header?.setActions(null);
  }, [header]);

  return (
    <div
      className="flex flex-col gap-3 bg-background p-6"
      data-testid="task-step-actions-sheet"
    >
      <button
        className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted"
        data-testid="task-step-create-case-button"
        type="button"
        onClick={() => {
          // TODO: navigate to create case surface
        }}
      >
        <Briefcase aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        <span>Create Case</span>
      </button>
    </div>
  );
}
```

---

### Step 27 — `pages/task_steps/TaskDetailSlidePage.tsx`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskDetailSlidePage.tsx` (create new)

Stub slide page for the task detail. Will be replaced when the task detail feature is built.

```tsx
import { useSurfaceProps } from '@beyo/hooks';
import type { TaskStepDetailSurfaceProps } from '@/features/task_steps/surface-ids';

export function TaskDetailSlidePage(): React.JSX.Element {
  const { stepId, taskId } = useSurfaceProps<TaskStepDetailSurfaceProps>();

  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-2 bg-background p-6"
      data-testid="task-detail-slide-page"
    >
      <p className="text-sm text-muted-foreground">Task detail coming soon</p>
      <p className="font-mono text-xs text-muted-foreground/50">
        step: {stepId} / task: {taskId}
      </p>
    </div>
  );
}
```

---

### Step 28 — `app/surface-registry.ts` (update)

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/app/surface-registry.ts` (update)

Add `taskStepSurfaces`:

```ts
import type { SurfaceRegistrations } from '@beyo/ui';
import { imageSurfaces } from '@beyo/images';
import { caseSurfaces } from '@/features/cases/surfaces';
import { taskStepSurfaces } from '@/features/task_steps/surfaces';

export const surfaceRegistry: SurfaceRegistrations = {
  ...imageSurfaces,
  ...caseSurfaces,
  ...taskStepSurfaces,
};

export type SurfaceId = keyof typeof surfaceRegistry;
```

---

### Step 29 — `features/home/route-entry.tsx` (replace)

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/home/route-entry.tsx` (replace entirely)

This is the most complex file. It manages the internal two-panel slide system. Key points:
- `useState<WorkingSectionViewModel | null>(null)` tracks the selected section
- `useState<number>(0)` tracks animation direction (0 = no animation, 1 = forward, -1 = back)
- On section select: `setDirection(1); setSelectedSection(section)`
- On back: `setDirection(-1); setSelectedSection(null)`
- `AnimatePresence` with `custom={direction}` uses `tabVariants` and `transitions.tab`
- Each panel is an absolute-positioned motion div with `key` to trigger AnimatePresence enter/exit
- `WorkingSectionsHomeProvider` is always mounted (panel 1 data stays alive)
- `WorkingSectionStepsProvider` is mounted only when `selectedSection !== null`

```tsx
import { useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { tabVariants, transitions } from '@beyo/lib';
import { WorkingSectionsHomeProvider } from '../working_sections/providers/WorkingSectionsHomeProvider';
import { WorkingSectionsHomeView } from '../working_sections/components/WorkingSectionsHomeView';
import { WorkingSectionStepsProvider } from '../task_steps/providers/WorkingSectionStepsProvider';
import { WorkingSectionStepsView } from '../task_steps/components/WorkingSectionStepsView';
import type { WorkingSectionViewModel } from '../working_sections/types';

export function HomeRouteEntry(): React.JSX.Element {
  const [selectedSection, setSelectedSection] = useState<WorkingSectionViewModel | null>(null);
  const [direction, setDirection] = useState(0);

  function handleSelectSection(section: WorkingSectionViewModel) {
    setDirection(1);
    setSelectedSection(section);
  }

  function handleBack() {
    setDirection(-1);
    setSelectedSection(null);
  }

  return (
    <WorkingSectionsHomeProvider>
      <div className="relative h-full overflow-hidden" data-testid="home-page">
        <AnimatePresence custom={direction} initial={false}>
          {selectedSection === null ? (
            <m.div
              key="sections"
              animate="center"
              className="absolute inset-0 overflow-hidden transform-gpu backface-hidden will-change-transform"
              custom={direction}
              exit="exit"
              initial="enter"
              transition={transitions.tab}
              variants={tabVariants}
            >
              <div className="h-full overflow-y-auto">
                <WorkingSectionsHomeView onSelectSection={handleSelectSection} />
              </div>
            </m.div>
          ) : (
            <m.div
              key={`steps-${selectedSection.sectionId}`}
              animate="center"
              className="absolute inset-0 overflow-hidden transform-gpu backface-hidden will-change-transform"
              custom={direction}
              exit="exit"
              initial="enter"
              transition={transitions.tab}
              variants={tabVariants}
            >
              <div className="h-full overflow-hidden">
                <WorkingSectionStepsProvider sectionId={selectedSection.sectionId}>
                  <WorkingSectionStepsView
                    section={selectedSection}
                    onBack={handleBack}
                  />
                </WorkingSectionStepsProvider>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </WorkingSectionsHomeProvider>
  );
}
```

> **Critical:** `key="sections"` and `key={\`steps-${sectionId}\`}` ensure AnimatePresence correctly unmounts the outgoing panel and mounts the incoming one, triggering the slide animation. Using `key={selectedSection ? 'steps' : 'sections'}` without the sectionId suffix also works but would not re-trigger animation if the user navigates to a different section from the steps panel.

---

### Step 30 — Playwright spec

**File:** `apps/workers-app/ManagerBeyo-app-workers/tests/playwright/features/home/working-sections.spec.ts` (create new)

```ts
import { test, expect } from '../../fixtures/app-fixture';

const hasCredentials =
  Boolean(process.env['PLAYWRIGHT_TEST_EMAIL']) &&
  Boolean(process.env['PLAYWRIGHT_TEST_PASSWORD']);

test.describe('Home — Working Sections', () => {
  test.skip(!hasCredentials, 'Requires PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD');

  test.beforeEach(async ({ auth }) => {
    await auth.signIn();
  });

  test('renders working sections list on home tab', async ({ page }) => {
    await expect(page.getByTestId('working-sections-home-view')).toBeVisible();
    await expect(page.getByTestId('working-sections-list')).toBeVisible();
  });

  test('navigates to steps panel on section tap', async ({ page }) => {
    const firstCard = page.getByTestId(/^working-section-card-/).first();
    await firstCard.click();
    await expect(page.getByTestId('working-section-steps-view')).toBeVisible();
    await expect(page.getByTestId('working-section-steps-title')).toBeVisible();
  });

  test('back button returns to sections list', async ({ page }) => {
    await page.getByTestId(/^working-section-card-/).first().click();
    await expect(page.getByTestId('working-section-steps-view')).toBeVisible();
    await page.getByTestId('working-section-steps-back').click();
    await expect(page.getByTestId('working-sections-home-view')).toBeVisible();
  });

  test('search filters step list', async ({ page }) => {
    await page.getByTestId(/^working-section-card-/).first().click();
    const search = page.getByTestId('working-section-steps-search-input');
    await search.fill('NOMATCH_XYZ_999');
    await expect(page.getByTestId('working-section-steps-empty')).toBeVisible({ timeout: 2000 });
  });

  test('action button transitions step state optimistically', async ({ page }) => {
    await page.getByTestId(/^working-section-card-/).first().click();
    const pendingButton = page.getByTestId(/^task-step-action-button-/).first();
    if (await pendingButton.isVisible()) {
      const buttonText = await pendingButton.textContent();
      await pendingButton.click();
      // Optimistic: button text should change immediately
      await expect(page.getByTestId(/^task-step-action-button-/).first()).not.toHaveText(
        buttonText ?? '',
        { timeout: 500 },
      );
    }
  });

  test('task actions sheet opens on three-dot tap', async ({ page }) => {
    await page.getByTestId(/^working-section-card-/).first().click();
    const actionsButton = page.getByTestId(/^task-step-card-actions-/).first();
    await actionsButton.click();
    await expect(page.getByTestId('task-step-actions-sheet')).toBeVisible();
    await expect(page.getByTestId('task-step-create-case-button')).toBeVisible();
  });
});
```

---

## Summary of all files to create or update

### `packages/lib`
| Action | File |
|---|---|
| CREATE | `src/hooks/use-ticking-elapsed.ts` |
| UPDATE | `src/index.ts` — append `export { useTickingElapsed } from './hooks/use-ticking-elapsed'` |

### `packages/ui`
| Action | File |
|---|---|
| CREATE | `src/components/primitives/ticking-timer/TickingTimer.tsx` |
| CREATE | `src/components/primitives/ticking-timer/index.ts` |
| UPDATE | `src/index.ts` — append `export * from './components/primitives/ticking-timer'` |

### Workers app — `features/working_sections/`
| Action | File |
|---|---|
| CREATE | `src/features/working_sections/types.ts` |
| CREATE | `src/features/working_sections/api/working-section-keys.ts` |
| CREATE | `src/features/working_sections/api/fetch-worker-working-sections.ts` |
| CREATE | `src/features/working_sections/api/use-worker-working-sections.ts` |
| CREATE | `src/features/working_sections/controllers/use-working-sections-home.controller.ts` |
| CREATE | `src/features/working_sections/providers/WorkingSectionsHomeProvider.tsx` |
| CREATE | `src/features/working_sections/components/WorkingSectionsHomeView.tsx` |
| CREATE | `src/features/working_sections/components/WorkingSectionCard.tsx` |
| CREATE | `src/features/working_sections/index.ts` |

### Workers app — `features/task_steps/`
| Action | File |
|---|---|
| CREATE | `src/features/task_steps/types.ts` |
| CREATE | `src/features/task_steps/api/task-step-keys.ts` |
| CREATE | `src/features/task_steps/api/fetch-working-section-steps.ts` |
| CREATE | `src/features/task_steps/api/use-working-section-steps.ts` |
| CREATE | `src/features/task_steps/api/transition-step-state.ts` |
| CREATE | `src/features/task_steps/actions/use-transition-step-state.ts` |
| CREATE | `src/features/task_steps/controllers/use-working-section-steps.controller.ts` |
| CREATE | `src/features/task_steps/providers/WorkingSectionStepsProvider.tsx` |
| CREATE | `src/features/task_steps/components/TaskStepActionButton.tsx` |
| CREATE | `src/features/task_steps/components/TaskStepCard.tsx` |
| CREATE | `src/features/task_steps/components/WorkingSectionStepsView.tsx` |
| CREATE | `src/features/task_steps/surface-ids.ts` |
| CREATE | `src/features/task_steps/surfaces.ts` |
| CREATE | `src/features/task_steps/index.ts` |

### Workers app — pages + app
| Action | File |
|---|---|
| CREATE | `src/pages/task_steps/TaskStepActionsSheetPage.tsx` |
| CREATE | `src/pages/task_steps/TaskDetailSlidePage.tsx` |
| UPDATE | `src/app/surface-registry.ts` |
| UPDATE | `src/features/home/route-entry.tsx` |

### Tests
| Action | File |
|---|---|
| CREATE | `tests/playwright/features/home/working-sections.spec.ts` |

---

## Risks and mitigations

- **Risk:** `ApiEnvelopeSchema` wrapper — verify the exact helper exported from `@beyo/lib`. If it is `ApiEnvelopeSchema(DataSchema).parse(response.data)` or `ApiEnvelopeSchema.extend({ data: DataSchema }).parse(response.data)`, check `packages/lib/src/types/api.ts` before writing fetch functions.
  **Mitigation:** Read `packages/lib/src/types/api.ts` (relational read — understanding what exists) before implementing fetch functions. Adjust envelope parsing to match the actual helper signature.

- **Risk:** The `useSurface().open<T>(id, props)` generic may not be supported if the `SurfaceStore` type is `open(id: string, props: unknown)`. Check `packages/ui/src/providers/SurfaceProvider.tsx` if TypeScript errors appear on `open<T>`.
  **Mitigation:** Cast props inline or use a typed wrapper. The surface-ids.ts `SurfaceProps` types serve as documentation regardless.

- **Risk:** `tabVariants` has `exit` key using the direction sign — on back navigation, `direction=-1` makes the outgoing panel exit to the right and incoming panel enter from the left. Verify this feels correct in the browser. If the animation direction feels inverted, flip the sign passed to `setDirection`.
  **Mitigation:** Run the dev server after wiring the route-entry and test the slide direction manually.

- **Risk:** `WorkingSectionStepsView` uses `pl-12` on the search bar row to visually align with the content (skip the back-button width). If the back button size changes, adjust the padding.
  **Mitigation:** Visual check in the browser after implementation.

- **Risk:** The `today_start` calculation uses local time. If the worker is in a different timezone than UTC, the "today" window may differ from what the backend expects. The backend accepts any ISO 8601 timestamp.
  **Mitigation:** Use local midnight (`new Date(y, m, d).toISOString()`) — this sends local midnight as a UTC offset, which is the natural "start of today" for the worker.

## Validation plan

- `npm run typecheck`: zero TypeScript errors in `packages/lib`, `packages/ui`, and `apps/workers-app`
- Visual: Run `npm run dev` from the workers app, sign in, navigate to home, verify section list renders and slide animation works
- Visual: Tap a section, verify steps render, search debounces, action button transitions step state
- Visual: Verify TickingTimer increments every second without causing parent re-renders (use React DevTools)
- `npm run test:e2e:mobile -- --grep "Working Sections"`: all 5 tests pass on `--project=mobile`
- `npm run test:e2e:desktop -- --grep "Working Sections"`: all 5 tests pass on `--project=desktop`

## Review log

_Empty — plan not yet reviewed._

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: David Loorenz
