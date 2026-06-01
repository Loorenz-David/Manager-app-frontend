# PLAN_participant_auto_select_20260601

## Metadata

- Plan ID: `PLAN_participant_auto_select_20260601`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-06-01T00:00:00Z`
- Last updated at (UTC): `2026-06-01T07:20:38Z`
- Related issue/ticket: n/a
- Intention plan: n/a

## Goal and intent

- Goal: When the case creation form mounts: (1) auto-open the case type picker immediately so the user can select a type without tapping; (2) auto-select participants based on the current user's role using a configuration-driven rules map that is easy to extend or modify.
- Business/user intent: The case type is always required — opening the picker on mount saves one tap for every case created. Workers and sellers should see relevant managers pre-selected; admins should see managers + sellers pre-selected. Both behaviours eliminate friction for the common path.
- Non-goals: Auto-select on the edit/add-participants flow (only creation form). Server-side filtering of users by role (client-side filtering is sufficient). Delaying the picker open until prefetch completes (the picker handles its own loading state).

## Scope

- In scope:
  - Auto-opening `CaseTypePickerTriggerField`'s picker surface once on mount via `surfaceOpeners.openCaseTypePicker`
  - `PARTICIPANT_AUTO_SELECT_RULES` config constant (the single place to change rules later)
  - `useParticipantAutoSelect` hook that reads the current user's role, determines target roles, fetches users, and returns a `ParticipantSelectionResult | null`
  - Applying both behaviours once on mount in `CaseCreationFormContent`
- Out of scope:
  - Modifying `listUsers` API or backend to support role-based filtering
  - Auto-select for the participants add flow inside an existing case
  - Any UI indicator showing the participant selection was auto-applied
- Assumptions:
  - `UserCompact.role.name` is a string that can be compared case-insensitively to role names in the rules map
  - The current user's role is the string stored in `AuthUser.role` from `useAuthStore`
  - A workspace will not exceed ~200 users of any given role, making client-side filtering viable
  - `surfaceOpeners.openCaseTypePicker` is always provided when the case creation surface is opened (it is injected from the app side through `CaseCreationSlideSurfaceProps`)

## Clarifications required

_None — all information confirmed from existing code._

## Acceptance criteria

1. When any user opens the case creation form, the case type picker opens automatically before any interaction.
2. Selecting a type from the auto-opened picker fills in the `CaseTypePickerTriggerField` exactly as if the user had tapped it manually.
3. If the user dismisses the picker without selecting, the form shows empty case type (normal empty state — no crash or loop).
4. After a case is created and the form re-opens, the picker auto-opens again (component remounts).
5. When a worker or seller opens the case creation form, participants with the `manager` role are pre-selected in `ParticipantPickerTriggerField` before any interaction.
6. When an admin opens the case creation form, participants with `manager` and `seller` roles are pre-selected.
7. If the current user's role has no entry in the rules map, no participants are pre-selected (field is empty).
8. The user can freely modify the pre-selection by opening the participant picker — changes are not overwritten.
9. Changing `PARTICIPANT_AUTO_SELECT_RULES` is the only change needed to update which participant roles are targeted.
10. `npm run typecheck` reports zero TypeScript errors.

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: query hook pattern for `useQuery` with `enabled`
- `architecture/08_hooks.md`: custom hook structure, ref guards for one-time side effects
- `architecture/06_client_state.md`: reading from Zustand auth store via selector
- `architecture/15_feature_structure.md`: placement of hooks and lib utilities inside a package

### Local extensions loaded

- `architecture/12_auth_local.md`: `AuthUser.role` is a plain string (e.g. `"worker"`, `"manager"`, `"admin"`)

### File read intent — pattern vs. relational

Relational reads performed:
- `packages/cases/src/api/list-users.ts`: established `listUsers` function signature, `ListUsersResult` shape, and `FETCH_PARAMS` query key inputs
- `packages/cases/src/api/user-keys.ts`: confirmed `userKeys.list(params)` query key factory
- `packages/cases/src/lib/user-view-model.ts`: confirmed `toParticipantSelectedDisplay(user)` helper exists and returns `ParticipantSelectedDisplay`
- `packages/cases/src/types.ts`: confirmed `UserCompact.role?.name`, `ParticipantSelectionResult`, `ParticipantSelectedDisplay` shapes
- `packages/cases/src/components/CaseCreationFormContent.tsx`: confirmed `form`, `setSelectedParticipants`, `setParticipantsTotalCount` available; `surfaceOpeners` and `selectedCaseType` are in context but NOT yet destructured — must be added
- `packages/cases/src/components/CaseTypePickerTriggerField.tsx`: confirmed `handlePress` calls `surfaceOpeners.openCaseTypePicker?.({ entityTypes, currentCaseTypeId, onSelect })` — auto-open replicates this exact call
- `packages/cases/src/surface-ids.ts`: confirmed `CaseTypePickerSheetSurfaceProps` shape: `{ entityTypes?, currentCaseTypeId?, onSelect }`
- `packages/auth/src/store/auth.store.ts`: confirmed `AuthUser.role: string`, `selectUser` selector, `useAuthStore` import

### Skill selection

- Primary skill: n/a (standalone feature addition)
- Trigger terms: `form`, `useForm`, `auth`, `role`

## Implementation plan

### Step 1 — Create `participant-auto-select-rules.ts`

**File:** `packages/cases/src/lib/participant-auto-select-rules.ts` (NEW)

A pure configuration constant. Keys are lowercase current-user role names. Values are arrays of lowercase target role names to pre-select.

```ts
export const PARTICIPANT_AUTO_SELECT_RULES: Record<string, string[]> = {
  worker: ["manager"],
  seller: ["manager"],
  admin: ["manager", "seller"],
};
```

No imports, no React, no side effects. This is the single place to add, remove, or change rules.

---

### Step 2 — Create `use-participant-auto-select.ts`

**File:** `packages/cases/src/lib/use-participant-auto-select.ts` (NEW)

Hook that reads auth state, derives target roles from the rules map, conditionally fetches users, and returns a resolved `ParticipantSelectionResult` once data is ready, or `null` otherwise.

```ts
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { selectUser, useAuthStore } from "@beyo/auth";
import { listUsers } from "../api/list-users";
import { userKeys } from "../api/user-keys";
import { toParticipantSelectedDisplay } from "./user-view-model";
import { PARTICIPANT_AUTO_SELECT_RULES } from "./participant-auto-select-rules";
import type { ParticipantSelectionResult } from "../types";

