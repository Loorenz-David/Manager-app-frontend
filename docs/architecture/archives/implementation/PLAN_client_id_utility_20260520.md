# PLAN_client_id_utility_20260520

## Metadata

- Plan ID: `PLAN_client_id_utility_20260520`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-05-20T14:00:00Z`
- Last updated at (UTC): `2026-05-20T13:52:16Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Create a `generateClientId(entity)` utility at `src/lib/client-id.ts` that produces prefixed ULID identifiers matching the backend's `CLIENT_ID_PREFIX` convention. Update all existing `client_id` and reference-ID input schema fields that currently use `z.string().uuid()` — which would reject the prefixed format — to use the correct validator.
- Business/user intent: The backend assigns no IDs — the frontend generates the ID before the POST/PUT request fires. That ID becomes the entity's permanent public identifier, enabling optimistic creation, cache seeding, and polymorphic entity coordination without a server round-trip for an ID. A mismatch between the generated format and the schema validator would silently fail at validation time before the request even leaves the client.
- Non-goals: Action hooks, query hooks, API functions, RHF form integration, optimistic cache update logic. This plan only creates the generator and fixes the validators.

## Scope

- In scope:
  - `src/lib/client-id.ts` — new file containing:
    - ULID generator via the installed `ulid` npm package
    - `CLIENT_ID_PREFIXES` constant — full mirror of `docs/architecture/backend/tables/client_id_prefix_map.md`
    - `ClientIdEntity` type — `keyof typeof CLIENT_ID_PREFIXES`
    - `ClientIdPrefix` type — union of all prefix string values
    - `generateClientId(entity: ClientIdEntity): string` — returns `"{prefix}_{ulid}"`
    - `ClientIdSchema` — Zod validator for the prefixed ULID format; replaces `z.string().uuid()` on `client_id` fields
  - Update every `client_id: z.string().uuid()` field in existing feature `types.ts` files to `ClientIdSchema`
  - Update `pending_upload_client_id: z.string().uuid()` in `item_images/types.ts` to `ClientIdSchema`
  - Update all reference-ID fields (`customer_id`, `item_id`, `working_section_id`, `worker_id`, `upholstery_id`, `case_type_id`, `prerequisite_step_id`, `working_section_ids`, `user_ids`, `priority_item_upholstery_ids`, `item_category_id`) that use `z.string().uuid()` to `z.string().min(1)` — these reference existing entity IDs which are already in the prefixed ULID format and arrive pre-validated through entity schemas
- Out of scope: Action hooks, mutation functions, RHF field components, anything that calls `generateClientId` — those are implemented in subsequent plans
- Assumptions:
  - The `ulid` package is already installed
  - The ULID part of the ID uses Crockford's Base32 alphabet (`0123456789ABCDEFGHJKMNPQRSTVWXYZ`, 32 symbols) and is 26 characters long
  - The format is always `{prefix}_{ulid}` — prefix from the backend map, ULID uppercase 26-char Crockford string
  - Prefixes that contain an underscore (e.g. `usr_stat`) are valid — the regex must treat the final 26 Base32 chars as the ULID part and everything before the last `_` as the prefix
  - No existing code in this codebase currently calls `generateClientId` — this plan introduces it fresh

## Clarifications required

None — the prefix map is authoritative and fully available. All affected files were identified by grep.

## Acceptance criteria

1. `npm run typecheck` passes with zero errors after all steps are applied.
2. `generateClientId('Customer')` returns a string matching `/^cus_[0-9A-HJKMNP-TV-Z]{26}$/`.
3. `generateClientId('ExecutionTask')` returns a string matching `/^task_[0-9A-HJKMNP-TV-Z]{26}$/`.
4. `ClientIdSchema.safeParse('cus_01ARYZ6S41TPTWGIBZH4S7APGE').success` is `true`.
5. `ClientIdSchema.safeParse('some-uuid-1234')` is `false` (plain UUIDs are rejected).
6. Every `client_id` field in every `CreateXxx` input schema uses `ClientIdSchema`, not `z.string().uuid()`.
7. No reference-ID field (`customer_id`, `item_id`, etc.) in any request DTO uses `z.string().uuid()`.
8. `CLIENT_ID_PREFIXES` contains exactly the 43 entries from the backend prefix map — no additions, no omissions.

