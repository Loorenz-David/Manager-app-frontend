# PLAN_upholstery_warning_sheet_20260602

## Metadata

- Plan ID: `PLAN_upholstery_warning_sheet_20260602`
- Status: `archived`
- Owner agent: `copilot`
- Created at (UTC): `2026-06-02T00:00:00Z`
- Last updated at (UTC): `2026-06-02T17:37:51Z`
- Related issue/ticket: N/A
- Intention plan: N/A

---

## Goal and intent

- **Goal:** When a worker attempts to start (`pending → working`) a task step whose working section is "Upholstery Installation" or "Sewing" AND no upholstery requirement is in `"available"` state, intercept the transition and open a bottom-sheet warning. The sheet shows the unavailable upholstery entries, and lets the worker either close the warning or report the missing fabric via a case — with the case type and initial message pre-populated.
- **Business/user intent:** Workers in fabric-dependent sections should not silently start without fabric. The warning creates a structured reporting path (a "No Fabric" case) rather than a soft block.
- **Non-goals:**
  - No changes to the transition mutation itself.
  - Does not block the transition — the worker can close the sheet and start anyway by tapping the action button again (as long as no fabric becomes available or section name changes).
  - Does not affect the dependency warning (from `PLAN_step_dependency_warning_sheet_20260602`). Both warnings coexist and are checked sequentially; this one runs second.
  - No changes to `LastActiveStepCardController` (handles resume transitions only, never `pending → working`).
  - No manager-app changes.

---

## Scope

- **In scope:**
  - Extracting `UpholsteryEntryCard` from `TaskStepUpholsterySection` into an exported component in `@beyo/tasks`.
  - Extending `CaseCreationSlideSurfaceProps`, `CaseCreationFormProvider`, `CaseCreationRouteEntry`, and `CaseCreationFormContent` in `@beyo/cases` to support pre-populated case type and composer content.
  - New surface ID + props type + page component for the upholstery warning sheet in the workers app.
  - Guard logic injected into `handleTransition` in `useWorkingSectionStepsController` and `useTaskStepDetailController` — placed **after** the existing dependency warning guard.
- **Out of scope:**
  - Hard-blocking the transition (the warning is dismissable).
  - Showing the upholstery warning from `LastActiveStepCardController`.
  - Any changes to `TaskStepUpholsterySection`'s rendering behavior.
- **Assumptions:**
  - The working section name check is case-insensitive exact match on `"upholstery installation"` or `"sewing"`. Variations in spacing or punctuation are not expected.
  - A step with `upholstery_requirement: []` (no requirements) does NOT trigger the warning.
  - A step with at least one requirement where `state === "available"` does NOT trigger the warning.
  - The `no_fabric` case type exists in the backend. If not found by name, the sheet falls back to `type_label: "No Fabric"` (no `case_type_id`).
  - `PLAN_step_dependency_warning_sheet_20260602` has been applied. The upholstery guard is appended to the same `handleTransition` block in both controllers.

---

## Clarifications required

_None — all questions resolved by codebase exploration._

---

## Acceptance criteria

1. Tapping "Start" on a pending step in "Upholstery Installation" or "Sewing" where all requirements are non-available opens the upholstery warning sheet.
2. The sheet displays each unavailable upholstery entry as a card (image or placeholder, name, code, requirement state pill) — styled identically to `TaskStepUpholsterySection`.
3. "Close" dismisses the sheet. The step remains `pending`. Tapping "Start" again shows the sheet again (the guard re-runs).
4. "Create case" (when no existing `no_fabric` case) opens the case creation slide with the `no_fabric` case type pre-selected and the initial message pre-filled with styled text.
5. "View case" (when a `no_fabric` case exists for the task) opens the existing case conversation directly.
6. After the case is created, the warning sheet closes automatically via `onCaseCreated`.
7. A step with at least one requirement in `"available"` state does NOT open the sheet.
8. A step with `upholstery_requirement: []` (no requirements) does NOT open the sheet.
9. Resume transitions (`paused → working`, `ended_shift → working`) do NOT open the sheet.
10. `npm run typecheck` passes with zero errors.

---

## Contracts and skills

### Contracts loaded

- `../architecture/08_hooks.md`: guard inside `handleTransition`; no new action hook needed
- `../architecture/28_surfaces.md` + `../architecture/28_surfaces_local.md`: sheet surface, `lazyWithPreload`, registration
- `../architecture/07_components.md`: extracted `UpholsteryEntryCard` component
- `../architecture/24_dto.md`: `CaseMessageContent` construction pattern
- `../architecture/23_providers.md`: `CaseCreationFormProvider` initial-state injection

