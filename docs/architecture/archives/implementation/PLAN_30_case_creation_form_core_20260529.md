# PLAN_30_case_creation_form_core_20260529

## Metadata

- Plan ID: `PLAN_30_case_creation_form_core_20260529`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-29T00:00:00Z`
- Last updated at (UTC): `2026-05-29T11:09:16Z`
- Related issue/ticket: `-`
- Intention plan: `docs/architecture/under_construction/intention/case_creation.md`
- Predecessor plan: `PLAN_29_case_creation_slide_entry_20260529` (surface + route already mounted)

## Goal and intent

- Goal: Wire the case creation slide with a working RHF form, a `useCreateCase` action, and a `CaseCreationFormProvider` so that tapping the submit button sends `POST /api/v1/cases` and invalidates the case list cache. Fields are **not** in this plan's scope — this plan delivers the invisible plumbing the submit button depends on.
- Business/user intent: Workers need to be able to create a case from the task detail slide with a single tap; the backend handoff (`HANDOFF_TO_FRONTEND_create_case_with_participants_contract_20260529`) added `participants`, `selected_all`, and `skip_participants` to the create-case contract.
- Non-goals: Form fields (type label, participant picker, select-all toggle) — deferred. Navigating to the new case conversation after creation — deferred. Optimistic cache insertion — not applicable for creation (user is on the creation form, not the list).

## Scope

- In scope:
  - `packages/cases/src/types.ts` — expand `CreateCaseInputSchema` with the three new backend fields; add `CaseCreationFormSchema` + `CaseCreationFormValues` as the RHF form schema
  - `packages/cases/package.json` — add `react-hook-form` and `@hookform/resolvers` as peer dependencies
  - `packages/cases/src/actions/use-create-case.ts` — NEW mutation action
  - `packages/cases/src/providers/CaseCreationFormProvider.tsx` — NEW: generates `caseClientId`, exposes context
  - `packages/cases/src/components/CaseCreationFormContent.tsx` — NEW: RHF `useForm` + `FormProvider` + empty field area + submit button
  - `packages/cases/src/components/CaseCreationRouteEntry.tsx` — UPDATE: set surface header title, wrap with `CaseCreationFormProvider`, render `CaseCreationFormContent` (replaces the placeholder `CaseCreationView`)
  - `packages/cases/src/components/CaseCreationView.tsx` — DELETE (was a placeholder; view is now `CaseCreationFormContent`)
  - `packages/cases/src/index.ts` — UPDATE: export `useCreateCase`, `CaseCreationFormProvider`, `useCaseCreationFormContext`
- Out of scope:
  - Form fields for type label, participants, select-all — deferred
  - Post-creation navigation to case conversation — deferred
  - Playwright spec — deferred (no visible UI to assert except the submit button; can be added when fields exist)
  - `CaseCreationSlidePage` in the workers app — already wired in PLAN_29; no changes here

## Clarifications required

_(none blocking — backend contract is fully documented in the handoff; scope agreed with user)_

## Acceptance criteria

1. `npm run typecheck` from `frontend/` passes with zero errors.
2. `npm run build` for the workers app succeeds.
3. Tapping the submit button on the case creation slide sends `POST /api/v1/cases` with the generated `client_id`; on success the case list query is invalidated and a success toast fires.
4. On network error, an error toast fires; the form stays open; the same `client_id` is preserved so the user can retry idempotently.
5. The submit button is disabled while the mutation is in flight (`isPending`).

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md` + `01_architecture_local.md`: monorepo + package boundaries; `route-entry.tsx` pattern
- `architecture/02_types.md`: Zod schema authoring rules; input schema vs. response schema separation
- `architecture/04_api_client.md` + `04_api_client_local.md`: `apiClient.post` usage; backend error shape (flat `error` string, no `field_errors`); refresh response envelope
- `architecture/05_server_state.md`: `useMutation` + `useQueryClient`; cache invalidation on `onSettled`
- `architecture/08_hooks.md`: action hook shape (`{ mutate fn, isPending, error, reset }`); data-only rule; surface transitions never from action hooks; `onMutate / onError / onSuccess / onSettled` lifecycle
- `architecture/09_forms.md`: schema-first forms; `zodResolver`; `client_id` as hidden value generated once; `FormProvider` wraps component tree; `onSubmit` in component or controller; field registration with `register` vs `Controller`
- `architecture/13_errors.md`: error handling; toast on mutation failure
- `architecture/15_feature_structure.md`: folder layout inside a shared package
- `architecture/23_providers.md`: provider + context shell pattern; `createContext` + `useContext` guard
- `architecture/35_shared_packages.md`: peer deps only (no `dependencies`); `index.ts` barrel exports public API only; no `@/` alias inside packages

