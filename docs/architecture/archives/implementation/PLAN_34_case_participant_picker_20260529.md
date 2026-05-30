# PLAN_34_case_participant_picker_20260529

## Metadata

- Plan ID: `PLAN_34_case_participant_picker_20260529`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-29T00:00:00Z`
- Last updated at (UTC): `2026-05-29T15:42:51Z`
- Related issue/ticket: `N/A`
- Intention plan: `N/A`

---

## Goal and intent

- **Goal:** Add a participant picker field to the case creation form. Users can search for and select workspace members as case participants before submitting. The selection supports three modes — individual picks (`participants: [id]`), select-all (`selected_all: true`), and select-all minus exclusions (`selected_all: true, skip_participants: [id]`).
- **Business/user intent:** When a manager creates a case they can immediately assign participants without a separate step after creation.
- **Non-goals:**
  - Pagination / infinite scroll for the user list — `limit=50` with search covers the use-case for now.
  - Adding a participant picker to the managers-app case creation flow — the same trigger renders automatically (shared `CaseCreationFormContent`), but registering the workers-app slide page in the managers-app surface registry is deferred.
  - Editing participants after case creation (a separate flow).

---

## Scope

- **In scope:**
  - `packages/cases/src/types.ts` — add `UserCompact`, `ListUsersParams`, `ParticipantSelectedDisplay`, `ParticipantSelectionResult` types/schemas
  - `packages/cases/src/api/user-keys.ts` (new) — query keys for the users list
  - `packages/cases/src/api/list-users.ts` (new) — API function calling `GET /api/v1/users?compact=true`
  - `packages/cases/src/api/use-list-users-query.ts` (new) — TanStack Query hook
  - `packages/cases/src/lib/user-view-model.ts` (new) — `toParticipantSelectedDisplay` helper
  - `packages/cases/src/surface-ids.ts` — add `PARTICIPANT_PICKER_SLIDE_SURFACE_ID`, `ParticipantPickerSlideSurfaceProps`, add `openParticipantPicker` key to `CaseCreationSurfaceOpeners`
  - `packages/cases/src/providers/CaseCreationFormProvider.tsx` — add `selectedParticipants`, `setSelectedParticipants`, `participantsTotalCount`, `setParticipantsTotalCount` to context
  - `packages/cases/src/components/ParticipantPickerTriggerField.tsx` (new)
  - `packages/cases/src/components/ParticipantPickerSlideContent.tsx` (new)
  - `packages/cases/src/components/ParticipantPickerRouteEntry.tsx` (new)
  - `packages/cases/src/components/CaseCreationFormContent.tsx` — add `<ParticipantPickerTriggerField />`, prefetch users on mount, reset `selectedParticipants` + `participantsTotalCount` on submit success
  - `packages/cases/src/index.ts` — export new public types and `ParticipantPickerRouteEntry`
  - `apps/workers-app/.../pages/cases/ParticipantPickerSlidePage.tsx` (new)
  - `apps/workers-app/.../features/cases/surfaces.ts` — register participant picker slide surface
  - `apps/workers-app/.../pages/cases/CaseCreationSlidePage.tsx` — add `usePreloadSurface(preloadParticipantPickerSlideSurface)`
  - `apps/workers-app/.../controllers/use-task-step-detail.controller.ts` — add `openParticipantPicker` to `surfaceOpeners`
- **Out of scope:**
  - Managers-app surface registration — deferred.
  - Participant pagination — use `limit=50`; search handles large user counts.
  - Any new backend endpoint — uses existing `GET /api/v1/users`.
- **Assumptions:**
  - `GET /api/v1/users?compact=true` is accessible to the manager/admin role authenticated in the workers app.
  - `UserId` brand type is importable from `@beyo/lib` (confirmed — already used in `packages/cases/src/types.ts`).
  - `UserPill` is exported from `@beyo/ui` (confirmed by reading its source).
  - `SearchBar` is exported from `@beyo/ui` (confirmed by reading its source).
  - The `CaseCreationFormSchema` already has `participants`, `selected_all`, `skip_participants` fields (confirmed by reading `types.ts:259-266`).
  - `imageSurfaces` and `caseSurfaces` are already registered in the workers-app `surface-registry.ts`.
  - The slide surface provides header back-navigation automatically; `useSurfaceHeader` is how the page sets its title and accesses `requestClose`.

---

## Clarifications required

_None — all design decisions are resolved by the existing architecture._

---

## Acceptance criteria

1. `npm run typecheck` passes with zero TypeScript errors across all workspaces.
2. `ParticipantPickerTriggerField` renders in the case creation form below the images section.
3. Tapping the trigger opens the participant picker slide with the search bar and user list.
4. Users can be individually selected/deselected; the save button appears only when selection differs from the initial state when the picker was opened.
5. Tapping "Select all" sets `selected_all=true`; deselecting a user adds them to `skip_participants`.
6. Tapping "Deselect all" clears the selection completely (`selected_all=false`, `participants=[]`, `skip_participants=[]`).
7. Saving closes the slide and updates the trigger label + pills.
8. The trigger label shows "Participants (N)" where N = `participants.length` in normal mode, or `total - skip_participants.length` in select-all mode.
9. The trigger shows up to 3 `UserPill` components for selected users; more than 3 shows an overflow "+M" pill.
10. In select-all mode the trigger shows no individual pills (user count shown in the label only).
11. On successful case creation the participant selection is cleared alongside the rest of the form.
12. Users are prefetched the moment the case creation slide opens (hot fetch).

---

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: monorepo structure, package boundary rules
- `architecture/05_server_state.md`: TanStack Query hook pattern (`useQuery`, `queryKey`, `queryFn`)
- `architecture/08_hooks.md`: action hook pattern (not needed directly, but referenced for controller)
- `architecture/07_components.md`: component authoring, `data-testid` placement
- `architecture/15_feature_structure.md`: package layer conventions
- `architecture/23_providers.md`: provider + context pattern
- `architecture/24_dto.md`: DTO / view model transformer pattern
- `architecture/28_surfaces.md` + `architecture/28_surfaces_local.md`: slide surface type; `useSurfaceHeader`, `useSurfaceProps`
- `architecture/30_dynamic_loading.md` + `architecture/30_dynamic_loading_local.md`: `lazyWithPreload` / `usePreloadSurface` pattern
- `architecture/35_shared_packages.md §13`: `surfaceOpeners` injection pattern — packages must never call `openSurface` directly; openers are injected by the app controller

### Local extensions loaded

- `architecture/28_surfaces_local.md`: confirms `slide` is a valid surface type; `useSurfaceHeader` provides `setTitle`, `requestClose`
- `architecture/30_dynamic_loading_local.md`: confirms `lazyWithPreload` lives at `@beyo/ui/src/lib/lazy-with-preload.ts`; `usePreloadSurface` is at `@beyo/hooks`

### File read intent — pattern vs. relational

Permitted (relational reads — understanding what already exists):

- `packages/cases/src/types.ts` — confirmed `CaseCreationFormSchema` fields, `UserId` import source, existing Zod schemas
- `packages/cases/src/surface-ids.ts` — confirmed existing IDs, `CaseCreationSurfaceOpeners` shape
- `packages/cases/src/providers/CaseCreationFormProvider.tsx` — confirmed current context shape, `selectedCaseType` pattern to mirror
- `packages/cases/src/api/case-type-keys.ts` — confirmed key factory shape to mirror for `userKeys`
- `packages/cases/src/api/list-case-types.ts` — confirmed API function pattern (parse, return unwrapped array)
- `packages/cases/src/api/use-list-case-types.ts` — confirmed query hook pattern
- `packages/cases/src/lib/case-type-view-model.ts` — confirmed view-model transformer pattern
- `packages/cases/src/components/CaseTypePickerTriggerField.tsx` — confirmed trigger field pattern (surfaceOpeners, form hook, useWatch)
- `packages/cases/src/components/CaseTypePickerSheetContent.tsx` — confirmed picker content pattern (useSurfaceProps, query, onSelect, requestClose)
- `packages/cases/src/components/CaseTypePickerRouteEntry.tsx` — confirmed route entry pattern (useSurfaceHeader, setTitle)
- `packages/cases/src/index.ts` — confirmed what is currently exported
- `packages/cases/src/components/CaseCreationFormContent.tsx` — confirmed current form body, prefetch pattern, reset calls
- `packages/ui/src/components/primitives/user-pill/UserPill.tsx` — confirmed `UserPillProps` shape
- `packages/ui/src/components/primitives/search-bar/SearchBar.tsx` — confirmed `SearchBarProps` shape, `showSortButton`/`showFilterButton` props
- `apps/workers-app/.../features/cases/surfaces.ts` — confirmed `lazyWithPreload` registration pattern, exported preload refs
- `apps/workers-app/.../pages/cases/CaseCreationSlidePage.tsx` — confirmed `usePreloadSurface` insertion point
- `apps/workers-app/.../controllers/use-task-step-detail.controller.ts` — confirmed `surfaceOpeners` assembly insertion point
- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_list_users_route_contract_20260529.md` — confirmed endpoint, compact mode response shape, `total` field in pagination