const AUTO_SELECT_FETCH_PARAMS = { limit: 200, compact: true as const };

export function useParticipantAutoSelect(): ParticipantSelectionResult | null {
  const user = useAuthStore(selectUser);

  const targetRoles = useMemo(() => {
    if (!user?.role) return [];
    return PARTICIPANT_AUTO_SELECT_RULES[user.role.toLowerCase()] ?? [];
  }, [user?.role]);

  const { data, isSuccess } = useQuery({
    queryKey: userKeys.list(AUTO_SELECT_FETCH_PARAMS),
    queryFn: () => listUsers(AUTO_SELECT_FETCH_PARAMS),
    enabled: targetRoles.length > 0,
  });

  return useMemo(() => {
    if (targetRoles.length === 0 || !isSuccess || !data) return null;

    const targetRoleSet = new Set(targetRoles);
    const filtered = data.users.filter(
      (u) => u.role?.name != null && targetRoleSet.has(u.role.name.toLowerCase()),
    );

    if (filtered.length === 0) return null;

    return {
      participants: filtered.map((u) => u.client_id as string),
      selectedAll: false,
      skipParticipants: [],
      selectedUsers: filtered.map(toParticipantSelectedDisplay),
      totalCount: filtered.length,
    };
  }, [targetRoles, isSuccess, data]);
}
```

**Key contract details:**
- `enabled: targetRoles.length > 0` — no fetch if the current user's role has no rules entry. This prevents a 200-user fetch on mount for roles like `manager` who are not in the rules map.
- `AUTO_SELECT_FETCH_PARAMS` is a stable object reference (module-level const) so the query key is stable across renders.
- Returns `null` (not loading state) until the result is ready — the caller ignores nulls via a ref guard.
- Uses `useMemo` for the filter/map so it only recomputes when data changes.

---

### Step 3 — Edit `CaseCreationFormContent.tsx` — auto-open case type picker on mount

**File:** `packages/cases/src/components/CaseCreationFormContent.tsx` (EDIT)

Call `surfaceOpeners.openCaseTypePicker` once on mount, replicating the same props that `CaseTypePickerTriggerField.handlePress()` builds. Use a `useRef` guard to prevent re-opening on re-renders.

**New context values to destructure** (add to the existing `useCaseCreationFormContext()` destructuring):
```ts
const {
  // ...existing...
  surfaceOpeners,
  selectedCaseType,
} = useCaseCreationFormContext();
```

**Import to add:**
```ts
import { useRef } from "react"; // likely already imported via participant step; add if not
```

**Effect to add inside `CaseCreationFormContent` body (after `form` is created, before return):**

```tsx
const caseTypeAutoOpenApplied = useRef(false);

