# PLAN_task_customer_coordination_email_picker_sheet_correction_20260704

## Metadata

- Plan ID: `PLAN_task_customer_coordination_email_picker_sheet_correction_20260704`
- Status: `archived`
- Owner agent: `claude`
- Created at (UTC): `2026-07-04T23:00:00Z`
- Last updated at (UTC): `2026-07-04T19:38:41Z`
- Parent plan: `PLAN_task_customer_coordination_email_slide_20260704` (implemented + summarized)

---

## Goal and intent

- **Goal:** Three corrections to the customer coordination email slide feature:
  1. Replace the `EmailTemplatePicker`'s internal vaul sheet + StagedForm with a proper registered sheet surface (`EMAIL_TEMPLATE_PICKER_SHEET_SURFACE_ID`) whose page uses a custom CSS slide container animation instead of StagedForm for the list ↔ preview transition.
  2. Add localStorage memory to the picker sheet page: the last-selected template name is persisted in `localStorage` and auto-navigated to on subsequent opens (auto-preview mode for the matched template).
  3. Wire `onTapCard` (→ task detail slide) and `onTapImage` (→ full image viewer) on the `TaskListCard` items in the task-selection step of `CustomerCoordinationEmailSlidePage` — same behaviour as `TasksView` and the post-handling slide.
- **Business/user intent:** Surface infrastructure consistency; fast template re-use via localStorage; task cards should be fully navigable from every context they appear in.
- **Non-goals:** Changing the task selection step layout, changing the email send flow, changing the `EmailComposer` inputs, changing any existing surface types.

---

## What changes and why

| Before | After |
|---|---|
| `EmailTemplatePicker` owns a `vaul` Drawer internally | `EmailTemplatePicker` is a pure trigger button; calls `surfaceOpeners?.openEmailTemplatePicker?.({onSelect})` |
| Template list ↔ preview uses StagedForm | `EmailTemplatePickerSheetPage` uses a custom two-panel CSS slide container (absolute positioning + `transition-transform`) |
| No surface ID in `@beyo/emails` | New `EMAIL_TEMPLATE_PICKER_SHEET_SURFACE_ID` + `EmailsSurfaceOpeners` type |
| `CustomerCoordinationEmailSlideSurfaceOpeners` has only `closeSurface` | Gains `openEmailTemplatePicker`, `openTaskDetail`, and `openImageViewer` openers |
| Sellers app doesn't register the picker sheet | Sellers app registers it as a `sheet` surface in `taskSurfaces` |
| `HomeView` opens coordination slide without template picker opener | `HomeView` adds `openEmailTemplatePicker`, `openTaskDetail`, and `openImageViewer` to the opener object |
| Template picker has no memory of last selection | `EmailTemplatePickerSheetPage` persists the last-selected template name in `localStorage`; auto-navigates to preview on match at load |
| `TaskListCard` in task-selection step has no card or image tap handlers | `onTapCard` and `onTapImage` wired through controller to surfaceOpeners |

---

## File manifest

### New files to create

| Path (relative to `frontend/`) | Notes |
|---|---|
| `packages/emails/src/surface-ids.ts` | `EMAIL_TEMPLATE_PICKER_SHEET_SURFACE_ID`, `EmailTemplatePickerSheetSurfaceProps`, `EmailsSurfaceOpeners` |
| `packages/emails/src/pages/EmailTemplatePickerSheetPage.tsx` | Registered sheet page; custom header + CSS slide container for list/preview |

### Existing files to edit

