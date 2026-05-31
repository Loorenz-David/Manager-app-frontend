# Frontend Contract Goal Mapping Guide (Local Entrypoint)

Purpose: frontend-local routing guide that selects contracts from `../architecture/`.

## Resolution policy

1. Start with frontend core contracts.
2. Add one primary goal bundle.
3. Add trigger-based expansions only when the goal explicitly requires them.
4. Keep the selected set minimal and sufficient.

---

## Pattern authority rule

**Read contracts to learn how to write. Read implementation files to learn what already exists.**

This is the core discipline. The two questions have different answers:

| Question | Source |
|---|---|
| How do I structure a query hook? | `05_server_state.md` |
| How do I write an action hook with optimistic updates? | `08_hooks.md` |
| How do I wire a controller to a provider? | `23_providers.md` |
| How do I define a DTO schema and view model? | `24_dto.md` |
| How do I handle form validation and server errors? | `09_forms.md` |
| How do I set up a route with lazy loading? | `11_routing.md` |
| How do I write a feature component that consumes context? | `07_components.md` |
| How does a package field open a picker surface? | `35_shared_packages.md §13` |
| How do I hide a shell element on scroll (global pattern)? | `36_scroll_visibility.md` |
| How do I hide a surface/slide element on scroll (local pattern)? | `36_scroll_visibility.md` |
| How does a page register its scroll container? | `36_scroll_visibility.md` |
| What does this existing feature's API return? | Implementation file or `types.ts` |
| What fields does this existing form have? | Implementation file |
| How does this existing controller aggregate its queries? | Implementation file |
| What query keys does this existing feature use? | `api/<entity>-keys.ts` |

**The test before opening any implementation file:**

> "Am I reading this to understand how to structure my new code — or to understand what this existing code does?"

- If **how to write** → stop, read the contract instead. If the contract feels incomplete, ask for clarification.
- If **what exists** → read it. Understanding existing behavior, return shapes, context values, and field names is legitimate and expected.

**The specific drift to avoid:**

Reading `features/<other_domain>/actions/use-create-*.ts` to understand the action hook structure (cache snapshot, rollback, invalidation) when `08_hooks.md` already defines it is a protocol violation — it consumes tokens without adding information the contract doesn't already contain. The same applies to reading an existing provider to understand the context shell when `23_providers.md` defines it.

If a contract's pattern feels ambiguous, re-read it carefully or ask for clarification — never open an unrelated implementation file as a substitute.

---

## Domain grounding rule

**Contract examples are illustrative only. They are not your domain.**

Every contract in `../architecture/` uses `Invoice`, `InvoiceDetailPage`, `invoiceKeys`, `customer_id`, `amount_cents`, and similar names throughout. These are teaching examples that demonstrate structure — not field names, entity names, or types to use in implementation.

**Before writing any implementation plan or any code:**

1. Identify which feature(s) cover the entities you are building.
2. Read `src/features/<domain>/types.ts` to establish:
   - Actual entity names (`Task`, `WorkingSection`, `Item` — not `Invoice`)
   - Actual field names and types (`assigned_at`, `step_state` — not `due_date`, `amount_cents`)
   - Actual Zod schema shapes and constraints
   - Actual relationships, foreign keys, and status enums
3. Use only those names in your plan and code. Never copy entity names or field names from contract examples.

Domain schemas live at:

| Domain | Types file |
|---|---|
| Tasks | `src/features/tasks/types.ts` |
| Items | `src/features/items/types.ts` |
| Customers | `src/features/customers/types.ts` |
| Upholstery | `src/features/upholstery/types.ts` |
| Users | `src/features/users/types.ts` |
| Working sections | `src/features/working-sections/types.ts` |
| Base / shared | `src/types/common.ts` |

If `types.ts` does not exist for the domain you are implementing, stop and ask the user before proceeding. Do not invent field names from the contract examples.

---

## Core contracts (always include)

- `../architecture/01_architecture.md`
- `../architecture/02_types.md`
- `../architecture/04_api_client.md`
- `../architecture/05_server_state.md`
- `../architecture/06_client_state.md`
- `../architecture/08_hooks.md`
- `../architecture/13_errors.md`
- `../architecture/15_feature_structure.md`

---

## Goal bundles (starter)

### New feature (CRUD)

Add:
- `../architecture/16_feature_workflow.md`
- `../architecture/07_components.md`
- `../architecture/09_forms.md`
- `../architecture/10_pages.md`
- `../architecture/11_routing.md`
- `../architecture/14_styling.md`
- `../architecture/23_providers.md`
- `../architecture/24_dto.md`
- `../architecture/17_testing.md`
- `../architecture/34_runtime_validation.md`
- `../architecture/34_runtime_validation_local.md`