### Local extensions loaded

- `../architecture/28_surfaces_local.md`: confirms `sheet` is valid; `drawer` excluded

### File read intent — pattern vs. relational

Permitted reads performed:
- `packages/cases/src/message-content.ts` — established `CaseMessageContent` format (`{ parts: CaseInlinePart[] }`) and `CaseInlinePartMarks` shape (`size: "large"`, `color: string`)
- `packages/cases/src/lib/case-lexical-serialization.ts` — confirmed `initializeCaseComposerEditorState(content)` calls `replaceRootWithContent(content)` → pre-filling context initial state populates the Lexical editor at mount
- `packages/cases/src/components/composer/CaseComposerEditor.tsx` — confirmed `ComparisonSyncPlugin` and `LexicalComposer.editorState` both read `content` prop → context initial state injection works
- `packages/cases/src/components/CaseInitialMessageComposer.tsx` — confirmed it passes `content={composerContent}` from context to the editor
- `packages/cases/src/providers/CaseCreationFormProvider.tsx` — established where to add initial-state params
- `packages/cases/src/components/CaseCreationFormContent.tsx` — established that `selectedCaseType` is available before `useForm(...)` and can drive `defaultValues`
- `packages/cases/src/surface-ids.ts` — established `CaseCreationSlideSurfaceProps` shape
- `packages/cases/src/index.ts` — confirmed `CaseMessageContent`, `CaseTypeSelectedDisplay`, `useListCaseTypesQuery`, `useListCasesQuery` all already exported
- `packages/tasks/src/components/detail/TaskStepUpholsterySection.tsx` — established `JoinedEntry` type and `UpholsteryEntryCard` component to extract
- `packages/upholstery/src/requirement-state.ts` — confirmed `UPHOLSTERY_REQUIREMENT_STATE` values and variant map

### Skill selection

No specific skill covers this multi-package, multi-surface task. Architecture contracts applied manually.

---

## Domain schemas consulted

- `apps/workers-app/.../features/task_steps/types.ts`:
  - `UpholsteryRequirementSchema`: `{ client_id, item_upholstery_id, upholstery_inventory_id, amount_meters, value_minor, currency, source, state: string }`
  - `ItemSnapshotSchema.upholstery_requirement: z.array(UpholsteryRequirementSchema)`
  - `TaskStepSchema.working_section_name_snapshot: z.string()`
- `packages/tasks/src/types.ts`:
  - `ItemUpholsteryEntry`: `{ client_id, item_id, upholstery_id, name, code, image_url, amount_meters, source, time_to_fix_in_seconds, active_requirement_id }`
  - `UpholsteryRequirementEntry`: `{ client_id, item_upholstery_id, upholstery_inventory_id, amount_meters, value_minor, currency, source, state }`
- `packages/upholstery/src/requirement-state.ts`:
  - States: `"missing_quantity" | "available" | "needs_ordering" | "ordered" | "in_use" | "completed" | "failed"`
  - `UPHOLSTERY_REQUIREMENT_VARIANT` maps each state to a `StatePillVariant`

---

## Implementation plan

### Step 1 — Extract `UpholsteryEntryCard` to its own exported file in `@beyo/tasks`

**Create:** `packages/tasks/src/components/UpholsteryEntryCard.tsx`

Move `JoinedEntry` type (renamed to `UpholsteryCardEntry`) and the `UpholsteryEntryCard` component out of `TaskStepUpholsterySection.tsx` into this new file. Export both.

```tsx
import { ImagePlaceholder, StatePill } from "@beyo/ui";
import {
  formatUpholsteryRequirementLabel,
  getUpholsteryRequirementVariant,
} from "@beyo/upholstery";
import type { ItemUpholsteryEntry, UpholsteryRequirementEntry } from "../types";

export type UpholsteryCardEntry = ItemUpholsteryEntry & {
  activeRequirement: UpholsteryRequirementEntry | null;
};

export function UpholsteryEntryCard({
  entry,
}: {
  entry: UpholsteryCardEntry;
}): React.JSX.Element {
  const requirementVariant = getUpholsteryRequirementVariant(
    entry.activeRequirement?.state ?? null,
  );
  const amountMeters =
    entry.activeRequirement?.amount_meters ?? entry.amount_meters;
  const amountLabel =
    amountMeters === null ? "Quantity missing" : `${amountMeters} m`;

  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2"
      data-testid={`upholstery-entry-card-${entry.client_id}`}
    >
      <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
        {entry.image_url ? (
          <img
            alt=""
            className="size-full object-cover"
            decoding="async"
            draggable={false}
            loading="lazy"
            src={entry.image_url}
          />
        ) : (
          <ImagePlaceholder iconClassName="size-4 text-muted-foreground/60" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {entry.name ?? "Upholstery unavailable"}
          </p>
          {requirementVariant && entry.activeRequirement ? (
            <StatePill
              label={formatUpholsteryRequirementLabel(
                entry.activeRequirement.state,
              )}
              variant={requirementVariant}
            />
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {entry.code ? `${entry.code} · ` : ""}
          {amountLabel}
        </p>
      </div>
    </div>
  );
}
```