| Path (relative to `frontend/`) | Change summary |
|---|---|
| `packages/emails/src/components/EmailTemplatePicker.tsx` | Remove vaul + StagedForm; add `surfaceOpeners?: EmailsSurfaceOpeners` prop; call opener on trigger press |
| `packages/emails/src/components/EmailComposer.tsx` | Add `surfaceOpeners?: EmailsSurfaceOpeners` prop; pass it to `EmailTemplatePicker` |
| `packages/emails/src/index.ts` | Export surface ID, types, loader function for `EmailTemplatePickerSheetPage` |
| `packages/emails/package.json` | Remove `vaul` from `peerDependencies` |
| `packages/task-customer-coordination/src/surface-ids.ts` | Add `openEmailTemplatePicker?`, `openTaskDetail?`, `openImageViewer?` to `CustomerCoordinationEmailSlideSurfaceOpeners` |
| `packages/task-customer-coordination/src/controllers/use-customer-coordination-email-slide.controller.ts` | Add `toViewerImages` helper + `openTaskDetail` + `openImageViewer` methods; return them from controller |
| `packages/task-customer-coordination/src/pages/CustomerCoordinationEmailSlidePage.tsx` | Pass `surfaceOpeners` to `EmailComposer`; add `onTapCard` + `onTapImage` to each `TaskListCard` |
| `apps/selleres-app/ManagerBeyo-app-sellers/src/features/tasks/surfaces.ts` | Register `EMAIL_TEMPLATE_PICKER_SHEET_SURFACE_ID` as a sheet surface; export ID |
| `apps/selleres-app/ManagerBeyo-app-sellers/src/features/home/components/HomeView.tsx` | Add `openEmailTemplatePicker`, `openTaskDetail`, `openImageViewer` to coordination opener |

---

## Clarifications required

None.

---

## Acceptance criteria

1. `EmailTemplatePicker` contains no `vaul` import and no `StagedForm` import.
2. Tapping the trigger calls `surfaceOpeners?.openEmailTemplatePicker?.({ onSelect })` — nothing else.
3. The sellers app registers `EMAIL_TEMPLATE_PICKER_SHEET_SURFACE_ID` as a `sheet` surface.
4. The `EmailTemplatePickerSheetPage` renders with a custom header (back arrow in preview view, close `X` always) and a CSS slide container for list ↔ preview.
5. In the list view, tapping a template card body slides to the preview view. In the preview view, tapping Back slides back to the list.
6. In the list view, tapping the checkmark button saves the template name to `localStorage` then calls `onSelect(template)` and closes the sheet.
7. In the preview view, tapping "Use template" saves the name to `localStorage`, calls `onSelect(previewTemplate)`, and closes the sheet.
8. On subsequent opens: if `localStorage` has a matching template name and the query resolves, the picker auto-navigates to the preview view showing that template (the auto-navigate fires at most once per mount via a `useRef` guard).
9. Tapping a `TaskListCard` body in the task-selection step opens the task detail slide (`onTapCard`).
10. Tapping the image in a `TaskListCard` in the task-selection step opens the full image viewer (`onTapImage`).
11. `npm run typecheck` passes with zero errors.

---

## Contracts and skills

Read before implementing:

- `architecture/28_surfaces_local.md` — `sheet` surface registration pattern
- `architecture/30_dynamic_loading_local.md` — `loadXxxPage` loader function pattern (§14 of 35_shared_packages.md)
- `architecture/35_shared_packages.md §13` — surfaceOpeners injection pattern
- `architecture/35_shared_packages.md §14` — loader function, never static-export page components

---

## Implementation plan

---

### Step 1 — `packages/emails/src/surface-ids.ts` (CREATE)

```ts
import type { EmailTemplate } from "./types";

export const EMAIL_TEMPLATE_PICKER_SHEET_SURFACE_ID =
  "email-template-picker-sheet";

export type EmailTemplatePickerSheetSurfaceProps = {
  onSelect: (template: EmailTemplate) => void;
};

export type EmailsSurfaceOpeners = {
  openEmailTemplatePicker?: (
    props: EmailTemplatePickerSheetSurfaceProps,
  ) => void;
};
```

---

### Step 2 — `packages/emails/src/pages/EmailTemplatePickerSheetPage.tsx` (CREATE)

This page is registered as a `sheet` surface. It renders inside `BottomSheetSurface` which provides the drag handle and the vaul Drawer. This page does NOT render its own Drawer — only the content inside it.