### Auth + permissions

Add:
- `../architecture/12_auth.md`
- `../architecture/19_permissions.md`

### Real-time feature

Add:
- `../architecture/21_realtime.md`

### UI — surfaces, animation, skeletons

Add:
- `../architecture/28_surfaces.md`
- `../architecture/27_responsive.md`
- `../architecture/31_animations.md`
- `../architecture/32_loading_skeletons.md`
- `../architecture/33_vaul_drawer.md`
- `../architecture/36_scroll_visibility.md` — if the feature includes elements that hide on scroll or registers a scroll container

### Performance + dynamic loading

Add:
- `../architecture/18_performance.md`
- `../architecture/30_dynamic_loading.md`

### Runtime validation + Playwright

Add:
- `../architecture/17_testing.md`
- `../architecture/21_realtime.md`
- `../architecture/27_responsive.md`
- `../architecture/28_surfaces.md`
- `../architecture/31_animations.md`
- `../architecture/33_vaul_drawer.md`
- `../architecture/34_runtime_validation.md`

---

## Trigger expansion map

- "auth", "session", "sign-in", "sign-out", "token", "refresh cookie" → `12`
- "permission", "role", "guard", "can", "forbidden", "403" → `19`
- "socket", "realtime", "real-time", "live update", "websocket", "push event" → `21`
- "form", "field error", "zodResolver", "useForm", "handleSubmit" → `09`, `24`
- "modal", "drawer", "surface", "overlay", "useSurface" → `28`
- "vaul", "drawer gesture", "drag to dismiss", "snap points", "shouldScaleBackground", "Drawer.Root", "scroll lock drawer" → `33`
- "animation", "transition", "motion", "framer", "AnimatePresence" → `31`
- "skeleton", "loading state", "shimmer", "suspense fallback" → `32`, `10`
- "responsive", "mobile", "breakpoint", "useBreakpoint", "isMobile" → `27`
- "scroll", "overflow", "scrollbar", "ScrollArea" → `29`
- "hide on scroll", "scroll visibility", "useScrollVisibility", "useScrollVisibilityContext", "isHidden", "hide on scroll", "scroll-driven hide", "AppScrollElementProvider", "registerScrollElement", "ScrollVisibilityProvider", "PullToRefresh registration", "shell card scroll", "fixed element scroll" → `36`
- "lazy load", "code split", "bundle", "dynamic import", "lazyRoute", "lazyWithPreload", "usePreloadSurface", "preload surface", "surface preload", "skeleton flash" → `30`, `18`
- "file upload", "attachment", "multipart", "XHR progress" → `22`
- "notification", "toast", "notify", "useNotify" → `20`
- "profile", "avatar", "current user", "useCurrentUser" → `25`
- "persistence", "localStorage", "IndexedDB", "persisted cache", "cold boot" → `26`
- "test", "testing", "vitest", "MSW", "renderHook" → `17`
- "playwright", "e2e", "browser test", "runtime test", "runtime validation", "browser validation" → `34`
- "console error", "uncaught exception", "page error", "console.error" → `34`
- "mobile validation", "mobile test", "viewport test", "responsive test" → `27`, `34`
- "trace", "playwright trace", "screenshot", "video", "test artifact" → `34`
- "websocket validation", "socket test", "realtime validation", "realtime test" → `21`, `34`
- "optimistic update validation", "optimistic rollback", "mutation validation" → `08`, `34`
- "interaction validation", "flow validation", "interaction test" → `34`
- "data-testid", "testid", "selector strategy", "stable selector" → `17`, `34`
- "environment", "env var", "VITE_", "import.meta.env" → `03`
- "dto", "view model", "client_id", "response schema", "toXxxViewModel" → `24`
- "memoization", "useMemo", "useCallback", "React.memo", "virtualize" → `18`
- "surfaceOpeners", "surface opener", "package picker", "openSurface from package", "picker injection", "package surface boundary", "XxxSurfaceOpeners", "callback injection surface" → `35_shared_packages §13`

---

## Output format (required before coding)

Domain schemas consulted:
- `src/features/<domain>/types.ts`: `<what was established — entity names, field names, schema shapes>`

Selected contracts:
- `<file>`: `<reason>`

Added from guide:
- `<file>`: `<trigger + justification>`

Local extensions loaded:
- `<canonical>_local.md`: `<what changed locally>`

Excluded contracts:
- `<file>`: `<why not needed now>`

---

## Document-only protocol (no resolver)

Use this protocol when the guide is the only entry point and no TypeScript tooling is executed.

1. Build an initial list from:
   - Core contracts
   - One goal bundle
   - Trigger expansion map (only explicit triggers)
