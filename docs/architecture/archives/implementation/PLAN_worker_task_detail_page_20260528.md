# PLAN_worker_task_detail_page_20260528

## Metadata

- Plan ID: `PLAN_worker_task_detail_page_20260528`
- Status: `archived`
- Owner agent: `GitHub Copilot`
- Created at (UTC): `2026-05-28T00:00:00Z`
- Last updated at (UTC): `2026-05-28T18:35:00Z`
- Related issue/ticket: Worker task detail page
- Intention plan: n/a

---

## Goal and intent

- **Goal:** Implement `TaskDetailSlidePage` in the workers app (`apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskDetailSlidePage.tsx`). The page replaces the current "coming soon" stub with a full read-only task step detail view, including a large circular action button, image preview, item details, upholstery section, flow timeline, and a scroll-aware complete footer.
- **Business/user intent:** Workers need to see all relevant context for a task step (images with annotations, item info, upholstery, history) and be able to control their own workflow (start/pause/resume/complete) from a single dedicated surface without navigating back to the section list.
- **Non-goals:** Editing item fields, editing upholstery selection, adding images, or any mutation beyond step state transitions. Creating a new backend endpoint for single-step fetch.

---

## Scope

- **In scope:**
  - Update `TaskStepDetailSurfaceProps` to carry `workingSectionId`
  - Create minimal `features/upholstery/` API layer in the workers app
  - Create `use-task-step-detail.controller.ts`
  - Create `TaskStepDetailProvider`
  - Create all detail components (`TaskStepDetailHeader`, `TaskStepCircularActionButton`, `TaskStepImagesPreview`, `TaskStepItemDetailsSection`, `TaskStepUpholsterySection`)
  - Implement the complete page layout with scroll-visibility footer
  - Update `use-working-section-steps.controller.ts` to pass `workingSectionId` when opening the detail surface

- **Out of scope:**
  - New backend endpoint for a single-step GET
  - Deep-link support (page only opens from the section list surface)
  - Editing any field on the step/task/item
  - Adding or removing images

- **Assumptions:**
  - The step is always present in the TQ cache when the detail surface opens (user tapped from the section list).
  - `useWorkingSectionStepsQuery({ working_section_id, limit: 50, offset: 0 })` in the detail controller is an acceptable cache-read strategy because: (a) the optimistic patch in `useTransitionStepState` uses `setQueriesData` scoped to `taskStepKeys.sectionListsBySection`, which patches ALL section queries regardless of params; (b) a 50-step limit is sufficient for any realistic section size.
  - `@beyo/item-categories` is already installed and its cache is warm from the `HomeRouteEntry` cache-warming call.
  - The `TaskFlowTimeline` from `@beyo/tasks` fetches its own data using `taskId` — it is already self-contained.

---

## Clarifications required

_(none — all decisions resolved during plan authoring)_

---

## Acceptance criteria

1. Opening the detail surface from a task step card renders the full detail page (header, circular button, images, item details, upholstery, flow timeline, footer).
2. Tapping the circular action button transitions the step state (start → working, working → paused, paused → working) with the same optimistic behavior as the card list.
3. The "Complete" footer button transitions the step to `completed` and disables when the step is already in a terminal state.
4. The footer slides down when the user scrolls past the threshold and slides back up when scrolling up.
5. Up to three images are shown in the preview; the third image shows a dark overlay with `+N` count when more than three exist; tapping any image opens the full image viewer in `preview-only` mode.
6. The first two visible images render their annotation SVG overlays.
7. Item position is shown (or omitted if null). Quantity and item category pills render correctly; the category pill shows image + name via `useItemCategoryByIdFlow`.
8. The upholstery section displays each active `upholstery_requirement` entry as a read-only card (image, name, code, amount) by fetching upholstery details from `/api/v1/upholsteries/:id`. If no requirements exist, a "No upholstery linked" message is shown.
9. `npm run typecheck` passes in the workers app with zero errors.