## Contracts and skills

### Contracts loaded

- `architecture/24_dto.md`: Request DTO field validation rules — informs why `client_id` validator must match the actual generated format
- `architecture/04_api_client.md`: `client_id` convention — frontend generates before request, backend stores as public ID

### Local extensions loaded

- `docs/architecture/backend/tables/client_id_prefix_map.md`: Authoritative source for all prefix values

### File read intent — pattern vs. relational

Permitted reads taken:
- `src/lib/` directory listing — to understand existing lib file naming conventions (relational: what exists)
- All affected `features/*/types.ts` — to locate exact `z.string().uuid()` occurrences for replacement (relational: what exists)
- `docs/architecture/backend/tables/client_id_prefix_map.md` — to derive prefix values (relational: what the backend owns)

---

## Implementation plan

---

### Step 1 — Create `src/lib/client-id.ts`

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/lib/client-id.ts`

Create the file. Uses the installed `ulid` npm package for ULID generation.

```ts
import { ulid } from 'ulid';
import { z } from 'zod';

// ─── Prefix map ───────────────────────────────────────────────────────────────
// Mirrors docs/architecture/backend/tables/client_id_prefix_map.md exactly.
// The frontend passes an entity name to generateClientId(); the prefix is looked
// up here. Add a new entry whenever a new backend table with client_id is added.

export const CLIENT_ID_PREFIXES = {
  AuditLog:                         'aud',
  Case:                             'ca',
  CaseConversation:                 'ccv',
  CaseConversationMessage:          'ccm',
  CaseLink:                         'clk',
  CaseParticipant:                  'cpa',
  CaseType:                         'cty',
  ContentMention:                   'cmt',
  ContentMentionLink:               'cml',
  Customer:                         'cus',
  ExecutionPayload:                 'epl',
  ExecutionTask:                    'task',
  HistoryRecord:                    'hrec',
  HistoryRecordLink:                'hrlk',
  Image:                            'img',
  ImageAnnotation:                  'ian',
  ImageEvent:                       'iev',
  ImageLink:                        'iml',
  Item:                             'itm',
  ItemCategory:                     'itc',
  ItemIssue:                        'iis',
  ItemUpholstery:                   'iup',
  ItemUpholsteryRequirement:        'iur',
  Notification:                     'not',
  NotificationPin:                  'npn',
  PendingUpload:                    'upl',
  PushSubscription:                 'psu',
  RecurringScheduler:               'rsch',
  Role:                             'role',
  StaticCost:                       'stc',
  StepStateRecord:                  'ssr',
  TaskEvent:                        'tev',
  TaskItem:                         'tki',
  TaskNote:                         'tno',
  TaskStep:                         'tsp',
  TaskStepAssignmentRecord:         'tsar',
  TaskStepDependency:               'tsd',
  Upholstery:                       'uph',
  UpholsteryInventory:              'uphi',
  User:                             'usr',
  UserAppViewRecord:                'uavr',
  UserDailyWorkStats:               'udwr',
  UserHistoryRecord:                'uhr',
  UserLifetimeStats:                'usr_stat',
  UserSectionDailyWorkStats:        'usdwr',
  UserShiftStateRecord:             'ussr',
  UserWorkProfile:                  'uwp',
  Workspace:                        'ws',
  WorkspaceMembership:              'wsm',
  WorkspaceRole:                    'wsr',
  WorkingSection:                   'wks',
  WorkingSectionDependency:         'wsd',
  WorkingSectionItemCategory:       'wsic',
  WorkingSectionMembership:         'wsmem',
  WorkingSectionSupportedIssueType: 'wssit',
  WorkingSectionDailyWorkStats:     'wsdws',
} as const;

