# PLAN_quick_preorder_assign_item_step_20260728

## Metadata

- Plan ID: `PLAN_quick_preorder_assign_item_step_20260728`
- Status: `approved`
- Owner agent: `claude-opus-5`
- Created at (UTC): `2026-07-28T00:00:00Z`
- Last updated at (UTC): `2026-07-28T08:05:59Z`
- Related issue/ticket: `n/a`
- Intention plan: `n/a` (verbal intention captured in "Goal and intent" below)

## Goal and intent

- Goal: give the pre-order variant of `QuickTaskAssignSlidePage` its own staged form: a third step (`item`) between the task list step and the `assign` step that captures **article number** and **quantity** for the selected task's primary item, single-task selection with auto-advance, and a submit that persists the item patch (`PATCH /api/v1/items/{id}`) in addition to the task-step creation.
- Business/user intent: a manager entering the quick-assign flow from the home page (`HomeView` → `QUICK_TASK_ASSIGN_SLIDE_SURFACE_ID` with `taskType: "pre_order"`) must complete the item identity data (article number + quantity) at the moment the pre-order is dispatched to working sections. Pre-orders arrive without a confirmed article number; assigning work without it produces items that cannot be located later.
- Non-goals:
  - Changing the `return` variant. It keeps the current 2-step (`list` → `assign`), multi-select, batch-apply behavior.
  - Making SKU editable in this step, or patching `sku` from this surface.
  - Changing `HomeView` or the surface registration/props contract (`QuickTaskAssignSurfaceProps` stays as-is).
  - Changing `useTaskWorkingSectionsController` / `TaskWorkingSectionsProvider` save semantics used by the other slide pages (`TaskWorkingSectionsSlidePage`, `TaskWorkingSectionsReassignSlidePage`).
  - Item lookup/scanner resolution, upholstery, item position, or notes in this step.

## Scope