Prohibited (pattern reads — contracts already cover these):

- Reading another action hook to understand cache snapshot/rollback → `08_hooks.md`
- Reading another provider to understand context shell → `23_providers.md`

### Skill selection

- Primary skill: N/A — standard feature composition following established package patterns
- Trigger terms: N/A
- Excluded alternatives: N/A

---

## Implementation plan

### Touch point summary (15 files: 8 new, 7 modified)

| # | File | New / Edit |
|---|---|---|
| 1 | `packages/cases/src/types.ts` | Edit |
| 2 | `packages/cases/src/api/user-keys.ts` | New |
| 3 | `packages/cases/src/api/list-users.ts` | New |
| 4 | `packages/cases/src/api/use-list-users-query.ts` | New |
| 5 | `packages/cases/src/lib/user-view-model.ts` | New |
| 6 | `packages/cases/src/surface-ids.ts` | Edit |
| 7 | `packages/cases/src/providers/CaseCreationFormProvider.tsx` | Edit |
| 8 | `packages/cases/src/components/ParticipantPickerTriggerField.tsx` | New |
| 9 | `packages/cases/src/components/ParticipantPickerSlideContent.tsx` | New |
| 10 | `packages/cases/src/components/ParticipantPickerRouteEntry.tsx` | New |
| 11 | `packages/cases/src/components/CaseCreationFormContent.tsx` | Edit |
| 12 | `packages/cases/src/index.ts` | Edit |
| 13 | `apps/workers-app/.../pages/cases/ParticipantPickerSlidePage.tsx` | New |
| 14 | `apps/workers-app/.../features/cases/surfaces.ts` | Edit |
| 15 | `apps/workers-app/.../pages/cases/CaseCreationSlidePage.tsx` | Edit |
| 16 | `apps/workers-app/.../controllers/use-task-step-detail.controller.ts` | Edit |