**Imports:**
```ts
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, X } from "lucide-react";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { cn } from "@beyo/lib";
import { ContentCard } from "@beyo/ui";
import { useEmailTemplatesQuery } from "../api/use-email-templates-query";
import type { EmailTemplate } from "../types";
import type { EmailTemplatePickerSheetSurfaceProps } from "../surface-ids";
```

**Module-level constant** (above the component function):
```ts
const LAST_TEMPLATE_KEY = "beyo_email_template_last_name";
```

**State:**
```ts
const [view, setView] = useState<"list" | "preview">("list");
const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
const didAutoSelect = useRef(false);
```

**Wiring:**
```ts
const { onSelect } = useSurfaceProps<EmailTemplatePickerSheetSurfaceProps>();
const header = useSurfaceHeader();
const templatesQuery = useEmailTemplatesQuery();
```

**Hide the surface header** (render custom header inline):
```ts
useEffect(() => {
  header?.setHeaderHidden(true);
}, [header]);
```

**localStorage auto-select effect** — runs when query data arrives; fires at most once per mount:
```ts
useEffect(() => {
  if (didAutoSelect.current) return;
  if (!templatesQuery.data?.length) return;
  const saved = localStorage.getItem(LAST_TEMPLATE_KEY);
  if (!saved) return;
  const match = templatesQuery.data.find((t) => t.name === saved);
  if (match) {
    setPreviewTemplate(match);
    setView("preview");
    didAutoSelect.current = true;
  }
}, [templatesQuery.data]);
```

**Handlers:**
```ts
function handlePreview(template: EmailTemplate): void {
  setPreviewTemplate(template);
  setView("preview");
}

function handleBack(): void {
  setView("list");
}

function handleSelect(template: EmailTemplate): void {
  localStorage.setItem(LAST_TEMPLATE_KEY, template.name);
  onSelect(template);
  header?.requestClose();
}
```

**Full render:**

