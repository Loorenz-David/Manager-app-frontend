# PLAN_task_customer_coordination_email_slide_20260704

## Metadata

- Plan ID: `PLAN_task_customer_coordination_email_slide_20260704`
- Status: `archived`
- Owner agent: `claude`
- Created at (UTC): `2026-07-04T22:00:00Z`
- Last updated at (UTC): `2026-07-04T15:42:43Z`
- Related handoff: `HANDOFF_TO_FRONTEND_task_customer_coordination_email_and_counts_20260704`

---

## Goal and intent

- **Goal:** Build a two-stage slide page in `@beyo/task-customer-coordination` that lets a seller select pending-coordination tasks and send them a batch email via a customisable template. Add a Home button in the sellers app showing the pending count.
- **Business/user intent:** Sellers need a fast workflow to reach out to customers whose tasks are ready for coordination (e.g. pickup notifications) without leaving the app.
- **Non-goals:** Inbox/thread view, real-time socket updates for coordination state, per-task skipped detail UI (toast only), multiple email connection picker.

---

## Scope

- **In scope:**
  - New package `@beyo/emails`: `EmailTemplatePicker` (internal vaul sheet + StagedForm) + `EmailComposer`
  - New package `@beyo/task-customer-coordination`: types, API, query hooks, mutation, controller, slide page
  - Sellers app: surface registration, home button with count badge
- **Out of scope:** Managers app wiring, workers app, real endpoint for email templates (decoy only), `html_body` support, connection picker for 422
- **Assumptions:**
  - `@beyo/tasks` exports `TaskListItemRawSchema`, `TaskListCard`, and `taskKeys` (verified)
  - `apiClient.post(url, responseSchema, body)` signature (verified)
  - `useStagedForm` starts at index 0 of `steps[]` (verified)

---

## Design decisions recorded

These decisions were confirmed with the user before writing the plan:

| Question | Decision |
|---|---|
| Email template picker sheet | Internal vaul `Drawer` — not a registered surface. No `surfaceOpeners` injection needed. |
| Skipped tasks feedback | Toast only: `"N email(s) queued, N skipped"`. No per-task error state. |
| list ↔ preview animation in picker | `StagedForm` with `useStagedForm`, `mode: "free"`. Standard forward direction (preview enters from right). |
| 422 multiple email connections | Show error toast with the API error message. No connection picker. |

---

## File manifest

### New packages to create

All paths relative to `frontend/`.

#### `@beyo/emails`

| Path | Notes |
|---|---|
| `packages/emails/package.json` | CREATE — see §Implementation step 1 |
| `packages/emails/tsconfig.json` | CREATE — standard package tsconfig |
| `packages/emails/src/index.ts` | CREATE — barrel: exports `EmailTemplate`, `EmailComposer`, `EmailTemplatePicker` |
| `packages/emails/src/types.ts` | CREATE — `EmailTemplate` type |
| `packages/emails/src/api/email-template-keys.ts` | CREATE — query key factory |
| `packages/emails/src/api/get-email-templates.ts` | CREATE — DECOY endpoint (hardcoded, easy swap) |
| `packages/emails/src/api/use-email-templates-query.ts` | CREATE — `useEmailTemplatesQuery` |
| `packages/emails/src/components/EmailTemplatePicker.tsx` | CREATE — trigger + internal vaul sheet with StagedForm list/preview |
| `packages/emails/src/components/EmailComposer.tsx` | CREATE — EmailTemplatePicker + subject input + textarea |

#### `@beyo/task-customer-coordination`

| Path | Notes |
|---|---|
| `packages/task-customer-coordination/package.json` | CREATE |
| `packages/task-customer-coordination/tsconfig.json` | CREATE |
| `packages/task-customer-coordination/src/index.ts` | CREATE — barrel (see §Public API) |
| `packages/task-customer-coordination/src/types.ts` | CREATE — schemas + types |
| `packages/task-customer-coordination/src/surface-ids.ts` | CREATE — surface ID constant + props type |
| `packages/task-customer-coordination/src/api/customer-coordination-keys.ts` | CREATE |
| `packages/task-customer-coordination/src/api/get-customer-coordination-counts.ts` | CREATE |
| `packages/task-customer-coordination/src/api/use-customer-coordination-counts-query.ts` | CREATE |
| `packages/task-customer-coordination/src/api/get-tasks-with-coordination.ts` | CREATE |
| `packages/task-customer-coordination/src/api/use-tasks-with-coordination-query.ts` | CREATE |
| `packages/task-customer-coordination/src/api/post-email-batch.ts` | CREATE |
| `packages/task-customer-coordination/src/actions/use-send-email-batch.ts` | CREATE |
| `packages/task-customer-coordination/src/controllers/use-customer-coordination-email-slide.controller.ts` | CREATE |
| `packages/task-customer-coordination/src/pages/CustomerCoordinationEmailSlidePage.tsx` | CREATE |

### Existing files to edit (sellers app)

All paths relative to `apps/selleres-app/ManagerBeyo-app-sellers/`.

| Path | Change summary |
|---|---|
| `package.json` | Add `@beyo/emails: "*"` and `@beyo/task-customer-coordination: "*"` to dependencies |
| `src/index.css` | Add `@source` directives for both new packages |
| `src/features/tasks/surfaces.ts` | Register `CustomerCoordinationEmailSlidePage` as a slide surface; export ID + loader |
| `src/features/home/types.ts` | Add `coordinationCount: number \| null` and `coordinationCountLabel: string` |
| `src/features/home/controllers/use-home-view.controller.ts` | Add `useCustomerCoordinationCountsQuery` for the count badge |
| `src/features/home/components/HomeView.tsx` | Add "Customer Coordination" button that opens the slide surface |

`surface-registry.ts` does NOT need to change — it already spreads `taskSurfaces` which will contain the new surface.

---

## Clarifications required

None — all decisions resolved before plan creation (see §Design decisions).

---

## Acceptance criteria