**Modify:** `packages/tasks/src/components/detail/TaskStepUpholsterySection.tsx`

Replace the local `JoinedEntry` type definition and the `UpholsteryEntryCard` component body with an import from the new file:

```tsx
import {
  UpholsteryEntryCard,
  type UpholsteryCardEntry,
} from "../UpholsteryEntryCard";
```

Remove the local `type JoinedEntry = ...` and the full `UpholsteryEntryCard` function. Change the `entries` useMemo to use `UpholsteryCardEntry`:

```tsx
const entries = useMemo<UpholsteryCardEntry[]>(
  () =>
    (upholsteryQuery.data?.upholstery ?? [])
      .map((entry) => ({
        ...entry,
        activeRequirement: entry.active_requirement_id
          ? (requirementsById.get(entry.active_requirement_id) ?? null)
          : null,
      }))
      .filter((entry) => entry.activeRequirement?.state !== "failed"),
  [requirementsById, upholsteryQuery.data?.upholstery],
);
```

**Modify:** `packages/tasks/src/index.ts`

Add exports:

```typescript
export { UpholsteryEntryCard } from "./components/UpholsteryEntryCard";
export type { UpholsteryCardEntry } from "./components/UpholsteryEntryCard";
```

---

### Step 2 — Extend `CaseCreationSlideSurfaceProps` in `@beyo/cases`

**File:** `packages/cases/src/surface-ids.ts`

Add two optional fields to `CaseCreationSlideSurfaceProps`:

```typescript
import type { CaseMessageContent } from "./message-content";

export type CaseCreationSlideSurfaceProps = {
  entityTypes?: string[];
  entityClientId?: string;
  title?: string;
  surfaceOpeners: CaseCreationSurfaceOpeners;
  onCaseCreated?: (plainText: string | undefined) => void;
  // NEW
  initialCaseType?: CaseTypeSelectedDisplay;
  initialComposerContent?: CaseMessageContent;
};
```

**Note:** `CaseTypeSelectedDisplay` is already imported from `./types` in this file (it is referenced by `CaseTypePickerSheetSurfaceProps`). Verify and add the import if not present.

---

### Step 3 — Update `CaseCreationFormProvider` to accept and use initial state

**File:** `packages/cases/src/providers/CaseCreationFormProvider.tsx`

Add `import type { CaseMessageContent } from "../message-content";` if not already present.

Extend the component props:

```typescript
export function CaseCreationFormProvider({
  children,
  entityTypes,
  entityClientId,
  surfaceOpeners,
  onCaseCreated,
  initialCaseType,       // NEW
  initialComposerContent, // NEW
}: {
  children: React.ReactNode;
  entityTypes?: string[];
  entityClientId?: string;
  surfaceOpeners?: CaseCreationSurfaceOpeners;
  onCaseCreated?: (plainText: string | undefined) => void;
  initialCaseType?: CaseTypeSelectedDisplay;       // NEW
  initialComposerContent?: CaseMessageContent;     // NEW
}): React.JSX.Element {
```

Change the two `useState` initializers:

```typescript
// Before:
const [selectedCaseType, setSelectedCaseType] =
  useState<CaseTypeSelectedDisplay | null>(null);

// After:
const [selectedCaseType, setSelectedCaseType] =
  useState<CaseTypeSelectedDisplay | null>(() => initialCaseType ?? null);
```

```typescript
// Before:
const [composerContent, setComposerContentState] =
  useState<CaseMessageContent>(() => ({ parts: [] }));

// After:
const [composerContent, setComposerContentState] =
  useState<CaseMessageContent>(() => initialComposerContent ?? { parts: [] });
```

No other changes. The `composerPlainText` companion state should also be seeded if `initialComposerContent` is provided. Add:

```typescript
import { toBackendPlainText } from "../lib/message-content-adapter";

// After:
const [composerPlainText, setComposerPlainText] = useState<string>(
  () => initialComposerContent ? toBackendPlainText(initialComposerContent) : "",
);
```

---

### Step 4 — Update `CaseCreationRouteEntry` to pass new props

**File:** `packages/cases/src/components/CaseCreationRouteEntry.tsx`

```typescript
export function CaseCreationRouteEntry(): React.JSX.Element {
  const header = useSurfaceHeader();
  const {
    entityTypes,
    entityClientId,
    title,
    surfaceOpeners,
    onCaseCreated,
    initialCaseType,        // NEW
    initialComposerContent, // NEW
  } = useSurfaceProps<CaseCreationSlideSurfaceProps>();

  useEffect(() => {
    header?.setTitle(title ? `Case for ${title}` : "New case");
  }, [header, title]);

  return (
    <CaseCreationFormProvider
      entityTypes={entityTypes}
      entityClientId={entityClientId}
      surfaceOpeners={surfaceOpeners}
      onCaseCreated={onCaseCreated}
      initialCaseType={initialCaseType}           // NEW
      initialComposerContent={initialComposerContent} // NEW
    >
      <CaseCreationFormContent />
    </CaseCreationFormProvider>
  );
}
```

---

### Step 5 — Seed `useForm` defaultValues from pre-selected case type

**File:** `packages/cases/src/components/CaseCreationFormContent.tsx`

The `selectedCaseType` is already read from context before `useForm(...)` is called. Use it to seed the initial form values so validation passes without the type picker being opened:

```typescript
// selectedCaseType is consumed from context BEFORE useForm:
const {
  selectedCaseType,
  // ...rest
} = useCaseCreationFormContext();

const form = useForm<CaseCreationFormValues>({
  resolver: zodResolver(CaseCreationFormSchema),
  defaultValues: {
    case_type_id: selectedCaseType?.clientId || undefined,  // CHANGED
    type_label: selectedCaseType?.name || undefined,         // CHANGED
    participants: undefined,
    selected_all: undefined,
    skip_participants: undefined,
  },
});
```

**Important:** `selectedCaseType?.clientId || undefined` (not `?? undefined`) because an empty string `""` (used in the fallback path below) must also be treated as absent so the optional `z.string().min(1)` validator is not triggered on an empty string.

No other changes to this file. The existing `useEffect` guard `if (caseTypeAutoOpenApplied.current || selectedCaseType !== null)` already skips auto-opening the type picker when a type is pre-seeded. ✓

---

### Step 6 — Add new surface ID and props type in the workers app

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surface-ids.ts`

Add:

```typescript
export const UPHOLSTERY_WARNING_SHEET_SURFACE_ID =
  "task-step-upholstery-warning-sheet";

export type UpholsteryWarningSheetSurfaceProps = {
  stepId: TaskStepId;
  taskId: TaskId;
  workingSectionId: WorkingSectionId;
  itemId: string;
};
```

---

### Step 7 — Register the surface in `surfaces.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surfaces.ts`

**Add import of new surface ID:**

```typescript
import {
  // ...existing imports
  UPHOLSTERY_WARNING_SHEET_SURFACE_ID,
} from "./surface-ids";
```

**Add lazy loader:**

```typescript
function loadUpholsteryWarningSheetPage() {
  return import("@/pages/task_steps/UpholsteryWarningSheetPage").then(
    (module) => ({ default: module.UpholsteryWarningSheetPage }),
  );
}
```

**Add lazy component and preload export:**

```typescript
const upholsteryWarningSheet = lazyWithPreload(loadUpholsteryWarningSheetPage);
export const preloadUpholsteryWarningSheetSurface =
  upholsteryWarningSheet.preload;
```

**Add to `taskStepSurfaces`:**

```typescript
[UPHOLSTERY_WARNING_SHEET_SURFACE_ID]: {
  surface: "sheet",
  component: upholsteryWarningSheet.Component,
},
```

---

### Step 8 — Create `UpholsteryWarningSheetPage`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/UpholsteryWarningSheetPage.tsx`

This page:
1. Reads surface props: `stepId, taskId, workingSectionId, itemId`.
2. Queries upholstery: `useItemUpholsteryQuery(itemId)` → builds joined entries → filters to unavailable ones.
3. Queries existing cases: `useListCasesQuery({ entity_client_id: taskId, case_state: "open,resolving" })` → looks for a `no_fabric` case.
4. Queries case types: `useListCaseTypesQuery({ entity_type: "task" })` → finds the `no_fabric` type.
5. Renders warning + unavailable upholstery cards + two-button footer.