---

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: monorepo layout, app vs. package boundaries
- `architecture/04_api_client.md`: `apiClient` import from `@beyo/api-client`, `ApiEnvelopeSchema` from `@beyo/lib`
- `architecture/05_server_state.md`: TanStack Query setup — `useQuery`, `useMutation`, cache strategy
- `architecture/08_hooks.md`: Action / Controller / Flow taxonomy; controller aggregates all UI needs into one typed API
- `architecture/07_components.md`: Components consume context via hook; no direct logic layer imports
- `architecture/13_errors.md`: error handling patterns
- `architecture/15_feature_structure.md`: Feature folder layout, layer responsibilities
- `architecture/23_providers.md`: Provider pattern — one Provider per UI section, exports Provider + context hook
- `architecture/28_surfaces_local.md`: `slide` surface type used by this page

### Local extensions loaded

- `architecture/04_api_client_local.md`: `apiClient` from `@beyo/api-client` (not `@/lib/api-client`); `ApiEnvelopeSchema` from `@beyo/lib`

### File read intent — pattern vs. relational

Prohibited (pattern reads — contract already covers these):
- Reading another controller to understand aggregation shape → `08_hooks.md`
- Reading another provider to understand context shell → `23_providers.md`

Permitted (relational reads — understanding what exists):
- Reading `features/task_steps/types.ts` for exact field names, schemas, and view model types
- Reading `features/task_steps/actions/use-transition-step-state.ts` for TransitionInput shape
- Reading `features/task_steps/api/task-step-keys.ts` for key factory shape
- Reading `features/task_steps/controllers/use-working-section-steps.controller.ts` to find the open-detail callsite to update
- Reading `features/task_steps/surface-ids.ts` to verify current surface props shape
- Reading `packages/tasks/src/components/TaskFlowTimeline.tsx` to verify props contract
- Reading `packages/item-categories/src/flows/use-item-category-by-id.ts` to verify flow return shape
- Reading `packages/ui/src/components/primitives/scroll-visibility/` to verify hook API
- Reading `packages/ui/src/components/primitives/shared/InfoPill.tsx` and `EyebrowLabel.tsx` for render API
- Reading `apps/managers-app/.../features/upholstery/api/fetch-upholstery.ts` to establish endpoint path and schema

### Skill selection

- Primary skill: n/a (no single skill fully covers this multi-layer feature build)

---

## Domain schema

Established from `apps/workers-app/.../features/task_steps/types.ts`:

- `TaskStep` — the root entity (`client_id: TaskStepId`, `task_id: TaskId`, `state: StepState`, `last_state_record: LastStateRecord | null`, `task: TaskSnapshot`, `item: ItemSnapshot | null`, `item_images: ItemImage[]`)
- `TaskSnapshot` — `task_type`, `return_source`, `ready_by_at`, `state`, `priority`
- `ItemSnapshot` — `article_number`, `sku`, `quantity`, `item_position`, `item_category_id`, `upholstery_requirement: UpholsteryRequirement[]`
- `UpholsteryRequirementSchema` — `client_id`, `item_upholstery_id`, `state`, `source`, `amount_meters`
- `ItemImage` — union of `ItemImageFullSchema | ItemImageLightSchema`; full schema has `image_annotation`; discriminate with `"image_annotation" in img`
- `StepState` — `pending | working | paused | ended_shift | blocked | completed | skipped | failed | cancelled`
- `STEP_QUICK_TRANSITION` — `{ pending→working, working→paused, paused→working, ended_shift→working }`
- `STEP_TERMINAL_STATES` — `completed | skipped | failed | cancelled`
- `TaskStepCardViewModel` — already has `firstImageAnnotations`, `firstImageWidthPx`, `firstImageHeightPx`

---

## Implementation plan

> Follow the build order from `frontend_contract_goal_mapping_guide.md`:
> Types/Schema → Query Keys → API Functions + Query Hooks → Actions → Controllers → Providers → Components → Pages → Public API (index.ts)

### Step 1 — Update `surface-ids.ts`: add `workingSectionId` to `TaskStepDetailSurfaceProps`

File: `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surface-ids.ts`

Add `workingSectionId: WorkingSectionId` to `TaskStepDetailSurfaceProps`:

```ts
import type { TaskId, TaskStepId, WorkingSectionId } from "@beyo/lib";

export type TaskStepDetailSurfaceProps = {
  stepId: TaskStepId;
  taskId: TaskId;
  workingSectionId: WorkingSectionId;
};
```

---