useEffect(() => {
  if (caseTypeAutoOpenApplied.current || selectedCaseType !== null) return;
  caseTypeAutoOpenApplied.current = true;

  surfaceOpeners.openCaseTypePicker?.({
    entityTypes,
    currentCaseTypeId: null,
    onSelect: (selection) => {
      setSelectedCaseType(selection);
      form.setValue("case_type_id", selection.clientId, { shouldDirty: true });
      form.setValue("type_label", selection.name, { shouldDirty: true });
    },
  });
}, [surfaceOpeners, entityTypes, selectedCaseType, setSelectedCaseType, form]);
```

**Key details:**
- `selectedCaseType !== null` guard: if the component somehow mounts with a case type already set, the picker does not re-open. Safe guard for any future refactor.
- The `onSelect` callback is identical to `CaseTypePickerTriggerField.handlePress`'s `onSelect` — no divergence.
- `surfaceOpeners.openCaseTypePicker?.` — optional chain because `surfaceOpeners` is typed as `CaseCreationSurfaceOpeners` (all props optional). If the opener is not injected, the call is a no-op.
- The `useRef` guard fires the effect only once even if `surfaceOpeners` reference changes between renders.

---

### Step 4 — Edit `CaseCreationFormContent.tsx` — auto-select participants on mount

**File:** `packages/cases/src/components/CaseCreationFormContent.tsx` (EDIT — same file, continuation of Step 3)

Apply the participant auto-select result exactly once when it transitions from `null` to non-null, using a second `useRef` guard. Applied to both the RHF form and the `CaseCreationFormContext` to keep them in sync — mirroring `handleSaveSelection` in `ParticipantPickerTriggerField`.

**Import to add:**
```ts
import { useParticipantAutoSelect } from "../lib/use-participant-auto-select";
```

**Additions inside `CaseCreationFormContent` body (after the case type auto-open block):**

```tsx
const autoSelectResult = useParticipantAutoSelect();
const participantAutoSelectApplied = useRef(false);