---

### Step 1 — `packages/cases/src/types.ts`

**Goal:** Add compact-user schema, params type, view model types, and selection result type.

**Append** after the existing type declarations (after `AddParticipantsInputSchema`):

```ts
// --- Compact user (GET /api/v1/users?compact=true) ---

export const UserCompactRoleSchema = z.object({
  client_id: z.string(),
  name: z.string(),
});

export const UserCompactSchema = z.object({
  client_id: z.string().transform((v) => v as UserId),
  username: z.string(),
  profile_picture: z.string().nullable(),
  role: UserCompactRoleSchema.nullable().optional(),
});
export type UserCompact = z.infer<typeof UserCompactSchema>;

export type ListUsersParams = {
  q?: string;
  limit?: number;
  offset?: number;
  compact?: boolean;
};

export type ParticipantSelectedDisplay = {
  userId: string;
  username: string;
  profilePicture: string | null;
  roleName: string | null;
};

export type ParticipantSelectionResult = {
  participants: string[];
  selectedAll: boolean;
  skipParticipants: string[];
  selectedUsers: ParticipantSelectedDisplay[];
  totalCount: number | null;
};
```

---

### Step 2 — `packages/cases/src/api/user-keys.ts` (new)

```ts
import type { ListUsersParams } from "../types";

export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (params: ListUsersParams = {}) =>
    [...userKeys.lists(), params] as const,
};
```

---

### Step 3 — `packages/cases/src/api/list-users.ts` (new)

```ts
import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import { UserCompactSchema, type UserCompact, type ListUsersParams } from "../types";

const ListUsersResponseSchema = ApiEnvelopeSchema(
  z.object({
    users: z.array(UserCompactSchema),
    users_pagination: z.object({
      has_more: z.boolean(),
      total: z.number().int(),
      limit: z.number().int(),
      offset: z.number().int(),
    }),
  }),
).extend({ ok: z.literal(true) });

export type ListUsersResult = {
  users: UserCompact[];
  total: number;
};

export async function listUsers(
  params: ListUsersParams = {},
): Promise<ListUsersResult> {
  const queryParams: Record<string, string | number | boolean> = {
    compact: true,
  };

  if (params.limit != null) queryParams.limit = params.limit;
  if (params.offset != null) queryParams.offset = params.offset;
  if (params.q) queryParams.q = params.q;

  const parsed = await apiClient.get(
    "/api/v1/users",
    ListUsersResponseSchema,
    queryParams,
  );

  return {
    users: parsed.data.users,
    total: parsed.data.users_pagination.total,
  };
}
```

---

### Step 4 — `packages/cases/src/api/use-list-users-query.ts` (new)

```ts
import { useQuery } from "@tanstack/react-query";

import type { ListUsersParams } from "../types";
import { userKeys } from "./user-keys";
import { listUsers } from "./list-users";

export function useListUsersQuery(params: ListUsersParams = {}) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => listUsers(params),
  });
}
```

---

### Step 5 — `packages/cases/src/lib/user-view-model.ts` (new)

