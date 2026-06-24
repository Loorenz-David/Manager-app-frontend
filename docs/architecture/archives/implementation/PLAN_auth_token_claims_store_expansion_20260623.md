# PLAN_auth_token_claims_store_expansion_20260623

## Metadata

- Plan ID: `PLAN_auth_token_claims_store_expansion_20260623`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-23T00:00:00Z`
- Last updated at (UTC): `2026-06-23T07:14:24Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Expand the JWT `TokenClaims` type, the Zustand auth store, and both call-sites that populate the store (login + session restore) to include all fields the backend now encodes in the access token.
- Business/user intent: App code needs to branch on `workspace_role_name`, `app_scope`, `time_zone`, `workspace_role_id`, and `jti` without re-fetching the backend. These values are already in the token — they just aren't decoded or stored yet.
- Non-goals: No UI changes. No backend changes. No new permissions logic. No use-sites updated in this plan (consuming components will read from the store once it is populated).

## Scope

- In scope:
  - `packages/api-client/src/auth-token.ts` — extend `TokenClaims` with the full set of JWT fields
  - `packages/auth/src/store/auth.store.ts` — extend `AuthUser` type and `AuthState` to hold all new fields
  - `packages/auth/src/api/use-sign-in.ts` — map new fields from login response + token claims into `setUser()`
  - `packages/auth/src/components/AuthProvider.tsx` — map new fields from `decodeTokenClaims()` into `setUser()` on session restore
- Out of scope:
  - Any component or hook that reads from the store (no changes to consumers)
  - `SignInResponseSchema` shape — the new fields are read from the decoded JWT, not the login response body (except `workspace_role_id` and `workspace_role_name` which may also appear in the response; see Assumptions)
- Assumptions:
  - The backend already encodes all listed fields in the JWT payload; no backend changes needed.
  - `workspace_role_name` is `null` for standard system roles (admin, manager, seller) — the store must allow `null`.
  - `backend_permissions` and `ui` sub-arrays are **scaffolded and always empty** for now. The frontend must store and expose them, but no component or permission check may gate behaviour on their contents yet. They will be populated in a later backend release without requiring further type changes.
  - `app_scope` and `role_name` currently map 1:1 (backend enforces alignment at sign-in). They are still separate fields: `role_name` is the user's actual system role; `app_scope` is the session context. Store both independently — do not derive one from the other, as they may diverge in future (e.g. an admin operating in a manager-scoped session).
  - `jti` and `exp` are stored in the auth store for completeness (token revocation / expiry display) but no logic consumes them in this plan.

## Clarifications required

_(none — all field shapes confirmed by product owner in conversation 2026-06-23)_

## Acceptance criteria

1. `TokenClaims` in `auth-token.ts` declares every field listed in the JWT schema below with correct TypeScript types.
2. `AuthUser` in `auth.store.ts` exposes all new fields; `workspaceRoleId`, `workspaceRoleName`, `appScope`, `timeZone`, `jti`, `exp` are present on the stored user object.
3. After a fresh sign-in, `useAuthStore.getState().user` contains the correct values for every new field.
4. After an app restart (session restore via refresh cookie), the same fields are populated from `decodeTokenClaims()` — no field is `undefined`.
5. `npm run typecheck` passes with zero errors across all packages.

## JWT field schema (source of truth)

| JWT key              | TS type                                                        | Notes                                      |
|----------------------|----------------------------------------------------------------|--------------------------------------------|
| `user_id`            | `string`                                                       | maps to `UserId` branded type              |
| `username`           | `string`                                                       |                                            |
| `workspace_id`       | `string`                                                       | maps to `WorkspaceId` branded type         |
| `workspace_role_id`  | `string`                                                       | maps to new `WorkspaceRoleId` branded type (or plain `string` if brand not yet defined) |
| `role_name`          | `"admin" \| "manager" \| "worker" \| "seller"`                 |                                            |
| `workspace_role_name`| `"wood_worker" \| null`                                        | `null` = standard role, no sub-specialisation |
| `app_scope`          | `"admin" \| "manager" \| "worker" \| "seller"`                 |                                            |
| `time_zone`          | `string`                                                       | IANA timezone string e.g. `"Europe/Stockholm"` |
| `backend_permissions`| `string[]`                                                     | scaffold, always `[]` today                |
| `ui`                 | `{ apps, pages, buttons, actions, query_filters: string[] }`  | scaffold, all empty arrays today           |
| `jti`                | `string`                                                       | UUID, for token revocation                 |
| `exp`                | `number`                                                       | Unix timestamp                             |

## Contracts and skills

### Contracts loaded

- None required — all four files are small, self-contained, and already read in full during planning.

### File read intent — pattern vs. relational

Permitted reads (relational — understanding what exists):
- `packages/api-client/src/auth-token.ts` — existing `TokenClaims` shape and `decodeTokenClaims()` logic
- `packages/auth/src/store/auth.store.ts` — existing `AuthUser`, `AuthState`, selectors
- `packages/auth/src/api/use-sign-in.ts` — existing `SignInResponseSchema` and `setUser()` call shape
- `packages/auth/src/components/AuthProvider.tsx` — existing `initSession` + `setUser()` call shape

### Skill selection

- Primary skill: direct file edits (no specialised skill required — 4 files, pure type/data plumbing)

## Implementation plan

### File 1 — `packages/api-client/src/auth-token.ts`

**Change:** Replace the existing `TokenClaims` type (lines 18–30) with the full field set.