useEffect(() => {
  if (autoSelectResult === null || participantAutoSelectApplied.current) return;
  participantAutoSelectApplied.current = true;
  form.setValue("participants", autoSelectResult.participants, { shouldDirty: false });
  setSelectedParticipants(autoSelectResult.selectedUsers);
  setParticipantsTotalCount(autoSelectResult.totalCount);
}, [autoSelectResult, form, setSelectedParticipants, setParticipantsTotalCount]);
```

**Why `shouldDirty: false`:** The auto-selection should not mark the form dirty. The worker did not manually choose anything yet; dirty state would incorrectly trigger unsaved-changes guards if any are added later.

**Why a ref guard instead of `useEffect` with empty deps:** `autoSelectResult` transitions from `null` → non-null once when the query resolves. Without the guard, a data refetch could recompute `autoSelectResult` (new object reference), re-trigger the effect, and reset the user's manual changes. The ref ensures one-shot application regardless of subsequent re-renders.

---

## File manifest

### Existing files to edit

| Path (relative to `packages/cases/src/`) | Change summary |
|---|---|
| `components/CaseCreationFormContent.tsx` | (1) Destructure `surfaceOpeners` + `selectedCaseType` from context; (2) one-shot `useEffect` to auto-open case type picker on mount; (3) `useParticipantAutoSelect` call + one-shot `useEffect` guard to apply participant result on mount |

### New files to create

| Path (relative to `packages/cases/src/`) |
|---|
| `lib/participant-auto-select-rules.ts` |
| `lib/use-participant-auto-select.ts` |

## Risks and mitigations

- Risk: The case type picker opens before the `listCaseTypes` prefetch resolves, showing a loading spinner inside the picker.
  Mitigation: Acceptable — the picker handles its own loading state. The prefetch is still fired concurrently and typically resolves within one network round trip, so the spinner is brief.

- Risk: `surfaceOpeners.openCaseTypePicker` is undefined at mount time (injected lazily or not at all).
  Mitigation: Optional chain `?.` makes the call a silent no-op. The form remains fully usable — the user just taps the field manually.

- Risk: The case type auto-open fires when the user is re-entering the form after a failed submission (form preserved for retry). Since the component did not remount, `caseTypeAutoOpenApplied.current` is still `true` and the picker does not re-open. This is correct.

- Risk: More than 200 users exist with a target role, causing some to be silently omitted.
  Mitigation: 200 is well above typical workspace size. Document the limit in a comment inside `use-participant-auto-select.ts`. If the workspace grows beyond this, adding pagination or a server-side `role` filter to `listUsers` is the correct next step.

- Risk: `AuthUser.role` casing differs from rule map keys (e.g. `"Worker"` vs. `"worker"`).
  Mitigation: `user.role.toLowerCase()` normalisation applied before lookup.

- Risk: `UserCompact.role.name` casing differs from target role names in the rules map.
  Mitigation: `u.role.name.toLowerCase()` normalisation applied before Set lookup.

- Risk: The user manually deselects auto-selected participants and the form re-applies them.
  Mitigation: `participantAutoSelectApplied.current` ref prevents re-application. The form surface unmounts on close, so the ref resets on next open — which is the desired behavior (re-apply on re-open).

## Validation plan

- `npm run typecheck`: zero TypeScript errors in `packages/cases`
- Manual: open case creation → case type picker opens automatically before any tap
- Manual: select a case type from the auto-opened picker → `CaseTypePickerTriggerField` reflects the selection
- Manual: dismiss the picker without selecting → field shows empty state, no crash, no re-open loop
- Manual: sign in as a worker → open case creation → `ParticipantPickerTriggerField` shows `Participants (N)` with N manager-role users pre-selected before any interaction
- Manual: sign in as an admin → open case creation → managers and sellers are pre-selected
- Manual: sign in as a manager → open case creation → participant field shows empty (no rules entry for manager); picker still auto-opens for case type
- Manual: open participant picker → deselect a participant → close picker → re-open form in same session → selection is preserved (component didn't remount, ref guard active)
- Manual: create a case → re-open case creation → case type picker auto-opens again and participant auto-select fires again (component remounted)

## Review log

- `2026-06-01` github-copilot: implemented plan, validated typecheck, summarized, and archived

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: github-copilot