```ts
import type { UserCompact, ParticipantSelectedDisplay } from "../types";

export function toParticipantSelectedDisplay(
  user: UserCompact,
): ParticipantSelectedDisplay {
  return {
    userId: user.client_id as string,
    username: user.username,
    profilePicture: user.profile_picture,
    roleName: user.role?.name ?? null,
  };
}
```

---

### Step 6 — `packages/cases/src/surface-ids.ts`

**Add** at the end of the file:

```ts
export const PARTICIPANT_PICKER_SLIDE_SURFACE_ID = "participant-picker-slide";

export type ParticipantPickerSlideSurfaceProps = {
  currentParticipants: string[];
  currentSelectedAll: boolean;
  currentSkipParticipants: string[];
  onSave: (result: import("./types").ParticipantSelectionResult) => void;
};
```

**Update** `CaseCreationSurfaceOpeners`:

Before:
```ts
export type CaseCreationSurfaceOpeners = {
  openCaseTypePicker?: (props: CaseTypePickerSheetSurfaceProps) => void;
};
```

After:
```ts
export type CaseCreationSurfaceOpeners = {
  openCaseTypePicker?: (props: CaseTypePickerSheetSurfaceProps) => void;
  openParticipantPicker?: (props: ParticipantPickerSlideSurfaceProps) => void;
};
```

**Design decision:** `ParticipantPickerSlideSurfaceProps` is self-contained — the picker reads its initial selection state from surface props and calls `onSave` with the final state. The trigger field assembles both sides of this contract. The `import("./types")` inline import avoids a circular import between `surface-ids.ts` and `types.ts`; alternatively, move `ParticipantSelectionResult` to `surface-ids.ts`. **Preferred:** move the `import` to a top-level import at the top of the file.

---

### Step 7 — `packages/cases/src/providers/CaseCreationFormProvider.tsx`

**Goal:** Add `selectedParticipants` and `participantsTotalCount` state to the provider, mirroring the `selectedCaseType` pattern.

**Update `CaseCreationFormContextValue`** — add four new keys:

```ts
type CaseCreationFormContextValue = {
  // existing ...
  selectedParticipants: ParticipantSelectedDisplay[];
  setSelectedParticipants: (participants: ParticipantSelectedDisplay[]) => void;
  participantsTotalCount: number | null;
  setParticipantsTotalCount: (count: number | null) => void;
};
```

**Add imports:**

```ts
import type { CaseTypeSelectedDisplay, ParticipantSelectedDisplay } from "../types";
```

**Add state declarations** (inside the provider function, after `selectedCaseType` state):

```ts
const [selectedParticipants, setSelectedParticipants] = useState<
  ParticipantSelectedDisplay[]
>([]);
const [participantsTotalCount, setParticipantsTotalCount] = useState<
  number | null
>(null);
```

**Add to context value object:**

```ts
selectedParticipants,
setSelectedParticipants,
participantsTotalCount,
setParticipantsTotalCount,
```

---

### Step 8 — `packages/cases/src/components/ParticipantPickerTriggerField.tsx` (new)

**Purpose:** Renders the trigger button. Shows a `UsersRound` icon (Lucide), a "Participants (N)" label, and up to 3 `UserPill` components for selected users (overflow "+M" pill when more than 3 in normal mode). Tapping opens the participant picker slide via `surfaceOpeners.openParticipantPicker`.