1. The sellers app Home screen shows a "Customer Coordination (N)" button with the pending count from `GET /api/v1/tasks/customer-coordination/counts?customer_coordination_states=pending`.
2. Tapping the button opens a slide surface with no header.
3. Stage 1 shows the task list cards filtered by `customer_coordination_states=pending`. Cards are in `batchMode` (checkmark selection). The "Next (N)" button is disabled when 0 tasks selected; enabled with a count when ≥1 selected.
4. Stage 2 shows `EmailComposer`. The template picker trigger shows a placeholder when no template is selected. Tapping it opens an internal vaul sheet (height 400 px) with a scrollable template list. Tapping a card preview body navigates to a preview panel (StagedForm forward). Tapping the checkmark on a card selects the template, closes the sheet, and populates subject + textBody inputs. The back arrow in preview returns to the list.
5. Subject and textBody are editable after template selection. Send button is disabled while subject or textBody is empty or while the mutation is pending.
6. On successful send: toast shows `"N email(s) queued"` (appends `, N skipped` when `skipped_count > 0`). App returns to stage 1 task list with selections cleared. If the refreshed task list is empty, the surface auto-closes.
7. On 422 from the API: error toast with the API error message.
8. `npm run typecheck` passes with zero errors in the sellers app and both new packages.

---

## Contracts and skills

### Contracts loaded

Read in this order per the document-only protocol:

- `architecture/01_architecture.md` → `architecture/01_architecture_local.md`
- `architecture/02_types.md`
- `architecture/04_api_client.md` → `architecture/04_api_client_local.md` (backend error shape, no `field_errors`)
- `architecture/05_server_state.md` (query hook pattern)
- `architecture/06_client_state.md` (local state rules)
- `architecture/08_hooks.md` (mutation action pattern, NO optimistic update needed)
- `architecture/13_errors.md` (error handling, `notify` for toast)
- `architecture/15_feature_structure.md` (feature directory layout)
- `architecture/16_feature_workflow.md` (build order)
- `architecture/07_components.md` (component rules)
- `architecture/10_pages.md` (page component rules)
- `architecture/14_styling.md` → `@source` directive rules (§14 of that doc)
- `architecture/28_surfaces.md` → `architecture/28_surfaces_local.md` (active surface types: `slide`, `sheet`, `modal`)
- `architecture/30_dynamic_loading.md` → `architecture/30_dynamic_loading_local.md` (`lazyWithPreload` path, `loadXxxPage` loader function pattern)
- `architecture/33_vaul_drawer.md` (**must read before implementing `EmailTemplatePicker`** — use the correct `Drawer.Root` props from this contract)
- `architecture/35_shared_packages.md` (§3 package.json template, §4 peer deps, §5 tsconfig, §6 @source, §13 surfaceOpeners injection pattern, §14 loader function pattern)

### Domain schemas consulted

- `packages/tasks/src/types.ts`:
  - `TaskListItemRawSchema` — extended in `@beyo/task-customer-coordination/src/types.ts` to add `customer_coordination` array
  - `TaskListItemRaw` — base list item type
  - `ListTasksFullParams` — NOT reused directly; custom param type defined in coordination package
- `packages/tasks/src/api/task-keys.ts` — pattern for query key factory
- `packages/tasks/src/api/get-post-handling-counts.ts` — pattern for counts API function
- `packages/tasks/src/api/list-tasks.ts` — pattern for task list API function with queryParams mapping
- `packages/tasks/src/pages/QuickTaskAssignSlidePage.tsx` — reference for two-stage layout, footer buttons, StagedForm usage, TaskListCard in batchMode, `setHeaderHidden(true)`

### Local extensions loaded

- `architecture/04_api_client_local.md`: flat string error shape (no `field_errors`), `decodeTokenClaims` export
- `architecture/28_surfaces_local.md`: active types are `slide`, `sheet`, `modal` only — `drawer` is excluded
- `architecture/30_dynamic_loading_local.md`: `lazyWithPreload` from `@beyo/ui/src/lib/`, `usePreloadSurface` hook path

---

## Implementation plan

Follow the build order: Types → Query Keys → API Functions → Query Hooks → Mutation Actions → Controllers → Components → Pages → App wiring → Public API.

---

### Step 1 — Create `@beyo/emails` package skeleton

Create `packages/emails/package.json`:

```json
{
  "name": "@beyo/emails",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "peerDependencies": {
    "@beyo/api-client": "*",
    "@beyo/lib": "*",
    "@beyo/ui": "*",
    "@beyo/hooks": "*",
    "react": ">=19.0.0",
    "@tanstack/react-query": ">=5.0.0",
    "vaul": ">=1.0.0",
    "zod": ">=4.0.0"
  }
}
```

Create `packages/emails/tsconfig.json` — copy the standard package tsconfig exactly:

```json
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "types": ["node", "vite/client"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true
  },
  "include": ["src"]
}
```

---

### Step 2 — `@beyo/emails` types

Create `packages/emails/src/types.ts`:

```ts
export type EmailTemplate = {
  client_id: string;
  name: string;
  subject: string;
  text_body: string;
};
```

---

### Step 3 — `@beyo/emails` query key factory

Create `packages/emails/src/api/email-template-keys.ts`:

```ts
export const emailTemplateKeys = {
  all: ["email-templates"] as const,
  list: () => [...emailTemplateKeys.all, "list"] as const,
};
```

---

### Step 4 — `@beyo/emails` decoy endpoint

Create `packages/emails/src/api/get-email-templates.ts`.

This function returns hardcoded templates. When the real `/api/v1/email-templates` endpoint is ready, replace only this file's implementation — keep the function signature identical.

```ts
import type { EmailTemplate } from "../types";

// DECOY: replace body with apiClient.get("/api/v1/email-templates", ...) when the real endpoint is live.
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  return [
    {
      client_id: "tpl_decoy_1",
      name: "Pickup Ready",
      subject: "Din {{task_type}} är klar för upphämtning — {{customer_name}}",
      text_body:
        "Hej {{customer_name}},\n\nDin order är nu klar för upphämtning.\nUpphämtning: {{task_scheduled_time}}\n\nArtikel: {{item_article_number}}\n\nMed vänlig hälsning",
    },
    {
      client_id: "tpl_decoy_2",
      name: "Order Status Update",
      subject: "Uppdatering på din order — {{customer_name}}",
      text_body:
        "Hej {{customer_name}},\n\nStatusen på din order har ändrats till: {{task_state}}.\n\nArtikel: {{item_article_number}}\nArtikelnummer: {{item_sku}}\n\nMed vänlig hälsning",
    },
  ];
}
```