- In scope (all inside `packages/task-working-sections/` unless noted):
  - `packages/items/src/components/ItemIdentityField.tsx` — **additive** `availableTabs` prop so a consumer can render the article-number input without the SKU tab. Default keeps today's two-tab behavior for all five existing consumers.
  - `src/types.ts` (new) — `QuickPreOrderItemFormSchema` + `QuickPreOrderItemFormValues`.
  - `src/lib/select-quick-lookup-result.ts` (new) — lookup-result selection + signature guard (local; the equivalents in `@beyo/task-creation` drag in `@beyo/item-categories` and `@beyo/images` and must not be imported here).
  - `src/controllers/use-quick-pre-order-item.controller.ts` (new) — RHF form, prefill from the selected task's `primary_item`, inventory-lookup write-back, changed-fields patch via `useUpdateItem`.
  - `src/controllers/use-quick-task-assign.controller.ts` — add `selectionMode: "single" | "multi"` and an `onSelectionAdvance` selection callback; keep every existing return value.
  - `src/components/QuickPreOrderItemStep.tsx` (new) — `ContentCard` + `ItemIdentityField` + `ItemQuantityField`.
  - `src/components/QuickTaskAssignFooter.tsx` (new) — footer lifted out of the page, extended with the `item` step branch.
  - `src/pages/QuickTaskAssignSlidePage.tsx` — split into the existing return staged form and a new pre-order staged form; step list, provider mount point, submit orchestration.
  - `package.json` — add `react-hook-form`, `@hookform/resolvers`, `zod`, `@tanstack/react-query` to `peerDependencies` (all already transitively used by this package's imports; `zod`/`react-query` only if not already resolved — verify before adding).
  - `packages/task-working-sections/vitest.config.ts` (new) + root `package.json` script `test:task-working-sections` — this package currently has **no** vitest config, so `src/components/TaskWorkingSectionsField.test.tsx` never runs.
  - `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/tasks/quick-preorder-assign.spec.ts` (new).
- Out of scope: backend changes (`PATCH /api/v1/items/{id}` and `GET` item lookup both already exist; the patch applies only `model_fields_set` keys), the `return` flow, `HomeView`, surface registry in `apps/managers-app/.../features/tasks/surfaces.ts`.
- Assumptions (all confirmed by the user on 2026-07-28 — see "Clarifications"):
  1. Single-selection + auto-advance + the `item` step apply to `taskType === "pre_order"` **only**.
  2. `article_number` is required (trimmed, non-empty) and `quantity` is required and `>= 1` before the `item` step can advance.
  3. `ItemIdentityField` runs the inventory lookup (it is **not** rendered with `disableLookup`), opens on `article_number`, and renders **no SKU tab**. A successful lookup writes the resolved `quantity` (and the canonical `article_number`) into the form.
  4. If the selected task has `primary_item === null`, the `item` step shows an explanatory message, the advance is blocked, and no patch is attempted.
  5. The item patch runs **before** step creation and is awaited; a patch failure keeps the user on the `item` step with the values intact and creates no task steps.
  6. Only changed fields are sent, and only `article_number` and `quantity` are ever sent — `sku` is not editable here and is never part of the patch.
  7. No scanner button: no scanner surface opener is injected into this surface, so `onOpenScanner` is left undefined.

## Clarifications

None open. Resolved by the user on 2026-07-28:

1. `Return` flow scope → **frozen as-is** (2-step, multi-select, batch). The `handleSaveCompleted` batch fan-out stays and is documented as multi-mode only.
2. Required fields → **both** `article_number` and `quantity` gate the advance.
3. Lookup → **enabled**. The article-number field queries the backend lookup endpoint; the returned shape is accounted for, and `quantity` is written from the match. **Correction to the original draft: `disableLookup` is NOT used.**
4. Missing `primary_item` → **block the step** with an explanatory message.
5. Failed item PATCH → **no task steps are created**.
6. Additional constraint from the user: **the SKU field must not be modifiable in this form**, which requires the additive `availableTabs` prop on `ItemIdentityField`.

## Acceptance criteria

1. Opening the quick-assign slide with `taskType: "pre_order"` renders a 3-step staged form with timeline titles `Pre-orders` → `Item` → `Assign`. Opening it with `taskType: "return"` renders the unchanged 2-step form (`Returns` → `Assign`) with unchanged multi-select batch behavior.
2. In the pre-order flow, tapping one `TaskListCard` selects it and advances to the `item` step within the same interaction (no footer press needed). Tapping a different card while one is selected replaces the selection (never accumulates); `controller.selectedTaskIds.length` is never `> 1`.
3. The `item` step renders one `ContentCard` containing `ItemIdentityField` and `ItemQuantityField`, prefilled from the selected task's `primary_item.article_number` / `primary_item.quantity`. The identity field shows **only** the article-number input: no tab picker, no SKU input, and the `item-identity-field-active-tab` localStorage value neither affects this step nor is written by it.
4. Typing an article number that passes the field's existing length gate triggers the inventory lookup. On a match, the resolved `quantity` and the canonical `article_number` are written into the form (the green check flashes); on no match the red X flashes and nothing is written. A lookup miss does **not** block the submit — only the zod validation does.
5. Advancing from `item` to `assign` is blocked while the form is invalid: the field error pills render, the step status is `error`, both the footer `Continue` button and the forward swipe are refused.
6. Pressing `Save` on the `assign` step of the pre-order flow issues `PATCH /api/v1/items/{itemId}` containing only the changed fields among `article_number` and `quantity` (never `sku`), and only after it resolves successfully does the existing working-sections save (`handleSaveAndClose` → `addTaskStep`) run.
7. A rejected item PATCH creates no task steps, returns the staged form to the `item` step with the entered values preserved, and surfaces an error; the surface stays open.
8. If the pre-order patch + save succeeds and no pre-order tasks remain, the surface closes; if tasks remain, the form returns to `list` with the saved task optimistically removed, the selection cleared, and the item form reset (no stale article number for the next task).
9. Submitting with a selection count other than exactly 1 is impossible: the submit handler returns early (strict guard) and the assign step's `Save` button stays disabled.
10. The other four `ItemIdentityField` consumers (`ReturnFormContent`, `PreOrderFormContent`, `InternalFormContent`, `WorkerInternalFormContent`, `ItemIdentitySheetPage`) render both tabs exactly as before — the new prop is opt-in and defaults to today's behavior.
11. `npm run typecheck` is clean; the new `task-working-sections` vitest suite passes; the new Playwright spec passes on `--project=mobile` and `--project=desktop`.

## Contracts and skills

### Contracts loaded

- `docs/architecture/01_architecture.md`: layer boundaries for a package-owned surface page.
- `docs/architecture/02_types.md`: schema/type placement for the new form values.
- `docs/architecture/05_server_state.md`: query key + invalidation rules for the item patch touching `quickTaskKeys` / `taskKeys`.
- `docs/architecture/08_hooks.md`: action-hook (mutation, optimistic snapshot/rollback) and controller aggregation shape.
- `docs/architecture/09_forms.md`: `useForm` + `zodResolver` + `FormProvider` wiring, field error surfacing, server-error handling.
- `docs/architecture/13_errors.md`: failure surfacing for the rejected patch.
- `docs/architecture/15_feature_structure.md`: folder layout inside the package (`types.ts`, `controllers/`, `components/`, `pages/`).
- `docs/architecture/16_feature_workflow.md`: build order (types → controllers → components → pages → tests).
- `docs/architecture/24_dto.md`: patch payload shaping (only changed fields, null-vs-omitted semantics).
- `docs/architecture/28_surfaces.md` + `28_surfaces_local.md`: slide surface props/openers; the active surface types for this app.
- `docs/architecture/35_shared_packages.md §13–§14`: package-owned page + `surfaceOpeners` injection boundary (this page must not import app-level surfaces).
- `docs/architecture/38_slide_stack.md`: gating a forward swipe on validation (`canAdvance` / `validateAdvance`) — required because the `item` step must refuse the forward drag, not only the footer button.
- `docs/architecture/17_testing.md`, `docs/architecture/34_runtime_validation.md` + `34_runtime_validation_local.md`: vitest + Playwright conventions, `data-testid` naming, fixture paths.

### Local extensions loaded

- `docs/architecture/28_surfaces_local.md`: surface types limited to `slide` / `sheet` / `modal`.
- `docs/architecture/34_runtime_validation_local.md`: spec location (`tests/playwright/features/<feature>/<flow>.spec.ts`), `app-fixture` import, `auth.signIn()`, project names `mobile` / `desktop`.

### File read intent — pattern vs. relational

Reads already performed for this plan were all **relational** (what exists):

- `packages/task-working-sections/src/pages/QuickTaskAssignSlidePage.tsx` — current step/footer/provider structure.
- `packages/task-working-sections/src/controllers/use-quick-task-assign.controller.ts` — selection state and save-completion bookkeeping that must be preserved.
- `packages/task-working-sections/src/controllers/use-task-working-sections.controller.ts` (`handleSaveAndClose`) — the existing save order and its optimistic close.
- `packages/task-working-sections/src/surface-ids.ts` — surface props/openers already in the contract.
- `packages/items/src/components/ItemIdentityField.tsx`, `ItemQuantityField.tsx` — exact RHF field names: `item.article_number`, `item.sku`, `item.quantity`.
- `packages/items/src/api/update-item.ts`, `packages/items/src/types.ts` — `UpdateItemInput` shape.
- `packages/tasks/src/actions/use-update-item.ts`, `packages/tasks/src/index.ts` — `useUpdateItem` exists and is exported.
- `packages/tasks/src/types.ts` (`TaskListItemRawSchema.primary_item`) — `client_id`, `article_number`, `sku`, `quantity` are present on the list row, so no extra fetch is needed for prefill.
- `packages/hooks/src/use-staged-form.ts` — `onBeforeAdvance`, `validateAdvance`, `setStepStatus`.
- `packages/ui/src/components/primitives/staged-form/StagedForm.tsx` — `canAdvance` / `canBack` forwarding into `SlideStack`.

Codex must **not** open other action hooks, providers, or DTO files to learn structure — `08_hooks.md`, `09_forms.md`, `23_providers.md`, `24_dto.md` already define those shapes.

### Skill selection

- Primary skill: none required (no skill covers staged-form/package surface work).
- Trigger terms: `staged form`, `slide stack`, `form`, `zodResolver`, `surface`, `package page`, `playwright`.
- Excluded alternatives: `skills/*` design/visualization skills — this is not a chart or artifact task.

## Implementation plan

### 1. Types — `packages/task-working-sections/src/types.ts` (new)

```ts
import { z } from "zod";

export const QuickPreOrderItemFormSchema = z.object({
  item: z.object({
    article_number: z
      .string()
      .trim()
      .min(1, { message: "Enter the article number." })
      .max(128),
    quantity: z
      .number({ message: "Enter a quantity." })
      .int()
      .min(1, { message: "Quantity must be at least 1." }),
  }),
});

export type QuickPreOrderItemFormValues = z.infer<
  typeof QuickPreOrderItemFormSchema
>;
```

Field names are fixed by `ItemIdentityField` / `ItemQuantityField`, which read `item.article_number` and `item.quantity` from `useFormContext`. Do not rename. `item.sku` is deliberately absent: with the SKU tab hidden (step 1b) the field never registers it, so it can never enter the form state or the patch.

### 1b. Shared field — `packages/items/src/components/ItemIdentityField.tsx` (additive prop)

The SKU tab must not be reachable from this step, and the field has no way to express that today. Add an opt-in prop; every existing call site keeps its current behavior untouched.

```ts
type ItemIdentityFieldProps = {
  defaultTab?: IdentityTab;
  /**
   * Restricts which identity tabs are offered. With a single entry the tab
   * picker is not rendered and that tab is permanently active — used where a
   * surface may only edit one identity (e.g. quick pre-order assignment).
   * Defaults to both tabs.
   */
  availableTabs?: readonly IdentityTab[];
  onOpenScanner?: (tab: IdentityTab) => void;
  onLookupResult?: (items: ItemLookupResult[]) => boolean | "invalid";
  disableLookup?: boolean;
};
```

Rules:

- `const tabs = availableTabs ?? IDENTITY_TABS;` and `const isSingleTab = tabs.length === 1;`
- Initial `activeTab`: `defaultTab ?? (isSingleTab ? tabs[0] : readStoredTab())`. When `isSingleTab`, never call `readStoredTab()` and never `localStorage.setItem` — this step must neither read nor pollute the shared tab memory.
- Render the `BoxSlidePicker` only when `!isSingleTab`; filter `TAB_OPTIONS` by `tabs` when it does render.
- Everything else (lookup, debounce, status flash, right-icon logic, error pill) is unchanged.
- Do **not** change the exported behavior in `packages/items/src/index.ts` — the export line already covers the component.

### 1c. Lookup selection helper — `packages/task-working-sections/src/lib/select-quick-lookup-result.ts` (new)

`@beyo/task-creation`'s `item-lookup-prefill.ts` cannot be reused here: it imports `@beyo/item-categories` and `@beyo/images`, neither of which is a dependency of this package, and cross-importing another feature package's lib violates the package boundary in `35_shared_packages.md`. Write the two small pieces this step needs:

```ts
export function selectQuickLookupResult(
  items: ItemLookupResult[],
): ItemLookupResult | null {
  return (
    items.find((item) => item.external_source === "purchase_api") ??
    items[0] ??
    null
  );
}

export function createQuickLookupSignature(
  item: ItemLookupResult | null,
): string | null {
  return item
    ? JSON.stringify({
        article_number: item.article_number,
        quantity: item.quantity,
        external_id: item.external_id,
        external_source: item.external_source,
      })
    : null;
}
```

The signature exists to stop a re-fetch of the same match from overwriting a quantity the manager edited by hand after the lookup landed.

### 2. Controller — `packages/task-working-sections/src/controllers/use-quick-pre-order-item.controller.ts` (new)

Responsibilities: own the RHF form, prefill it from the selected task, expose `validate()` and `submitItemPatch()`.

```ts
type UseQuickPreOrderItemControllerArgs = {
  task: TaskListItemRaw | null;   // controller.selectedTask
};

export function useQuickPreOrderItemController({ task }: UseQuickPreOrderItemControllerArgs) {
  const item = task?.primary_item ?? null;
  const taskId = task?.task.client_id ?? "";
  const updateItem = useUpdateItem(taskId);          // from "@beyo/tasks"

  const form = useForm<QuickPreOrderItemFormValues>({
    resolver: zodResolver(QuickPreOrderItemFormSchema),
    defaultValues: { item: { article_number: "", quantity: 1 } },
    mode: "onChange",
  });
  const lastAppliedLookupSignatureRef = useRef<string | null>(null);

  // Reseed whenever the selected item changes identity (keyed on client_id).
  useEffect(() => { ... form.reset({ item: {
        article_number: item?.article_number ?? "",
        quantity: item?.quantity ?? 1,
      } }); lastAppliedLookupSignatureRef.current = null; }, [item?.client_id]);

  const hasItem = Boolean(item);

  // Passed straight to <ItemIdentityField onLookupResult={...} />; wrap in
  // useEffectEvent so the field's effect does not re-run on every render.
  const handleLookupResult = useEffectEvent((items: ItemLookupResult[]) => { ... });

  async function validate(): Promise<boolean> {
    if (!hasItem) return false;
    return form.trigger();
  }

  // Returns true when the patch succeeded (or when nothing changed).
  async function submitItemPatch(): Promise<boolean> { ... }

  function reset(): void {
    form.reset({ item: { article_number: "", quantity: 1 } });
    lastAppliedLookupSignatureRef.current = null;
  }

  return { form, hasItem, itemClientId: item?.client_id ?? null, isPatching: updateItem.isPending, handleLookupResult, validate, submitItemPatch, reset };
}
```

`handleLookupResult(items)` rules — the return value drives the field's own status flash (`true` → green check, `"invalid"` → red X, `false` → no flash):

- `const match = selectQuickLookupResult(items);` no match → return `"invalid"` (nothing is written; the manager may still submit their typed value).
- Same signature as `lastAppliedLookupSignatureRef.current` → return `false` (already applied; do not stomp a manual quantity edit).
- Otherwise `form.setValue("item.quantity", match.quantity, { shouldDirty: true, shouldValidate: true })` and `form.setValue("item.article_number", match.article_number, { shouldDirty: true })` — writing back the canonical article number keeps the patch consistent with what inventory returned (`normalizeArticleNumberForLookup` pads numeric input to 7 digits before querying, so the typed and canonical forms can differ). Store the signature and return `true`.
- Nothing else from `ItemLookupResult` is consumed here — no images, no category, no SKU.

`submitItemPatch()` rules (per `24_dto.md` + the backend's `model_fields_set` behavior — see the comment in `packages/tasks/src/pages/ItemIdentitySheetPage.tsx:84`):

- Build `changes` by comparing the trimmed form values against `item.article_number` and `item.quantity` only. `sku` is never sent.
- If `changes` is empty → return `true` without calling the endpoint.
- Otherwise `await updateItem.mutateAsync({ id: item.client_id, ...changes })`; on rejection set a form-level error (`form.setError("item.article_number", { message: "Could not save the item. Try again." })` or a root error the step renders) and return `false`.

`useUpdateItem(taskId)` already snapshots/rolls back `taskKeys.detail(taskId)` and invalidates `taskKeys.detail` + `taskKeys.lists()` on settle. It does **not** invalidate `quickTaskKeys`; `handleSaveAndClose` already does that, so no extra invalidation is needed on the success path.

### 3. Selection mode — `src/controllers/use-quick-task-assign.controller.ts`

Additive only; every current return value stays.

- New args: `selectionMode?: "single" | "multi"` (default `"multi"`), `onSelect?: (taskId: string) => void`.
- `handleToggleTask(taskId)`:
  - `savingTaskId` guard unchanged.
  - `single`: if `selectedTaskIds[0] === taskId` → `setSelectedTaskIds([])` (deselect, no callback). Otherwise `setSelectedTaskIds([taskId])` then `onSelect?.(taskId)`.
  - `multi`: current behavior verbatim.
- Expose `selectionMode` and a derived `isSelectionValidForSubmit = selectionMode === "single" ? selectedTaskIds.length === 1 : selectedTaskIds.length > 0` for the strict guard in acceptance criterion 8.
- Leave `handleSaveCompleted` untouched — in single mode `remainingTaskIds` is always empty, so the batch fan-out branch is naturally inert.

### 4. Components

**`src/components/QuickPreOrderItemStep.tsx` (new)**

```tsx
const ARTICLE_NUMBER_ONLY_TABS = ["article_number"] as const;

export function QuickPreOrderItemStep({
  hasItem,
  onLookupResult,
}: {
  hasItem: boolean;
  onLookupResult: (items: ItemLookupResult[]) => boolean | "invalid";
}): React.JSX.Element {
  if (!hasItem) {
    return (
      <div className="mx-4 mt-3">
        <ContentCard data-testid="quick-preorder-item-missing">
          <p className="px-0 py-2 text-sm text-muted-foreground">
            This pre-order has no item attached, so it cannot be assigned here.
          </p>
        </ContentCard>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-3 flex flex-col gap-3" data-testid="quick-preorder-item-step">
      <ContentCard gapClassName="gap-4">
        <ItemIdentityField
          availableTabs={ARTICLE_NUMBER_ONLY_TABS}
          defaultTab="article_number"
          onLookupResult={onLookupResult}
        />
        <ItemQuantityField />
      </ContentCard>
    </div>
  );
}
```

`ContentCard` is exported from `@beyo/ui` (defined in `packages/ui/src/components/primitives/form-field-container/FormFieldContainer.tsx`). `defaultTab` plus the single-entry `availableTabs` pins the field to the article-number input with no tab picker; `disableLookup` is deliberately **not** passed, so the field's existing debounced `useItemLookupQuery` runs and feeds `onLookupResult`. No `onOpenScanner` is passed — with no scanner opener injected into this surface the field simply renders no scan button (and the success/invalid flash buttons become inert, which is the existing behavior of the component).

**`src/components/QuickTaskAssignFooter.tsx` (new)**

Move `QuickTaskUnifiedFooter` out of the page unchanged, then extend it:

- New branch for `activeStepId === "item"`: left button = `Back` (→ `list`), right button = `Continue`, `data-testid="quick-task-item-continue-button"`, disabled while `isAdvancing` or `isPatching` or `!hasItem`.
- The `list` step's primary button label in single mode becomes `Continue` (enabled when exactly one task is selected) — it stays useful after a back navigation.
- Keep all existing `data-testid` values (`quick-task-list-back-button`, `quick-task-list-assign-button`, `quick-task-assign-back-button`, `quick-task-assign-save-button`, `quick-task-assign-shortcut-bar`) so the existing surface specs keep passing.

### 5. Page — `src/pages/QuickTaskAssignSlidePage.tsx`

Split the render into two staged forms and keep the existing one for returns.

- `const isPreOrder = taskType === "pre_order";`
- Steps: pre-order → `[{ id: "list", title: "Pre-orders" }, { id: "item", title: "Item" }, { id: "assign", title: "Assign" }]`; return → the current two entries.
- `useStagedForm({ steps, mode: "free", onBeforeAdvance })` — for pre-order supply `onBeforeAdvance(currentStepId, _next, setStepStatus)`:
  - `currentStepId === "list"` → `controller.selectedTaskIds.length === 1`.
  - `currentStepId === "item"` → `const ok = await itemController.validate(); setStepStatus("item", ok ? "completed" : "error"); return ok;`
  - otherwise `true`.
  Pass `staged.validateAdvance` through `StagedForm`'s `canAdvance` so the forward swipe obeys the same gate (`38_slide_stack.md`); the footer `Continue` calls `staged.advance()`.
- Selection wiring: `useQuickTaskAssignController({ taskType, surfaceOpeners, selectionMode: isPreOrder ? "single" : "multi", onSelect: isPreOrder ? handleSelectAndAdvance : undefined })`, where `handleSelectAndAdvance(taskId)` sets `primaryTaskId` **and** navigates to `item`. Mounting `TaskWorkingSectionsProvider` at selection time (instead of at assign time) warms the task detail/steps queries one step earlier; the provider is already keyed by `primaryTaskId`, so a different card remounts it cleanly.
- Item form: mount `useQuickPreOrderItemController({ task: controller.selectedTask })` in the pre-order page component and wrap the pre-order `<StagedForm>` in `<FormProvider {...itemController.form}>`. RHF keeps values when the inactive pane unmounts (`shouldUnregister` defaults to `false`), so a back-and-forward navigation does not lose input. Pass `itemController.handleLookupResult` down to `QuickPreOrderItemStep`.
- Submit orchestration for pre-order — replace the direct `onSaveAndClose={workingSectionsController.handleSaveAndClose}` binding with:

```ts
async function handlePreOrderSave(): Promise<void> {
  if (controller.selectedTaskIds.length !== 1) return;        // strict guard
  if (!(await itemController.validate())) { staged.navigateTo("item"); return; }
  if (!(await itemController.submitItemPatch())) { staged.navigateTo("item"); return; }
  await workingSectionsController.handleSaveAndClose();
}
```

  The patch is awaited before the working-sections save because `handleSaveAndClose` closes/navigates optimistically and creates the task steps; a failed patch must not leave steps created against an item with the wrong article number. Cost: one PATCH round-trip before the pane transitions.
- Reset on return to list: in the pre-order `surfaceOpeners.onSaveComplete`, after `controller.handleSaveCompleted(...)` returns a non-zero remaining count, call `itemController.reset()` alongside `setPrimaryTaskId(null)` and `staged.navigateTo("list")`. Do the same in `handleCloseToList` when the user backs out of a selection.
- Also add `item` to the `reopenSlideAfterError` path: it currently navigates to `assign`, which stays correct (the failure there is the step/note save, not the item patch).

### 6. Package wiring

- `packages/task-working-sections/package.json`: add `"react-hook-form": ">=7.0.0"`, `"@hookform/resolvers": ">=5.0.0"`, `"zod": ">=3.0.0"`, `"@tanstack/react-query": ">=5.0.0"` to `peerDependencies` (mirror the ranges already declared in `packages/task-creation/package.json`; skip any that are already listed there after re-reading the file).
- `src/index.ts`: export `useQuickPreOrderItemController` and the new schema/type only if an app needs them. Nothing outside the package consumes them today, so prefer **no** new public exports and keep the surface API unchanged.

### 7. Tests

**Unit (vitest) — this package has no runner today.**

- Add `packages/task-working-sections/vitest.config.ts`, mirroring `packages/upholstery/vitest.config.ts` (`plugins: [react()]`, `define` for `import.meta.env.VITE_API_URL`, `environment: "jsdom"`, `include: ["packages/task-working-sections/src/**/*.test.ts(x)"]`, `css: true`).
- Add `"test:task-working-sections": "vitest run --config packages/task-working-sections/vitest.config.ts"` to the root `package.json` scripts.
- New tests:
  - `src/controllers/use-quick-task-assign.controller.test.ts` — single mode replaces the selection, re-tapping the selected card clears it, `onSelect` fires once per new selection, multi mode is unchanged.
  - `src/controllers/use-quick-pre-order-item.controller.test.tsx` — prefill from `primary_item`; `submitItemPatch` sends only changed fields and never `sku`; unchanged values skip the request; a rejected mutation returns `false` and sets a form error.
  - `src/lib/select-quick-lookup-result.test.ts` — `purchase_api` result wins over other sources; empty input → `null`; identical results produce an identical signature.
  - `src/controllers/use-quick-pre-order-item.controller.test.tsx` (lookup cases) — a match writes `quantity` and the canonical `article_number` and returns `true`; the same match applied twice returns `false` on the second call and leaves a hand-edited quantity untouched; an empty result returns `"invalid"` and writes nothing.
  - `src/components/QuickPreOrderItemStep.test.tsx` — renders the article-number input and quantity field inside a `FormProvider`, renders **no** tab picker and **no** SKU input even when `localStorage` holds `"sku"`, leaves `item-identity-field-active-tab` unwritten, and renders the missing-item message when `hasItem` is false.
- `@beyo/items` regression: add `packages/items/src/components/ItemIdentityField.test.tsx` if no runner covers it — check first, since `packages/items` currently has no test files and no vitest config. If adding a whole runner for one test is disproportionate, cover the single-tab rendering through `QuickPreOrderItemStep.test.tsx` (which renders the real field) and state that choice in the review log.
- Running the new config also executes the pre-existing `src/components/TaskWorkingSectionsField.test.tsx` for the first time. If it fails, fix the test (not the component) and report what was wrong.

**E2E (Playwright)** — `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/tasks/quick-preorder-assign.spec.ts`

Follow `34_runtime_validation_local.md`: import from `fixtures/app-fixture`, call `auth.signIn()`. Cover: open the pre-order quick-assign slide from home → tap one task card → assert `quick-preorder-item-step` is visible, the timeline shows three steps, and `item-identity-tab-picker` / `item-sku-input` are **absent** → press `Continue` with an empty article number and assert the error pill + no navigation → type an article number that resolves and assert the quantity field is filled from the lookup (mock the lookup endpoint per the contract's mocking pattern; assert `item-article-number-success-button` appears) → advance → assign a working section → `Save` → assert the item PATCH carries `article_number` + `quantity` and no `sku`, and that the surface behaves per criterion 8. Use `tap()`/`press()` rather than `click()` for interactions inside `PullToRefresh` on the mobile project (known `filterTaps` issue).

## Risks and mitigations

- Risk: awaiting the item PATCH before `handleSaveAndClose` adds a visible delay before the slide closes, breaking the current instant-feel.
  Mitigation: keep the `Save` button in its `isSaving` state for the combined duration (`isPatching || isSaving`) so the delay reads as progress, not as a dead press. If the delay is judged unacceptable in runtime validation, revisit by running the patch optimistically in parallel — but only after the user confirms clarification #5.
- Risk: `handleSaveCompleted`'s batch fan-out (applying `appliedAdds` to remaining selected tasks) becomes unreachable in single mode and could silently rot.
  Mitigation: leave it untouched for the `return` flow, and add a code comment stating it is multi-mode only. Removing it depends on clarification #1.
- Risk: the item form retains a previous task's article number when the manager assigns a second pre-order in the same session.
  Mitigation: `form.reset` keyed on `primary_item.client_id` **and** an explicit `itemController.reset()` on every return to the `list` step; covered by acceptance criterion 7 and the Playwright spec.
- Risk: mounting `TaskWorkingSectionsProvider` one step earlier changes when the task detail/steps queries fire and when `hasUnsavedChanges` starts tracking.
  Mitigation: the provider is keyed by `primaryTaskId` and only stages changes on user interaction, so an earlier mount only prefetches. Verify in runtime validation that navigating back from `item` to `list` and picking a different task does not carry pending adds across (the `key` remount guarantees this).
- Risk: adding a vitest config surfaces a pre-existing failing test in this package.
  Mitigation: fix it as part of this work and report it explicitly in the review log rather than excluding the file.
- Risk: the lookup write-back overwrites a quantity the manager typed by hand (the field re-emits its result whenever the query data or enablement changes, not only on a fresh fetch).
  Mitigation: the `lastAppliedLookupSignatureRef` guard applies a given match exactly once; a second emission of the same result returns `false` and writes nothing. Covered by a unit test.
- Risk: `ItemIdentityField` is used by five other call sites; adding `availableTabs` could regress them.
  Mitigation: the prop is opt-in and defaults to `IDENTITY_TABS`, so the picker, the `readStoredTab()` seed, and the `localStorage.setItem` on tab change are all unchanged when it is omitted. Acceptance criterion 10 plus `npm run typecheck` (which compiles every consumer app) covers it.
- Risk: writing back the canonical `article_number` from the lookup silently changes what the manager typed (e.g. `123` → `0000123`).
  Mitigation: intentional — the padded form is what inventory matched on, and patching the typed form would store an article number that no longer resolves. It is visible in the input immediately, so it is not a hidden mutation.
- Risk: a lookup miss (red X) still allows submit, so a typo can be patched onto the item.
  Mitigation: accepted per clarification 3 — the lookup is an aid, not a gate; pre-orders legitimately carry article numbers that inventory does not know yet.

## Validation plan

- `npm run typecheck`: zero TypeScript errors.
- `npm run test:task-working-sections`: new controller/component suites pass; pre-existing `TaskWorkingSectionsField` test passes.
- `npm run lint --workspace managerbeyo-app-managers`: clean.
- `npx playwright test --grep quick-preorder-assign --project=mobile` (from `apps/managers-app/ManagerBeyo-app-managers`): passes.
- `npx playwright test --grep quick-preorder-assign --project=desktop`: passes.
- Regression: `npx playwright test --grep surfaces --project=mobile` — the return-flow quick assign must be unaffected.
- Regression: `npx playwright test --grep task-creation --project=mobile` — the four task-creation forms use `ItemIdentityField` with both tabs; the additive prop must not disturb them.
- Manual runtime check (user-run dev server): pre-order flow end to end including a real lookup hit and a real lookup miss, plus one return-flow batch assignment to confirm no behavior change.

## Review log

- `2026-07-28` `claude-opus-5`: initial plan drafted; 5 clarifications open, each with a stated default assumption so implementation is not blocked if the user accepts the defaults.
- `2026-07-28` `user`: all five defaults accepted, with one correction — the article-number field **keeps** the backend inventory lookup (the return shape is accounted for) and writes `quantity` from the match; the SKU field must not be modifiable in this form.
- `2026-07-28` `claude-opus-5`: correction applied. `disableLookup` removed; added the lookup write-back path (`handleLookupResult` + signature guard + local `select-quick-lookup-result.ts`), dropped `item.sku` from the form schema and the patch, and added the additive `availableTabs` prop on `@beyo/items` `ItemIdentityField` so the SKU tab can be withheld without duplicating the field. Clarifications section closed.
- `2026-07-28` `codex`: implemented the approved plan bottom-up. Added the quick pre-order item schema, lookup selector/signature guard, RHF item controller, single-selection controller mode, article-number-only item step, extracted footer, three-step pre-order page orchestration, strict validate → item PATCH → working-section save order, `StagedForm canAdvance={staged.validateAdvance}`, package peers/lock wiring, package Vitest config/script, 13 new tests, and the `quick-preorder-assign` Playwright spec. The return variant remains two-step/multi-select, and the existing batch fan-out is unchanged with a multi-mode-only comment.
- `2026-07-28` `codex`: the new Vitest config executed `TaskWorkingSectionsField.test.tsx` for the first time. It failed because `jest-dom` was not registered and rendered DOM was not cleaned between tests; only the test was corrected. Final result: 6 files passed, 22 tests passed.
- `2026-07-28` `codex`: validation status: `npm run typecheck` passed with zero errors. `npm run lint --workspace managerbeyo-app-managers` did not reach a clean baseline (43 errors, 4 warnings in unrelated pre-existing app files; none reported in the new spec). Playwright was not run because no user-controlled server was listening on `localhost:5173`; invoking the configured runner would have started the forbidden dev server. The plan remains active until those runtime/lint gates are resolved.
- `2026-07-28` `codex`: runtime validation resumed against the user-controlled server on `localhost:5173`. The first mobile quick-assign run exposed an E2E-only assertion that expected an active timeline indicator to render its stored `error` status; `StagedFormTimeline` intentionally gives `active` precedence. Removed that assertion while retaining the required error-pill and no-navigation checks. Final quick-assign results: mobile 1 passed (5.2s), desktop 1 passed (6.2s).
- `2026-07-28` `codex`: regression results were not green and no unrelated production code was changed. `--grep surfaces --project=mobile` ran 2 tests and both failed because `open-testing-forms-button` is not rendered anywhere in the current app, so the calendar preload fixtures cannot open their test surface. `--grep task-creation --project=mobile` ran 9 tests: 4 passed and 5 timed out. The failing existing fixtures assume an obsolete customer type value (`person`, while the rendered options are `private`/`company`/`unknown`), assume the remembered item identity tab is Article when storage currently selects SKU, or expect category option `cat_wood_table` from unavailable fixture data. These failures are outside this plan and do not touch the new quick-assign flow.
- `2026-07-28` `codex`: final local rerun after the E2E correction: `npm run typecheck` exited 0; `npm run test:task-working-sections` passed 6 files / 22 tests; manager-app lint remained at the same unrelated baseline of 43 errors / 4 warnings. Lifecycle remains `approved` because the mandatory lint and regression gates are not green.
- `2026-07-28` `codex`: implemented the user's follow-up item preview on the pre-order `item` step. The card shows the selected task's first item image with a fallback, its current SKU, and its article number below the SKU only when non-empty. Added component and Playwright assertions. Final validation: full workspace typecheck exited 0; task-working-sections passed 6 files / 23 tests; quick-assign Playwright passed mobile 1/1 (6.1s) and desktop 1/1 (5.0s).

- `2026-07-28` `claude-opus-5`: reviewed the implementation (typecheck re-run clean, package suite re-run green, plan conformance checked file by file). No correctness defects found; confirmed the `ItemIdentityField` change is behavior-preserving when `availableTabs` is omitted, and that both reported regression suites fail for reasons this work cannot cause.
- `2026-07-28` `user`: added an item preview card (image + SKU + stored article number) to the item step, with matching unit and Playwright assertions. Reported a gesture bug: swiping back from `item` to `list` replays a slide animation on the list after the gesture settles.
- `2026-07-28` `claude-opus-5`: review findings corrected, and the gesture bug fixed.
  - **Gesture bug (root cause):** back from `item` ran `handleCloseToList`, which nulled `primaryTaskId`. That swapped the rendered tree between the `TaskWorkingSectionsProvider`-wrapped form and the bare one, remounting `SlideStack` — and `StagedForm` always passes `animateInitial`, so the fresh stack replayed the enter animation of the pane the gesture had just settled (the drag's `suppressEnterRef` died with the old instance). Pre-order back is now `staged.back()` only. The provider mount condition also dropped its `primaryTask` half, so a momentary selection clear (deselect, or mid-save optimistic removal) no longer flips the tree.
  - **Lookup write-back gate:** `handleLookupResult` now returns `false` without writing when the article number still equals the stored one, so the lookup that auto-fires on entering the step with a prefilled article number can no longer overwrite the item's quantity. Only a hand-edited article number pulls values in.
  - **Item-only save:** the assign-step Save now enables on `workingSections.hasUnsavedChanges || itemController.hasItemChanges` (`isDirty` against the reset baseline). With no section changes the flow patches the item and returns to the list via `onItemOnlySaved` instead of calling `handleSaveAndClose`, which would early-return yet still fire `closeSlide()` and optimistically drop the task without ever completing a save.
  - **Back preserves work:** back from `item` keeps the selection and the typed values; the reset/clear now happens only after a completed save or an item-only save.
  - **`staged` ordering:** the selection callback reaches the staged form through a ref instead of closing over a `const` declared below it.
  - **Test setup:** `packages/task-working-sections/vitest.setup.ts` registers `jest-dom` and `cleanup` for the whole package; the inline copies were removed from the two test files.
  - The preview card intentionally still shows the stored article number rather than the draft; a comment in `QuickPreOrderItemStep.tsx` records that.
  - Re-validated: `npm run typecheck` clean, `npm run test:task-working-sections` 6 files / 25 tests pass (2 new: the auto-fire gate and `hasItemChanges`). Playwright not re-run — needs the user's dev server.

## Lifecycle transition

- Current state: `approved` (implementation complete; final validation blocked)
- Next state: `archived` (after lint is clean and all four required Playwright commands pass)
- Transition owner: `codex` after the existing lint baseline and regression fixtures are green