### Step 2 — Create `features/upholstery/` minimal API layer

The workers app needs to fetch upholstery details by `item_upholstery_id`. This is a new feature domain, so create a minimal feature folder. No types file is needed beyond the API types (Zod-inferred). No action layer needed (read-only).

**2a.** `apps/workers-app/ManagerBeyo-app-workers/src/features/upholstery/api/upholstery-keys.ts`

```ts
export const upholsteryKeys = {
  all: ["upholsteries"] as const,
  details: () => [...upholsteryKeys.all, "detail"] as const,
  detail: (id: string) => [...upholsteryKeys.details(), id] as const,
};
```

**2b.** `apps/workers-app/ManagerBeyo-app-workers/src/features/upholstery/api/fetch-upholstery.ts`

```ts
import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

export const UPHOLSTERY_INVENTORY_CONDITION = [
  "available",
  "low_stock",
  "out_of_stock",
] as const;

export const UpholsteryPickerOptionSchema = z.object({
  client_id: z.string(),
  name: z.string(),
  code: z.string().nullable(),
  image_url: z.string().nullable(),
  favorite: z.boolean(),
  list_order: z.number().nullable(),
  current_stored_amount_meters: z.string().nullable(),
  inventory_condition: z.enum(UPHOLSTERY_INVENTORY_CONDITION).nullable(),
});
export type UpholsteryPickerOption = z.infer<typeof UpholsteryPickerOptionSchema>;

const ResponseSchema = ApiEnvelopeSchema(
  z.object({ upholstery: UpholsteryPickerOptionSchema }),
);

export async function fetchUpholstery(clientId: string): Promise<UpholsteryPickerOption> {
  const response = await apiClient.get(
    `/api/v1/upholsteries/${clientId}`,
    ResponseSchema,
  );
  return response.data.upholstery;
}
```

**2c.** `apps/workers-app/ManagerBeyo-app-workers/src/features/upholstery/api/use-upholstery-query.ts`

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchUpholstery } from "./fetch-upholstery";
import { upholsteryKeys } from "./upholstery-keys";

export function useUpholsteryQuery(clientId: string | null | undefined) {
  return useQuery({
    queryKey: clientId
      ? upholsteryKeys.detail(clientId)
      : upholsteryKeys.details(),
    queryFn: () => {
      if (!clientId) throw new Error("clientId is required");
      return fetchUpholstery(clientId);
    },
    enabled: Boolean(clientId),
  });
}
```

**2d.** `apps/workers-app/ManagerBeyo-app-workers/src/features/upholstery/index.ts`

```ts
export { useUpholsteryQuery } from "./api/use-upholstery-query";
export type { UpholsteryPickerOption } from "./api/fetch-upholstery";
```

---

### Step 3 — Create `use-task-step-detail.controller.ts`

File: `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-task-step-detail.controller.ts`

The controller:
- Reads `stepId`, `taskId`, `workingSectionId` from `useSurfaceProps<TaskStepDetailSurfaceProps>()`
- Fetches step list from `useWorkingSectionStepsQuery` (same cache key scope as the list view — no new HTTP request when cache is warm)
- Derives the specific step from the paginated response by filtering on `client_id === stepId`
- Derives `vm` from `toTaskStepCardViewModel`
- Uses `useTransitionStepState` action for all state transitions (quick action + complete footer)
- Opens the image viewer via `useSurface().open`
- Opens the flow record surface via `useSurface().open` (if a flow record detail surface exists; otherwise a no-op)

```ts
import { useCallback, useMemo } from "react";
import { useSurface } from "@beyo/hooks";
import { useSurfaceProps } from "@beyo/hooks";
import type { TaskId, TaskStepId, WorkingSectionId } from "@beyo/lib";
import {
  IMAGE_VIEWER_SURFACE_ID,
  ImageAnnotationSchema,
  toImageAnnotationViewModel,
  toImageAnnotationViewModels,
  type ImageLinkEntityType,
  type ImageUploadState,
  type ImageViewModel,
} from "@beyo/images";
import { useTransitionStepState } from "../actions/use-transition-step-state";
import { useWorkingSectionStepsQuery } from "../api/use-working-section-steps";
import type { TaskStepDetailSurfaceProps } from "../surface-ids";
import {
  STEP_TERMINAL_STATES,
  toTaskStepCardViewModel,
  type StepState,
  type TaskStepCardViewModel,
  type TaskStep,
} from "../types";