**Full implementation:**

```tsx
import { useEffect, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { useSurface, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import {
  CASE_CONVERSATION_SURFACE_ID,
  CASE_CREATION_SLIDE_SURFACE_ID,
  CASE_TYPE_PICKER_SHEET_SURFACE_ID,
  PARTICIPANT_PICKER_SLIDE_SURFACE_ID,
  useListCasesQuery,
  useListCaseTypesQuery,
  type CaseCreationSurfaceOpeners,
  type CaseMessageContent,
  type CaseTypeSelectedDisplay,
  type ParticipantPickerSlideSurfaceProps,
} from "@beyo/cases";
import { useItemUpholsteryQuery, UpholsteryEntryCard } from "@beyo/tasks";
import type { UpholsteryWarningSheetSurfaceProps } from "@/features/task_steps/surface-ids";

function buildNoFabricMessage(upholsteryName: string): CaseMessageContent {
  return {
    parts: [
      { kind: "text", text: "I can't start as I'm", marks: { size: "large" } },
      { kind: "text", text: "\nWaiting for upholstery\n" },
      { kind: "text", text: upholsteryName, marks: { color: "#ef4444" } },
    ],
  };
}

function isNoFabricCase(
  caseName: string | null | undefined,
  label: string | null | undefined,
): boolean {
  const normalize = (v: string) => v.toLowerCase().replaceAll(" ", "_");
  return (
    normalize(caseName ?? "") === "no_fabric" ||
    normalize(label ?? "") === "no_fabric"
  );
}

export function UpholsteryWarningSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { stepId, taskId, workingSectionId, itemId } =
    useSurfaceProps<UpholsteryWarningSheetSurfaceProps>();

  const resolvedTaskId = taskId!;
  const resolvedItemId = itemId!;

  const { open: openSurface } = useSurface();

  useEffect(() => {
    header?.setTitle("Fabric not available");
    header?.setActions(null);
  }, [header]);

  // ── Queries ──────────────────────────────────────────────────────────────
  const upholsteryQuery = useItemUpholsteryQuery(resolvedItemId);
  const casesQuery = useListCasesQuery({
    entity_client_id: resolvedTaskId,
    case_state: "open,resolving",
  });
  const caseTypesQuery = useListCaseTypesQuery({ entity_type: "task" });

  // ── Derive joined + unavailable entries ─────────────────────────────────
  const unavailableEntries = useMemo(() => {
    const reqs = new Map(
      (upholsteryQuery.data?.requirements ?? []).map((r) => [r.client_id, r]),
    );
    return (upholsteryQuery.data?.upholstery ?? [])
      .map((entry) => ({
        ...entry,
        activeRequirement: entry.active_requirement_id
          ? (reqs.get(entry.active_requirement_id) ?? null)
          : null,
      }))
      .filter(
        (entry) =>
          entry.activeRequirement !== null &&
          entry.activeRequirement.state !== "available" &&
          entry.activeRequirement.state !== "failed",
      );
  }, [upholsteryQuery.data]);

  // ── Derive existing no_fabric case ──────────────────────────────────────
  const existingCase = useMemo(
    () =>
      (casesQuery.data ?? []).find((c) =>
        isNoFabricCase(c.case_type?.name, c.type_label),
      ),
    [casesQuery.data],
  );

  // ── Derive initialCaseType for creation ─────────────────────────────────
  const initialCaseType = useMemo<CaseTypeSelectedDisplay>(() => {
    const found = (caseTypesQuery.data ?? []).find((ct) =>
      isNoFabricCase(ct.name, null),
    );
    return found
      ? {
          clientId: found.client_id,
          name: found.name,
          imageUrl: found.image_url ?? null,
          description: found.description ?? null,
        }
      : { clientId: "", name: "No Fabric", imageUrl: null, description: null };
  }, [caseTypesQuery.data]);

  // ── Handlers ────────────────────────────────────────────────────────────
  function handleClose(): void {
    header?.requestClose();
  }

  function handleCaseAction(): void {
    if (existingCase) {
      openSurface(CASE_CONVERSATION_SURFACE_ID, {
        caseClientId: existingCase.client_id,
      });
      return;
    }

    const firstUnavailableName =
      unavailableEntries[0]?.name ?? "upholstery material";
    const initialComposerContent = buildNoFabricMessage(firstUnavailableName);

    const surfaceOpeners: CaseCreationSurfaceOpeners = {
      openCaseTypePicker: (props) =>
        openSurface(CASE_TYPE_PICKER_SHEET_SURFACE_ID, props),
      openParticipantPicker: (props: ParticipantPickerSlideSurfaceProps) =>
        openSurface(PARTICIPANT_PICKER_SLIDE_SURFACE_ID, props),
    };

    openSurface(CASE_CREATION_SLIDE_SURFACE_ID, {
      entityTypes: ["task"],
      entityClientId: resolvedTaskId,
      surfaceOpeners,
      initialCaseType,
      initialComposerContent,
      onCaseCreated: () => {
        header?.requestClose();
      },
    });
  }

  const caseActionLabel = casesQuery.isSuccess
    ? existingCase
      ? "View case"
      : "Create case"
    : "Create case";

  return (
    <div
      className="flex flex-col gap-5 bg-background px-5 pb-[calc(var(--safe-bottom,0)+1.25rem)] pt-4"
      data-testid="upholstery-warning-sheet"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-yellow-500"
        />
        <p className="text-sm text-foreground">
          The required upholstery is not yet available for this step. You can
          report the missing fabric or close and start anyway.
        </p>
      </div>

      {unavailableEntries.length > 0 ? (
        <div
          className="flex flex-col gap-2"
          data-testid="upholstery-warning-entries"
        >
          {unavailableEntries.map((entry) => (
            <UpholsteryEntryCard key={entry.client_id} entry={entry} />
          ))}
        </div>
      ) : null}

      <div className="flex gap-3">
        <button
          className="flex-1 rounded-xl border border-light-border bg-card py-3 text-sm font-semibold text-foreground"
          data-testid="upholstery-warning-close"
          type="button"
          onClick={handleClose}
        >
          Close
        </button>
        <button
          className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-card disabled:opacity-50"
          data-testid="upholstery-warning-case-action"
          disabled={
            upholsteryQuery.isPending ||
            casesQuery.isPending ||
            caseTypesQuery.isPending
          }
          type="button"
          onClick={handleCaseAction}
        >
          {caseActionLabel}
        </button>
      </div>
    </div>
  );
}
```