```tsx
export function EmailTemplatePickerSheetPage(): React.JSX.Element {
  // ... (state, wiring, handlers above)

  return (
    <div className="flex h-full flex-col">
      {/* Custom header */}
      <div className="relative flex flex-shrink-0 items-center border-b border-border px-2 py-3">
        {/* Left: back button (preview only) */}
        <div className="w-10">
          {view === "preview" ? (
            <button
              aria-label="Back to template list"
              className="flex items-center justify-center rounded-full p-2 text-muted-foreground"
              type="button"
              onClick={handleBack}
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>

        {/* Center: title */}
        <p className="flex-1 text-center text-sm font-semibold text-primary">
          {view === "preview" ? "Preview" : "Email Templates"}
        </p>

        {/* Right: close */}
        <div className="flex w-10 justify-end">
          <button
            aria-label="Close template picker"
            className="flex items-center justify-center rounded-full p-2 text-muted-foreground"
            type="button"
            onClick={() => {
              header?.requestClose();
            }}
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>

      {/* Slide container — two absolute panels with CSS transitions */}
      <div className="relative flex-1 overflow-hidden">
        {/* List panel — exits to left when preview is shown */}
        <div
          className={cn(
            "absolute inset-0 overflow-y-auto transition-transform duration-200 ease-out",
            view === "preview" ? "-translate-x-full" : "translate-x-0",
          )}
        >
          <div className="flex flex-col gap-3 px-4 pb-4 pt-3">
            {templatesQuery.isPending ? (
              <ContentCard>
                <p className="px-4 py-6 text-sm text-muted-foreground">
                  Loading templates…
                </p>
              </ContentCard>
            ) : templatesQuery.isError ? (
              <ContentCard>
                <div className="flex flex-col gap-3 px-4 py-6">
                  <p className="text-sm text-muted-foreground">
                    Templates could not be loaded.
                  </p>
                  <button
                    className="w-fit rounded-full border border-border px-4 py-2 text-sm font-medium"
                    type="button"
                    onClick={() => {
                      void templatesQuery.refetch();
                    }}
                  >
                    Try again
                  </button>
                </div>
              </ContentCard>
            ) : (
              templatesQuery.data?.map((template) => (
                <ContentCard key={template.client_id}>
                  <div className="flex items-stretch">
                    {/* Tap to preview */}
                    <button
                      className="min-w-0 flex-1 px-4 py-4 text-left"
                      type="button"
                      onClick={() => {
                        handlePreview(template);
                      }}
                    >
                      <p className="text-sm font-semibold text-primary">
                        {template.name}
                      </p>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {template.subject}
                      </p>
                    </button>
                    {/* Tap to select */}
                    <button
                      aria-label={`Use ${template.name}`}
                      className="flex w-14 shrink-0 items-center justify-center border-l border-border text-muted-foreground"
                      type="button"
                      onClick={() => {
                        handleSelect(template);
                      }}
                    >
                      <Check aria-hidden="true" className="size-5" />
                    </button>
                  </div>
                </ContentCard>
              ))
            )}
          </div>
        </div>

        {/* Preview panel — enters from right */}
        <div
          className={cn(
            "absolute inset-0 overflow-y-auto transition-transform duration-200 ease-out",
            view === "preview" ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="px-4 pb-4 pt-3">
            {previewTemplate ? (
              <ContentCard>
                <div className="flex flex-col gap-4 px-4 py-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      Template
                    </p>
                    <p className="mt-1 text-sm font-semibold text-primary">
                      {previewTemplate.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      Subject
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-primary">
                      {previewTemplate.subject}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      Body
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {previewTemplate.text_body}
                    </p>
                  </div>
                  <button
                    className="rounded-2xl bg-(--color-primary) px-4 py-3 text-sm font-semibold text-white shadow-sm"
                    type="button"
                    onClick={() => {
                      handleSelect(previewTemplate);
                    }}
                  >
                    Use template
                  </button>
                </div>
              </ContentCard>
            ) : (
              <ContentCard>
                <p className="px-4 py-6 text-sm text-muted-foreground">
                  Select a template to preview it.
                </p>
              </ContentCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Animation explained** (so Codex does not change it):
- The two panels are `absolute inset-0` inside a `relative overflow-hidden` container.
- List panel: `translate-x-0` (visible) → `-translate-x-full` (exits LEFT) when preview is shown.
- Preview panel: `translate-x-full` (off-screen RIGHT) → `translate-x-0` (enters from RIGHT) when preview is shown.
- Transition: `transition-transform duration-200 ease-out` on both panels.
- No framer-motion, no StagedForm, no additional imports needed.

---

### Step 3 — `packages/emails/src/components/EmailTemplatePicker.tsx` (EDIT)

Replace the entire file with the simplified trigger-only version:

```ts
import { ChevronRight } from "lucide-react";

import { cn } from "@beyo/lib";

import type { EmailsSurfaceOpeners } from "../surface-ids";
import type { EmailTemplate } from "../types";

export type EmailTemplatePickerProps = {
  selectedTemplate: EmailTemplate | null;
  onSelectTemplate: (template: EmailTemplate) => void;
  surfaceOpeners?: EmailsSurfaceOpeners;
  disabled?: boolean;
  placeholder?: string;
};