export type TaskStepDetailController = {
  stepId: TaskStepId;
  taskId: TaskId;
  workingSectionId: WorkingSectionId;
  step: TaskStep | null;
  vm: TaskStepCardViewModel | null;
  isPending: boolean;
  isError: boolean;
  isStepTerminal: boolean;
  handleTransition: (stepId: TaskStepId, taskId: TaskId, nextState: StepState) => void;
  handleComplete: () => void;
  handleOpenImageViewer: (initialImageClientId: string) => void;
  handleOpenFlowRecord: (entityClientId: string) => void;
  isTransitioning: boolean;
  transitioningStepId: TaskStepId | null;
};

export function useTaskStepDetailController(): TaskStepDetailController {
  const { stepId, taskId, workingSectionId } =
    useSurfaceProps<TaskStepDetailSurfaceProps>();

  const query = useWorkingSectionStepsQuery({
    working_section_id: workingSectionId,
    limit: 50,
    offset: 0,
  });

  const step = useMemo(
    () => query.data?.items.find((s) => s.client_id === stepId) ?? null,
    [query.data?.items, stepId],
  );

  const vm = useMemo(
    () => (step ? toTaskStepCardViewModel(step) : null),
    [step],
  );

  const { transitionStepState, isPending: isTransitioning, pendingStepId } =
    useTransitionStepState();
  const { open: openSurface } = useSurface();

  const handleTransition = useCallback(
    (sId: TaskStepId, tId: TaskId, nextState: StepState) => {
      transitionStepState({
        task_id: tId,
        step_id: sId,
        new_state: nextState,
        working_section_id: workingSectionId,
      });
    },
    [transitionStepState, workingSectionId],
  );

  const handleComplete = useCallback(() => {
    if (!vm || STEP_TERMINAL_STATES.has(vm.state)) return;
    transitionStepState({
      task_id: taskId,
      step_id: stepId,
      new_state: "completed",
      working_section_id: workingSectionId,
    });
  }, [vm, taskId, stepId, workingSectionId, transitionStepState]);

  const handleOpenImageViewer = useCallback(
    (initialImageClientId: string) => {
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
        initialImageClientId,
        entityType: "item" as ImageLinkEntityType,
        entityClientId: entityClientId ?? "",
        mode: "preview-only",
        enableOnDemandImageLoad: false,
      });
    },
    [step, openSurface],
  );

  // Flow record detail surface not yet registered in workers app — no-op for now
  const handleOpenFlowRecord = useCallback((_entityClientId: string) => {}, []);

  return {
    stepId,
    taskId,
    workingSectionId,
    step,
    vm,
    isPending: query.isPending,
    isError: query.isError,
    isStepTerminal: vm ? STEP_TERMINAL_STATES.has(vm.state) : false,
    handleTransition,
    handleComplete,
    handleOpenImageViewer,
    handleOpenFlowRecord,
    isTransitioning,
    transitioningStepId: pendingStepId ?? null,
  };
}
```

---

### Step 4 — Create `TaskStepDetailProvider`

File: `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/providers/TaskStepDetailProvider.tsx`

Standard provider shell per `23_providers.md`:

```tsx
import { createContext, useContext } from "react";
import {
  useTaskStepDetailController,
  type TaskStepDetailController,
} from "../controllers/use-task-step-detail.controller";

const TaskStepDetailContext = createContext<TaskStepDetailController | null>(null);

export function TaskStepDetailProvider({ children }: { children: React.ReactNode }) {
  const controller = useTaskStepDetailController();
  return (
    <TaskStepDetailContext.Provider value={controller}>
      {children}
    </TaskStepDetailContext.Provider>
  );
}