---

### Step 5 — `@beyo/emails` query hook

Create `packages/emails/src/api/use-email-templates-query.ts`:

```ts
import { useQuery } from "@tanstack/react-query";

import { getEmailTemplates } from "./get-email-templates";
import { emailTemplateKeys } from "./email-template-keys";

export function useEmailTemplatesQuery() {
  return useQuery({
    queryKey: emailTemplateKeys.list(),
    queryFn: getEmailTemplates,
    staleTime: Infinity,  // templates change rarely; don't re-fetch in background
  });
}
```

---

### Step 6 — `EmailTemplatePicker` component

Create `packages/emails/src/components/EmailTemplatePicker.tsx`.

**Read `architecture/33_vaul_drawer.md` before implementing** to use the correct `Drawer.Root` props (specifically `handleOnly`, `modal`, `repositionInputs`, `direction`).

Behaviour:
- Renders a tappable trigger `<button>` that opens an internal vaul sheet.
- Trigger shows "Select a template" (placeholder, `text-muted-foreground`) when `selectedTemplate` is null. When a template is selected, shows `template.name` as the primary line and `template.subject` as a secondary line (truncated to one line, `text-sm text-muted-foreground`).
- The vaul sheet uses **internal state only** (`isOpen: boolean`) — it is NOT a registered surface, does NOT call `useSurface`, and does NOT use `SurfaceProvider`.

#### Internal vaul sheet

```
Drawer.Root (open={isOpen}, onOpenChange handles close, direction="bottom", dismissible)
  Drawer.Portal
    Drawer.Overlay  ← semi-transparent backdrop, className="fixed inset-0 bg-black/30"
    Drawer.Content  ← fixed inset-x-0 bottom-0, rounded-t-2xl, bg-background, shadow-xl
                       height controlled by EMAIL_TEMPLATE_SHEET_HEIGHT constant
```

Define the height constant at the top of the file (NOT as a magic number inline):

```ts
const EMAIL_TEMPLATE_SHEET_HEIGHT = 400; // px — adjust as needed
```

Apply height to the content wrapper div **inside** `Drawer.Content`, not to `Drawer.Content` itself (vaul controls `Drawer.Content` transforms):

```tsx
<Drawer.Content
  className="fixed inset-x-0 bottom-0 rounded-t-2xl bg-background shadow-xl focus:outline-none"
>
  <div style={{ height: EMAIL_TEMPLATE_SHEET_HEIGHT }} className="flex flex-col overflow-hidden">
    {/* drag handle */}
    <div className="flex h-9 flex-shrink-0 items-start justify-center pt-3">
      <div aria-hidden="true" className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
    </div>
    {/* StagedForm list/preview */}
    ...
  </div>
</Drawer.Content>
```

#### Internal StagedForm for list ↔ preview

```ts
const pickerSteps = [
  { id: "list", title: "Templates" },
  { id: "preview", title: "Preview" },
];
const pickerStaged = useStagedForm({ steps: pickerSteps, mode: "free" });
```

When the sheet opens, reset to "list": call `pickerStaged.navigateTo("list")` in an `useEffect` that watches `isOpen`.

**List step:**

- Fetch templates via `useEmailTemplatesQuery()`.
- Loading state: show `<p className="px-4 py-6 text-sm text-muted-foreground">Loading templates…</p>`.
- Error state: show error message + retry button (matching the existing empty-state pattern from `QuickTaskAssignSlidePage`).
- Empty state: `<p className="px-4 py-6 text-sm text-muted-foreground">No templates available.</p>`.
- List: `overflow-y-auto flex-1` div, one `EmailTemplateCardRow` per template.

**`EmailTemplateCardRow` (inline sub-component, do NOT export):**

Each row is a full-width container. Inside:
- Left body (flex-1): template `name` as `text-sm font-semibold text-primary`, template `subject` as `text-xs text-muted-foreground` (truncated, `line-clamp-1`). Tapping this area calls `handlePreview(template)` which sets `previewTemplate` state and calls `pickerStaged.navigateTo("preview")`.
- Right side: a rounded checkmark trigger button. Tapping it calls `onTemplateSelect(template)` and sets `isOpen(false)`.

Checkmark icon: use `Check` from `lucide-react` inside a `<button className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border bg-card">`.

Row container: `<div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0">`.

**Preview step:**

State: `previewTemplate: EmailTemplate | null` (tracked in the picker component).

Header: a back arrow button at top-left:
```tsx
<button
  type="button"
  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary"
  onClick={() => pickerStaged.navigateTo("list")}
>
  <ArrowLeft aria-hidden="true" className="size-4 shrink-0" />
  Back
</button>
```

Content: `overflow-y-auto flex-1` div with:
- `<p className="px-4 pb-1 text-base font-semibold text-primary">{previewTemplate.subject}</p>`
- `<p className="px-4 pt-1 text-sm text-muted-foreground whitespace-pre-line">{previewTemplate.text_body}</p>`

#### Props

```ts
type EmailTemplatePickerProps = {
  selectedTemplate: EmailTemplate | null;
  onTemplateSelect: (template: EmailTemplate) => void;
};
```

---

### Step 7 — `EmailComposer` component

Create `packages/emails/src/components/EmailComposer.tsx`.

**Props:**

```ts
type EmailComposerProps = {
  subject: string;
  textBody: string;
  onSubjectChange: (value: string) => void;
  onTextBodyChange: (value: string) => void;
};
```

**Internal state:**

```ts
const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
```

**Template selection handler:**

When a template is selected via `EmailTemplatePicker`, update both the local `selectedTemplate` display state AND propagate to the parent via `onSubjectChange` and `onTextBodyChange`:

```ts
function handleTemplateSelect(template: EmailTemplate): void {
  setSelectedTemplate(template);
  onSubjectChange(template.subject);
  onTextBodyChange(template.text_body);
}
```