export function EmailTemplatePicker({
  selectedTemplate,
  onSelectTemplate,
  surfaceOpeners,
  disabled = false,
  placeholder = "Select an email template",
}: EmailTemplatePickerProps): React.JSX.Element {
  function handlePress(): void {
    surfaceOpeners?.openEmailTemplatePicker?.({
      onSelect: onSelectTemplate,
    });
  }

  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-sm transition",
        disabled ? "cursor-not-allowed opacity-50" : null,
      )}
      disabled={disabled}
      type="button"
      onClick={handlePress}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">
          {selectedTemplate?.name ?? placeholder}
        </p>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {selectedTemplate?.subject ?? "Choose a template to prefill the email."}
        </p>
      </div>
      <ChevronRight
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground"
      />
    </button>
  );
}
```

**Key changes from the current file:**
- Removed all `useState`, `useEffect` imports
- Removed `useStagedForm` import and all staged form state
- Removed `vaul` `Drawer` import and all Drawer JSX
- Removed `StagedForm`, `StagedFormStep`, `ContentCard` imports
- Removed `useEmailTemplatesQuery` import
- Added `surfaceOpeners?: EmailsSurfaceOpeners` prop
- `handlePress` is the only new logic

The visual trigger button (`className`, inner `<p>` elements, `ChevronRight` icon) is **unchanged** from the current implementation.

---

### Step 4 — `packages/emails/src/components/EmailComposer.tsx` (EDIT)

Add `surfaceOpeners?: EmailsSurfaceOpeners` to props and pass it to `EmailTemplatePicker`.

Change the import block to include `EmailsSurfaceOpeners`:

```ts
import type { EmailsSurfaceOpeners } from "../surface-ids";
```

Add to `EmailComposerProps`:
```ts
surfaceOpeners?: EmailsSurfaceOpeners;
```

Pass to `EmailTemplatePicker`:
```tsx
<EmailTemplatePicker
  disabled={disabled}
  selectedTemplate={selectedTemplate}
  surfaceOpeners={surfaceOpeners}
  onSelectTemplate={onSelectTemplate}
/>
```

No other changes to `EmailComposer`.

---

### Step 5 — `packages/emails/src/index.ts` (EDIT)

Add the following exports. Do NOT add a static re-export of `EmailTemplatePickerSheetPage` — use the loader function pattern (§14):

```ts
// Add these to the existing exports:
export { EMAIL_TEMPLATE_PICKER_SHEET_SURFACE_ID } from "./surface-ids";
export type {
  EmailTemplatePickerSheetSurfaceProps,
  EmailsSurfaceOpeners,
} from "./surface-ids";

export function loadEmailTemplatePickerSheetPage() {
  return import("./pages/EmailTemplatePickerSheetPage").then((m) => ({
    default: m.EmailTemplatePickerSheetPage,
  }));
}
```

Keep all existing exports (`EmailTemplate`, `getEmailTemplates`, `emailTemplateKeys`, `useEmailTemplatesQuery`, `EmailTemplatePicker`, `EmailTemplatePickerProps`, `EmailComposer`, `EmailComposerProps`).

---

### Step 6 — `packages/emails/package.json` (EDIT)

Remove `"vaul": ">=1.0.0"` from `peerDependencies`. The package no longer uses vaul directly.

The final `peerDependencies` object should be:
```json
"peerDependencies": {
  "@beyo/api-client": "*",
  "@beyo/hooks": "*",
  "@beyo/lib": "*",
  "@beyo/ui": "*",
  "@tanstack/react-query": ">=5.0.0",
  "lucide-react": ">=1.0.0",
  "react": ">=19.0.0",
  "zod": ">=4.0.0"
}
```

---

### Step 7 — `packages/task-customer-coordination/src/surface-ids.ts` (EDIT)

Replace the file with the full updated version that adds `openEmailTemplatePicker`, `openTaskDetail`, and `openImageViewer` to `CustomerCoordinationEmailSlideSurfaceOpeners`:

```ts
import type { EmailTemplatePickerSheetSurfaceProps } from "@beyo/emails";

export const CUSTOMER_COORDINATION_EMAIL_SLIDE_SURFACE_ID =
  "customer-coordination-email-slide";

export type CustomerCoordinationEmailSlideSurfaceOpeners = {
  closeSurface?: () => void;
  openEmailTemplatePicker?: (
    props: EmailTemplatePickerSheetSurfaceProps,
  ) => void;
  openTaskDetail?: (taskId: string) => void;
  openImageViewer?: (
    taskId: string,
    itemClientId: string | null,
    images: Array<{ client_id: string; image_url: string }>,
  ) => void;
};