export function useTaskStepDetailContext(): TaskStepDetailController {
  const ctx = useContext(TaskStepDetailContext);
  if (!ctx) {
    throw new Error(
      "useTaskStepDetailContext must be used within <TaskStepDetailProvider>",
    );
  }
  return ctx;
}
```

---

### Step 5 — Create detail components

All components live in `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/detail/`.

All components consume context via `useTaskStepDetailContext()` per `07_components.md`.

**Exception documented**: `TaskStepUpholsterySection` is allowed to call `useUpholsteryQuery` directly (not through the controller). Rationale: upholstery data is one-per-requirement, varies per item, and is not shared by any other component on the page. Lifting it into the controller would require storing `N` query results in the controller type. The self-contained query pattern is identical to `TaskFlowTimeline` in `@beyo/tasks`.

---

#### 5a. `TaskStepDetailHeader.tsx`

Structure (mirrors `TaskDetailHeader` in managers app but uses `StepState` + back button):

```
Row 1:  [ ← back button ]  [ article label (truncate) ]  [ step state pill ]  [ ⋮ actions ]
Row 2:  [ task type icon ]  [ task type label (± return source) ]
Row 3:  [ calendar icon ]  [ ready_by_at formatted (DD/MM/YY) ]  [ DaysLeftPill? ]
```

- **Back button**: calls `useSurfaceHeader()` → `header.requestClose()`. Uses `ChevronLeft` icon from lucide-react.
- **State pill**: use `StatePill` from `@beyo/ui` with the step `state` (NOT the task state). Provide a `STEP_STATE_VARIANT` map similar to the managers app's `TASK_STATE_VARIANT`.
- **Three-dot menu button**: no surface yet in workers app — calls a no-op or `handleOpenFlowRecord` stub. Render as `⋮` button.
- **Article label**: `vm.articleLabel` from context.
- **Task type icon / label**: same `TYPE_ICON` and `TYPE_LABEL` maps from `TaskStepCard.tsx` — extract them to a shared file, or re-declare locally.
- **DaysLeftPill**: extract and reuse the inline `DaysLeftPill` component from the managers app's `TaskDetailHeader` (copy, not import — different app).
- **`data-testid`**: `"task-step-detail-header"`

```tsx
import { ChevronLeft, Calendar, RotateCcw, ShoppingBag, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { m } from "framer-motion";
import { useSurfaceHeader } from "@beyo/hooks";
import { StatePill } from "@beyo/ui";
import type { StatePillVariant } from "@beyo/ui";
import type { StepState } from "../types";
import { useTaskStepDetailContext } from "../providers/TaskStepDetailProvider";

const TYPE_ICON: Record<string, LucideIcon> = {
  return: RotateCcw,
  pre_order: ShoppingBag,
  internal: Wrench,
};
const TYPE_LABEL: Record<string, string> = {
  return: "Return",
  pre_order: "Pre-order",
  internal: "Internal",
};
const RETURN_SOURCE_LABEL: Record<string, string> = {
  after_purchase: "After purchase",
  before_purchase: "Before purchase",
  store_return: "Store return",
};
const STEP_STATE_VARIANT: Partial<Record<StepState, StatePillVariant>> = {
  pending: "default",
  working: "active",
  paused: "warning",
  ended_shift: "warning",
  blocked: "danger",
  completed: "success",
  skipped: "default",
  failed: "danger",
  cancelled: "default",
};
```

> **Note for Copilot**: check what `StatePillVariant` values are available in `@beyo/ui`'s `StatePill` component and use the closest match for each step state.

---

#### 5b. `TaskStepCircularActionButton.tsx`

Large centered circular button that mirrors the behavior of `TaskStepActionButton` but with a circular layout.

Props (all from context via parent, but the component itself accepts them as explicit props for memoization):

```ts
type TaskStepCircularActionButtonProps = {
  stepId: TaskStepId;
  taskId: TaskId;
  state: StepState;
  lastStateRecord: LastStateRecord | null;
  onTransition: (stepId: TaskStepId, taskId: TaskId, nextState: StepState) => void;
  isTransitioning: boolean;
};
```

Layout:
```
<div className="flex flex-col items-center gap-2">
  <button            ← the big circle
    type="button"
    aria-label={label}
    disabled={isTransitioning || nextState === undefined}
    className="... size-24 rounded-full ..."
    onClick={...}
  >
    <Icon className="size-8" />
  </button>
  {showTimer && <TickingTimer startedAtIso={lastStateRecord.entered_at} ... />}
  <span className="text-sm text-muted-foreground">{label}</span>
</div>
```

Color rules (same as `TaskStepActionButton`):
- `isWorking` → `bg-(--color-soft-container) text-foreground`
- other (pending/paused/ended_shift) → `bg-primary text-card`
- Terminal state → button is hidden (return `null`)

Labels:
- `pending` → "Tap to start"
- `working` → "Tap to pause"
- `paused` | `ended_shift` → "Tap to resume"

The ticking timer appears **below the circle** when `isWorking && lastStateRecord !== null`.

Use `TickingTimer` from `@beyo/ui`.

`data-testid`: `"task-step-circular-action-${stepId}"`

---

#### 5c. `TaskStepImagesPreview.tsx`

Accepts no props — reads from context. Shows up to 3 images from `step.item_images`.

Layout:
```
<div className="flex gap-2">
  {previews.map((img, index) => (
    <button key={img.client_id} onClick={() => handleOpenImageViewer(img.client_id)}
            className="relative aspect-square flex-1 overflow-hidden rounded-xl bg-muted">
      <img src={img.image_url} ... className="size-full object-cover" />
      {index < 2 && <ImageAnnotationSvgLayer annotations={...} coverMode ... />}
      {isLastSlot && extraCount > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <span className="text-lg font-semibold text-white">+{extraCount}</span>
        </div>
      )}
    </button>
  ))}