**Layout** (top to bottom, `flex flex-col gap-4 px-4 pb-10 pt-3`):

1. `EmailTemplatePicker selectedTemplate={selectedTemplate} onTemplateSelect={handleTemplateSelect}`
2. Subject input section:
   - Label `<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Subject</p>`
   - `<input type="text" value={subject} onChange={e => onSubjectChange(e.target.value)} className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-primary placeholder:text-muted-foreground focus:outline-none" placeholder="Email subject" />`
3. Body textarea section:
   - Label `<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Message</p>`
   - `<textarea value={textBody} onChange={e => onTextBodyChange(e.target.value)} rows={12} className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm text-primary placeholder:text-muted-foreground focus:outline-none" placeholder="Email body…" />`

Do NOT use `react-textarea-autosize` here — a fixed `rows={12}` textarea with the page scroll containing it is sufficient.

---

### Step 8 — `@beyo/emails` public API

Create `packages/emails/src/index.ts`:

```ts
export type { EmailTemplate } from "./types";
export { EmailComposer } from "./components/EmailComposer";
export { EmailTemplatePicker } from "./components/EmailTemplatePicker";
```

---

### Step 9 — Create `@beyo/task-customer-coordination` package skeleton

Create `packages/task-customer-coordination/package.json`:

```json
{
  "name": "@beyo/task-customer-coordination",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "peerDependencies": {
    "@beyo/api-client": "*",
    "@beyo/lib": "*",
    "@beyo/ui": "*",
    "@beyo/hooks": "*",
    "@beyo/tasks": "*",
    "@beyo/emails": "*",
    "react": ">=19.0.0",
    "@tanstack/react-query": ">=5.0.0",
    "zod": ">=4.0.0",
    "lucide-react": ">=0.400.0"
  }
}
```

Create `packages/task-customer-coordination/tsconfig.json` — same standard tsconfig as in step 1.

---

### Step 10 — `@beyo/task-customer-coordination` types

Create `packages/task-customer-coordination/src/types.ts`.

Import `TaskListItemRawSchema` from `@beyo/tasks` and extend it with `customer_coordination`.

```ts
import { z } from "zod";
import { TaskListItemRawSchema } from "@beyo/tasks";

export const CUSTOMER_COORDINATION_STATE = [
  "pending",
  "coordinating",
  "completed",
] as const;
export type CustomerCoordinationState =
  (typeof CUSTOMER_COORDINATION_STATE)[number];

export const CustomerCoordinationRecordSchema = z.object({
  client_id: z.string(),
  task_id: z.string(),
  state: z.enum(CUSTOMER_COORDINATION_STATE),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});
export type CustomerCoordinationRecord = z.infer<
  typeof CustomerCoordinationRecordSchema
>;

// Extends the base task list item with customer_coordination as a non-null array.
// Used only when the API is called with customer_coordination_states param.
export const TaskWithCoordinationSchema = TaskListItemRawSchema.extend({
  task: TaskListItemRawSchema.shape.task.extend({
    customer_coordination: z.array(CustomerCoordinationRecordSchema),
  }),
});
export type TaskWithCoordination = z.infer<typeof TaskWithCoordinationSchema>;

export type ListTasksWithCoordinationResult = {
  items: TaskWithCoordination[];
  limit: number;
  offset: number;
  has_more: boolean;
};

const CustomerCoordinationCountsSchema = z.object({
  pending: z.number().int().optional(),
  coordinating: z.number().int().optional(),
  completed: z.number().int().optional(),
});
export type CustomerCoordinationCounts = z.infer<
  typeof CustomerCoordinationCountsSchema
>;

export type EmailBatchBody = {
  task_ids: string[];
  subject: string;
  text_body: string;
  html_body: null;
};

export const EmailBatchResponseSchema = z.object({
  job_id: z.string().nullable(),
  status: z.enum(["queued", "nothing_to_send"]),
  queued_count: z.number().int(),
  skipped_count: z.number().int(),
  skipped: z.array(
    z.object({
      task_client_id: z.string(),
      reason: z.enum([
        "task_not_found",
        "no_coordination_record",
        "no_customer_email",
      ]),
    }),
  ),
});
export type EmailBatchResponse = z.infer<typeof EmailBatchResponseSchema>;
```

---

### Step 11 — `surface-ids.ts`

Create `packages/task-customer-coordination/src/surface-ids.ts`:

```ts
export const CUSTOMER_COORDINATION_EMAIL_SLIDE_SURFACE_ID =
  "customer-coordination-email-slide";

export type CustomerCoordinationEmailSlideSurfaceOpeners = {
  closeSurface?: () => void;
};

export type CustomerCoordinationEmailSlideSurfaceProps = {
  surfaceOpeners: CustomerCoordinationEmailSlideSurfaceOpeners;
};
```

---

### Step 12 — Query key factory

Create `packages/task-customer-coordination/src/api/customer-coordination-keys.ts`:

```ts
export const customerCoordinationKeys = {
  all: ["customer-coordination"] as const,
  counts: (states?: string) =>
    [...customerCoordinationKeys.all, "counts", states ?? "all"] as const,
  taskList: (params: Record<string, string> = {}) =>
    [...customerCoordinationKeys.all, "task-list", params] as const,
};
```

---

### Step 13 — Counts API function

Create `packages/task-customer-coordination/src/api/get-customer-coordination-counts.ts`:

```ts
import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { CustomerCoordinationCountsSchema } from "../types";

const GetCoordinationCountsResponseSchema = ApiEnvelopeSchema(
  CustomerCoordinationCountsSchema,
).extend({ ok: z.literal(true) });

export type GetCoordinationCountsParams = {
  customer_coordination_states?: string;
};

export async function getCustomerCoordinationCounts(
  params: GetCoordinationCountsParams = {},
): Promise<CustomerCoordinationCounts> {
  const queryParams: Record<string, string> = {};
  if (params.customer_coordination_states) {
    queryParams.customer_coordination_states =
      params.customer_coordination_states;
  }
  const parsed = await apiClient.get(
    "/api/v1/tasks/customer-coordination/counts",
    GetCoordinationCountsResponseSchema,
    queryParams,
  );
  return parsed.data;
}
```