### Local extensions loaded

- `04_api_client_local.md`: backend error shape is a flat `error: string` — no `field_errors`. Do not call `form.setError` per backend field; show a toast instead.
- `01_architecture_local.md`: `route-entry.tsx` is the package's surface entry point — it sets the surface header and wires the provider.

### File read intent — pattern vs. relational

Prohibited (pattern reads — contracts above already cover these):
- Reading another action hook to understand `useMutation` shape → `08_hooks.md` + `05_server_state.md`
- Reading another provider to understand context shell → `23_providers.md`
- Reading another form to understand `zodResolver` setup → `09_forms.md`

Permitted (relational reads — understanding what exists):
- `packages/cases/src/types.ts` — actual field names and existing schema to update ✓ (read)
- `packages/cases/src/api/create-case.ts` — existing API function signature to confirm no change needed ✓ (read)
- `packages/cases/src/api/case-keys.ts` — query key used for invalidation ✓ (read)
- `packages/cases/src/actions/use-send-case-message.ts` — existing action in the same package for import pattern reference ✓ (read)
- `packages/cases/src/components/CaseCreationRouteEntry.tsx` — current placeholder to understand what to replace ✓ (read from PLAN_29 output)
- `packages/cases/package.json` — existing peer deps to confirm what is missing ✓ (read)
- `apps/managers-app/.../features/task-creation/providers/TaskCreationFormProvider.tsx` — client ID generation pattern ✓ (read)
- `apps/managers-app/.../features/task-creation/components/InternalFormContent.tsx` — RHF + FormProvider + submit pattern ✓ (read)

### Skill selection

- Primary skill: none — new feature core within shared package
- Trigger terms: `useMutation`, `zodResolver`, `FormProvider`, `useCreateCase`
- Excluded: `09_forms.md` StagedForm — this form has no steps in this phase

## Domain schemas consulted

- `packages/cases/src/types.ts`:
  - `CreateCaseInputSchema = { client_id, case_type_id?, type_label? }` — confirmed; needs expansion
  - `CaseDetailBaseSchema` — the response shape; already models `participants_count`, `conversation_client_id`, etc.
  - `ClientIdSchema` from `@beyo/lib` — used for `client_id` validation
- `packages/lib/src/client-id.ts`:
  - `generateClientId('Case')` → `ca_<ulid>` — confirmed prefix is `'Case'`
  - `generateClientId` is exported from `@beyo/lib`

## Selected contracts summary

```
Core:       01, 01_local, 02, 04, 04_local, 05, 08, 13, 15, 23
Goal:       09_forms (schema-first, zodResolver, FormProvider, hidden client_id)
Packages:   35_shared_packages
Excluded:   28_surfaces (already handled in PLAN_29), 30_dynamic_loading (no new surfaces),
            24_dto (no view model transform), 16_feature_workflow (build order inline below),
            09_forms StagedForm (single-step form in this phase)
```

## Implementation plan

Build order follows `16_feature_workflow.md`: Types → API update → Action → Provider → Components → Route entry → Public API.

---

### Step 1 — Expand `CreateCaseInputSchema` and add form schema (`packages/cases/src/types.ts`)

**Edit** the existing `CreateCaseInputSchema` to add the three new backend fields:

```ts
export const CreateCaseInputSchema = z.object({
  client_id: ClientIdSchema,
  case_type_id: z.string().min(1).optional(),
  type_label: z.string().max(128).optional(),
  participants: z.array(z.string()).optional(),
  selected_all: z.boolean().optional(),
  skip_participants: z.array(z.string()).optional(),
});
export type CreateCaseInput = z.infer<typeof CreateCaseInputSchema>;
```

**Add** the RHF form schema immediately after `CreateCaseInputSchema` in `types.ts`:

```ts
export const CaseCreationFormSchema = z.object({
  type_label: z.string().max(128).optional(),
  participants: z.array(z.string()).optional(),
  selected_all: z.boolean().optional(),
  skip_participants: z.array(z.string()).optional(),
});
export type CaseCreationFormValues = z.infer<typeof CaseCreationFormSchema>;
```

`client_id` is intentionally absent from `CaseCreationFormSchema` — it is generated by `CaseCreationFormProvider` and injected at submit time, not stored in form state. This mirrors the `TaskCreationFormProvider` pattern from the managers app.

---

### Step 2 — Add peer dependencies (`packages/cases/package.json`)

Add to `"peerDependencies"`:

```json
"@hookform/resolvers": ">=5.0.0",
"react-hook-form": ">=7.0.0"
```