**Notes:**
- `text-yellow-500` is used for the warning icon. Copilot: check `packages/styles/src/index.css` for a `--color-warning` token. If it exists, use `text-warning` instead.
- The `existingCase` check runs after `casesQuery.isSuccess` to avoid showing "Create case" when the query is still loading. Default label is "Create case" during loading.
- `onCaseCreated` closes the warning sheet so the worker can continue after reporting.
- `workingSectionId` and `stepId` are received in props but not used inside this page (they were needed by the opening controller). They can be omitted from usage here but must remain in the props type for controller consistency.

---

### Step 9 — Add upholstery guard to `useWorkingSectionStepsController`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-working-section-steps.controller.ts`

**Add imports:**

```typescript
import {
  UPHOLSTERY_WARNING_SHEET_SURFACE_ID,
  type UpholsteryWarningSheetSurfaceProps,
} from "../surface-ids";
```

**Add guard helpers (module-level constants/functions, above the controller hook):**

```typescript
const UPHOLSTERY_SECTION_NAMES = new Set(["upholstery installation", "sewing"]);

function isUpholsteryWarningSection(name: string): boolean {
  return UPHOLSTERY_SECTION_NAMES.has(name.toLowerCase().trim());
}

function hasNoAvailableUpholstery(step: TaskStep): boolean {
  const reqs = step.item?.upholstery_requirement ?? [];
  if (reqs.length === 0) return false;
  return !reqs.some((req) => req.state === "available");
}
```

**Replace `handleTransition` useCallback — append upholstery block after the dependency block:**