</div>
```

Logic:
- `previews = step.item_images.slice(0, 3)`
- `extraCount = step.item_images.length - 3` (shown on index 2 when > 0)
- Annotations for index 0: same extraction logic as `toTaskStepCardViewModel` but for `item_images[0]` and `item_images[1]`
- Annotations for index 2: none (overlay displayed instead)
- Parse annotations from `ItemImageFullSchema` where `"image_annotation" in img`
- When no images: render nothing (or a single placeholder — design choice left to Copilot)

`data-testid`: `"task-step-images-preview"`

---

#### 5d. `TaskStepItemDetailsSection.tsx`

Reads from context. Shows item position and detail pills.

Structure:
```
<div data-testid="task-step-item-details">
  {item.item_position && (
    <div>
      <EyebrowLabel>Position</EyebrowLabel>
      <p className="text-sm text-foreground">{item.item_position}</p>
    </div>
  )}

  <div className="flex gap-2">
    {/* Quantity pill */}
    <InfoPill data-testid="task-step-item-qty-pill">
      <span className="text-sm">{item.quantity}×</span>
    </InfoPill>

    {/* Category pill */}
    {item.item_category_id && (
      <ItemCategoryPill categoryId={item.item_category_id} />
    )}
  </div>
</div>
```

**`ItemCategoryPill`** is a local sub-component (not exported) that calls `useItemCategoryByIdFlow(id)` from `@beyo/item-categories`:
- Loading: empty `InfoPill` or skeleton pill
- Loaded: `InfoPill` with `<img src={category.imageUrl} className="size-4 rounded-full mr-1.5 object-cover" />{category.name}`
- Error: omit the pill silently

> Note: `useItemCategoryByIdFlow` reads from the warm cache (set at `HomeRouteEntry`). No network request expected in typical use.

---

#### 5e. `TaskStepUpholsterySection.tsx`

**Documented exception**: this component calls `useUpholsteryQuery` directly (not through the controller) because upholstery data is per-requirement and not shared. This mirrors the `TaskFlowTimeline` self-contained pattern.

The component reads `step` from context, then for each `upholstery_requirement` entry, renders an `UpholsteryEntryCard` sub-component that fetches its own data.

Structure:
```
<DashedInfoSection data-testid="task-step-upholstery-section">
  <SectionLabel as="h3" tone="muted">Selected Upholstery</SectionLabel>

  {requirements.length === 0 ? (
    <p className="text-sm text-muted-foreground">No upholstery linked.</p>
  ) : (
    requirements.map((req) => (
      <UpholsteryEntryCard key={req.client_id} requirement={req} />
    ))
  )}