export type CustomerCoordinationEmailSlideSurfaceProps = {
  surfaceOpeners?: CustomerCoordinationEmailSlideSurfaceOpeners;
};
```

---

### Step 8 — `packages/task-customer-coordination/src/controllers/use-customer-coordination-email-slide.controller.ts` (EDIT)

Add a `toViewerImages` helper and two new controller methods. Follow the same pattern as `use-task-post-handling.controller.ts`.

**Add at module level** (above the controller function, after existing imports):

```ts
import type { TaskListItemWithCoordinationRaw } from "../types";

function toViewerImages(
  images: TaskListItemWithCoordinationRaw["item_images"],
): Array<{ client_id: string; image_url: string }> {
  return images.flatMap((image) => {
    const clientId =
      typeof image.client_id === "string" ? image.client_id : null;
    const imageUrl =
      typeof image.image_url === "string" ? image.image_url : null;
    return clientId && imageUrl
      ? [{ client_id: clientId, image_url: imageUrl }]
      : [];
  });
}
```

Note: `TaskListItemWithCoordinationRaw` is already imported in this file. `item_images` is typed as `Array<Record<string, unknown>>` (loose record), so the `typeof` guards are required.

**Add to `CustomerCoordinationEmailSlideController` type:**

```ts
openTaskDetail: (taskId: string) => void;
openImageViewer: (task: TaskListItemWithCoordinationRaw) => void;
```

**Add inside the controller function** (alongside existing `toggleTaskSelection`, `applyTemplate` etc.):

```ts
function openTaskDetail(taskId: string): void {
  surfaceOpeners?.openTaskDetail?.(taskId);
}

function openImageViewer(task: TaskListItemWithCoordinationRaw): void {
  const images = toViewerImages(task.item_images);
  if (!images.length) return;
  surfaceOpeners?.openImageViewer?.(
    task.task.client_id,
    task.primary_item?.client_id ?? null,
    images,
  );
}
```

**Add to the return object:**

```ts
openTaskDetail,
openImageViewer,
```

No other changes to the controller.

---

### Step 9 — `packages/task-customer-coordination/src/pages/CustomerCoordinationEmailSlidePage.tsx` (EDIT)

Two changes to this file:

**Change A — Pass `surfaceOpeners` to `EmailComposer`** (was the only change in the original plan):

Import `EmailsSurfaceOpeners` from `@beyo/emails`:

```ts
import type { EmailsSurfaceOpeners } from "@beyo/emails";
```

Derive the emails surface openers inside the component function, above the `return`:

```tsx
const emailsSurfaceOpeners: EmailsSurfaceOpeners = {
  openEmailTemplatePicker:
    props.surfaceOpeners?.openEmailTemplatePicker,
};
```

Pass it to `EmailComposer`:

```tsx
<EmailComposer
  disabled={controller.isSending}
  selectedTemplate={controller.selectedTemplate}
  subject={controller.subject}
  textBody={controller.textBody}
  surfaceOpeners={emailsSurfaceOpeners}
  onSelectTemplate={controller.applyTemplate}
  onSubjectChange={controller.setSubject}
  onTextBodyChange={controller.setTextBody}