Wait — `CustomerCoordinationCounts` import: add it to the import from `"../types"`.

---

### Step 14 — Counts query hook

Create `packages/task-customer-coordination/src/api/use-customer-coordination-counts-query.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { getCustomerCoordinationCounts } from "./get-customer-coordination-counts";
import { customerCoordinationKeys } from "./customer-coordination-keys";

export function useCustomerCoordinationCountsQuery(
  coordinationStates?: string,
) {
  return useQuery({
    queryKey: customerCoordinationKeys.counts(coordinationStates),
    queryFn: () =>
      getCustomerCoordinationCounts({
        customer_coordination_states: coordinationStates,
      }),
  });
}
```

---

### Step 15 — Task list with coordination API function

Create `packages/task-customer-coordination/src/api/get-tasks-with-coordination.ts`.

This function calls the same `GET /api/v1/tasks` endpoint as `listTasks` in `@beyo/tasks`, but uses a custom response schema that expects `customer_coordination` as an array (because we always pass `customer_coordination_states`).

```ts
import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import {
  TaskWithCoordinationSchema,
  type ListTasksWithCoordinationResult,
} from "../types";

const ListTasksWithCoordinationResponseSchema = ApiEnvelopeSchema(
  z.object({
    tasks_pagination: z.object({
      items: z.array(TaskWithCoordinationSchema),
      limit: z.number().int(),
      offset: z.number().int(),
      has_more: z.boolean(),
    }),
  }),
).extend({ ok: z.literal(true) });

export type GetTasksWithCoordinationParams = {
  customer_coordination_states: string;  // required — this function always filters
  task_states?: string;
  limit?: number;
  offset?: number;
};

export async function getTasksWithCoordination(
  params: GetTasksWithCoordinationParams,
): Promise<ListTasksWithCoordinationResult> {
  const queryParams: Record<string, string | number> = {
    customer_coordination_states: params.customer_coordination_states,
  };
  if (params.task_states) queryParams.task_states = params.task_states;
  if (params.limit != null) queryParams.limit = params.limit;
  if (params.offset != null) queryParams.offset = params.offset;

  const parsed = await apiClient.get(
    "/api/v1/tasks",
    ListTasksWithCoordinationResponseSchema,
    queryParams,
  );
  return parsed.data.tasks_pagination;
}
```

---

### Step 16 — Task list query hook

Create `packages/task-customer-coordination/src/api/use-tasks-with-coordination-query.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import {
  getTasksWithCoordination,
  type GetTasksWithCoordinationParams,
} from "./get-tasks-with-coordination";
import { customerCoordinationKeys } from "./customer-coordination-keys";

export function useTasksWithCoordinationQuery(
  params: GetTasksWithCoordinationParams,
) {
  return useQuery({
    queryKey: customerCoordinationKeys.taskList({
      customer_coordination_states: params.customer_coordination_states,
      ...(params.task_states ? { task_states: params.task_states } : {}),
    }),
    queryFn: () => getTasksWithCoordination(params),
  });
}
```

---

### Step 17 — Email batch API function

Create `packages/task-customer-coordination/src/api/post-email-batch.ts`:

```ts
import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import {
  EmailBatchResponseSchema,
  type EmailBatchBody,
  type EmailBatchResponse,
} from "../types";

const PostEmailBatchResponseSchema = ApiEnvelopeSchema(
  EmailBatchResponseSchema,
).extend({ ok: z.literal(true) });

export async function postEmailBatch(
  body: EmailBatchBody,
): Promise<EmailBatchResponse> {
  const parsed = await apiClient.post(
    "/api/v1/tasks/customer-coordination/email-batch",
    PostEmailBatchResponseSchema,
    body,
  );
  return parsed.data;
}
```

---

### Step 18 — Send email batch mutation action

Create `packages/task-customer-coordination/src/actions/use-send-email-batch.ts`.

No optimistic update. The action invalidates the coordination data on success.

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postEmailBatch } from "../api/post-email-batch";
import { customerCoordinationKeys } from "../api/customer-coordination-keys";