export type ClientIdEntity = keyof typeof CLIENT_ID_PREFIXES;
export type ClientIdPrefix = (typeof CLIENT_ID_PREFIXES)[ClientIdEntity];

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a prefixed ULID client ID for the given entity type.
 * The returned string is the ID that will be sent to the backend as `client_id`
 * and stored as the entity's permanent public identifier.
 *
 * @example
 *   generateClientId('Customer')     // → "cus_01ARYZ6S41TPTWGIBZH4S7APGE"
 *   generateClientId('ExecutionTask') // → "task_01ARYZ6S41TPTWGIBZH4S7APGE"
 */
export function generateClientId(entity: ClientIdEntity): string {
  return `${CLIENT_ID_PREFIXES[entity]}_${ulid()}`;
}

// ─── Zod validator ────────────────────────────────────────────────────────────
// Validates that a string is a well-formed prefixed ULID client ID.
// Used on client_id fields in all CreateXxx input schemas.
//
// Format: {prefix}_{ulid}
//   prefix — one or more lowercase letters or underscores (e.g. "cus", "usr_stat")
//   ulid   — exactly 26 Crockford Base32 characters (uppercase)
//
// The regex anchors on the 26-char Base32 tail to avoid ambiguity when the
// prefix itself contains underscores (e.g. "usr_stat_01ARYZ...").

export const CLIENT_ID_REGEX = /^[a-z][a-z_]*_[0-9A-HJKMNP-TV-Z]{26}$/;

export const ClientIdSchema = z
  .string()
  .regex(CLIENT_ID_REGEX, 'Invalid client ID format. Expected {prefix}_{ulid}.');
```

---

### Step 2 — Update `tasks/types.ts`

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/types.ts`

Add import and replace `client_id` and reference-ID validators.

**Add to imports:**
```ts
import { ClientIdSchema } from '@/lib/client-id';
```

**Replace in `CreateTaskInputSchema`:**
```ts
// Before:
client_id: z.string().uuid(),
// After:
client_id: ClientIdSchema,
```

**Replace in `CreateTaskInputSchema` reference fields:**
```ts
// Before:
customer_id: z.string().uuid().optional(),
item_id:     z.string().uuid(),
// After:
customer_id: z.string().min(1).optional(),
item_id:     z.string().min(1),
```

**Replace in `UpdateTaskInputSchema` reference field:**
```ts
// Before:
customer_id: z.string().uuid().nullable().optional(),
// After:
customer_id: z.string().min(1).nullable().optional(),
```

---

### Step 3 — Update `task_steps/types.ts`

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/subfeatures/task_steps/types.ts`

**Add to imports:**
```ts
import { ClientIdSchema } from '@/lib/client-id';
```

**Replace reference-ID validators in `CreateTaskStepInputSchema`, `AssignWorkerToStepInputSchema`, `AddStepDependencyInputSchema`:**
```ts
// Before:
working_section_id: z.string().uuid(),
worker_id:          z.string().uuid(),
prerequisite_step_id: z.string().uuid(),
// After:
working_section_id:   z.string().min(1),
worker_id:            z.string().min(1),
prerequisite_step_id: z.string().min(1),
```

Note: `task_steps` has no `client_id` field on its create input (steps are created by the backend under a task). No `ClientIdSchema` needed here — only reference-ID cleanup.

---

### Step 4 — Update `items/types.ts`

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/items/types.ts`

**Add to imports:**
```ts
import { ClientIdSchema } from '@/lib/client-id';
```

**Replace in `CreateItemInputSchema`:**
```ts
// Before:
client_id:        z.string().uuid(),
item_category_id: z.string().uuid().optional(),
// After:
client_id:        ClientIdSchema,
item_category_id: z.string().min(1).optional(),
```

**Replace in `UpdateItemInputSchema`:**
```ts
// Before:
item_category_id: z.string().uuid().nullable().optional(),
// After:
item_category_id: z.string().min(1).nullable().optional(),
```

---