```ts
type TokenClaims = {
  user_id: string;
  username: string;
  workspace_id: string;
  workspace_role_id: string;
  role_name: "admin" | "manager" | "worker" | "seller";
  workspace_role_name: "wood_worker" | null;
  app_scope: "admin" | "manager" | "worker" | "seller";
  time_zone: string;
  backend_permissions: string[];
  ui: {
    apps: string[];
    pages: string[];
    buttons: string[];
    actions: string[];
    query_filters: string[];
  };
  jti: string;
  exp: number;
};
```

No other changes to this file — `decodeTokenClaims()` returns `TokenClaims | null` and the decode logic is unchanged.

---

### File 2 — `packages/auth/src/store/auth.store.ts`

**Change:** Extend `AuthUser` with all new fields. `workspaceId` stays at the top level of `AuthState` (unchanged).

```ts
type AuthUI = {
  apps: string[];
  pages: string[];
  buttons: string[];
  actions: string[];
  query_filters: string[];
};

type AuthUser = {
  id: UserId;
  email: string;
  username: string;
  role: "admin" | "manager" | "worker" | "seller";
  workspaceRoleId: string;
  workspaceRoleName: "wood_worker" | null;
  appScope: "admin" | "manager" | "worker" | "seller";
  timeZone: string;
  backend_permissions: string[];
  ui: AuthUI;
  jti: string;
  exp: number;
};
```

`AuthState`, `setUser`, `clearAuth`, and the three selectors (`selectUser`, `selectWorkspaceId`, `selectIsAuthenticated`) are unchanged.

Add two convenience selectors below the existing ones:

```ts
export const selectUserRole = (state: AuthState) => state.user?.role ?? null;
export const selectWorkspaceRoleName = (state: AuthState) => state.user?.workspaceRoleName ?? null;
export const selectAppScope = (state: AuthState) => state.user?.appScope ?? null;
export const selectTimeZone = (state: AuthState) => state.user?.timeZone ?? null;
```

---

### File 3 — `packages/auth/src/api/use-sign-in.ts`

**Change:** After `setAccessToken(result.data.access_token)`, decode the token to read the new fields, then pass them to `setUser()`.

The login response (`SignInResponseSchema`) already returns `user.role`, `user.backend_permissions`, and `user.ui` — keep those as-is for the login path. The new fields (`workspace_role_id`, `workspace_role_name`, `app_scope`, `time_zone`, `jti`, `exp`) come from decoding the access token immediately after it is set.

Import `decodeTokenClaims` alongside the existing imports:

```ts
import { apiClient, setAccessToken, setAuthScope, decodeTokenClaims } from "@beyo/api-client";
```

Replace the `setUser()` call:

```ts
setAccessToken(result.data.access_token);

const claims = decodeTokenClaims(); // decode the token we just stored

useAuthStore.getState().setUser(
  {
    id: result.data.user.client_id,
    email: result.data.user.email,
    username: result.data.user.username,
    role: result.data.user.role as AuthUser["role"],
    workspaceRoleId: claims?.workspace_role_id ?? "",
    workspaceRoleName: claims?.workspace_role_name ?? null,
    appScope: claims?.app_scope ?? (appScope as AuthUser["appScope"]),
    timeZone: claims?.time_zone ?? "UTC",
    backend_permissions: result.data.user.backend_permissions,
    ui: result.data.user.ui,
    jti: claims?.jti ?? "",
    exp: claims?.exp ?? 0,
  },
  result.data.workspace_id,
);
```

> Note: `AuthUser` type must be imported from `@beyo/auth` or from the relative store path for the cast — adjust import if needed, or use inline type assertion.

---

### File 4 — `packages/auth/src/components/AuthProvider.tsx`

**Change:** In the `initSession` `.then()` block, the existing code already calls `decodeTokenClaims()` and `apiClient.get("/api/v1/users/me")`. Extend the `setUser()` call to pass all new fields from `claims`.

Replace the existing `setUser()` call:

```ts
setUser(
  {
    id: profile.data.user.client_id,
    email: profile.data.user.email,
    username: profile.data.user.username,
    role: claims.role_name,
    workspaceRoleId: claims.workspace_role_id,
    workspaceRoleName: claims.workspace_role_name,
    appScope: claims.app_scope,
    timeZone: claims.time_zone,
    backend_permissions: claims.backend_permissions,
    ui: claims.ui,
    jti: claims.jti,
    exp: claims.exp,
  },
  claims.workspace_id as WorkspaceId,
);
```

No other changes to this file.

---

## Risks and mitigations

- Risk: `decodeTokenClaims()` returns `null` in `use-sign-in.ts` if the token is malformed immediately after being set.
  Mitigation: Use nullish-coalescing fallbacks (`?? ""`, `?? null`, `?? "UTC"`, `?? 0`) so `setUser()` never receives `undefined`. Token malformation here would surface as an auth error on the very next API call anyway.

- Risk: New fields added to `AuthUser` break existing `setUser()` call-sites if there are others not covered by this plan.
  Mitigation: `npm run typecheck` will catch any incomplete `setUser()` call — there are exactly two call-sites (login + restore) and both are updated in this plan.

## Validation plan

- `npm run typecheck`: zero TypeScript errors across `packages/api-client`, `packages/auth`
- Manual smoke test: sign in as a worker → open DevTools → `useAuthStore.getState()` in console → verify all new fields are populated
- Manual smoke test: refresh the page (session restore path) → same check

## Review log

- `2026-06-23` product owner: confirmed full JWT field schema and null semantics for `workspace_role_name`
- `2026-06-23` product owner: `backend_permissions` and `ui` are scaffolded / always empty — store them but no component should gate on their values yet
- `2026-06-23` product owner: `app_scope` and `role_name` are always aligned today (backend-enforced) but are semantically distinct — store both independently, never derive one from the other

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Codex`