export function useSendEmailBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postEmailBatch,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: customerCoordinationKeys.all,
      });
    },
  });
}
```

---

### Step 19 — Controller

Create `packages/task-customer-coordination/src/controllers/use-customer-coordination-email-slide.controller.ts`.

**Imports:**
- `useState`, `useEffect`, `useCallback` from `react`
- `useStagedForm` from `@beyo/hooks`
- `notify` from `@beyo/lib`
- `useTasksWithCoordinationQuery` from `../api/use-tasks-with-coordination-query`
- `useSendEmailBatch` from `../actions/use-send-email-batch`
- `CustomerCoordinationEmailSlideSurfaceOpeners` from `../surface-ids`

**`useStagedForm` setup:**

```ts
const stagedSteps = [
  { id: "tasks", title: "Coordination Tasks" },
  { id: "email", title: "Send Email" },
];
const staged = useStagedForm({ steps: stagedSteps, mode: "free" });
```

**State:**

```ts
const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
const [subject, setSubject] = useState("");
const [textBody, setTextBody] = useState("");
const [hasSentBatch, setHasSentBatch] = useState(false);
```

**Task query:**

```ts
const tasksQuery = useTasksWithCoordinationQuery({
  customer_coordination_states: "pending",
});
const tasks = tasksQuery.data?.items ?? [];
```

**Mutation:**

```ts
const sendEmailBatch = useSendEmailBatch();
```

**Auto-close effect** — fires after a send when the refreshed list is empty:

```ts
useEffect(() => {
  if (hasSentBatch && !tasksQuery.isFetching && tasks.length === 0) {
    surfaceOpeners.closeSurface?.();
  }
}, [hasSentBatch, tasksQuery.isFetching, tasks.length, surfaceOpeners]);
```

**handleToggleTask:**

```ts
const handleToggleTask = useCallback((taskId: string): void => {
  setSelectedTaskIds((prev) =>
    prev.includes(taskId)
      ? prev.filter((id) => id !== taskId)
      : [...prev, taskId],
  );
}, []);
```

**handleGoToEmail:**

```ts
const handleGoToEmail = useCallback((): void => {
  if (selectedTaskIds.length === 0) return;
  staged.navigateTo("email");
}, [selectedTaskIds.length, staged]);
```

**handleBackToTasks:**

```ts
const handleBackToTasks = useCallback((): void => {
  staged.navigateTo("tasks");
}, [staged]);
```

**handleSend:**

```ts
const handleSend = useCallback(async (): Promise<void> => {
  if (
    selectedTaskIds.length === 0 ||
    !subject.trim() ||
    !textBody.trim() ||
    sendEmailBatch.isPending
  ) {
    return;
  }

  try {
    const result = await sendEmailBatch.mutateAsync({
      task_ids: selectedTaskIds,
      subject: subject.trim(),
      text_body: textBody.trim(),
      html_body: null,
    });

    const queuedLabel = `${result.queued_count} email${result.queued_count !== 1 ? "s" : ""} queued`;
    const skippedLabel =
      result.skipped_count > 0 ? `, ${result.skipped_count} skipped` : "";
    notify(`${queuedLabel}${skippedLabel}`, "success");

    setSelectedTaskIds([]);
    setSubject("");
    setTextBody("");
    setHasSentBatch(true);
    staged.navigateTo("tasks");
  } catch {
    // apiClient normalises errors; notify is called by the global error handler.
    // If a 422 slips through, show a generic toast.
    notify("Failed to send emails. Please try again.", "error");
  }
}, [selectedTaskIds, subject, textBody, sendEmailBatch, staged]);
```

**Return shape:**

```ts
return {
  // staged form
  staged,
  // task list
  tasks,
  isInitialLoading: tasksQuery.isLoading,
  isError: tasksQuery.isError,
  refetch: tasksQuery.refetch,
  // selection
  selectedTaskIds,
  handleToggleTask,
  // navigation
  handleGoToEmail,
  handleBackToTasks,
  // email
  subject,
  setSubject,
  textBody,
  setTextBody,
  // send
  handleSend,
  isSending: sendEmailBatch.isPending,
  canSend:
    selectedTaskIds.length > 0 &&
    subject.trim().length > 0 &&
    textBody.trim().length > 0,
  // surface
  closeSurface: surfaceOpeners.closeSurface,
};
```

The function signature:

```ts
export function useCustomerCoordinationEmailSlideController({
  surfaceOpeners,
}: {
  surfaceOpeners: CustomerCoordinationEmailSlideSurfaceOpeners;
}): { ... }  // inferred
```

---

### Step 20 — `CustomerCoordinationEmailSlidePage`

Create `packages/task-customer-coordination/src/pages/CustomerCoordinationEmailSlidePage.tsx`.

**Reference: `QuickTaskAssignSlidePage.tsx`** — copy its overall structure exactly for:
- `useSurfaceProps` + `useSurfaceHeader` pattern
- `setHeaderHidden(true)` on mount, reset on unmount
- `StagedForm` with `showNavigation={false}`
- Footer button grid (`grid grid-cols-2 gap-3 px-4 pb-4 pt-3`)
- Empty/error/loading states inside `ContentCard`
- `resolveImageUrl` helper for `TaskListCard`
- `TaskListCard` prop shape (copy exactly from QuickTaskAssignSlidePage)

**Imports:**

```ts
import { useCallback, useEffect, useMemo } from "react";
import { useStagedForm, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { TaskListCard } from "@beyo/tasks";
import { ArrowLeft } from "lucide-react";
import { ContentCard, StagedForm, StagedFormStep } from "@beyo/ui";
import { cn } from "@beyo/lib";
import { EmailComposer } from "@beyo/emails";
import { useCustomerCoordinationEmailSlideController } from "../controllers/use-customer-coordination-email-slide.controller";
import type {
  CustomerCoordinationEmailSlideSurfaceProps,
} from "../surface-ids";
```

**`resolveImageUrl` helper** (same as QuickTaskAssignSlidePage — copy verbatim):

```ts
function resolveImageUrl(
  images: Array<Record<string, unknown>>,
): string | null {
  const first = images[0];
  if (!first) return null;
  return typeof first.image_url === "string" ? first.image_url : null;
}
```

**`CoordinationUnifiedFooter` inner component:**

Footer renders a two-column button grid. Accepts `activeStepId`, `selectedCount`, `isSending`, `canSend`, `onClose`, `onGoToEmail`, `onBack`, `onSend` props.

- When `activeStepId === "tasks"`:
  - Left: Close button (`rounded-2xl border border-border bg-card`, label "Close", calls `onClose`)
  - Right: Next button (label `selectedCount > 0 ? \`Next (${selectedCount})\` : "Next"`, disabled when `selectedCount === 0`, primary color `bg-(--color-primary) text-card` when enabled, `bg-muted text-muted-foreground opacity-50` when disabled)

- When `activeStepId === "email"`:
  - Left: Back button with `ArrowLeft` icon (same border/bg style as Close)
  - Right: Send button (label `isSending ? "Sending…" : \`Send (${selectedCount})\``, disabled when `!canSend || isSending`, primary color when enabled)

Safe-bottom spacer `<div aria-hidden="true" className="h-(--safe-bottom,0px) bg-background" />` at the very bottom (copy from QuickTaskAssignSlidePage).

**Main exported component `CustomerCoordinationEmailSlidePage`:**