Both are already installed in the workers app (`react-hook-form: ^7.76.1`, `@hookform/resolvers: ^5.0.0`). Adding them as peer deps makes the dependency contract explicit and type-safe. Run `npm install` from `frontend/` after this step.

---

### Step 3 — Action hook (`packages/cases/src/actions/use-create-case.ts`)

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiRequestError } from "@beyo/api-client";
import { notify } from "@beyo/lib";

import { caseKeys } from "../api/case-keys";
import { createCase } from "../api/create-case";
import type { CaseDetailBase, CreateCaseInput } from "../types";

export function useCreateCase() {
  const queryClient = useQueryClient();

  const mutation = useMutation<CaseDetailBase, ApiRequestError, CreateCaseInput>({
    mutationFn: createCase,

    onSuccess: () => {
      notify.success("Case created");
    },

    onError: () => {
      notify.error(
        "Case not created",
        "Something went wrong. Your input is preserved — try again.",
      );
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
    },
  });

  return {
    createCase: mutation.mutate,
    createCaseAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
    data: mutation.data,
  };
}

export type CreateCaseAction = ReturnType<typeof useCreateCase>;
```

**Why no `onMutate` (no optimistic update):** The user is on the creation slide while the mutation runs; they cannot see the case list. There is no optimistic state to display. `onSettled` invalidation is sufficient — when the user navigates to the list after creation it will refetch.

**Why `createCaseAsync` is exposed:** The form content uses `mutateAsync` so it can `await` and reset the form on success within `handleSubmit`. `mutate` (fire-and-forget) is exposed for callers that do not need to await.

---

### Step 4 — Form provider (`packages/cases/src/providers/CaseCreationFormProvider.tsx`)

```tsx
import { createContext, useContext, useState } from "react";

import { generateClientId } from "@beyo/lib";
import type { CaseId } from "@beyo/lib";

type CaseCreationFormContextValue = {
  caseClientId: CaseId;
  regenerateId: () => void;
};

const CaseCreationFormContext =
  createContext<CaseCreationFormContextValue | null>(null);

export function CaseCreationFormProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [caseClientId, setCaseClientId] = useState<CaseId>(
    () => generateClientId("Case") as CaseId,
  );

  function regenerateId(): void {
    setCaseClientId(generateClientId("Case") as CaseId);
  }

  return (
    <CaseCreationFormContext.Provider value={{ caseClientId, regenerateId }}>
      {children}
    </CaseCreationFormContext.Provider>
  );
}

export function useCaseCreationFormContext(): CaseCreationFormContextValue {
  const ctx = useContext(CaseCreationFormContext);

  if (!ctx) {
    throw new Error(
      "useCaseCreationFormContext must be used inside CaseCreationFormProvider",
    );
  }

  return ctx;
}
```

`caseClientId` is generated once on mount and held in state (not in a `ref`) so `regenerateId` triggers a re-render and the new ID propagates to the form submit handler. The same `client_id` is reused across retry attempts — the submit handler never regenerates it on failure, only on success. This ensures idempotent retries.

---

### Step 5 — Form content (`packages/cases/src/components/CaseCreationFormContent.tsx`)

```tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";

import type { CaseId } from "@beyo/lib";

import { useCreateCase } from "../actions/use-create-case";
import { useCaseCreationFormContext } from "../providers/CaseCreationFormProvider";
import { CaseCreationFormSchema, type CaseCreationFormValues } from "../types";