### Step 5 — Update `item_images/types.ts`

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/items/subfeatures/item_images/types.ts`

**Add to imports:**
```ts
import { ClientIdSchema } from '@/lib/client-id';
```

**Replace in `ConfirmItemImageUploadInputSchema`:**
```ts
// Before:
pending_upload_client_id: z.string().uuid(),
// After:
pending_upload_client_id: ClientIdSchema,
```

Note: `RequestItemImageUploadInputSchema` has no `client_id` field (the pending upload ID is returned by the server). `ReorderItemImagesInputSchema` and `UnlinkItemImageInputSchema` use branded entity IDs from transforms — no UUID validators to fix there.

---

### Step 6 — Update `customers/types.ts`

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/customers/types.ts`

**Add to imports:**
```ts
import { ClientIdSchema } from '@/lib/client-id';
```

**Replace in `CreateCustomerInputSchema` and `FindOrCreateCustomerInputSchema`:**
```ts
// Before:
client_id: z.string().uuid(),
// After:
client_id: ClientIdSchema,
```

---

### Step 7 — Update `cases/types.ts`

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/types.ts`

**Add to imports:**
```ts
import { ClientIdSchema } from '@/lib/client-id';
```

**Replace in `CreateCaseInputSchema`:**
```ts
// Before:
client_id:    z.string().uuid(),
case_type_id: z.string().uuid().optional(),
// After:
client_id:    ClientIdSchema,
case_type_id: z.string().min(1).optional(),
```

**Replace in `AddCaseParticipantsInputSchema`:**
```ts
// Before:
user_ids: z.array(z.string().uuid()).min(1, 'Select at least one user.'),
// After:
user_ids: z.array(z.string().min(1)).min(1, 'Select at least one user.'),
```

---

### Step 8 — Update `users/types.ts`

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/users/types.ts`

No `client_id` creation fields in users (users are created by the backend). Only reference-ID cleanup.

**Replace in `AssignWorkingSectionsInputSchema` and `UnassignWorkingSectionsInputSchema`:**
```ts
// Before:
working_section_ids: z.array(z.string().uuid()).min(1),
// After:
working_section_ids: z.array(z.string().min(1)).min(1),
```

---

### Step 9 — Update `working_sections/types.ts`

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/working_sections/types.ts`

**Add to imports:**
```ts
import { ClientIdSchema } from '@/lib/client-id';
```

**Replace in `CreateWorkingSectionInputSchema`:**
```ts
// Before:
client_id: z.string().uuid(),
// After:
client_id: ClientIdSchema,
```

---

### Step 10 — Update `upholstery/types.ts`

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/types.ts`

**Add to imports:**
```ts
import { ClientIdSchema } from '@/lib/client-id';
```

**Replace in `CreateUpholsteryInventoryInputSchema`:**
```ts
// Before:
client_id:    z.string().uuid(),
upholstery_id: z.string().uuid(),
// After:
client_id:    ClientIdSchema,
upholstery_id: z.string().min(1),
```

---