```tsx
import { Plus, UsersRound } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";

import { UserPill } from "@beyo/ui";

import { useCaseCreationFormContext } from "../providers/CaseCreationFormProvider";
import type { CaseCreationFormValues, ParticipantSelectionResult } from "../types";
import { toParticipantSelectedDisplay } from "../lib/user-view-model";

const MAX_VISIBLE_PILLS = 3;

export function ParticipantPickerTriggerField(): React.JSX.Element {
  const {
    surfaceOpeners,
    selectedParticipants,
    setSelectedParticipants,
    participantsTotalCount,
    setParticipantsTotalCount,
  } = useCaseCreationFormContext();
  const form = useFormContext<CaseCreationFormValues>();

  const participants = useWatch({ control: form.control, name: "participants" });
  const selectedAll = useWatch({ control: form.control, name: "selected_all" });
  const skipParticipants = useWatch({
    control: form.control,
    name: "skip_participants",
  });

  const totalSelected = selectedAll
    ? (participantsTotalCount ?? 0) - (skipParticipants?.length ?? 0)
    : (participants?.length ?? 0);

  const visiblePills = selectedAll ? [] : selectedParticipants.slice(0, MAX_VISIBLE_PILLS);
  const overflowCount = selectedAll
    ? 0
    : Math.max(0, selectedParticipants.length - MAX_VISIBLE_PILLS);

  function handlePress(): void {
    surfaceOpeners.openParticipantPicker?.({
      currentParticipants: participants ?? [],
      currentSelectedAll: selectedAll ?? false,
      currentSkipParticipants: skipParticipants ?? [],
      onSave: (result: ParticipantSelectionResult) => {
        form.setValue("participants", result.participants.length > 0 ? result.participants : undefined, {
          shouldDirty: true,
        });
        form.setValue(
          "selected_all",
          result.selectedAll ? true : undefined,
          { shouldDirty: true },
        );
        form.setValue(
          "skip_participants",
          result.skipParticipants.length > 0 ? result.skipParticipants : undefined,
          { shouldDirty: true },
        );
        setSelectedParticipants(result.selectedUsers);
        setParticipantsTotalCount(result.totalCount);
      },
    });
  }

  const hasSelection = totalSelected > 0;

  return (
    <button
      type="button"
      data-testid="participant-picker-trigger"
      className="flex w-full items-center gap-3 rounded-2xl bg-[var(--color-card)] px-4 py-3 text-left shadow-sm"
      onClick={handlePress}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg">
        <UsersRound className="size-5 text-muted-foreground" aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">
          {hasSelection ? `Participants (${totalSelected})` : "Participants"}
        </span>

        {visiblePills.length > 0 ? (
          <span className="mt-1.5 flex flex-wrap gap-1.5">
            {visiblePills.map((p) => (
              <UserPill
                key={p.userId}
                userName={p.username}
                imageSrc={p.profilePicture}
                data-testid={`participant-pill-${p.userId}`}
              />
            ))}
            {overflowCount > 0 ? (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-soft-container)] px-2.5 py-1 text-sm font-medium text-foreground"
                data-testid="participant-pill-overflow"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                {overflowCount}
              </span>
            ) : null}
          </span>
        ) : !hasSelection ? (
          <span className="mt-0.5 block text-xs text-muted-foreground">
            No participants selected
          </span>
        ) : null}
      </span>

      <ChevronRight
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
    </button>
  );
}
```

**Note:** Add `ChevronRight` to the Lucide import.

---

### Step 9 — `packages/cases/src/components/ParticipantPickerSlideContent.tsx` (new)

**Purpose:** Full-page participant selection UI. Manages its own local selection state initialized from surface props. Calls `onSave` + `requestClose` on save.

**Selection state model:**
- `localSelectedAll: boolean` — mirrors `selected_all`
- `localParticipants: string[]` — user IDs when NOT in select-all mode
- `localSkipParticipants: string[]` — excluded user IDs when IN select-all mode
- `isDirty` — true when local state differs from the initial state passed via surface props

**Select all / Deselect all:**
- "Select all" → `localSelectedAll=true`, `localSkipParticipants=[]`
- "Deselect all" → `localSelectedAll=false`, `localParticipants=[]`, `localSkipParticipants=[]`

**Per-user toggle:**
- `localSelectedAll=true` → toggle user in `localSkipParticipants`
- `localSelectedAll=false` → toggle user in `localParticipants`

**Save:**
- Assembles `ParticipantSelectionResult` (participants, selectedAll, skipParticipants, selectedUsers as view models, totalCount from query)
- Calls `onSave(result)` then `surfaceHeader?.requestClose()`

**Search:** `searchQuery` state → debounced 300ms → passed to `useListUsersQuery({ q: debouncedQ, limit: 50, compact: true })`

**User card:** not using `BoxPicker` — a custom `<button>` per user showing:
- Circular avatar (user profile picture via `<img>` or fallback to initials)
- Username in bold
- Role name pill (small badge, `bg-[var(--color-soft-container)]` text-xs)
- Selection indicator (checkmark or filled circle on the left/right)

**Save button:** absolutely positioned at the bottom of the slide.

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";

import { SearchBar } from "@beyo/ui";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import { useListUsersQuery } from "../api/use-list-users-query";
import { toParticipantSelectedDisplay } from "../lib/user-view-model";
import type { ParticipantPickerSlideSurfaceProps } from "../surface-ids";
import type { UserCompact } from "../types";