export function CaseCreationFormContent(): React.JSX.Element {
  const { caseClientId, regenerateId } = useCaseCreationFormContext();
  const { createCaseAsync, isPending } = useCreateCase();

  const form = useForm<CaseCreationFormValues>({
    resolver: zodResolver(CaseCreationFormSchema),
    defaultValues: {
      type_label: undefined,
      participants: undefined,
      selected_all: undefined,
      skip_participants: undefined,
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    await createCaseAsync({
      client_id: caseClientId as CaseId,
      ...values,
    });
    form.reset();
    regenerateId();
  });

  return (
    <FormProvider {...form}>
      <form
        className="flex h-full flex-col"
        data-testid="case-creation-form"
        noValidate
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
          {/* Fields are added here in subsequent plans */}
        </div>

        <div className="shrink-0 border-t border-border/60 px-4 pb-[calc(var(--safe-bottom,0)+1rem)] pt-3">
          <button
            type="button"
            disabled={isPending}
            data-testid="case-creation-submit"
            className="flex w-full items-center justify-center rounded-2xl bg-foreground py-3.5 text-sm font-semibold text-background disabled:opacity-50"
            onClick={() => void handleSubmit()}
          >
            {isPending ? "Creating…" : "Create case"}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}
```

**Layout rationale:**
- `flex h-full flex-col` fills the slide surface height — matches the `InternalFormContent` pattern.
- Top `<div>` is the scrollable field area (`flex-1 overflow-y-auto`) — empty for now, fields are added in Plan 31.
- Bottom `<div>` is a sticky footer (`shrink-0`) with the submit button — same approach as `TaskCreationAssignmentFooter`.
- `pb-[calc(var(--safe-bottom,0)+1rem)]` respects iOS home indicator safe area.
- `onSubmit={(e) => e.preventDefault()}` prevents browser default form submission; the click handler calls `handleSubmit`.
- `disabled` on button prevents double-submit.
- The button does not use `type="submit"` because submission is controlled programmatically via `onClick` — this avoids enter-key surprises while fields are being filled.

---

### Step 6 — Update route entry (`packages/cases/src/components/CaseCreationRouteEntry.tsx`)

Full replacement of the placeholder from PLAN_29:

```tsx
import { useEffect } from "react";

import { useSurfaceHeader } from "@beyo/hooks";

import { CaseCreationFormProvider } from "../providers/CaseCreationFormProvider";
import { CaseCreationFormContent } from "./CaseCreationFormContent";

export function CaseCreationRouteEntry(): React.JSX.Element {
  const header = useSurfaceHeader();

  useEffect(() => {
    header?.setTitle("New case");
  }, [header]);

  return (
    <CaseCreationFormProvider>
      <CaseCreationFormContent />
    </CaseCreationFormProvider>
  );
}
```

This matches the `InternalTaskSlidePage` pattern exactly:
- Header title is set via `useSurfaceHeader()` (already a peer dep, already used in `CaseConversationSlideView`).
- Provider wraps the form content — same as `TaskCreationFormProvider` wrapping `InternalFormContent`.

---

### Step 7 — Delete placeholder view

Delete `packages/cases/src/components/CaseCreationView.tsx`.

This file was created as a placeholder in PLAN_29. It is fully replaced by `CaseCreationFormContent` + `CaseCreationRouteEntry`. Deleting it prevents dead code from leaking into the bundle.

---

### Step 8 — Update public API (`packages/cases/src/index.ts`)

Add the following exports (keep all existing exports untouched):

```ts
export { CaseCreationRouteEntry } from "./components/CaseCreationRouteEntry";  // replaces placeholder
export { CaseCreationFormContent } from "./components/CaseCreationFormContent";
export {
  CaseCreationFormProvider,
  useCaseCreationFormContext,
} from "./providers/CaseCreationFormProvider";
export { useCreateCase } from "./actions/use-create-case";
export type { CreateCaseAction } from "./actions/use-create-case";
export type { CaseCreationFormValues } from "./types";
```

`CaseCreationFormContent` is exported to allow apps to embed it in custom wrappers without the full `CaseCreationRouteEntry` (e.g., a manager app that wants to inject custom props). Export it only if there is a concrete use case; otherwise omit. For now include it.

---

## Risks and mitigations

- Risk: `react-hook-form` is not in `@beyo/cases` peer deps — TypeScript will error on `import { useForm } from 'react-hook-form'` inside the package.
  Mitigation: Step 2 adds it as a peer dep; follow up with `npm install` from `frontend/`.

- Risk: Forgetting to cast `generateClientId('Case')` result to `CaseId` — TypeScript knows the return type is `string`, not `CaseId`.
  Mitigation: Explicit `as CaseId` cast in the provider and the submit handler. Acceptable because `generateClientId('Case')` always produces a `ca_*` string — the cast is safe by construction.

- Risk: `CaseCreationView.tsx` still imported somewhere after deletion.
  Mitigation: `npm run typecheck` will surface any stale import immediately. The only importer was `CaseCreationRouteEntry.tsx`, which is fully replaced in Step 6.

- Risk: The `notify` import path — `@beyo/lib` exports `notify`. Confirmed by reading `case-keys.ts` and `use-send-case-message.ts` import patterns inside the package.
  Mitigation: Match import patterns from `use-send-case-message.ts`. If `notify` is not exported from `@beyo/lib`, check `@beyo/lib/src/index.ts`.

## Validation plan

- `npm install` from `frontend/` — confirms peer dep linking after Step 2
- `npm run typecheck` from `frontend/` — zero TypeScript errors across all packages and apps
- `npm run build` for workers app — bundle succeeds
- Manual smoke test: open task detail slide → tap `MessageSquareMore` → case creation slide opens → tap "Create case" → `POST /api/v1/cases` fires in network tab → success toast → case list query refetches on next navigation

## Review log

_(empty — awaiting first review)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