</DashedInfoSection>
```

`UpholsteryEntryCard` (local sub-component):
- Props: `requirement: UpholsteryRequirementSchema` (from task_steps types)
- Calls `useUpholsteryQuery(requirement.item_upholstery_id)`
- Renders: image (or `ImagePlaceholder`), name, code, amount in meters
- Read-only: no tap / no edit button (key difference from managers app)
- Loading: show a subtle loading skeleton or `null` while pending
- `data-testid`: `"upholstery-entry-card-${requirement.client_id}"`

Imports needed:
- `useUpholsteryQuery` from `@/features/upholstery`
- `DashedInfoSection`, `SectionLabel`, `ImagePlaceholder` from `@beyo/ui`
- `UpholsteryRequirementSchema` type inferred from `task_steps/types.ts`

---

#### 5f. `components/detail/index.ts`

```ts
export { TaskStepDetailHeader } from "./TaskStepDetailHeader";
export { TaskStepCircularActionButton } from "./TaskStepCircularActionButton";
export { TaskStepImagesPreview } from "./TaskStepImagesPreview";
export { TaskStepItemDetailsSection } from "./TaskStepItemDetailsSection";
export { TaskStepUpholsterySection } from "./TaskStepUpholsterySection";
```

---

### Step 6 — Update `use-working-section-steps.controller.ts`: pass `workingSectionId`

File: `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-working-section-steps.controller.ts`

In `handleOpenTaskDetail`, add `workingSectionId: sectionId` to the surface props:

```ts
const handleOpenTaskDetail = useCallback(
  (stepId: TaskStepId, taskId: TaskId) => {
    openSurface(TASK_STEP_DETAIL_SURFACE_ID, {
      stepId,
      taskId,
      workingSectionId: sectionId,  // ← add this
    } as TaskStepDetailSurfaceProps);
  },
  [openSurface, sectionId],  // ← add sectionId to deps
);
```

---

### Step 7 — Implement `TaskDetailSlidePage`

File: `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskDetailSlidePage.tsx`

Full structure:

```tsx
import { useEffect } from "react";
import { useSurfaceHeader } from "@beyo/hooks";
import { ContentCard, DashedInfoSection, SectionLabel, useScrollVisibility } from "@beyo/ui";
import { TaskFlowTimeline } from "@beyo/tasks";
import {
  TaskStepDetailProvider,
  useTaskStepDetailContext,
} from "@/features/task_steps/providers/TaskStepDetailProvider";
import {
  TaskStepDetailHeader,
  TaskStepCircularActionButton,
  TaskStepImagesPreview,
  TaskStepItemDetailsSection,
  TaskStepUpholsterySection,
} from "@/features/task_steps/components/detail";
import { cn } from "@beyo/lib";