/>
```

**Change B — Wire `onTapCard` and `onTapImage` on each `TaskListCard`** in the task-selection step:

Each `TaskListCard` in the `controller.tasks.map(...)` call currently receives no `onTapCard` or `onTapImage`. Add both:

```tsx
controller.tasks.map((task) => (
  <TaskListCard
    key={task.task.client_id}
    batchMode
    imageUrl={resolveImageUrl(task.item_images)}
    isSelected={controller.selectedTaskIds.includes(task.task.client_id)}
    item={
      task.primary_item
        ? {
            itemId: task.primary_item.client_id,
            article_number: task.primary_item.article_number,
            sku: task.primary_item.sku,
            item_major_category_snapshot:
              task.primary_item.item_major_category_snapshot,
            quantity: task.primary_item.quantity,
          }
        : null
    }
    onTapCard={controller.openTaskDetail}
    onTapImage={() => {
      controller.openImageViewer(task);
    }}
    onToggleSelect={controller.toggleTaskSelection}
    task={{
      task_type: task.task.task_type,
      state: task.task.state,
      return_source: task.task.return_source,
      ready_by_at: task.task.ready_by_at,
    }}
    taskId={task.task.client_id}
  />
))
```

No other changes to the slide page.

---

### Step 10 — `apps/selleres-app/.../src/features/tasks/surfaces.ts` (EDIT)

**Add import** from `@beyo/emails`:

```ts
import {
  EMAIL_TEMPLATE_PICKER_SHEET_SURFACE_ID,
  loadEmailTemplatePickerSheetPage,
} from "@beyo/emails";
```

**Add lazy component** (place it with the other sheet lazy components):

```ts
const emailTemplatePickerSheet = lazyWithPreload(
  loadEmailTemplatePickerSheetPage,
);
```

**Export the surface ID** (add to the existing `export { ... }` block or as a standalone re-export):

```ts
export { EMAIL_TEMPLATE_PICKER_SHEET_SURFACE_ID } from "@beyo/emails";
```

**Add to `taskSurfaces`** (add it alongside the other sheet entries):

```ts
[EMAIL_TEMPLATE_PICKER_SHEET_SURFACE_ID]: {
  surface: "sheet",
  component: emailTemplatePickerSheet.Component,
},
```

No other changes to `surfaces.ts`.

---

### Step 11 — `apps/selleres-app/.../src/features/home/components/HomeView.tsx` (EDIT)

**Add imports** — `EMAIL_TEMPLATE_PICKER_SHEET_SURFACE_ID` comes from `@/features/tasks/surfaces` (added in Step 10). `TASK_DETAIL_SURFACE_ID` and `ImageViewModel`, `ImageLinkEntityType` from `@beyo/images` are already imported for the post-handling opener. Confirm `IMAGE_VIEWER_SURFACE_ID` is in scope.

The current import from `@/features/tasks/surfaces` needs to add `EMAIL_TEMPLATE_PICKER_SHEET_SURFACE_ID`:

```ts
import {
  EMAIL_TEMPLATE_PICKER_SHEET_SURFACE_ID,
  TASK_ACTIONS_SHEET_SURFACE_ID,
  TASK_DETAIL_SURFACE_ID,
  TASK_POST_HANDLING_PENDING_WARNING_SHEET_SURFACE_ID,
  TASK_POST_HANDLING_SLIDE_SURFACE_ID,
  preloadPinNotificationsSlideSurface,
  preloadTaskPostHandlingPendingWarningSheetSurface,
  type TaskPostHandlingPendingWarningSheetSurfaceProps,
  type TaskPostHandlingSlideSurfaceProps,
} from "@/features/tasks/surfaces";
```

**Update `openCustomerCoordinationSurface`** to add `openEmailTemplatePicker`, `openTaskDetail`, and `openImageViewer`:

```ts
function openCustomerCoordinationSurface(): void {
  surface.open(CUSTOMER_COORDINATION_EMAIL_SLIDE_SURFACE_ID, {
    surfaceOpeners: {
      closeSurface: () =>
        surface.close(CUSTOMER_COORDINATION_EMAIL_SLIDE_SURFACE_ID),
      openEmailTemplatePicker: (pickerProps) => {
        surface.open(EMAIL_TEMPLATE_PICKER_SHEET_SURFACE_ID, pickerProps);
      },
      openTaskDetail: (taskId) => {
        surface.open(TASK_DETAIL_SURFACE_ID, { taskId });
      },
      openImageViewer: (taskId, itemClientId, images) => {
        if (!images.length) return;

        const viewModels: ImageViewModel[] = images.map((img, index) => ({
          clientId: img.client_id,
          linkClientId: null,
          entityType: "item" as ImageLinkEntityType,
          entityClientId: itemClientId ?? taskId,
          imageUrl: img.image_url,
          localObjectUrl: null,
          displayOrder: index,
          widthPx: null,
          heightPx: null,
          fileSizeBytes: null,
          createdAt: null,
          uploadState: "completed",
          isOptimistic: false,
          isDeleted: false,
          pendingUploadClientId: null,
          uploadError: null,
          annotation: null,
          annotations: [],
        }));

        const initialImage = viewModels[0];
        if (!initialImage) return;

        surface.open(IMAGE_VIEWER_SURFACE_ID, {
          images: viewModels,
          initialImageClientId: initialImage.clientId,
          entityType: "item",
          entityClientId: itemClientId ?? taskId,
          mode: "preview-only",
        });
      },
    },
  } satisfies CustomerCoordinationEmailSlideSurfaceProps);
}
```

The `ImageViewModel`, `ImageLinkEntityType`, and `IMAGE_VIEWER_SURFACE_ID` are already imported from `@beyo/images` in this file (used by the post-handling opener). No new package imports needed.

No other changes to `HomeView.tsx`.

---

## Risks and mitigations

- **Risk:** `header?.requestClose()` inside the sheet page triggers a close animation, but `onSelect(template)` is called just before. If the parent re-renders immediately on `onSelect`, the closing animation may stutter.
  **Mitigation:** Call `localStorage.setItem` → `onSelect` → `header?.requestClose()` in that order. `onSelect` queues a React state update; `requestClose` starts the animation immediately — no conflict.

- **Risk:** `CustomerCoordinationEmailSlidePage` imports `EmailsSurfaceOpeners` from `@beyo/emails`. This is already a declared peer dependency — no new dep needed.

- **Risk:** `EMAIL_TEMPLATE_PICKER_SHEET_SURFACE_ID` must be re-exported from `@/features/tasks/surfaces` for `HomeView.tsx` to import it without importing directly from `@beyo/emails`.
  **Mitigation:** Step 10 adds the re-export. Step 11 imports from `@/features/tasks/surfaces` only.

- **Risk:** `didAutoSelect` ref prevents re-triggering the auto-navigate effect on query refetch, but the user could tap Back, then the next open of the picker sheet starts fresh with a new mount — so the auto-select fires again on the next open, which is correct behaviour.

- **Risk:** `toViewerImages` in the coordination controller is a module-level helper. The `TaskListItemWithCoordinationRaw["item_images"]` type is `Array<Record<string, unknown>>` (from `TaskListItemRawSchema`), requiring `typeof` guards. Follow the exact same implementation as `use-task-post-handling.controller.ts`.

- **Risk:** `openTaskDetail` on a task card in batch-mode opens the detail slide behind the coordination slide. Both are registered surfaces — the surface layer handles stacking correctly.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors.
- Open the sellers app. Tap "Customer Coordination" button on the home screen.
- Stage 1 (task-selection step): tap a task card body → task detail slide opens.
- Stage 1: tap a task image → full image viewer opens.
- Stage 2 (email step): confirm `EmailTemplatePicker` trigger renders correctly.
- Tap the trigger: a sheet opens from the bottom showing a list of email templates.
- Tap a template card body: the list slides to the LEFT, the preview slides in from the RIGHT (CSS transition visible).
- Tap the back button: preview slides out to the RIGHT, list slides in from the LEFT.
- Tap the checkmark on a card: the sheet closes; trigger updates; template name saved to `localStorage`.
- Close the coordination slide and re-open it. Tap the template trigger again: picker sheet should open directly on the preview of the previously selected template.
- Tap "Use template" in the preview: same result — sheet closes, trigger updates.
- Verify subject and textBody inputs in the composer are populated from the template.

---

## Review log

- `2026-07-04` `claude`: Corrections plan authored from post-implementation feedback.
- `2026-07-04` `claude`: Added localStorage auto-selection and task detail/image viewer wiring.

---

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: user (David)