function useDebounce(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function ParticipantPickerSlideContent(): React.JSX.Element {
  const surfaceHeader = useSurfaceHeader();
  const {
    currentParticipants,
    currentSelectedAll,
    currentSkipParticipants,
    onSave,
  } = useSurfaceProps<ParticipantPickerSlideSurfaceProps>();

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);

  const { data, isPending, isError } = useListUsersQuery({
    q: debouncedQuery || undefined,
    limit: 50,
    compact: true,
  });

  const users = data?.users ?? [];
  const totalCount = data?.total ?? null;

  // Local selection state
  const [localSelectedAll, setLocalSelectedAll] = useState(
    currentSelectedAll ?? false,
  );
  const [localParticipants, setLocalParticipants] = useState<string[]>(
    currentParticipants ?? [],
  );
  const [localSkipParticipants, setLocalSkipParticipants] = useState<string[]>(
    currentSkipParticipants ?? [],
  );

  // Detect dirty state
  const initialRef = useRef({
    participants: currentParticipants ?? [],
    selectedAll: currentSelectedAll ?? false,
    skipParticipants: currentSkipParticipants ?? [],
  });

  const isDirty = useMemo(() => {
    const initial = initialRef.current;
    if (localSelectedAll !== initial.selectedAll) return true;
    if (localSelectedAll) {
      return (
        localSkipParticipants.length !== initial.skipParticipants.length ||
        localSkipParticipants.some((id) => !initial.skipParticipants.includes(id))
      );
    }
    return (
      localParticipants.length !== initial.participants.length ||
      localParticipants.some((id) => !initial.participants.includes(id))
    );
  }, [localSelectedAll, localParticipants, localSkipParticipants]);

  function handleSelectAll(): void {
    setLocalSelectedAll(true);
    setLocalSkipParticipants([]);
  }

  function handleDeselectAll(): void {
    setLocalSelectedAll(false);
    setLocalParticipants([]);
    setLocalSkipParticipants([]);
  }

  function handleToggleUser(user: UserCompact): void {
    const id = user.client_id as string;
    if (localSelectedAll) {
      setLocalSkipParticipants((prev) =>
        prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
      );
    } else {
      setLocalParticipants((prev) =>
        prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
      );
    }
  }

  function isUserSelected(user: UserCompact): boolean {
    const id = user.client_id as string;
    if (localSelectedAll) return !localSkipParticipants.includes(id);
    return localParticipants.includes(id);
  }

  function handleSave(): void {
    const selectedUsers = localSelectedAll
      ? []
      : users
          .filter((u) => localParticipants.includes(u.client_id as string))
          .map(toParticipantSelectedDisplay);

    onSave?.({
      participants: localSelectedAll ? [] : localParticipants,
      selectedAll: localSelectedAll,
      skipParticipants: localSelectedAll ? localSkipParticipants : [],
      selectedUsers,
      totalCount,
    });
    surfaceHeader?.requestClose();
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* Sticky header: search + select actions */}
      <div className="shrink-0 px-4 pb-3 pt-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          showSortButton={false}
          showFilterButton={false}
          placeholder="Search participants..."
          isLoading={isPending && searchQuery.length > 0}
          data-testid="participant-picker-search"
        />
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            data-testid="participant-picker-select-all"
            className="flex-1 rounded-xl border border-border py-2 text-sm font-medium text-foreground"
            onClick={handleSelectAll}
          >
            Select all
          </button>
          <button
            type="button"
            data-testid="participant-picker-deselect-all"
            className="flex-1 rounded-xl border border-border py-2 text-sm font-medium text-foreground"
            onClick={handleDeselectAll}
          >
            Deselect all
          </button>
        </div>
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto px-4 pb-28">
        {isPending && !data ? (
          <div className="flex h-40 items-center justify-center">
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : isError ? (
          <div className="flex h-40 items-center justify-center">
            <span className="text-sm text-muted-foreground">
              Could not load users.
            </span>
          </div>
        ) : users.length === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <span className="text-sm text-muted-foreground">No users found.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {users.map((user) => {
              const selected = isUserSelected(user);
              return (
                <button
                  key={user.client_id as string}
                  type="button"
                  data-testid={`participant-option-${user.client_id}`}
                  className="flex w-full items-center gap-3 rounded-2xl bg-[var(--color-card)] px-4 py-3 text-left shadow-sm"
                  onClick={() => handleToggleUser(user)}
                >
                  {/* Avatar */}
                  <span className="relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-soft-container)]">
                    {user.profile_picture ? (
                      <img
                        src={user.profile_picture}
                        alt={user.username}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-sm font-semibold uppercase text-muted-foreground">
                        {user.username.charAt(0)}
                      </span>
                    )}
                  </span>

                  {/* Name + role */}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {user.username}
                    </span>
                    {user.role?.name ? (
                      <span className="mt-0.5 inline-block rounded-full bg-[var(--color-soft-container)] px-2 py-0.5 text-xs text-muted-foreground">
                        {user.role.name}
                      </span>
                    ) : null}
                  </span>

                  {/* Selection indicator */}
                  <span
                    className={[
                      "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      selected
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                        : "border-border bg-transparent",
                    ].join(" ")}
                    aria-hidden="true"
                  >
                    {selected ? (
                      <Check className="size-3 text-[var(--color-card)]" />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Save button — appears only when selection has changed */}
      {isDirty ? (
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-[calc(var(--safe-bottom,0)+1rem)] pt-3">
          <button
            type="button"
            data-testid="participant-picker-save"
            className="flex w-full items-center justify-center rounded-2xl bg-[var(--color-primary)] py-3.5 text-sm font-semibold text-[var(--color-card)]"
            onClick={handleSave}
          >
            Save selection
          </button>
        </div>
      ) : null}
    </div>
  );
}
```

---

### Step 10 — `packages/cases/src/components/ParticipantPickerRouteEntry.tsx` (new)

```tsx
import { useEffect } from "react";
import { useSurfaceHeader } from "@beyo/hooks";

import { ParticipantPickerSlideContent } from "./ParticipantPickerSlideContent";

export function ParticipantPickerRouteEntry(): React.JSX.Element {
  const header = useSurfaceHeader();

  useEffect(() => {
    header?.setTitle("Select participants");
  }, [header]);

  return <ParticipantPickerSlideContent />;
}
```

---

### Step 11 — `packages/cases/src/components/CaseCreationFormContent.tsx`

**Changes:**
1. Import `ParticipantPickerTriggerField`
2. Import `userKeys` and `listUsers` for prefetch
3. Add second `useEffect` to prefetch the users query on mount
4. Add `<ParticipantPickerTriggerField />` in the scrollable field list after the images section
5. Destructure `setSelectedParticipants` and `setParticipantsTotalCount` from context
6. Reset them in the submit success branch alongside `setSelectedCaseType(null)` and `regenerateId()`

**Updated context destructure** (add to existing destructure):
```ts
const {
  caseClientId,
  regenerateId,
  entityTypes,
  setSelectedCaseType,
  composerContent,
  setComposerContent,
  setSelectedParticipants,
  setParticipantsTotalCount,
} = useCaseCreationFormContext();
```

**Add users prefetch useEffect** (after the existing caseTypes prefetch useEffect):
```ts
useEffect(() => {
  void queryClient.prefetchQuery({
    queryKey: userKeys.list({ limit: 50, compact: true }),
    queryFn: () => listUsers({ limit: 50, compact: true }),
  });
}, [queryClient]);
```

**Add reset calls** in the submit success branch (after `regenerateId()`):
```ts
setSelectedParticipants([]);
setParticipantsTotalCount(null);
```

**Updated form body:**
```tsx
<div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
  <CaseTypePickerTriggerField />
  <CaseInitialMessageComposer />
  <div
    className="rounded-2xl bg-card px-4 py-3 shadow-sm"
    data-testid="case-creation-images-section"
  >
    <EntityImagesProvider
      captureFlow="camera-to-editor"
      deleteMode="hard-delete"
      entityClientId={caseClientId}
      entityType="case"
    >
      <ImagePreviewGrid
        maxImages={6}
        testId="case-creation-images-grid"
      />
    </EntityImagesProvider>
  </div>
  <ParticipantPickerTriggerField />
</div>
```

---

### Step 12 — `packages/cases/src/index.ts`

**Add** to existing exports:

```ts
export { ParticipantPickerRouteEntry } from "./components/ParticipantPickerRouteEntry";

export {
  PARTICIPANT_PICKER_SLIDE_SURFACE_ID,
} from "./surface-ids";
export type {
  ParticipantPickerSlideSurfaceProps,
} from "./surface-ids";

export type {
  UserCompact,
  ListUsersParams,
  ParticipantSelectedDisplay,
  ParticipantSelectionResult,
} from "./types";
```

---

### Step 13 — `apps/workers-app/.../pages/cases/ParticipantPickerSlidePage.tsx` (new)

Full path: `apps/workers-app/ManagerBeyo-app-workers/src/pages/cases/ParticipantPickerSlidePage.tsx`

```tsx
import { ParticipantPickerRouteEntry } from "@beyo/cases";

export function ParticipantPickerSlidePage(): React.JSX.Element {
  return <ParticipantPickerRouteEntry />;
}
```

---

### Step 14 — `apps/workers-app/.../features/cases/surfaces.ts`

**Add import:**
```ts
import {
  CASE_CONVERSATION_SURFACE_ID,
  CASE_CREATION_SLIDE_SURFACE_ID,
  CASE_TYPE_PICKER_SHEET_SURFACE_ID,
  CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID,
  PARTICIPANT_PICKER_SLIDE_SURFACE_ID,
  type CaseConversationSurfaceProps,
} from "@beyo/cases";
```

**Add loader function:**
```ts
function loadParticipantPickerSlidePage() {
  return import("@/pages/cases/ParticipantPickerSlidePage").then((module) => ({
    default: module.ParticipantPickerSlidePage,
  }));
}
```

**Add lazy + preload:**
```ts
const participantPickerSlide = lazyWithPreload(loadParticipantPickerSlidePage);

export const preloadParticipantPickerSlideSurface =
  participantPickerSlide.preload;
```

**Add to `caseSurfaces`:**
```ts
[PARTICIPANT_PICKER_SLIDE_SURFACE_ID]: {
  surface: "slide",
  component: participantPickerSlide.Component,
},
```

---

### Step 15 — `apps/workers-app/.../pages/cases/CaseCreationSlidePage.tsx`

**Add import and preload call:**

```ts
import { preloadParticipantPickerSlideSurface } from "@/features/cases/surfaces";
```

```tsx
export function CaseCreationSlidePage(): React.JSX.Element {
  usePreloadSurface(preloadCaseTypePickerSheetSurface);
  usePreloadSurface(preloadImageCameraSurface);
  usePreloadSurface(preloadParticipantPickerSlideSurface);

  return <CaseCreationRouteEntry />;
}
```

---

### Step 16 — `apps/workers-app/.../controllers/use-task-step-detail.controller.ts`

**Add imports:**
```ts
import {
  CASE_CREATION_SLIDE_SURFACE_ID,
  CASE_TYPE_PICKER_SHEET_SURFACE_ID,
  PARTICIPANT_PICKER_SLIDE_SURFACE_ID,
  type CaseCreationSurfaceOpeners,
  type ParticipantPickerSlideSurfaceProps,
} from "@beyo/cases";
```

**Update `handleOpenCaseCreation`:**
```ts
const handleOpenCaseCreation = useCallback(() => {
  const surfaceOpeners: CaseCreationSurfaceOpeners = {
    openCaseTypePicker: (props) =>
      openSurface(CASE_TYPE_PICKER_SHEET_SURFACE_ID, props),
    openParticipantPicker: (props: ParticipantPickerSlideSurfaceProps) =>
      openSurface(PARTICIPANT_PICKER_SLIDE_SURFACE_ID, props),
  };

  openSurface(CASE_CREATION_SLIDE_SURFACE_ID, {
    entityTypes: ["task"],
    surfaceOpeners,
  });
}, [openSurface]);
```

---

## Risks and mitigations

- **Risk:** `GET /api/v1/users` is scoped to admin/manager roles only (per the handoff doc). If a worker role tries to load the picker, the API returns an error.
  **Mitigation:** The case creation slide is opened from the task step detail controller, which is only accessible to authenticated users. Backend role scoping handles this. The picker will show "Could not load users." if the response fails — no crash, no silent failure.

- **Risk:** The `onSave` callback captures `form.setValue` and context setters from the trigger field's closure. If the trigger re-renders between opening the picker and pressing save (e.g., due to a route update), the closure is stale.
  **Mitigation:** `form.setValue` is a stable reference from `react-hook-form`. Context setters (`setSelectedParticipants`, `setParticipantsTotalCount`) are stable `useState` dispatchers. The closure captures stable references; no stale closure risk.

- **Risk:** `ParticipantPickerSlideContent` local state is initialized from surface props on first render. If the surface is opened multiple times without unmounting (e.g., in a slide stack), the state is not re-initialized.
  **Mitigation:** Each `openSurface` call creates a new surface entry in the stack; the slide mounts fresh each time. The `useState` initializers use the props at mount time, which is correct.

- **Risk:** The select-all count (`totalCount`) in the trigger may be stale if the user list changes between opening the picker and seeing the trigger.
  **Mitigation:** Acceptable for this use case — the count is a UI hint, not a hard constraint. The actual form values (`selected_all`, `skip_participants`) are the source of truth sent to the backend.

- **Risk:** `ParticipantPickerSlideSurfaceProps.onSave` uses an inline import `import("./types").ParticipantSelectionResult` in `surface-ids.ts`.
  **Mitigation:** Avoid the inline import pattern. Instead, import `ParticipantSelectionResult` at the top of `surface-ids.ts` from `"./types"`. There is no circular dependency: `types.ts` does not import from `surface-ids.ts`.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors in all workspaces.
- Manual smoke test (mobile viewport in workers app):
  1. Open case creation slide (from task step detail → "Create case").
  2. Verify `ParticipantPickerTriggerField` renders below the images section with the `Users` icon and "Participants" label.
  3. Tap the trigger → participant picker slide opens; user list loads.
  4. Search for a name → list filters.
  5. Select individual users → selection checkmarks appear; save button appears.
  6. Tap save → slide closes; trigger label shows "Participants (N)" with UserPill(s).
  7. Re-open picker → initial selection is pre-populated.
  8. Tap "Select all" → all users show as selected; save button appears.
  9. Deselect one user → they are excluded (skip); tap save → `selected_all=true` in form.
  10. Tap "Deselect all" → all deselected; save clears selection.
  11. Submit the case creation form → request body contains correct `participants` / `selected_all` / `skip_participants` keys; trigger resets to empty after success.

---

## Review log

_No reviews yet._

---

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