The full updated `handleTransition` (this plan's additions are marked with `// UPHOLSTERY`):

```typescript
const handleTransition = useCallback(
  (stepId: TaskStepId, taskId: TaskId, nextState: StepState) => {
    if (nextState === "paused") {
      openSurface(PAUSE_REASON_SHEET_SURFACE_ID, {
        stepId,
        taskId,
        workingSectionId: sectionId,
      } as PauseReasonSheetSurfaceProps);
      return;
    }

    if (nextState === "working") {
      const rawStep = query.data?.items.find((s) => s.client_id === stepId);
      if (rawStep && rawStep.state === "pending") {
        // Dependency warning guard (PLAN_step_dependency_warning_sheet_20260602)
        const incompleteDependencies = toIncompleteDependencyViewModels(
          rawStep.dependency_working_sections,
        );
        if (incompleteDependencies.length > 0) {
          openSurface(STEP_DEPENDENCY_WARNING_SHEET_SURFACE_ID, {
            stepId,
            taskId,
            workingSectionId: sectionId,
            incompleteDependencies,
          } as StepDependencyWarningSheetSurfaceProps);
          return;
        }

        // Upholstery warning guard (this plan) // UPHOLSTERY
        if (
          rawStep.item?.client_id &&
          isUpholsteryWarningSection(rawStep.working_section_name_snapshot) &&
          hasNoAvailableUpholstery(rawStep)
        ) {
          openSurface(UPHOLSTERY_WARNING_SHEET_SURFACE_ID, {
            stepId,
            taskId,
            workingSectionId: sectionId,
            itemId: rawStep.item.client_id,
          } as UpholsteryWarningSheetSurfaceProps);
          return;
        }
      }
    }

    transitionStepState({
      task_id: taskId,
      step_id: stepId,
      new_state: nextState,
      working_section_id: sectionId,
    });
  },
  [transitionStepState, sectionId, openSurface, query.data?.items],
);
```

**Note:** `query.data?.items` is already in the dep array from the dependency warning plan. No additional dep changes needed.

---

### Step 10 — Add upholstery guard to `useTaskStepDetailController`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-task-step-detail.controller.ts`

**Add imports:**

```typescript
import {
  UPHOLSTERY_WARNING_SHEET_SURFACE_ID,
  type UpholsteryWarningSheetSurfaceProps,
} from "../surface-ids";
```

Import helpers from the working-section steps controller — OR duplicate them here to avoid cross-controller imports. **Do NOT import from `use-working-section-steps.controller.ts`** (layer violation: controllers do not import each other). Instead, define the same small helpers at module scope in this file, or extract them to a shared `lib/step-transition-guards.ts` utility file.

**Option: shared utility file**

Create `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/lib/step-transition-guards.ts`:

```typescript
import type { TaskStep } from "../types";

export const UPHOLSTERY_SECTION_NAMES = new Set([
  "upholstery installation",
  "sewing",
]);

export function isUpholsteryWarningSection(name: string): boolean {
  return UPHOLSTERY_SECTION_NAMES.has(name.toLowerCase().trim());
}

export function hasNoAvailableUpholstery(step: TaskStep): boolean {
  const reqs = step.item?.upholstery_requirement ?? [];
  if (reqs.length === 0) return false;
  return !reqs.some((req) => req.state === "available");
}
```

Then import in both controllers:

```typescript
import {
  isUpholsteryWarningSection,
  hasNoAvailableUpholstery,
} from "../lib/step-transition-guards";
```

**Replace `handleTransition` useCallback in `useTaskStepDetailController` — append upholstery block after dependency block:**

```typescript
const handleTransition = useCallback(
  (targetStepId: TaskStepId, targetTaskId: TaskId, nextState: StepState) => {
    if (nextState === "paused") {
      openSurface(PAUSE_REASON_SHEET_SURFACE_ID, {
        stepId: targetStepId,
        taskId: targetTaskId,
        workingSectionId: resolvedWorkingSectionId,
      } as PauseReasonSheetSurfaceProps);
      return;
    }

    if (nextState === "working" && step?.state === "pending") {
      // Dependency warning guard (PLAN_step_dependency_warning_sheet_20260602)
      const incompleteDependencies = toIncompleteDependencyViewModels(
        step.dependency_working_sections,
      );
      if (incompleteDependencies.length > 0) {
        openSurface(STEP_DEPENDENCY_WARNING_SHEET_SURFACE_ID, {
          stepId: targetStepId,
          taskId: targetTaskId,
          workingSectionId: resolvedWorkingSectionId,
          incompleteDependencies,
        } as StepDependencyWarningSheetSurfaceProps);
        return;
      }

      // Upholstery warning guard (this plan)
      if (
        step.item?.client_id &&
        isUpholsteryWarningSection(step.working_section_name_snapshot) &&
        hasNoAvailableUpholstery(step)
      ) {
        openSurface(UPHOLSTERY_WARNING_SHEET_SURFACE_ID, {
          stepId: targetStepId,
          taskId: targetTaskId,
          workingSectionId: resolvedWorkingSectionId,
          itemId: step.item.client_id,
        } as UpholsteryWarningSheetSurfaceProps);
        return;
      }
    }

    transitionStepState({
      task_id: targetTaskId,
      step_id: targetStepId,
      new_state: nextState,
      working_section_id: resolvedWorkingSectionId,
    });
  },
  [transitionStepState, resolvedWorkingSectionId, openSurface, step],
);
```

**Note:** `step` is already in the dep array from the dependency warning plan. No additional dep changes.

---

## File summary

| # | Package | Action | File |
|---|---------|--------|------|
| 1 | `@beyo/tasks` | Create | `packages/tasks/src/components/UpholsteryEntryCard.tsx` |
| 2 | `@beyo/tasks` | Modify | `packages/tasks/src/components/detail/TaskStepUpholsterySection.tsx` |
| 3 | `@beyo/tasks` | Modify | `packages/tasks/src/index.ts` |
| 4 | `@beyo/cases` | Modify | `packages/cases/src/surface-ids.ts` |
| 5 | `@beyo/cases` | Modify | `packages/cases/src/providers/CaseCreationFormProvider.tsx` |
| 6 | `@beyo/cases` | Modify | `packages/cases/src/components/CaseCreationRouteEntry.tsx` |
| 7 | `@beyo/cases` | Modify | `packages/cases/src/components/CaseCreationFormContent.tsx` |
| 8 | workers-app | Modify | `src/features/task_steps/surface-ids.ts` |
| 9 | workers-app | Modify | `src/features/task_steps/surfaces.ts` |
| 10 | workers-app | Create | `src/pages/task_steps/UpholsteryWarningSheetPage.tsx` |
| 11 | workers-app | Create | `src/features/task_steps/lib/step-transition-guards.ts` |
| 12 | workers-app | Modify | `src/features/task_steps/controllers/use-working-section-steps.controller.ts` |
| 13 | workers-app | Modify | `src/features/task_steps/controllers/use-task-step-detail.controller.ts` |

**Total: 13 files (5 new, 8 modified across 3 packages)**

---

## Risks and mitigations

- **Risk:** `CaseCreationFormContent` reads `selectedCaseType` from context before calling `useForm(...)`. If the render order or hook call order in the component changes, `defaultValues` could be stale.
  **Mitigation:** This is safe as long as `useCaseCreationFormContext()` is called before `useForm(...)` — which is the current and intended order. No structural change required.

- **Risk:** `initialComposerContent` passed to `CaseCreationFormProvider` initializes the Lexical editor via `initializeCaseComposerEditorState(content)` at mount. If `LazyCaseComposerEditor` is loaded lazily (it is), the editor may mount after the context is initialized — but context state persists across the Suspense boundary, so `composerContent` will be non-empty when the editor eventually mounts.
  **Mitigation:** Confirmed: `LazyCaseComposerEditor` passes `content={composerContent}` where `composerContent` comes from context. The lazy component mounts with the current context value. Pre-fill works regardless of when the lazy chunk loads.

- **Risk:** The `no_fabric` case type may not exist in the backend for a given workspace.
  **Mitigation:** The `initialCaseType` fallback uses `{ clientId: "", name: "No Fabric" }` with `clientId: ""` treated as absent by the `|| undefined` guard in `defaultValues`. The case is created with `type_label: "No Fabric"` and no `case_type_id`. Both `isNoFabricCase` checks (by `case_type?.name` and `type_label`) will match it on subsequent lookups.

- **Risk:** Both the dependency warning (Plan 1) and upholstery warning (this plan) could theoretically fire for the same step. They are checked sequentially; only the first-matching guard fires. The upholstery warning can only show after the dependency warning has been resolved or bypassed.
  **Mitigation:** This is the intended behavior. The guards are ordered: dependency first, upholstery second.

- **Risk:** `step-transition-guards.ts` helpers are duplicated (once per controller) if the shared file is not used.
  **Mitigation:** The plan explicitly calls for the shared `lib/step-transition-guards.ts` file. Copilot must not inline the functions in both controllers.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors across all three packages
- Manual: tap "Start" on a pending upholstery/sewing step with no available fabric → warning sheet opens with correct entries
- Manual: verify upholstery cards match style of `TaskStepUpholsterySection` (same component class)
- Manual: tap "Close" → sheet dismissed, step remains pending
- Manual: tap "Create case" → case creation slide opens with "No Fabric" type pre-selected and pre-filled message rendered in composer
- Manual: submit case → warning sheet closes automatically
- Manual: reopen warning sheet for same step → "View case" label shown, tapping opens the existing case conversation
- Manual: step with one `"available"` requirement → no warning sheet (direct transition)
- Manual: step with `upholstery_requirement: []` → no warning sheet
- Manual: non-upholstery section step → no warning sheet
- Manual: `paused → working` on a previously-started upholstery step → no warning sheet

---

## Review log

_(empty — awaiting first review)_

---

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