2. For each selected canonical contract `../architecture/N_name.md`, check whether a companion `../architecture/N_name_local.md` exists.
3. If companion exists, load both files in this order:
   - Canonical first (`N_name.md`)
   - Local extension second (`N_name_local.md`)
4. Merge interpretation with precedence:
   - Canonical defines baseline rules.
   - Local companion may add fields, constraints, and app-specific behavior.
   - If canonical and local conflict, local wins for this app, but canonical remains unchanged.
5. Report both baseline and delta explicitly in the plan before coding.

### Required read order block in agent output

Agents should include this section before implementation:

Read order:
- `../architecture/<canonical>.md` (baseline)
- `../architecture/<canonical>_local.md` (app delta, if present)

Applied precedence:
- Local extension overrides baseline only for this app.

---

## Local contract extensions

Canonical contracts in `../architecture/` are **never modified** for app-specific requirements.

When an app extends a canonical contract, use a `*_local.md` companion file in the same folder:

```
../architecture/15_feature_structure.md      ← canonical (read-only)
../architecture/15_feature_structure_local.md ← app-specific extensions
```

Every companion must open with:
```md
> Extends: 15_feature_structure.md
```

When using tooling, the resolver automatically detects and surfaces `*_local.md` files alongside their canonical counterparts.
When running document-only, agents must apply the protocol above manually.

**Rule:** If a change benefits all apps → update canonical here and re-stamp. If it is app-specific → write it in the `*_local.md` companion.

### Known local companions (index)

| Canonical | Local companion | What it overrides |
|---|---|---|
| `01_architecture.md` | `01_architecture_local.md` | `route-entry.tsx` pattern for primary tab routes |
| `04_api_client.md` | `04_api_client_local.md` | Backend error shape (flat string, no `field_errors`), refresh response envelope (`body.data.access_token`), `decodeTokenClaims()` export |
| `12_auth.md` | `12_auth_local.md` | `AuthUser` type, sign-in body (`app_scope: 'admin'`), sign-out endpoint (`/logout`), `AuthProvider` boot uses JWT claims for workspace/role/permissions, no OAuth |
| `28_surfaces.md` | `28_surfaces_local.md` | Active surface types (`slide`, `sheet`, `modal`); `drawer` excluded |
| `30_dynamic_loading.md` | `30_dynamic_loading_local.md` | `lazyWithPreload` utility path (`@/utils/lazy-with-preload`), `usePreloadSurface` hook, StagedForm hoisting rule |
| `34_runtime_validation.md` | `34_runtime_validation_local.md` | Bootstrap status, fixture/helper paths, npm scripts, project names, spec location convention, credential env vars, mocking pattern |

---

## Feature build order quick reference

The build order is defined fully in `16_feature_workflow.md`. This is the summary:

```
Types → Query Keys → API Functions + Query Hooks → Actions → Controllers
  → Flows (if needed) → Providers
  → Components (add data-testid to all feature-critical elements here — see 34_runtime_validation_local.md)
  → Forms → Pages → Dynamic loading → Routes → Public API (index.ts)
  → Vitest unit + component tests
  → Playwright spec  tests/playwright/features/<feature>/<flow>.spec.ts  (import from fixtures/app-fixture; call auth.signIn() for authenticated tests)
  → Runtime validation pass on mobile project first, then desktop
  → COMPLETE
```

Never build components before the controller is complete. Never build the controller before actions and query hooks exist. The logic layer is built bottom-up; the UI layer is assembled top-down on top of it.

**Playwright is not optional.** An implementation is not complete until `npm run test:e2e:mobile` and `npm run test:e2e:desktop` pass. See `34_runtime_validation_local.md` for the bootstrapped fixture paths, credential env vars, and the element-naming convention.

---

## Layer dependency cheat sheet

| Layer | Reads from context? | Imports from |
|---|---|---|
| `features/<f>/components/` | Yes — context hook only | `providers/` (via context), `components/ui/`, `lib/utils` |
| `features/<f>/providers/` | No | `controllers/`, `flows/`, `types/` |
| `features/<f>/controllers/` | No | `actions/`, `api/`, `hooks/`, `store/`, `types/` |
| `features/<f>/actions/` | No | `api/`, `lib/`, `types/`, `store/` |
| `features/<f>/api/` | No | `lib/api-client`, `types/` |
| `pages/` | No | `features/*/index` (public API only) |
| `components/ui/` | No | `lib/utils`, `types/` |
| `store/` | No | `types/`, `lib/` |
| `lib/api-client` | No | `types/api`, `lib/env`, `lib/auth-token` |

The critical rule: **feature components never import from the logic layer.** They only consume context.