```tsx
export function CustomerCoordinationEmailSlidePage(): React.JSX.Element {
  const props = useSurfaceProps<CustomerCoordinationEmailSlideSurfaceProps>();
  const header = useSurfaceHeader();

  const controller = useCustomerCoordinationEmailSlideController({
    surfaceOpeners: props.surfaceOpeners,
  });

  useEffect(() => {
    header?.setHeaderHidden(true);
    return () => { header?.setHeaderHidden(false); };
  }, [header]);

  return (
    <div className="flex h-full flex-col py-4">
      <StagedForm
        activeStepId={controller.staged.activeStepId}
        data-testid="customer-coordination-email-slide-page"
        direction={controller.staged.direction}
        footer={
          <CoordinationUnifiedFooter
            activeStepId={controller.staged.activeStepId}
            selectedCount={controller.selectedTaskIds.length}
            isSending={controller.isSending}
            canSend={controller.canSend}
            onClose={() => controller.closeSurface?.()}
            onGoToEmail={controller.handleGoToEmail}
            onBack={controller.handleBackToTasks}
            onSend={() => { void controller.handleSend(); }}
          />
        }
        isAdvancing={controller.staged.isAdvancing}
        isFirstStep={controller.staged.isFirstStep}
        isLastStep={controller.staged.isLastStep}
        navigationMode="free"
        onAdvance={() => {}}
        onBack={() => { controller.staged.navigateTo("tasks"); }}
        onNavigate={controller.staged.navigateTo}
        showNavigation={false}
        stepStatusMap={controller.staged.stepStatusMap}
        steps={controller.staged.steps}
      >
        {/* Step 1 — task selection */}
        <StagedFormStep id="tasks" className="px-0">
          <div className="flex flex-col gap-3 pb-10 pt-3">
            {controller.isInitialLoading ? (
              <ContentCard>
                <p className="px-4 py-6 text-sm text-muted-foreground">
                  Loading tasks…
                </p>
              </ContentCard>
            ) : controller.isError ? (
              <ContentCard>
                <div className="flex flex-col gap-3 px-4 py-6">
                  <p className="text-sm text-muted-foreground">
                    Tasks could not be loaded.
                  </p>
                  <button
                    type="button"
                    className="w-fit rounded-full border border-border px-4 py-2 text-sm font-medium"
                    onClick={() => { void controller.refetch(); }}
                  >
                    Try again
                  </button>
                </div>
              </ContentCard>
            ) : controller.tasks.length === 0 ? (
              <ContentCard>
                <p className="px-4 py-6 text-sm text-muted-foreground">
                  No pending coordination tasks.
                </p>
              </ContentCard>
            ) : (
              controller.tasks.map((task) => (
                <TaskListCard
                  key={task.task.client_id}
                  batchMode
                  imageUrl={resolveImageUrl(task.item_images)}
                  isSelected={controller.selectedTaskIds.includes(
                    task.task.client_id,
                  )}
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
                  onTapActions={null}
                  onTapCard={null}
                  onTapImage={null}
                  onToggleSelect={controller.handleToggleTask}
                  task={{
                    task_type: task.task.task_type,
                    state: task.task.state,
                    return_source: task.task.return_source,
                    ready_by_at: task.task.ready_by_at,
                  }}
                  taskId={task.task.client_id}
                />
              ))
            )}
          </div>
        </StagedFormStep>

        {/* Step 2 — email composer */}
        <StagedFormStep id="email" className="px-0">
          <EmailComposer
            subject={controller.subject}
            textBody={controller.textBody}
            onSubjectChange={controller.setSubject}
            onTextBodyChange={controller.setTextBody}
          />
        </StagedFormStep>
      </StagedForm>
    </div>
  );
}
```

**IMPORTANT — `onTapActions`, `onTapCard`, `onTapImage`:** Check the actual `TaskListCard` prop types from `@beyo/tasks`. If those props are required and cannot be `null`, pass `() => {}` no-op callbacks instead of `null`. Do NOT invent prop names — read the `TaskListCard` exported type.

---

### Step 21 — `@beyo/task-customer-coordination` public API

Create `packages/task-customer-coordination/src/index.ts`:

```ts
// Types
export type {
  CustomerCoordinationRecord,
  CustomerCoordinationCounts,
  TaskWithCoordination,
  EmailBatchBody,
  EmailBatchResponse,
} from "./types";

// Surface IDs and props
export {
  CUSTOMER_COORDINATION_EMAIL_SLIDE_SURFACE_ID,
} from "./surface-ids";
export type {
  CustomerCoordinationEmailSlideSurfaceProps,
  CustomerCoordinationEmailSlideSurfaceOpeners,
} from "./surface-ids";

// Public query hook (used by the sellers app Home controller)
export { useCustomerCoordinationCountsQuery } from "./api/use-customer-coordination-counts-query";

// Loader function for code-split surface registration (§14 of 35_shared_packages.md)
export function loadCustomerCoordinationEmailSlidePage() {
  return import("./pages/CustomerCoordinationEmailSlidePage").then((m) => ({
    default: m.CustomerCoordinationEmailSlidePage,
  }));
}

// Preload function for surface-ids pattern
export function preloadCustomerCoordinationEmailSlideSurface(): Promise<unknown> {
  return import("./pages/CustomerCoordinationEmailSlidePage");
}
```

Do NOT statically re-export `CustomerCoordinationEmailSlidePage` from `index.ts` — the loader function above is the correct pattern (§14).

---

### Step 22 — Run `npm install`

From `frontend/` root:
```bash
npm install
```

Verify `node_modules/@beyo/emails` and `node_modules/@beyo/task-customer-coordination` are symlinks pointing to the packages.

---

### Step 23 — Sellers app: `package.json`

Add to `apps/selleres-app/ManagerBeyo-app-sellers/package.json` dependencies:

```json
"@beyo/emails": "*",
"@beyo/task-customer-coordination": "*"
```

---

### Step 24 — Sellers app: `index.css`

Add two `@source` lines to `apps/selleres-app/ManagerBeyo-app-sellers/src/index.css` AFTER the existing `@source` directives:

```css
@source "../../../../packages/emails/src";
@source "../../../../packages/task-customer-coordination/src";
```

---

### Step 25 — Sellers app: surface registration

Edit `apps/selleres-app/ManagerBeyo-app-sellers/src/features/tasks/surfaces.ts`.

Add the following imports:

```ts
import {
  CUSTOMER_COORDINATION_EMAIL_SLIDE_SURFACE_ID,
  loadCustomerCoordinationEmailSlidePage,
  type CustomerCoordinationEmailSlideSurfaceProps,
} from "@beyo/task-customer-coordination";
```

Add the lazy component:

```ts
const customerCoordinationEmailSlide = lazyWithPreload(
  loadCustomerCoordinationEmailSlidePage,
);
```