### Step 11 — Update `upholstery_requirements/types.ts`

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery_requirements/types.ts`

**Add to imports:**
```ts
import { ClientIdSchema } from '@/lib/client-id';
```

**Replace in `CreateItemUpholsteryInputSchema`:**
```ts
// Before:
client_id:    z.string().uuid(),
item_id:      z.string().uuid(),
upholstery_id: z.string().uuid().optional(),
// After:
client_id:    ClientIdSchema,
item_id:      z.string().min(1),
upholstery_id: z.string().min(1).optional(),
```

**Replace in `MarkUpholsteryOrderedInputSchema`:**
```ts
// Before:
upholstery_id:               z.string().uuid(),
priority_item_upholstery_ids: z.array(z.string().uuid()).optional(),
// After:
upholstery_id:               z.string().min(1),
priority_item_upholstery_ids: z.array(z.string().min(1)).optional(),
```

---

### Step 12 — Typecheck

```
npm run typecheck
```

Expected: zero TypeScript errors. Resolve any import path issues before marking complete.

---

## Risks and mitigations

- Risk: `CLIENT_ID_REGEX` uses `[0-9A-HJKMNP-TV-Z]` for the ULID part. Crockford Base32 excludes I, L, O, U. The hyphen placement in the character class (`P-T` then `V-Z`) must be verified — incorrect ranges silently match wrong chars.
  Mitigation: The regex is `[0-9A-HJKMNP-TV-Z]`. Expanded: `0-9`, `A-H`, `J`, `K`, `M`, `N`, `P-T`, `V-Z` — correctly excludes I, L, O, U. Codex must verify this matches the ULID spec before committing.

- Risk: The `ulid` package may use CJS internals that cause issues under Vite's ESM-first bundling.
  Mitigation: `ulid` ships both CJS and ESM builds and is widely used with Vite. If a bundler warning appears, add `'ulid'` to `optimizeDeps.include` in `vite.config.ts`.

- Risk: `toOptimisticTask`, `toOptimisticItem`, `toOptimisticCustomer`, `toOptimisticWorkingSection` currently call `TaskSchema.parse({ id: input.client_id, ... })`. After this plan, `input.client_id` is a prefixed ULID string (e.g. `task_01ARYZ...`). The entity schema ID field uses `z.string().transform(v => v as TaskId)` — no format validation — so parse will still succeed. No change needed in the optimistic builders.

- Risk: Existing test fixtures or mock data may use plain UUID strings for `client_id`. If any test calls `CreateTaskInputSchema.parse({ client_id: 'some-uuid', ... })`, it will now fail `ClientIdSchema` validation.
  Mitigation: No tests exist yet in this codebase (`npm run typecheck` is the only validation). Not currently a risk.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual spot check: `generateClientId('Customer')` output matches `/^cus_[0-9A-HJKMNP-TV-Z]{26}$/`
- Manual spot check: `generateClientId('UserLifetimeStats')` output matches `/^usr_stat_[0-9A-HJKMNP-TV-Z]{26}$/` (prefix with underscore)
- Manual spot check: two calls to `generateClientId('Item')` return different strings (randomness check)
- `grep -r "z.string().uuid()" src/features/` — must return zero results after all steps applied

## Review log

- `2026-05-20` `claude-sonnet-4-6`: Initial plan created
- `2026-05-20` `Codex`: Implemented plan, validated the new utility and DTO replacements, and recorded two stale source-plan assumptions: the backend prefix map currently contains `56` entries, and the sample ULID in acceptance criterion 4 is invalid because it contains `I`.

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `Codex`

---

## Architecture decision notes (for implementer)

### Why `ulid` package

The `ulid` package is the canonical JavaScript ULID implementation — well-tested, typed, and handles edge cases (monotonic generation within the same millisecond to guarantee sort order). Using it avoids maintaining a custom encoder and keeps the implementation auditable.

### Why `ClientIdSchema` validates the full format

The generator is the only correct source of client IDs — no user input, no server data, no third-party IDs ever go into the `client_id` field. Validating the full `{prefix}_{ulid}` format at the Zod boundary ensures that if someone accidentally passes a raw UUID, a legacy ID, or a server-assigned ID where a `client_id` is expected, the error is caught at schema parse time with a clear message rather than silently accepted and sent to the backend (which would reject it at the ID uniqueness check).

### Why reference IDs use `z.string().min(1)` not `ClientIdSchema`

Reference IDs (e.g. `customer_id`, `item_id` in request schemas) are branded types derived from entity response schemas. By the time they appear in a request DTO, they have already been parsed and branded by the response schema — the format is guaranteed by the entity schema boundary. Adding `ClientIdSchema` validation on top would be redundant. `z.string().min(1)` is the minimum necessary constraint (non-empty) without over-specifying the format.

### Why `user_ids` and `working_section_ids` arrays use `z.string().min(1)` not `ClientIdSchema`

These are arrays of existing entity IDs selected by the user (from a picker backed by server data). The IDs arrived as `UserId` / `WorkingSectionId` branded strings through the response entity schema — already validated to be non-empty. Using `ClientIdSchema` here would also be redundant and unnecessarily strict.