function TaskDetailSlidePageContent(): React.JSX.Element {
  const header = useSurfaceHeader();
  const controller = useTaskStepDetailContext();
  const { scrollRef, isHidden } = useScrollVisibility();

  useEffect(() => {
    header?.setHeaderHidden(true);
  }, [header]);

  if (controller.isPending) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (controller.isError || !controller.step || !controller.vm) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">Could not load task details.</p>
      </div>
    );
  }

  const { vm, stepId, taskId, handleTransition, handleComplete,
          isTransitioning, transitioningStepId, isStepTerminal, taskId: tId } = controller;

  return (
    <div className="relative flex h-full flex-col bg-background">
      {/* Scrollable body */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto pb-[calc(var(--safe-bottom,0px)+5rem)]"
        data-testid="task-detail-slide-page"
      >
        <TaskStepDetailHeader />

        {/* Circular action button section */}
        {!isStepTerminal && (
          <div className="flex flex-col items-center gap-2 px-6 py-4">
            <TaskStepCircularActionButton
              isTransitioning={isTransitioning}
              lastStateRecord={vm.lastStateRecord}
              state={vm.state}
              stepId={vm.stepId}
              taskId={vm.taskId}
              onTransition={handleTransition}
            />
          </div>
        )}

        <ContentCard className="mx-4 mt-2">
          {/* Images preview */}
          <TaskStepImagesPreview />

          {/* Item details */}
          <TaskStepItemDetailsSection />

          {/* Upholstery */}
          <TaskStepUpholsterySection />

          {/* Flow timeline */}
          <TaskFlowTimeline
            taskId={controller.taskId}
            onRecordPress={controller.handleOpenFlowRecord}
          />
        </ContentCard>
      </div>

      {/* Scroll-aware complete footer */}
      {!isStepTerminal && (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 transition-transform duration-300",
            isHidden ? "translate-y-full" : "translate-y-0",
          )}
        >
          <div className="border-t border-border bg-background px-4 pb-[calc(var(--safe-bottom,0px)+0.75rem)] pt-3">
            <button
              type="button"
              data-testid="task-step-complete-button"
              disabled={isTransitioning || isStepTerminal}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-card disabled:opacity-50"
              onClick={handleComplete}
            >
              Complete task
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TaskDetailSlidePage(): React.JSX.Element {
  return (
    <TaskStepDetailProvider>
      <TaskDetailSlidePageContent />
    </TaskStepDetailProvider>
  );
}
```

> **Note for Copilot**: `ContentCard` in the workers app may need to be imported from `@beyo/ui` or a local `@/components/primitives` barrel — confirm the correct import path. If it doesn't exist in `@beyo/ui`, create a local equivalent or use a `div` with the same card styling as in `TaskStepCard` (`rounded-xl bg-card shadow-sm`). Check `packages/ui/src/index.ts` for exports before creating a local component.

---

### Step 8 — Update `features/task_steps/index.ts`

Add exports for the new provider and context hook:

```ts
export {
  TaskStepDetailProvider,
  useTaskStepDetailContext,
} from "./providers/TaskStepDetailProvider";
```

---

### Step 9 — TypeScript typecheck

Run `npm run typecheck` from `apps/workers-app/ManagerBeyo-app-workers/`. Fix all errors before marking complete.

Common failure points to watch for:
- `useSurfaceProps` generic type — ensure `TaskStepDetailSurfaceProps` is imported from `@/features/task_steps/surface-ids`
- `WorkingSectionId` branded type — surface props must use `WorkingSectionId`, not plain `string`
- `UpholsteryRequirement` type — use `z.infer<typeof UpholsteryRequirementSchema>` from `task_steps/types.ts`
- `StatePillVariant` union values — must match exactly what `@beyo/ui` exports

---

## Risks and mitigations

- **Risk:** Step not found in 50-item page if the section has >50 items.
  **Mitigation:** Acceptable for current data volumes. The detail surface always opens from the list which already has the step in cache at the first page. Document as a known limitation.

- **Risk:** `ContentCard` not available in `@beyo/ui`.
  **Mitigation:** Before creating a local component, check `packages/ui/src/index.ts`. If absent, create `components/primitives/ContentCard.tsx` in the workers app mirroring the managers app's `FormFieldContainer`.

- **Risk:** `DashedInfoSection` / `SectionLabel` imports — used by `TaskStepUpholsterySection`.
  **Mitigation:** Both are exported from `@beyo/ui`. Confirm via `packages/ui/src/index.ts`. If not there, look at the managers app's `components/primitives/index.ts` for the pattern.

- **Risk:** `useSurface` / `useSurfaceHeader` import path.
  **Mitigation:** In the workers app these come from `@beyo/hooks` (confirmed from controller read). Do not use `@/hooks/...` paths.

- **Risk:** `TickingTimer` not exported from `@beyo/ui`.
  **Mitigation:** It is already used in `TaskStepActionButton` with `import { TickingTimer } from "@beyo/ui"`. Use the same import.

- **Risk:** The workers app `index.css` does not have `@source` for the new `upholstery` feature.
  **Mitigation:** No new Tailwind classes are introduced in `features/upholstery/` (it's pure API logic). The `components/detail/` files use the same tokens already scanned from `src/**`. No `@source` change needed.

---

## Validation plan

- `npm run typecheck` (workers app): zero TypeScript errors
- Manual smoke test: open a task step card → detail page renders with all sections
- Manual: tap circular button → optimistic state change visible on both detail page and behind it in the section list (shared TQ cache)
- Manual: tap "Complete task" footer → step transitions to `completed`, footer disappears
- Manual: scroll down → footer slides out; scroll up → footer slides back in
- Manual: tap an image → full image viewer opens in `preview-only` mode
- Manual: annotations visible on first two preview images, overlay on third when count > 3

---

## Review log

- 2026-05-28: Implemented in workers app, validated with `npm run typecheck` (pass), and archived.

---

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `GitHub Copilot`