Export the preload function (if needed by other components in the future — add it to the `export const` block):

```ts
export const preloadCustomerCoordinationEmailSlideSurface =
  customerCoordinationEmailSlide.preload;
```

Export the surface ID and props type:

```ts
export { CUSTOMER_COORDINATION_EMAIL_SLIDE_SURFACE_ID } from "@beyo/task-customer-coordination";
export type { CustomerCoordinationEmailSlideSurfaceProps } from "@beyo/task-customer-coordination";
```

Add to `taskSurfaces`:

```ts
[CUSTOMER_COORDINATION_EMAIL_SLIDE_SURFACE_ID]: {
  surface: "slide",
  component: customerCoordinationEmailSlide.Component,
},
```

`surface-registry.ts` requires NO changes — it already spreads `taskSurfaces`.

---

### Step 26 — Sellers app: home types

Edit `apps/selleres-app/ManagerBeyo-app-sellers/src/features/home/types.ts`.

Add two fields to `HomeState`:

```ts
export type HomeState = {
  postHandlingCount: number | null;
  postHandlingCountLabel: string;
  coordinationCount: number | null;
  coordinationCountLabel: string;
};
```

---

### Step 27 — Sellers app: home controller

Edit `apps/selleres-app/ManagerBeyo-app-sellers/src/features/home/controllers/use-home-view.controller.ts`.

Add import:

```ts
import { useCustomerCoordinationCountsQuery } from "@beyo/task-customer-coordination";
```

Add inside the controller function:

```ts
const coordinationCountsQuery = useCustomerCoordinationCountsQuery("pending");
const coordinationCount = coordinationCountsQuery.data?.pending ?? null;
const coordinationCountLabel =
  coordinationCount !== null
    ? ` (${formatCompactCount(coordinationCount)})`
    : "";
```

Add to the return object:

```ts
return {
  postHandlingCount,
  postHandlingCountLabel,
  coordinationCount,
  coordinationCountLabel,
};
```

---

### Step 28 — Sellers app: home view

Edit `apps/selleres-app/ManagerBeyo-app-sellers/src/features/home/components/HomeView.tsx`.

Add imports:

```ts
import {
  CUSTOMER_COORDINATION_EMAIL_SLIDE_SURFACE_ID,
  type CustomerCoordinationEmailSlideSurfaceProps,
} from "@/features/tasks/surfaces";
```

Add `coordinationCountLabel` to the destructure from context:

```ts
const { postHandlingCountLabel, coordinationCountLabel } = useHomeViewContext();
```

Add a `openCustomerCoordinationSurface` function (modelled after `openTaskPostHandlingSurface`):

```ts
function openCustomerCoordinationSurface(): void {
  surface.open(CUSTOMER_COORDINATION_EMAIL_SLIDE_SURFACE_ID, {
    surfaceOpeners: {
      closeSurface: () =>
        surface.close(CUSTOMER_COORDINATION_EMAIL_SLIDE_SURFACE_ID),
    },
  } satisfies CustomerCoordinationEmailSlideSurfaceProps);
}
```

Add a second button below the existing "Ready for Handling" button:

```tsx
<button
  className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3.5 text-left text-lg font-medium text-primary shadow-sm disabled:opacity-50"
  data-testid="home-customer-coordination-box"
  type="button"
  onClick={openCustomerCoordinationSurface}
>
  <span>Customer Coordination{coordinationCountLabel}</span>
  <div className="ml-auto flex">
    <PostHandlingIcon aria-hidden="true" className="size-8 shrink-0" />
  </div>
</button>
```

**Styling note:** Use the EXACT same `className` as the existing "Ready for Handling" button. Do not add any new colors, custom bg, or custom text colors. `PostHandlingIcon` is already imported and reused as the placeholder icon.

---

## Risks and mitigations

- **Risk:** `TaskListItemRawSchema.shape.task.extend(...)` may fail if zod version doesn't support deep `.shape` access on nested `.object()`.
  **Mitigation:** `TaskListItemRawSchema.shape.task` is a `z.object(...)` call, and `.extend()` on it returns a new schema. Verified this is zod v4 compatible. If it fails, flatten the extension: define the full `task` schema inline referencing the individual fields from `TaskListItemRawSchema.shape.task.shape`.

- **Risk:** `vaul` internal sheet height may behave unexpectedly on some devices when using `style={{ height: ... }}` on an inner wrapper.
  **Mitigation:** Read `architecture/33_vaul_drawer.md` before implementation. If the contract specifies a different height-constraining approach, follow it.

- **Risk:** `TaskListCard` props `onTapActions`, `onTapCard`, `onTapImage` may be required (non-optional). Passing `null` would fail TypeScript.
  **Mitigation:** Inspect the exported `TaskListCard` props type from `@beyo/tasks` before writing the page. Pass `() => {}` no-ops if required.

- **Risk:** StagedForm inside the vaul sheet may conflict with scroll behaviour (vaul intercepts drag gestures).
  **Mitigation:** Wrap the inner list content with `className="overflow-y-auto"` and test on mobile. Add `data-vaul-no-drag` attribute to the scroll container if drag-to-dismiss fires instead of scrolling (see vaul docs).

---

## Validation plan

- `npm run typecheck` (run from `frontend/`): zero TypeScript errors in sellers app and both new packages.
- Open the sellers app in the browser. Verify the "Customer Coordination" button appears on the Home screen.
- Confirm the count label appears when pending coordination tasks exist.
- Tap the button: verify the slide surface opens with no header.
- Stage 1: verify task cards render, checkmark toggles selection, Next button enables/disables correctly.
- Stage 2: verify EmailTemplatePicker trigger is visible, tap it to open the sheet, select a template, confirm subject + textBody are populated.
- Tap a template card body in the sheet: verify StagedForm animates to preview panel.
- Tap Back in preview: verify return to list.
- Edit subject and textBody manually.
- Tap Send: verify toast appears, stage returns to task list, surface auto-closes when no tasks remain.

---

## Review log

- `2026-07-04` `claude`: Initial plan created. Design decisions confirmed with user before authoring.

---

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: user (David)
